const { mkdir, writeFile } = require("node:fs/promises");
const { gzipSync } = require("node:zlib");
const { cert, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const OPENLIGADB_URL = "https://api.openligadb.de/getmatchdata/wm26/2026";
const mode = process.argv[2];
const TEAM_CODE_ALIASES = Object.freeze({
  ALG: "DZA", CRO: "HRV", DRC: "COD", KSA: "SAU", NED: "NLD", POR: "PRT", SUI: "CHE", URU: "URY",
});
const COUNTRY_NAMES_ZH = Object.freeze({
  England: "英格蘭", Spain: "西班牙", Portugal: "葡萄牙", Croatia: "克羅埃西亞", Switzerland: "瑞士", Algeria: "阿爾及利亞", Australia: "澳洲", Egypt: "埃及", Argentina: "阿根廷", Colombia: "哥倫比亞", Ghana: "迦納", Germany: "德國", Japan: "日本", France: "法國", Brazil: "巴西", Mexico: "墨西哥", Canada: "加拿大", Morocco: "摩洛哥", Tunisia: "突尼西亞", Uruguay: "烏拉圭", Norway: "挪威", Paraguay: "巴拉圭", Ecuador: "厄瓜多", "South Korea": "韓國", Iran: "伊朗", Qatar: "卡達", "Saudi Arabia": "沙烏地阿拉伯", Belgium: "比利時", Senegal: "塞內加爾", "United States": "美國", USA: "美國", Austria: "奧地利",
});

function getServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not configured");
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

function compactDate(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function getEspnRange(dateValue) {
  const selected = new Date(`${dateValue}T12:00:00+08:00`);
  const previous = new Date(selected);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return `${compactDate(previous)}-${compactDate(selected)}`;
}

function getCompetitor(competition, homeAway) {
  return competition?.competitors?.find((competitor) => competitor.homeAway === homeAway);
}

function calculateRegulationScore(event) {
  const competition = event.competitions?.[0];
  const home = getCompetitor(competition, "home");
  const away = getCompetitor(competition, "away");
  if (!competition || !home || !away) return null;

  const status = competition.status?.type || event.status?.type || {};
  if (!status.completed) return null;

  const description = `${status.name || ""} ${status.detail || ""} ${status.shortDetail || ""}`.toUpperCase();
  if (!/AET|EXTRA TIME|PEN|PENS/.test(description)) {
    return `${Number(home.score || 0)}-${Number(away.score || 0)}`;
  }

  const teamIds = {
    home: String(home.team?.id || home.id),
    away: String(away.team?.id || away.id),
  };
  const score = { home: 0, away: 0 };
  (competition.details || []).forEach((detail) => {
    const isGoal = detail.scoringPlay && !detail.shootout && Number(detail.scoreValue || 0) > 0;
    const isRegulation = Number(detail.clock?.value || 0) <= 5400;
    if (!isGoal || !isRegulation) return;
    const teamId = String(detail.team?.id || "");
    if (teamId === teamIds.home) score.home += Number(detail.scoreValue || 0);
    if (teamId === teamIds.away) score.away += Number(detail.scoreValue || 0);
  });
  return `${score.home}-${score.away}`;
}

function calculateHalfTimeScore(event) {
  const competition = event.competitions?.[0];
  const home = getCompetitor(competition, "home");
  const away = getCompetitor(competition, "away");
  const status = competition?.status?.type || event.status?.type || {};
  if (!status.completed || !home || !away || !Array.isArray(competition?.details)) return null;

  const teamIds = { home: String(home.team?.id || home.id), away: String(away.team?.id || away.id) };
  const score = { home: 0, away: 0 };
  competition.details.forEach((detail) => {
    const isFirstHalfGoal = detail.scoringPlay && !detail.shootout
      && Number(detail.scoreValue || 0) > 0 && Number(detail.clock?.value || 0) <= 2700;
    if (!isFirstHalfGoal) return;
    const teamId = String(detail.team?.id || "");
    if (teamId === teamIds.home) score.home += Number(detail.scoreValue || 0);
    if (teamId === teamIds.away) score.away += Number(detail.scoreValue || 0);
  });
  return `${score.home}-${score.away}`;
}

function normalizeTeamCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return TEAM_CODE_ALIASES[normalized] || normalized;
}

function toTaipeiDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function fetchEspnResultsForDates(dateValues) {
  const results = new Map();
  const failures = [];
  await Promise.all(Array.from(new Set(dateValues.filter(Boolean))).map(async (dateValue) => {
    try {
      const payload = await fetchWithRetry(`${ESPN_SCOREBOARD_URL}?limit=100&dates=${getEspnRange(dateValue)}`);
      (payload.events || []).forEach((event) => {
        const score = calculateRegulationScore(event);
        if (score) results.set(String(event.id), { score, halfTimeScore: calculateHalfTimeScore(event), provider: "ESPN" });
      });
    } catch (error) {
      failures.push(`${dateValue}: ${error.message}`);
    }
  }));
  return { failures, results };
}

async function fetchOpenLigaResults() {
  const matches = await fetchWithRetry(OPENLIGADB_URL, 2);
  const results = new Map();
  (matches || []).filter((match) => match.matchIsFinished).forEach((match) => {
    const regularTime = (match.matchResults || []).find((result) => Number(result.resultTypeID) === 2);
    if (!regularTime || !match.matchDateTimeUTC) return;
    const key = [
      toTaipeiDate(match.matchDateTimeUTC),
      normalizeTeamCode(match.team1?.shortName),
      normalizeTeamCode(match.team2?.shortName),
    ].join("|");
    results.set(key, {
      score: `${Number(regularTime.pointsTeam1)}-${Number(regularTime.pointsTeam2)}`,
      provider: "OpenLigaDB",
    });
  });
  return results;
}

function getPredictedScore(bet) {
  if (Number.isInteger(bet.predictedHome) && Number.isInteger(bet.predictedAway)) {
    return `${bet.predictedHome}-${bet.predictedAway}`;
  }
  const match = String(bet.note || "").normalize("NFKC").trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);
  return match ? `${Number(match[1])}-${Number(match[2])}` : null;
}

function getBetType(bet) {
  return ["correct_score", "half_time_correct_score", "match_winner", "half_time_winner", "tournament_champion"].includes(bet.betType) ? bet.betType : "correct_score";
}

function localizeTeamName(name) {
  return COUNTRY_NAMES_ZH[String(name || "").trim()] || String(name || "").trim();
}

function getWinnerSelection(score) {
  const [home, away] = String(score || "").split("-").map(Number);
  return home === away ? "draw" : home > away ? "home" : "away";
}

async function fetchTournamentChampion() {
  const payload = await fetchWithRetry(`${ESPN_SCOREBOARD_URL}?limit=100&dates=20260718-20260719`);
  const event = (payload.events || []).find((item) => /final/i.test(`${item.name || ""} ${item.shortName || ""}`));
  const competition = event?.competitions?.[0];
  if (!event || !(competition?.status?.type || event.status?.type || {}).completed) return null;
  const winner = competition.competitors?.find((competitor) => competitor.winner === true || competitor.advance === true);
  return winner?.team ? localizeTeamName(winner.team.displayName || winner.team.shortDisplayName) : null;
}

async function settlePendingBets(firestore) {
  const snapshot = await firestore.collection("bets").where("result", "==", "pending").get();
  const pending = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  const espn = await fetchEspnResultsForDates(pending.map((bet) => bet.matchDate || bet.date));
  let fallbackResults = new Map();
  try {
    fallbackResults = await fetchOpenLigaResults();
  } catch (error) {
    console.warn(`OpenLigaDB fallback unavailable: ${error.message}`);
  }
  let champion = null;
  if (pending.some((bet) => getBetType(bet) === "tournament_champion")) {
    try { champion = await fetchTournamentChampion(); } catch (error) { console.warn(`Champion result unavailable: ${error.message}`); }
  }
  const settled = pending
    .map((bet) => {
      const fallbackKey = [
        bet.matchDate || bet.date || "",
        normalizeTeamCode(bet.homeCode),
        normalizeTeamCode(bet.awayCode),
      ].join("|");
      return {
        ...bet,
        betType: getBetType(bet),
        predictedScore: getPredictedScore(bet),
        officialResult: espn.results.get(String(bet.matchId || "")) || fallbackResults.get(fallbackKey),
        champion,
      };
    })
    .filter((bet) => (bet.betType === "tournament_champion" && bet.champion)
      || (["half_time_correct_score", "half_time_winner"].includes(bet.betType) && bet.officialResult?.halfTimeScore)
      || (!["tournament_champion", "half_time_correct_score", "half_time_winner"].includes(bet.betType) && bet.officialResult));

  for (let offset = 0; offset < settled.length; offset += 200) {
    const batch = firestore.batch();
    settled.slice(offset, offset + 200).forEach((bet) => {
      const { score: regulationScore, halfTimeScore, provider } = bet.officialResult || {};
      const settledScore = ["half_time_correct_score", "half_time_winner"].includes(bet.betType) ? halfTimeScore : regulationScore;
      const selection = String(bet.selection || bet.note || "").trim();
      const result = bet.betType === "tournament_champion"
        ? (selection === bet.champion ? "win" : "loss")
        : ["match_winner", "half_time_winner"].includes(bet.betType)
          ? (selection === getWinnerSelection(settledScore) ? "win" : "loss")
          : (bet.predictedScore === settledScore ? "win" : "loss");
      const settlementFields = bet.betType === "tournament_champion"
        ? { settledSelection: bet.champion, resultProvider: "ESPN" }
        : { settledScore, resultProvider: provider };
      const auditRef = firestore.collection("auditLogs").doc();
      batch.update(firestore.collection("bets").doc(bet.id), {
        result,
        ...settlementFields,
        settledAt: FieldValue.serverTimestamp(),
      });
      batch.set(auditRef, {
        id: auditRef.id,
        action: "background_settle",
        actorUid: "system:github-actions",
        actorName: "GitHub Actions",
        recordId: bet.id,
        occurredAt: FieldValue.serverTimestamp(),
        details: { result, ...(bet.betType === "tournament_champion" ? { settledSelection: bet.champion, provider: "ESPN" } : { settledScore, provider }) },
      });
    });
    await batch.commit();
  }
  const providerCounts = settled.reduce((counts, bet) => {
    counts[bet.officialResult.provider] = (counts[bet.officialResult.provider] || 0) + 1;
    return counts;
  }, {});
  const result = { pending: pending.length, settled: settled.length, providerCounts, espnFailures: espn.failures };
  await firestore.collection("maintenanceRuns").doc("background_settlement_latest").set({
    type: "background_settlement",
    label: "背景賽果同步",
    completedAt: FieldValue.serverTimestamp(),
    summary: `${pending.length} 筆待判定，完成 ${settled.length} 筆`,
    ...result,
  }, { merge: true });
  return result;
}

function serialize(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

async function createBackup(firestore) {
  const names = ["bets", "settlements", "auditLogs", "maintenanceRuns", "personalHistoryBets"];
  const collections = {};
  for (const name of names) {
    const snapshot = await firestore.collection(name).get();
    collections[name] = snapshot.docs.map((document) => ({ id: document.id, ...serialize(document.data()) }));
  }

  const generatedAt = new Date().toISOString();
  const payload = { generatedAt, projectId: "fifa2026-53511", collections };
  await mkdir(".maintenance-output", { recursive: true });
  const path = `.maintenance-output/firestore-${generatedAt.slice(0, 10)}.json.gz`;
  await writeFile(path, gzipSync(JSON.stringify(payload)));
  const counts = Object.fromEntries(names.map((name) => [name, collections[name].length]));
  await firestore.collection("maintenanceRuns").doc("daily_backup_latest").set({
    type: "daily_backup",
    label: "每日 Firestore 備份",
    completedAt: FieldValue.serverTimestamp(),
    summary: `${counts.bets} 筆投注已匯出`,
    counts,
  }, { merge: true });
  return { path, counts };
}

async function main() {
  if (mode !== "settle" && mode !== "backup") throw new Error("Usage: node scripts/maintenance.js settle|backup");
  const serviceAccount = getServiceAccount();
  const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  const firestore = getFirestore(app);
  const result = mode === "settle" ? await settlePendingBets(firestore) : await createBackup(firestore);
  console.log(JSON.stringify({ ok: true, mode, ...result }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { calculateRegulationScore, calculateHalfTimeScore, fetchOpenLigaResults, getPredictedScore, normalizeTeamCode };
