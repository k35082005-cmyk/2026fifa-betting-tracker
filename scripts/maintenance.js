const { mkdir, writeFile } = require("node:fs/promises");
const { gzipSync } = require("node:zlib");
const { cert, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const mode = process.argv[2];

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

async function fetchResultsForDates(dateValues) {
  const results = new Map();
  await Promise.all(Array.from(new Set(dateValues.filter(Boolean))).map(async (dateValue) => {
    const response = await fetch(`${ESPN_SCOREBOARD_URL}?limit=100&dates=${getEspnRange(dateValue)}`);
    if (!response.ok) throw new Error(`ESPN ${response.status} for ${dateValue}`);
    const payload = await response.json();
    (payload.events || []).forEach((event) => {
      const score = calculateRegulationScore(event);
      if (score) results.set(String(event.id), score);
    });
  }));
  return results;
}

function getPredictedScore(bet) {
  if (Number.isInteger(bet.predictedHome) && Number.isInteger(bet.predictedAway)) {
    return `${bet.predictedHome}-${bet.predictedAway}`;
  }
  const match = String(bet.note || "").normalize("NFKC").trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);
  return match ? `${Number(match[1])}-${Number(match[2])}` : null;
}

async function settlePendingBets(firestore) {
  const snapshot = await firestore.collection("bets").where("result", "==", "pending").get();
  const pending = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  const results = await fetchResultsForDates(pending.map((bet) => bet.matchDate || bet.date));
  const settled = pending
    .map((bet) => ({ ...bet, predictedScore: getPredictedScore(bet) }))
    .filter((bet) => bet.matchId && bet.predictedScore && results.has(String(bet.matchId)));

  for (let offset = 0; offset < settled.length; offset += 200) {
    const batch = firestore.batch();
    settled.slice(offset, offset + 200).forEach((bet) => {
      const settledScore = results.get(String(bet.matchId));
      const result = bet.predictedScore === settledScore ? "win" : "loss";
      const auditRef = firestore.collection("auditLogs").doc();
      batch.update(firestore.collection("bets").doc(bet.id), {
        result,
        settledScore,
        settledAt: FieldValue.serverTimestamp(),
      });
      batch.set(auditRef, {
        id: auditRef.id,
        action: "background_settle",
        actorUid: "system:github-actions",
        actorName: "GitHub Actions",
        recordId: bet.id,
        occurredAt: FieldValue.serverTimestamp(),
        details: { result, settledScore },
      });
    });
    await batch.commit();
  }
  return { pending: pending.length, settled: settled.length };
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
  const names = ["bets", "settlements", "auditLogs"];
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
  return { path, counts: Object.fromEntries(names.map((name) => [name, collections[name].length])) };
}

async function main() {
  if (mode !== "settle" && mode !== "backup") throw new Error("Usage: node scripts/maintenance.js settle|backup");
  const serviceAccount = getServiceAccount();
  const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  const firestore = getFirestore(app);
  const result = mode === "settle" ? await settlePendingBets(firestore) : await createBackup(firestore);
  console.log(JSON.stringify({ ok: true, mode, ...result }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
