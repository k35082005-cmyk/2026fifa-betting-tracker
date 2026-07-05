const STORAGE_KEY = "fifa-bet-tracker-v1";
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const OPENLIGADB_URL = "https://api.openligadb.de/getmatchdata/wm26/2026";
const WORLD_CUP_TOURNAMENT_RANGE = "20260611-20260719";
const MATCH_REFRESH_INTERVAL = 5 * 60 * 1000;
const ADMIN_UID = "qnPcedb81rXsq5o6BjMS4FiqycZ2";
const MEMBER_NAMES_BY_UID = Object.freeze({
  qnPcedb81rXsq5o6BjMS4FiqycZ2: "Wei",
  tvjU2F7IkDVZ1Hhov5IlYCYC2ky2: "Vicky",
  a2Nte74OdZVWsJXNc3CFxsYvgII2: "Hou",
  RjLkSRBvwUQtdLrQsL24wVmpxI32: "Sam",
});
const TEAM_CODE_ALIASES = Object.freeze({
  ALG: "DZA", CRO: "HRV", DRC: "COD", KSA: "SAU", NED: "NLD", POR: "PRT", SUI: "CHE", URU: "URY",
});

const form = document.getElementById("betForm");
const authStatus = document.getElementById("authStatus");
const syncHint = document.getElementById("syncHint");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const matchInput = document.getElementById("matchInput");
const matchIdInput = document.getElementById("matchIdInput");
const recordsBody = document.getElementById("recordsBody");
const summaryStats = document.getElementById("summaryStats");
const matchBreakdown = document.getElementById("matchBreakdown");
const memberStats = document.getElementById("memberStats");
const overallMemberStats = document.getElementById("overallMemberStats");
const filterMember = document.getElementById("filterMember");
const filterResult = document.getElementById("filterResult");
const searchInput = document.getElementById("searchInput");
const exportBtn = document.getElementById("exportBtn");
const refreshMatchesBtn = document.getElementById("refreshMatchesBtn");
const scoreFields = document.getElementById("scoreFields");
const scoreHint = document.getElementById("scoreHint");
const homeScoreLabel = document.getElementById("homeScoreLabel");
const awayScoreLabel = document.getElementById("awayScoreLabel");
const memberInput = document.getElementById("memberInput");
const matchDateInput = document.getElementById("matchDateInput");
const recordsToggleSummary = document.getElementById("recordsToggleSummary");
const analysisDateFilter = document.getElementById("analysisDateFilter");
const analysisMatchFilter = document.getElementById("analysisMatchFilter");
const statsDateFilter = document.getElementById("statsDateFilter");
const statsMatchFilter = document.getElementById("statsMatchFilter");
const statsMemberFilter = document.getElementById("statsMemberFilter");
const statsRangeLabel = document.getElementById("statsRangeLabel");
const filteredSummary = document.getElementById("filteredSummary");
const settlementStartInput = document.getElementById("settlementStartInput");
const settlementEndInput = document.getElementById("settlementEndInput");
const settlementRangeHint = document.getElementById("settlementRangeHint");
const settlementPreview = document.getElementById("settlementPreview");
const settlementMemberStats = document.getElementById("settlementMemberStats");
const settlementHistory = document.getElementById("settlementHistory");
const createSettlementBtn = document.getElementById("createSettlementBtn");
const adminMenuButton = document.getElementById("adminMenuButton");
const adminSystemSummary = document.getElementById("adminSystemSummary");
const adminRefreshBtn = document.getElementById("adminRefreshBtn");
const adminMaintenanceStatus = document.getElementById("adminMaintenanceStatus");
const adminCorrectionForm = document.getElementById("adminCorrectionForm");
const adminRecordSelect = document.getElementById("adminRecordSelect");
const adminHomeScoreInput = document.getElementById("adminHomeScoreInput");
const adminAwayScoreInput = document.getElementById("adminAwayScoreInput");
const adminOddsInput = document.getElementById("adminOddsInput");
const adminAmountInput = document.getElementById("adminAmountInput");
const adminCorrectionBtn = document.getElementById("adminCorrectionBtn");
const adminAuditLogs = document.getElementById("adminAuditLogs");
const personalHistoryMenuButton = document.getElementById("personalHistoryMenuButton");
const personalHistorySummary = document.getElementById("personalHistorySummary");
const personalSourceFilter = document.getElementById("personalSourceFilter");
const personalTypeFilter = document.getElementById("personalTypeFilter");
const personalSourceBreakdown = document.getElementById("personalSourceBreakdown");
const personalPerformanceBreakdown = document.getElementById("personalPerformanceBreakdown");
const personalHistoryRange = document.getElementById("personalHistoryRange");
const personalHistoryBody = document.getElementById("personalHistoryBody");
const refreshTeamGuideBtn = document.getElementById("refreshTeamGuideBtn");
const teamGuideStatus = document.getElementById("teamGuideStatus");
const teamGuideStageSummary = document.getElementById("teamGuideStageSummary");
const teamGuideBracket = document.getElementById("teamGuideBracket");
const teamGuideSummary = document.getElementById("teamGuideSummary");
const teamGuideRanking = document.getElementById("teamGuideRanking");
const submitButton = form.querySelector('[type="submit"]');
const menuToggle = document.getElementById("menuToggle");
const currentPageLabel = document.getElementById("currentPageLabel");
const pageMenu = document.getElementById("pageMenu");
const pageButtons = Array.from(document.querySelectorAll("[data-page-target]"));
const pageViews = Array.from(document.querySelectorAll("[data-page]"));

const COUNTRY_NAMES_ZH = {
  England: "英格蘭", Congo: "剛果共和國", "Congo DR": "剛果民主共和國", Belgium: "比利時",
  Senegal: "塞內加爾", "United States": "美國", USA: "美國", "Bosnia-Herzegovina": "波士尼亞與赫塞哥維納",
  Spain: "西班牙", Austria: "奧地利", Portugal: "葡萄牙", Croatia: "克羅埃西亞", Switzerland: "瑞士",
  Algeria: "阿爾及利亞", Australia: "澳洲", Egypt: "埃及", Argentina: "阿根廷", "Cape Verde": "維德角",
  Colombia: "哥倫比亞", Ghana: "迦納", Germany: "德國", Japan: "日本", France: "法國", Brazil: "巴西",
  Mexico: "墨西哥", Canada: "加拿大", Morocco: "摩洛哥", Tunisia: "突尼西亞", Uruguay: "烏拉圭",
  Norway: "挪威", Paraguay: "巴拉圭",
  Ecuador: "厄瓜多", "South Korea": "韓國", Korea: "韓國", Iran: "伊朗", Qatar: "卡達", "Saudi Arabia": "沙烏地阿拉伯"
};

let records = loadRecords();
let availableMatches = [];
let auth = null;
let firestore = null;
let stopFirestoreSync = null;
let stopSettlementsSync = null;
let stopAuditSync = null;
let stopMaintenanceSync = null;
let stopPersonalHistorySync = null;
let settlements = [];
let auditLogs = [];
let maintenanceRuns = [];
let personalHistoryRecords = [];
let statsDateInitialized = false;
let latestUpcomingStatsDate = "";
let settlementRangeInitialized = false;
let activeSubmissionId = createId();
let teamGuideEvents = [];
let teamGuideLoadedAt = null;
let teamGuideLoading = false;

const LEGACY_CREATED_DATE = "2026-07-02";
const LEGACY_FIXTURES = [
  {
    key: "spain-austria",
    label: "西班牙 VS 奧地利",
    matchDate: "2026-07-03",
    teams: [["西班牙", "spain"], ["奧地利", "奥地利", "austria"]],
  },
  {
    key: "portugal-croatia",
    label: "葡萄牙 VS 克羅埃西亞",
    matchDate: "2026-07-03",
    teams: [["葡萄牙", "portugal"], ["克羅埃西亞", "克羅地亞", "克罗地亚", "croatia"]],
  },
  {
    key: "switzerland-algeria",
    label: "瑞士 VS 阿爾及利亞",
    matchDate: "2026-07-03",
    teams: [["瑞士", "switzerland"], ["阿爾及利亞", "阿尔及利亚", "algeria"]],
  },
];

if (migrateLegacyRecordDates().length) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

try {
  if (window.firebase && window.__FIREBASE_CONFIG__?.apiKey) {
    firebase.initializeApp(window.__FIREBASE_CONFIG__);
    auth = firebase.auth();
    firestore = firebase.firestore();
  }
} catch (error) {
  console.error("Firebase 初始化失敗：", error);
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("無法讀取本機資料：", error);
    return [];
  }
}

async function saveRecords(changedRecords = records, auditAction = "update", auditDetails = null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

  if (!auth?.currentUser || !firestore || !changedRecords.length) return false;

  try {
    const uniqueRecords = Array.from(new Map(changedRecords.map((record) => [record.id, record])).values());
    for (let offset = 0; offset < uniqueRecords.length; offset += 200) {
      const batch = firestore.batch();
      uniqueRecords.slice(offset, offset + 200).forEach((record) => {
        const auditRef = firestore.collection("auditLogs").doc();
        batch.set(firestore.collection("bets").doc(record.id), record);
        batch.set(auditRef, {
          id: auditRef.id,
          action: auditAction,
          actorUid: auth.currentUser.uid,
          actorName: getMemberDisplayName(auth.currentUser),
          recordId: record.id,
          occurredAt: firebase.firestore.FieldValue.serverTimestamp(),
          ...(auditDetails ? { details: auditDetails } : {}),
        });
      });
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error("雲端同步失敗：", error);
    window.alert(`資料已保存在本機，但雲端同步失敗：${error.message}`);
    return false;
  }
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isLikelyDuplicateBet(candidate, existing) {
  return existing.id !== candidate.id
    && existing.memberUid === candidate.memberUid
    && String(existing.matchId || "") === String(candidate.matchId || "")
    && Number(existing.predictedHome) === Number(candidate.predictedHome)
    && Number(existing.predictedAway) === Number(candidate.predictedAway)
    && roundMoney(existing.amount) === roundMoney(candidate.amount)
    && Number(existing.odds) === Number(candidate.odds);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatSignedCurrency(amount) {
  const value = Number(amount) || 0;
  return `${value > 0 ? "+" : ""}${formatCurrency(value)}`;
}

function toLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toEspnDateValue(date) {
  return toLocalDateValue(date).replaceAll("-", "");
}

function getEspnRangeForLocalDate(dateValue) {
  const selected = new Date(`${dateValue}T12:00:00`);
  const previous = new Date(selected);
  previous.setDate(previous.getDate() - 1);
  return `${toEspnDateValue(previous)}-${toEspnDateValue(selected)}`;
}

function getMemberDisplayName(user) {
  if (!user) return "";
  return MEMBER_NAMES_BY_UID[user.uid]
    || user.displayName
    || user.email
    || "Google 成員";
}

async function deleteRecord(recordId) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (!auth?.currentUser || !firestore) return;
  const batch = firestore.batch();
  const auditRef = firestore.collection("auditLogs").doc();
  batch.delete(firestore.collection("bets").doc(recordId));
  batch.set(auditRef, {
    id: auditRef.id,
    action: "delete",
    actorUid: auth.currentUser.uid,
    actorName: getMemberDisplayName(auth.currentUser),
    recordId,
    occurredAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

function getResultLabel(result) {
  return { win: "贏", loss: "輸", pending: "未開獎" }[result] || "未開獎";
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function getRecordPayout(item) {
  if (item.result !== "win") return 0;
  return roundMoney(Number(item.amount || 0) * Number(item.odds || 0));
}

function getSettlementStats(items) {
  return items.reduce(
    (stats, item) => {
      const amount = Number(item.amount || 0);
      stats.totalAmount = roundMoney(stats.totalAmount + amount);

      if (item.result === "pending") {
        stats.pendingAmount = roundMoney(stats.pendingAmount + amount);
        return stats;
      }

      if (item.result === "win" || item.result === "loss") {
        stats.settledAmount = roundMoney(stats.settledAmount + amount);
        stats.payout = roundMoney(stats.payout + getRecordPayout(item));
      }

      return stats;
    },
    { totalAmount: 0, settledAmount: 0, pendingAmount: 0, payout: 0 }
  );
}

function getNetAmount(items) {
  const stats = getSettlementStats(items);
  return roundMoney(stats.payout - stats.settledAmount);
}

function getRecordCreatedDate(item) {
  if (item.createdDate) return item.createdDate;
  if (item.createdAt) return toLocalDateValue(new Date(item.createdAt));
  return "";
}

function getSettlementCandidates(startDate, endDate) {
  return records.filter((item) => {
    const createdDate = getRecordCreatedDate(item);
    return !item.settlementId
      && (item.result === "win" || item.result === "loss")
      && createdDate
      && createdDate >= startDate
      && createdDate <= endDate;
  });
}

function getMemberSettlementSummary(items) {
  return getMemberFinanceStats(items).map((entry) => ({
    memberUid: entry.records[0]?.memberUid || "",
    memberEmail: entry.records[0]?.memberEmail || "",
    member: entry.label,
    count: entry.count,
    stake: entry.settledAmount,
    payout: entry.payout,
    netAmount: entry.netAmount,
  }));
}

function getSettlementTotals(items) {
  const settlement = getSettlementStats(items);
  const members = getMemberSettlementSummary(items);
  const externalMembers = members.filter((member) => member.memberUid !== ADMIN_UID);
  const payable = roundMoney(externalMembers.reduce((sum, member) => sum + Math.max(member.netAmount, 0), 0));
  const receivable = roundMoney(externalMembers.reduce((sum, member) => sum + Math.max(-member.netAmount, 0), 0));
  return {
    stake: settlement.settledAmount,
    payout: settlement.payout,
    accountNetAmount: roundMoney(settlement.payout - settlement.settledAmount),
    payable,
    receivable,
    netAmount: roundMoney(payable - receivable),
  };
}

function getMoneyToneClass(amount) {
  if (amount > 0) return "is-positive";
  if (amount < 0) return "is-negative";
  return "is-even";
}

function calculateSummary(items) {
  const settlement = getSettlementStats(items);
  return {
    totalCount: items.length,
    totalAmount: settlement.totalAmount,
    netAmount: roundMoney(settlement.payout - settlement.settledAmount),
    pendingCount: items.filter((item) => item.result === "pending").length,
    completedCount: items.filter((item) => item.result === "win" || item.result === "loss").length,
  };
}

function groupStats(items, key) {
  const grouped = new Map();

  items.forEach((item) => {
    const label = item[key] || "未填寫";
    const existing = grouped.get(label) || { label, count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += Number(item.amount || 0);
    grouped.set(label, existing);
  });

  return Array.from(grouped.values());
}

function normalizeScore(score) {
  const text = String(score || "").normalize("NFKC").trim();
  return parseScore(text) || text || "未填寫";
}

function getLegacyFixture(match) {
  const compact = String(match || "")
    .normalize("NFKC")
    .toLocaleLowerCase("zh-Hant")
    .replace(/[\p{Separator}\p{Punctuation}\p{Format}\p{Mark}\p{Control}]/gu, "");
  return LEGACY_FIXTURES.find((fixture) =>
    fixture.teams.every((aliases) => aliases.some((alias) => compact.includes(alias.toLocaleLowerCase("zh-Hant"))))
  );
}

function normalizeMatchKey(match) {
  const legacyFixture = getLegacyFixture(match);
  if (legacyFixture) return legacyFixture.key;
  const text = String(match || "未填寫").normalize("NFKC").replace(/[\p{Format}\u200B-\u200D\uFEFF]/gu, "").trim();
  const teams = text.split(/\s*(?:vs\.?|對)\s*/i);
  return teams
    .map((team) => localizeCountryName(team.trim()))
    .map((team) => String(team).toLocaleLowerCase("zh-Hant").replace(/[\p{Separator}\p{Punctuation}\p{Format}\p{Mark}\p{Control}]/gu, ""))
    .join("::");
}

function getRecordMatchKey(record) {
  const matchId = String(record?.matchId || "").trim();
  if (matchId) return `id:${matchId}`;

  const normalizedName = normalizeMatchKey(record?.match);
  const matchDate = String(record?.matchDate || record?.date || "").trim();
  const matchingRecordWithId = records.find((item) =>
    item.matchId &&
    normalizeMatchKey(item.match) === normalizedName &&
    (!matchDate || String(item.matchDate || item.date || "").trim() === matchDate)
  );
  return matchingRecordWithId
    ? `id:${String(matchingRecordWithId.matchId).trim()}`
    : `name:${normalizedName}:date:${matchDate || "unknown"}`;
}

function getMatchFilterOptions() {
  return Array.from(
    new Map(records.filter((item) => item.match).map((item) => [getRecordMatchKey(item), item.match])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1], "zh-Hant"));
}

function isCurrentUserAdmin() {
  return auth?.currentUser?.uid === ADMIN_UID;
}

function migrateLegacyRecordDates() {
  const changedRecords = [];
  records = records.map((record) => {
    const legacyFixture = getLegacyFixture(record.match);
    const migrated = {
      ...record,
      createdDate: record.createdDate || LEGACY_CREATED_DATE,
      match: legacyFixture?.label || record.match,
      matchDate: legacyFixture?.matchDate || record.matchDate || record.date || "",
      date: legacyFixture?.matchDate || record.date,
    };
    if (
      migrated.createdDate === record.createdDate
      && migrated.match === record.match
      && migrated.matchDate === record.matchDate
      && migrated.date === record.date
    ) return record;
    changedRecords.push(migrated);
    return migrated;
  });
  return changedRecords;
}

function reconcileRecordsWithMatches(matches) {
  if (!matches.length) return [];
  const byId = new Map(matches.map((match) => [match.id, match]));
  const byKey = new Map(matches.map((match) => [normalizeMatchKey(match.label), match]));
  const changedRecords = [];

  records = records.map((record) => {
    const matched = byId.get(String(record.matchId || "")) || byKey.get(normalizeMatchKey(record.match));
    if (!matched) return record;
    if (
      record.matchId === matched.id
      && record.match === matched.label
      && record.matchDate === matched.date
      && (!matched.homeCode || record.homeCode === matched.homeCode)
      && (!matched.awayCode || record.awayCode === matched.awayCode)
    ) return record;
    const alignedRecord = {
      ...record,
      matchId: matched.id,
      match: matched.label,
      matchDate: matched.date,
      date: matched.date,
      homeCode: matched.homeCode || record.homeCode || "",
      awayCode: matched.awayCode || record.awayCode || "",
      alignedAt: new Date().toISOString(),
    };
    changedRecords.push(alignedRecord);
    return alignedRecord;
  });

  return changedRecords;
}

function getGroupedBetStats(items, keyGetter) {
  const grouped = new Map();

  items.forEach((item) => {
    const label = keyGetter(item) || "未填寫";
    const current = grouped.get(label) || {
      label,
      count: 0,
      amount: 0,
      oddsTotal: 0,
      members: new Set(),
      records: [],
    };
    current.count += 1;
    current.amount += Number(item.amount || 0);
    current.oddsTotal += Number(item.odds || 0);
    current.members.add(item.member || "未填寫");
    current.records.push(item);
    grouped.set(label, current);
  });

  return Array.from(grouped.values()).map((entry) => ({
    ...entry,
    averageOdds: entry.count ? entry.oddsTotal / entry.count : 0,
    memberCount: entry.members.size,
  }));
}

function getCompetitor(competition, homeAway) {
  return competition?.competitors?.find((competitor) => competitor.homeAway === homeAway);
}

function localizeCountryName(name) {
  return COUNTRY_NAMES_ZH[String(name || "").trim()] || name;
}

function normalizeTeamCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return TEAM_CODE_ALIASES[normalized] || normalized;
}

function parseScore(score) {
  const match = String(score || "").normalize("NFKC").trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!match) return null;
  return `${Number(match[1])}-${Number(match[2])}`;
}

function calculateRegulationScore(event) {
  const competition = event.competitions?.[0];
  const home = getCompetitor(competition, "home");
  const away = getCompetitor(competition, "away");
  if (!competition || !home || !away) return null;

  const status = competition.status?.type || event.status?.type || {};
  const completed = Boolean(status.completed);
  if (!completed) return null;

  const statusDescription = `${status.name || ""} ${status.detail || ""} ${status.shortDetail || ""}`.toUpperCase();
  const includesExtraTime = /AET|EXTRA TIME|PEN|PENS/.test(statusDescription);
  if (!includesExtraTime) {
    return `${Number(home.score || 0)}-${Number(away.score || 0)}`;
  }

  const teamIds = {
    home: String(home.team?.id || home.id),
    away: String(away.team?.id || away.id),
  };
  const score = { home: 0, away: 0 };
  const goals = competition.details || [];

  goals.forEach((detail) => {
    const isGoal = detail.scoringPlay && !detail.shootout && Number(detail.scoreValue || 0) > 0;
    const isRegulation = Number(detail.clock?.value || 0) <= 5400;
    if (!isGoal || !isRegulation) return;

    const teamId = String(detail.team?.id || "");
    if (teamId === teamIds.home) score.home += Number(detail.scoreValue || 0);
    if (teamId === teamIds.away) score.away += Number(detail.scoreValue || 0);
  });

  return `${score.home}-${score.away}`;
}

function getEventTeam(event, homeAway) {
  return getCompetitor(event.competitions?.[0], homeAway);
}

function getTeamIdentity(competitor) {
  const team = competitor?.team || {};
  return {
    id: String(team.id || competitor?.id || ""),
    name: localizeCountryName(team.displayName || team.shortDisplayName || team.name || "未知隊伍"),
    abbreviation: String(team.abbreviation || "").toUpperCase(),
    logo: String(team.logo || ""),
  };
}

const KNOCKOUT_STAGES = Object.freeze([
  { key: "round32", label: "32 強", pattern: /Round of 32/i },
  { key: "round16", label: "16 強", pattern: /Round of 16/i },
  { key: "quarterfinals", label: "8 強", pattern: /Quarterfinals?/i },
  { key: "semifinals", label: "4 強", pattern: /Semifinals?/i },
  { key: "thirdPlace", label: "季軍戰", pattern: /3rd-Place Match/i },
  { key: "final", label: "冠軍戰", pattern: /Final$/i },
]);

function getEventStage(event) {
  const note = event.competitions?.[0]?.altGameNote || "";
  return KNOCKOUT_STAGES.find((stage) => stage.pattern.test(note)) || null;
}

function getTeamNameFromCompetitor(competitor) {
  return competitor?.team?.displayName || competitor?.team?.shortDisplayName || competitor?.team?.name || "";
}

function isPlaceholderTeam(competitor) {
  return /Winner|Loser|TBD/i.test(getTeamNameFromCompetitor(competitor));
}

function getKnockoutEvents(events) {
  return events
    .map((event) => ({ event, stage: getEventStage(event) }))
    .filter((entry) => entry.stage)
    .sort((a, b) => String(a.event.date).localeCompare(String(b.event.date)));
}

function getStageEvents(knockoutEntries, stageKey) {
  return knockoutEntries.filter((entry) => entry.stage.key === stageKey).map((entry) => entry.event);
}

function getRealCompetitors(event) {
  return (event.competitions?.[0]?.competitors || []).filter((competitor) => !isPlaceholderTeam(competitor));
}

function getAdvancingCompetitor(event) {
  const competitors = getRealCompetitors(event);
  return competitors.find((competitor) => competitor.advance === true)
    || competitors.find((competitor) => competitor.winner === true)
    || null;
}

function getCurrentKnockoutContext(knockoutEntries) {
  const stageSummaries = KNOCKOUT_STAGES.map((stage) => {
    const events = getStageEvents(knockoutEntries, stage.key);
    const completed = events.filter((event) => Boolean(calculateRegulationScore(event))).length;
    return { ...stage, events, completed };
  }).filter((stage) => stage.events.length);
  const firstIncomplete = stageSummaries.find((stage) => stage.completed < stage.events.length);
  const finalStages = stageSummaries.filter((stage) => ["thirdPlace", "final"].includes(stage.key));
  const currentStage = firstIncomplete && ["thirdPlace", "final"].includes(firstIncomplete.key)
    ? {
        key: "finalWeek",
        label: "決賽週",
        events: finalStages.flatMap((stage) => stage.events),
        completed: finalStages.reduce((sum, stage) => sum + stage.completed, 0),
      }
    : firstIncomplete || stageSummaries.at(-1) || null;
  const activeTeamIds = new Set();
  const activeTeams = new Map();

  if (currentStage) {
    currentStage.events.forEach((event) => {
      const completed = Boolean(calculateRegulationScore(event));
      const competitors = getRealCompetitors(event);
      const candidates = completed ? [getAdvancingCompetitor(event)].filter(Boolean) : competitors;
      candidates.forEach((competitor) => {
        const identity = getTeamIdentity(competitor);
        if (!identity.id) return;
        activeTeamIds.add(identity.id);
        activeTeams.set(identity.id, identity);
      });
    });
  }

  if (!activeTeamIds.size) {
    const roundOf16Events = getStageEvents(knockoutEntries, "round16");
    roundOf16Events.flatMap(getRealCompetitors).forEach((competitor) => {
      const identity = getTeamIdentity(competitor);
      if (!identity.id) return;
      activeTeamIds.add(identity.id);
      activeTeams.set(identity.id, identity);
    });
  }

  return { stageSummaries, currentStage, activeTeamIds, activeTeams };
}

function getTournamentTeamStats(events, teamIds) {
  const statsByTeam = new Map();
  const ensureTeam = (competitor) => {
    const identity = getTeamIdentity(competitor);
    if (!statsByTeam.has(identity.id)) {
      statsByTeam.set(identity.id, {
        ...identity,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        cleanSheets: 0,
        form: [],
      });
    }
    return statsByTeam.get(identity.id);
  };

  events.forEach((event) => {
    const score = calculateRegulationScore(event);
    if (!score) return;
    const [homeGoals, awayGoals] = score.split("-").map(Number);
    const home = getEventTeam(event, "home");
    const away = getEventTeam(event, "away");
    if (!home || !away) return;
    const homeIdentity = getTeamIdentity(home);
    const awayIdentity = getTeamIdentity(away);
    if (!teamIds.has(homeIdentity.id) && !teamIds.has(awayIdentity.id)) return;

    [[home, homeGoals, awayGoals], [away, awayGoals, homeGoals]].forEach(([competitor, scored, conceded]) => {
      const team = ensureTeam(competitor);
      if (!teamIds.has(team.id)) return;
      team.played += 1;
      team.goalsFor += scored;
      team.goalsAgainst += conceded;
      if (conceded === 0) team.cleanSheets += 1;
      const result = scored > conceded ? "W" : scored < conceded ? "L" : "D";
      team.form.push({
        result,
        score: `${scored}-${conceded}`,
        opponent: competitor.homeAway === "home" ? awayIdentity.name : homeIdentity.name,
        date: event.date,
        stage: String(event.competitions?.[0]?.altGameNote || "FIFA World Cup").replace(/^FIFA World Cup,\s*/i, ""),
      });
      if (result === "W") team.wins += 1;
      if (result === "D") team.draws += 1;
      if (result === "L") team.losses += 1;
    });
  });

  return statsByTeam;
}

function getTeamGuideData(events) {
  const knockoutEntries = getKnockoutEvents(events);
  const roundOf16Events = getStageEvents(knockoutEntries, "round16");
  const roundOf16TeamIds = new Set(roundOf16Events.flatMap((event) => [
    getTeamIdentity(getEventTeam(event, "home")).id,
    getTeamIdentity(getEventTeam(event, "away")).id,
  ]).filter(Boolean));
  const statsByTeam = getTournamentTeamStats(events, roundOf16TeamIds);
  const knockoutContext = getCurrentKnockoutContext(knockoutEntries);
  roundOf16Events.forEach((event) => {
    [getEventTeam(event, "home"), getEventTeam(event, "away")].forEach((competitor) => {
      const identity = getTeamIdentity(competitor);
      if (!statsByTeam.has(identity.id)) {
        statsByTeam.set(identity.id, {
          ...identity, played: 0, wins: 0, draws: 0, losses: 0,
          goalsFor: 0, goalsAgainst: 0, cleanSheets: 0, form: [],
        });
      }
    });
  });
  return { knockoutEntries, knockoutContext, roundOf16Events, statsByTeam };
}

function getTeamPoints(team) {
  return team.wins * 3 + team.draws;
}

function getGoalDifference(team) {
  return team.goalsFor - team.goalsAgainst;
}

function getFormMarkup(form) {
  return form.slice(-5).map((match) => `
    <span class="form-result is-${match.result.toLowerCase()}" title="${escapeHtml(`${match.opponent} ${match.score}`)}">${match.result}</span>
  `).join("") || '<span class="team-guide-muted">—</span>';
}

function getTeamResultLabel(result) {
  return { W: "勝", D: "和", L: "敗" }[result] || "—";
}

function formatTeamGuideMatchDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  });
}

function getTeamMatchHistoryMarkup(team) {
  const matches = team.form
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!matches.length) return '<p class="team-guide-muted">尚無已完成賽事</p>';

  return `
    <details class="team-history">
      <summary>逐場戰績（${team.played} 場）</summary>
      <div class="team-history-list">
        ${matches.map((match) => `
          <div class="team-history-row">
            <span class="history-result is-${match.result.toLowerCase()}">${getTeamResultLabel(match.result)}</span>
            <div>
              <strong>${escapeHtml(match.score)} vs ${escapeHtml(match.opponent)}</strong>
              <small>${escapeHtml(formatTeamGuideMatchDate(match.date))} · ${escapeHtml(match.stage)}</small>
            </div>
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

function getTeamComparisonMarkup(team, side) {
  const goalDifference = getGoalDifference(team);
  return `
    <article class="team-comparison ${side}">
      <div class="team-comparison-name">
        ${team.logo ? `<img src="${escapeHtml(team.logo)}" alt="" loading="lazy" />` : ""}
        <div><strong>${escapeHtml(team.name)}</strong><span>${team.wins} 勝 ${team.draws} 和 ${team.losses} 敗</span></div>
      </div>
      <div class="team-comparison-numbers">
        <span><small>進球</small><strong>${team.goalsFor}</strong></span>
        <span><small>失球</small><strong>${team.goalsAgainst}</strong></span>
        <span><small>淨勝</small><strong>${goalDifference > 0 ? "+" : ""}${goalDifference}</strong></span>
        <span><small>場均進球</small><strong>${team.played ? (team.goalsFor / team.played).toFixed(1) : "0.0"}</strong></span>
      </div>
      <div class="team-form" aria-label="${escapeHtml(`${team.name} 最近戰績`)}">${getFormMarkup(team.form)}</div>
      ${getTeamMatchHistoryMarkup(team)}
    </article>
  `;
}

function getStageProgressText(stage) {
  return `${stage.completed}/${stage.events.length}`;
}

function getStageDisplayLabel(stage) {
  if (!stage) return "尚未載入";
  if (stage.key === "final" && stage.completed === stage.events.length) return "賽事已完成";
  if (stage.key === "thirdPlace") return "決賽週";
  return `${stage.label}進行中`;
}

function renderTeamStageSummary(knockoutContext) {
  const { stageSummaries, currentStage, activeTeams } = knockoutContext;
  const stageRows = stageSummaries.map((stage) => `
    <span class="${currentStage?.key === stage.key || (currentStage?.key === "finalWeek" && ["thirdPlace", "final"].includes(stage.key)) ? "is-current" : ""}">
      <small>${escapeHtml(stage.label)}</small>
      <strong>${escapeHtml(getStageProgressText(stage))}</strong>
    </span>
  `).join("");
  const teamRows = Array.from(activeTeams.values())
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
    .map((team) => `
      <span class="survivor-chip">
        ${team.logo ? `<img src="${escapeHtml(team.logo)}" alt="" loading="lazy" />` : ""}
        ${escapeHtml(team.name)}
      </span>
    `).join("");

  teamGuideStageSummary.innerHTML = `
    <section class="team-stage-card">
      <span>目前階段</span>
      <strong>${escapeHtml(getStageDisplayLabel(currentStage))}</strong>
      <p>${currentStage ? `${currentStage.label} 已完成 ${getStageProgressText(currentStage)} 場` : "等待 ESPN 淘汰賽資料"}</p>
    </section>
    <section class="team-stage-card">
      <span>各階段進度</span>
      <div class="stage-progress-list">${stageRows || '<span class="team-guide-muted">尚無資料</span>'}</div>
    </section>
    <section class="team-stage-card survivors-card">
      <span>目前存活隊伍</span>
      <div class="survivor-list">${teamRows || '<span class="team-guide-muted">尚無資料</span>'}</div>
    </section>
  `;
}

function getBracketTeamMarkup(competitor, event) {
  const identity = getTeamIdentity(competitor);
  const isPlaceholder = isPlaceholderTeam(competitor);
  const score = event.status?.type?.completed ? competitor.score : "";
  const advanced = competitor.advance === true || competitor.winner === true;
  return `
    <div class="bracket-team ${isPlaceholder ? "is-placeholder" : ""} ${advanced ? "is-advanced" : ""}">
      <span>${escapeHtml(identity.name)}</span>
      <strong>${escapeHtml(score)}</strong>
    </div>
  `;
}

function renderTeamBracket(knockoutEntries) {
  const stageColumns = KNOCKOUT_STAGES
    .filter((stage) => stage.key !== "round32")
    .map((stage) => {
      const events = getStageEvents(knockoutEntries, stage.key);
      if (!events.length) return "";
      return `
        <section class="bracket-column">
          <h4>${escapeHtml(stage.label)}</h4>
          <div class="bracket-games">
            ${events.map((event) => {
              const competitors = event.competitions?.[0]?.competitors || [];
              const kickoff = new Date(event.date).toLocaleString("zh-TW", {
                month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
              });
              const score = calculateRegulationScore(event);
              return `
                <article class="bracket-game">
                  <div class="bracket-game-meta">${score ? `已賽 · ${score}` : kickoff}</div>
                  ${competitors.map((competitor) => getBracketTeamMarkup(competitor, event)).join("")}
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }).join("");
  teamGuideBracket.innerHTML = `<div class="bracket-board">${stageColumns}</div>`;
}

function renderTeamGuide() {
  if (!teamGuideEvents.length) {
    teamGuideStageSummary.innerHTML = "";
    teamGuideBracket.innerHTML = "";
    teamGuideSummary.innerHTML = "";
    teamGuideRanking.innerHTML = "";
    return;
  }
  const { knockoutEntries, knockoutContext, roundOf16Events, statsByTeam } = getTeamGuideData(teamGuideEvents);
  const completedRoundOf16Count = roundOf16Events.filter((event) => Boolean(calculateRegulationScore(event))).length;
  if (roundOf16Events.length !== 8 || statsByTeam.size !== 16) {
    teamGuideStatus.textContent = `目前 ESPN 僅辨識到 ${roundOf16Events.length} 場 16 強賽、${statsByTeam.size} 支隊伍，請稍後更新。`;
  } else {
    const loadedLabel = teamGuideLoadedAt?.toLocaleString("zh-TW", { hour12: false }) || "";
    teamGuideStatus.textContent = `已載入淘汰賽資料 · 16 強已賽 ${completedRoundOf16Count}/8 · 更新時間 ${loadedLabel}`;
  }
  renderTeamStageSummary(knockoutContext);
  renderTeamBracket(knockoutEntries);

  teamGuideSummary.innerHTML = roundOf16Events.map((event) => {
    const home = statsByTeam.get(getTeamIdentity(getEventTeam(event, "home")).id);
    const away = statsByTeam.get(getTeamIdentity(getEventTeam(event, "away")).id);
    const kickoff = new Date(event.date).toLocaleString("zh-TW", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const regulationScore = calculateRegulationScore(event);
    const status = event.competitions?.[0]?.status?.type || event.status?.type || {};
    const fixtureCompleted = status.completed && regulationScore;
    const fixtureStatus = fixtureCompleted
      ? `已賽 · 正規時間 ${regulationScore}`
      : `${status.state === "in" ? "進行中" : "未賽"} · ${kickoff}`;
    return `
      <section class="team-matchup">
        <div class="team-matchup-header">
          <span class="team-fixture-status ${fixtureCompleted ? "is-completed" : "is-scheduled"}">${escapeHtml(fixtureStatus)}</span>
          <strong>${escapeHtml(home.name)} VS ${escapeHtml(away.name)}</strong>
        </div>
        <div class="team-comparison-grid">
          ${getTeamComparisonMarkup(home, "home")}
          <span class="team-versus" aria-hidden="true">VS</span>
          ${getTeamComparisonMarkup(away, "away")}
        </div>
      </section>
    `;
  }).join("");

  const ranking = Array.from(statsByTeam.values()).sort((a, b) =>
    getTeamPoints(b) - getTeamPoints(a)
    || getGoalDifference(b) - getGoalDifference(a)
    || b.goalsFor - a.goalsFor
    || a.name.localeCompare(b.name, "zh-Hant")
  );
  teamGuideRanking.innerHTML = `
    <table class="team-ranking-table">
      <thead><tr><th>#</th><th>隊伍</th><th>賽</th><th>勝</th><th>和</th><th>敗</th><th>進球</th><th>失球</th><th>淨勝</th><th>零封</th><th>近況</th></tr></thead>
      <tbody>${ranking.map((team, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><span class="ranking-team">${team.logo ? `<img src="${escapeHtml(team.logo)}" alt="" loading="lazy" />` : ""}<strong>${escapeHtml(team.name)}</strong></span></td>
          <td>${team.played}</td><td>${team.wins}</td><td>${team.draws}</td><td>${team.losses}</td>
          <td>${team.goalsFor}</td><td>${team.goalsAgainst}</td>
          <td>${getGoalDifference(team) > 0 ? "+" : ""}${getGoalDifference(team)}</td>
          <td>${team.cleanSheets}</td><td><span class="team-form">${getFormMarkup(team.form)}</span></td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

async function refreshTeamGuide() {
  if (teamGuideLoading) return;
  teamGuideLoading = true;
  refreshTeamGuideBtn.disabled = true;
  refreshTeamGuideBtn.textContent = "更新中…";
  teamGuideStatus.textContent = "正在讀取 ESPN 本屆世界盃賽事…";
  try {
    const response = await fetch(`${ESPN_SCOREBOARD_URL}?limit=200&dates=${WORLD_CUP_TOURNAMENT_RANGE}`);
    if (!response.ok) throw new Error(`ESPN API 回應 ${response.status}`);
    const data = await response.json();
    teamGuideEvents = Array.isArray(data.events) ? data.events : [];
    teamGuideLoadedAt = new Date();
    renderTeamGuide();
  } catch (error) {
    console.error("無法載入 16 強戰力參考：", error);
    teamGuideStatus.textContent = `16 強資料載入失敗：${error.message}`;
  } finally {
    teamGuideLoading = false;
    refreshTeamGuideBtn.disabled = false;
    refreshTeamGuideBtn.textContent = "更新戰績";
  }
}

function normalizeEspnMatch(event) {
  const competition = event.competitions?.[0];
  const home = getCompetitor(competition, "home");
  const away = getCompetitor(competition, "away");
  if (!home || !away) return null;

  const homeName = localizeCountryName(home.team?.displayName || home.team?.shortDisplayName || "主隊");
  const awayName = localizeCountryName(away.team?.displayName || away.team?.shortDisplayName || "客隊");
  const kickoff = new Date(event.date);
  const label = `${homeName} VS ${awayName}`;
  const status = competition.status?.type || event.status?.type || {};

  return {
    id: String(event.id),
    label,
    homeName,
    awayName,
    homeCode: String(home.team?.abbreviation || home.team?.shortDisplayName || "").toUpperCase(),
    awayCode: String(away.team?.abbreviation || away.team?.shortDisplayName || "").toUpperCase(),
    date: toLocalDateValue(kickoff),
    displayTime: kickoff.toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    statusText: status.shortDetail || status.detail || "未開賽",
    statusState: status.state || "pre",
    completed: Boolean(status.completed),
    regulationScore: calculateRegulationScore(event),
  };
}

function populateMatchSelect(matches) {
  const currentValue = matchInput.value;
  const options = matches
    .map((match) => {
      const statusLabel = match.completed ? "已結束比賽" : match.statusState === "in" ? "進行中" : "未開賽";
      const scoreLabel = match.completed && match.regulationScore ? ` · 正規 ${match.regulationScore}` : "";
      const statusClass = match.completed ? "is-completed" : match.statusState === "in" ? "is-live" : "is-scheduled";
      return `<option class="${statusClass}" value="${escapeHtml(match.label)}" data-id="${escapeHtml(match.id)}">${escapeHtml(
        `${match.displayTime} · ${match.label}${scoreLabel} · ${statusLabel}`
      )}</option>`;
    })
    .join("");

  matchInput.innerHTML = `
    <option value="">選擇 ${escapeHtml(matchDateInput.value)} 賽事</option>
    ${options}
  `;

  matchInput.value = matches.some((match) => match.label === currentValue) ? currentValue : "";
  updateMatchMode();
}

function updateMatchMode() {
  const selectedOption = matchInput.selectedOptions?.[0];
  matchIdInput.value = selectedOption?.dataset.id || "";
  const selectedMatch = availableMatches.find((match) => match.id === matchIdInput.value);
  matchInput.classList.remove("is-completed", "is-live", "is-scheduled");
  if (selectedMatch) {
    matchInput.classList.add(selectedMatch.completed ? "is-completed" : selectedMatch.statusState === "in" ? "is-live" : "is-scheduled");
  }
  const hasMatch = Boolean(selectedMatch);
  homeScoreLabel.textContent = selectedMatch?.homeName || "A 隊";
  awayScoreLabel.textContent = selectedMatch?.awayName || "B 隊";
  scoreFields.disabled = !hasMatch;
  scoreHint.textContent = hasMatch ? `${homeScoreLabel.textContent} 對 ${awayScoreLabel.textContent}（正規時間）` : "請先選擇賽事，系統會帶入兩隊名稱。";
}

async function fetchWorldCupMatches(dateValue) {
  if (!dateValue) return [];
  const url = `${ESPN_SCOREBOARD_URL}?limit=100&dates=${getEspnRangeForLocalDate(dateValue)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`賽程 API 回應 ${response.status}`);
  const data = await response.json();
  return (data.events || [])
    .map(normalizeEspnMatch)
    .filter(Boolean)
    .filter((match) => match.date === dateValue)
    .sort((a, b) => `${a.date} ${a.displayTime}`.localeCompare(`${b.date} ${b.displayTime}`));
}

async function fetchMatchesForDates(dateValues) {
  const uniqueDates = Array.from(new Set(dateValues.filter(Boolean)));
  if (!uniqueDates.length) return [];
  const groups = await Promise.allSettled(uniqueDates.map((date) => fetchWorldCupMatches(date)));
  const matches = groups.filter((group) => group.status === "fulfilled").flatMap((group) => group.value);
  const failedDates = uniqueDates.filter((date, index) => groups[index].status === "rejected");
  if (failedDates.length) {
    try {
      matches.push(...await fetchOpenLigaFallbackMatches(failedDates));
    } catch (error) {
      console.error("OpenLigaDB 備援也無法取得：", error);
    }
  }
  return Array.from(new Map(matches.map((match) => [match.id, match])).values());
}

async function fetchOpenLigaFallbackMatches(dateValues) {
  const response = await fetch(OPENLIGADB_URL);
  if (!response.ok) throw new Error(`OpenLigaDB 回應 ${response.status}`);
  const data = await response.json();
  const wantedDates = new Set(dateValues);
  const resultByFixture = new Map();
  (data || []).filter((match) => match.matchIsFinished && match.matchDateTimeUTC).forEach((match) => {
    const regularTime = (match.matchResults || []).find((result) => Number(result.resultTypeID) === 2);
    const date = toLocalDateValue(new Date(match.matchDateTimeUTC));
    if (!regularTime || !wantedDates.has(date)) return;
    resultByFixture.set([
      date,
      normalizeTeamCode(match.team1?.shortName),
      normalizeTeamCode(match.team2?.shortName),
    ].join("|"), `${Number(regularTime.pointsTeam1)}-${Number(regularTime.pointsTeam2)}`);
  });

  return records.flatMap((record) => {
    const date = record.matchDate || record.date;
    const key = [date, normalizeTeamCode(record.homeCode), normalizeTeamCode(record.awayCode)].join("|");
    const regulationScore = resultByFixture.get(key);
    return record.result === "pending" && record.matchId && regulationScore
      ? [{ id: String(record.matchId), label: record.match, date, completed: true, regulationScore, provider: "OpenLigaDB" }]
      : [];
  });
}

function getPendingRecordDates() {
  return records.filter((record) => record.result === "pending").map((record) => record.matchDate || record.date);
}

function mergeMatches(...groups) {
  return Array.from(new Map(groups.flat().map((match) => [match.id, match])).values());
}

async function refreshWorldCupData({ saveAfterUpdate = true } = {}) {
  const selectedDate = matchDateInput.value;
  if (!selectedDate) {
    matchInput.innerHTML = '<option value="">請先選擇賽事日期</option>';
    availableMatches = [];
    updateMatchMode();
    return;
  }
  refreshMatchesBtn.disabled = true;
  refreshMatchesBtn.textContent = "更新中...";

  try {
    availableMatches = await fetchWorldCupMatches(selectedDate);
    populateMatchSelect(availableMatches);
    const pendingMatches = await fetchMatchesForDates(getPendingRecordDates());
    const settlementMatches = mergeMatches(availableMatches, pendingMatches);
    const aligned = reconcileRecordsWithMatches(settlementMatches);
    const settled = applyMatchResultsToRecords(settlementMatches);
    render();
    if (saveAfterUpdate) {
      if (aligned.length) await saveRecords(aligned, "schedule_sync");
      if (settled.length) await saveRecords(settled, "foreground_settle");
    }
    syncHint.textContent = aligned.length
      ? "已更新賽程，並自動對齊舊紀錄的場次、名稱與日期。"
      : `已更新 ${selectedDate} 賽程/賽果；自動判定只採正規時間，不含延長賽與 PK。`;
  } catch (error) {
    console.error("無法更新世界盃賽程/賽果：", error);
    matchInput.innerHTML = `<option value="">${escapeHtml(selectedDate)} 賽程載入失敗，請稍後重試</option>`;
    updateMatchMode();
    syncHint.textContent = `賽程/賽果更新失敗，請稍後重試：${error.message}`;
  } finally {
    refreshMatchesBtn.disabled = false;
    refreshMatchesBtn.textContent = "更新賽程/賽果";
  }
}

function applyMatchResultsToRecords(matches) {
  const resultsById = new Map(matches.filter((match) => match.completed && match.regulationScore).map((match) => [match.id, match]));
  const changedRecords = [];

  records = records.map((record) => {
    const match = resultsById.get(String(record.matchId || ""));
    const predictedScore = Number.isInteger(record.predictedHome) && Number.isInteger(record.predictedAway)
      ? `${record.predictedHome}-${record.predictedAway}`
      : parseScore(record.note);
    if (!match || !predictedScore || record.result !== "pending") return record;

    const result = predictedScore === match.regulationScore ? "win" : "loss";
    const settledRecord = {
      ...record,
      result,
      settledScore: match.regulationScore,
      resultProvider: match.provider || "ESPN",
      settledAt: new Date().toISOString(),
    };
    changedRecords.push(settledRecord);
    return settledRecord;
  });

  return changedRecords;
}

function buildPieSlices(items) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0;
  const colors = ["#111111", "#2f6f73", "#b64e35", "#d3a21f", "#6f5ca8", "#5f7f3d", "#8b4c68"];

  return items.map((item, index) => {
    const start = cursor;
    const size = total ? (item.count / total) * 100 : 0;
    cursor += size;
    return {
      ...item,
      color: colors[index % colors.length],
      start,
      end: cursor,
      percentage: total ? Math.round((item.count / total) * 100) : 0,
    };
  });
}

function getPieChartMarkup(items) {
  const slices = buildPieSlices(items);
  const gradient = slices.map((slice) => `${slice.color} ${slice.start}% ${slice.end}%`).join(", ");
  return `
    <div class="pie-layout">
      <div class="pie-chart" style="background: conic-gradient(${gradient});" aria-hidden="true"></div>
      <div class="pie-legend">
        ${slices.map((slice) => `
          <div class="legend-row">
            <span class="legend-swatch" style="background:${slice.color}"></span>
            <span>${escapeHtml(slice.label)}</span>
            <strong>${slice.count} 筆 · ${slice.percentage}%</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderMatchBreakdown(matchItems) {
  if (!matchItems.length) {
    matchBreakdown.innerHTML = '<p class="empty">還沒有可分析的下注資料</p>';
    return;
  }

  matchBreakdown.innerHTML = matchItems
    .map((match) => {
      const scoreItems = getGroupedBetStats(match.records, (item) => normalizeScore(item.note)).sort(
        (a, b) => b.count - a.count || b.amount - a.amount
      );
      const scoreGroups = scoreItems.map((score) => {
        const memberRows = score.records
          .slice()
          .sort((a, b) => String(a.member).localeCompare(String(b.member), "zh-Hant") || Number(b.odds) - Number(a.odds))
          .map((record) => `
              <tr>
                <td>${escapeHtml(record.member || "未填寫")}</td>
                <td>${Number(record.odds || 0).toFixed(2)}</td>
                <td>${formatCurrency(record.amount)}</td>
              </tr>
            `)
          .join("");

        return `
          <section class="score-detail-group">
            <div class="score-detail-header">
              <h4>${escapeHtml(score.label)}</h4>
              <span>${score.count} 筆 · ${formatCurrency(score.amount)} · 平均賠率 ${score.averageOdds.toFixed(2)}</span>
            </div>
            <div class="compact-table-wrap">
              <table class="compact-table">
                <thead><tr><th>成員</th><th>賠率</th><th>金額</th></tr></thead>
                <tbody>${memberRows}</tbody>
              </table>
            </div>
          </section>
        `;
      }).join("");

      return `
        <article class="match-card">
          <div class="match-card-header">
            <div>
              <h3>${escapeHtml(match.label)}</h3>
              <p>${escapeHtml(match.records[0]?.matchDate || "比賽日期未填")} · ${match.count} 筆 · ${match.memberCount} 人 · ${formatCurrency(match.amount)} · 平均賠率 ${match.averageOdds.toFixed(2)}</p>
            </div>
          </div>
          <div class="match-score-chart">
            ${getPieChartMarkup(scoreItems)}
          </div>
          <div class="score-detail-groups">${scoreGroups}</div>
        </article>
      `;
    })
    .join("");
}

function renderVisualStats(items) {
  const byMatch = getGroupedBetStats(
    items,
    (item) => getRecordMatchKey(item)
  )
    .map((entry) => ({ ...entry, label: entry.records[0]?.match || "未填寫" }))
    .sort((a, b) => String(b.records[0]?.matchDate).localeCompare(String(a.records[0]?.matchDate)) || b.count - a.count);
  renderMatchBreakdown(byMatch);
}

function renderSummary() {
  const summary = calculateSummary(records);
  const items = [
    { label: "總筆數", value: summary.totalCount },
    { label: "下注總額", value: formatCurrency(summary.totalAmount) },
    { label: "目前淨輸贏", value: formatCurrency(summary.netAmount), tone: getMoneyToneClass(summary.netAmount) },
    { label: "未開獎", value: summary.pendingCount },
    { label: "已開獎", value: summary.completedCount },
  ];

  summaryStats.innerHTML = items
    .map(
      (item) => `
        <div class="summary-item">
          <span>${item.label}</span>
          <strong class="${item.tone || ""}">${item.value}</strong>
        </div>
      `
    )
    .join("");
}

function renderStatList(target, items) {
  target.innerHTML = items.length
    ? items
        .map(
          (entry) => `
            <div class="stat-row">
              <span>${escapeHtml(entry.label)}</span>
              <strong>${entry.count} 筆 · ${formatCurrency(entry.amount)}</strong>
            </div>
          `
        )
        .join("")
    : '<p class="empty">還沒有資料</p>';
}

function getMemberFinanceStats(items) {
  const grouped = new Map();

  items.forEach((item) => {
    const label = MEMBER_NAMES_BY_UID[item.memberUid] || item.member || "未填寫";
    const memberKey = item.memberUid || label;
    const current = grouped.get(memberKey) || {
      label,
      count: 0,
      records: [],
    };
    current.count += 1;
    current.records.push(item);
    grouped.set(memberKey, current);
  });

  return Array.from(grouped.values()).map((entry) => {
    const settlement = getSettlementStats(entry.records);
    const netAmount = roundMoney(settlement.payout - settlement.settledAmount);
    return {
      ...entry,
      ...settlement,
      netAmount,
    };
  });
}

function renderMemberFinanceList(target, items) {
  target.innerHTML = items.length
    ? items
        .map(
          (entry) => `
            <div class="member-money-row">
              <div class="member-money-main">
                <strong>${escapeHtml(entry.label)}</strong>
                <span>${entry.count} 筆 · 總投注 ${formatCurrency(entry.totalAmount)}</span>
              </div>
              <div class="member-money-grid">
                <span>已開獎本金 <strong>${formatCurrency(entry.settledAmount)}</strong></span>
                <span>未開獎 <strong>${formatCurrency(entry.pendingAmount)}</strong></span>
                <span>派彩 <strong>${formatCurrency(entry.payout)}</strong></span>
                <span>淨輸贏 <strong class="${getMoneyToneClass(entry.netAmount)}">${formatCurrency(entry.netAmount)}</strong></span>
              </div>
            </div>
          `
        )
        .join("")
    : '<p class="empty">還沒有資料</p>';
}

function renderStatsPanels(items) {
  const byMember = getMemberFinanceStats(items).sort((a, b) => b.netAmount - a.netAmount || b.totalAmount - a.totalAmount);
  renderMemberFinanceList(memberStats, byMember);
}

function renderOverallMemberList(items) {
  if (!items.length) {
    overallMemberStats.innerHTML = '<p class="empty">還沒有資料</p>';
    return;
  }

  const columnCount = items.length;
  const memberHeaders = items.map((entry, index) => `
    <div class="overall-matrix-cell member-matrix-header member-color-${index % 6}">
      <span>${String.fromCharCode(65 + index)} 成員 · ${entry.count} 筆</span>
      <strong>${escapeHtml(entry.label)}</strong>
    </div>
  `).join("");
  const metricRow = (label, valueGetter, toneGetter = () => "") => `
    <div class="overall-matrix-row" style="--member-count:${columnCount}">
      <strong class="overall-metric-label">${label}</strong>
      ${items.map((entry) => `<div class="overall-matrix-cell"><strong class="${toneGetter(entry)}">${valueGetter(entry)}</strong></div>`).join("")}
    </div>
  `;

  overallMemberStats.innerHTML = `
    <div class="overall-matrix-wrap">
      <div class="overall-matrix" style="--member-count:${columnCount}">
        <div class="overall-matrix-row overall-matrix-head" style="--member-count:${columnCount}">
          <span class="overall-metric-label">項目</span>${memberHeaders}
        </div>
        ${metricRow("所有投注額", (entry) => formatCurrency(entry.totalAmount))}
        ${metricRow("已派彩", (entry) => formatCurrency(entry.payout), (entry) => entry.payout > 0 ? "is-positive" : "")}
        ${metricRow("淨輸贏", (entry) => formatCurrency(entry.netAmount), (entry) => getMoneyToneClass(entry.netAmount))}
      </div>
    </div>
  `;
}

function renderOverallStats() {
  const currentUid = auth?.currentUser?.uid;
  const currentName = getMemberDisplayName(auth?.currentUser);
  const byMember = getMemberFinanceStats(records).sort((a, b) => {
    const aIsCurrent = a.label === currentName || a.records.some((record) => record.memberUid === currentUid);
    const bIsCurrent = b.label === currentName || b.records.some((record) => record.memberUid === currentUid);
    return Number(bIsCurrent) - Number(aIsCurrent) || b.totalAmount - a.totalAmount || a.label.localeCompare(b.label, "zh-Hant");
  });
  renderOverallMemberList(byMember);
}

function populateAnalysisFilters() {
  const currentDate = analysisDateFilter.value;
  const currentMatch = analysisMatchFilter.value;
  const dates = Array.from(new Set(records.map((item) => item.matchDate).filter(Boolean))).sort().reverse();
  const matches = getMatchFilterOptions();

  analysisDateFilter.innerHTML = '<option value="all">所有比賽日期</option>' + dates.map((date) => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`).join("");
  analysisMatchFilter.innerHTML = '<option value="all">所有場次</option>' + matches.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("");
  analysisDateFilter.value = dates.includes(currentDate) ? currentDate : "all";
  analysisMatchFilter.value = matches.some(([key]) => key === currentMatch) ? currentMatch : "all";
}

function getAnalysisRecords() {
  return records.filter((item) =>
    (analysisDateFilter.value === "all" || item.matchDate === analysisDateFilter.value) &&
    (analysisMatchFilter.value === "all" || getRecordMatchKey(item) === analysisMatchFilter.value)
  );
}

function populateStatsFilters() {
  const currentDate = statsDateFilter.value;
  const currentMatch = statsMatchFilter.value;
  const currentMember = statsMemberFilter.value;
  const dates = Array.from(new Set(records.map((item) => item.matchDate).filter(Boolean))).sort().reverse();
  const matches = getMatchFilterOptions();
  const members = Array.from(new Set(records.map((item) => item.member).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hant"));

  const today = toLocalDateValue();
  const upcomingDates = dates.filter((date) => date >= today);
  const newestUpcomingDate = upcomingDates[0] || dates[0] || "all";
  statsDateFilter.innerHTML = '<option value="all">所有比賽日期</option>' + dates.map((date) => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`).join("");
  statsMatchFilter.innerHTML = '<option value="all">所有場次</option>' + matches.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("");
  statsMemberFilter.innerHTML = '<option value="all">所有成員</option>' + members.map((member) => `<option value="${escapeHtml(member)}">${escapeHtml(member)}</option>`).join("");
  const shouldFollowNewest = !statsDateInitialized || currentDate === latestUpcomingStatsDate || !dates.includes(currentDate);
  statsDateFilter.value = shouldFollowNewest ? newestUpcomingDate : currentDate;
  statsDateInitialized = true;
  latestUpcomingStatsDate = newestUpcomingDate;
  statsMatchFilter.value = matches.some(([key]) => key === currentMatch) ? currentMatch : "all";
  statsMemberFilter.value = members.includes(currentMember) ? currentMember : "all";
}

function getStatsRecords() {
  return records.filter((item) =>
    (statsDateFilter.value === "all" || item.matchDate === statsDateFilter.value) &&
    (statsMatchFilter.value === "all" || getRecordMatchKey(item) === statsMatchFilter.value) &&
    (statsMemberFilter.value === "all" || item.member === statsMemberFilter.value)
  );
}

function renderFilteredSummary(items) {
  const settlement = getSettlementStats(items);
  const netAmount = roundMoney(settlement.payout - settlement.settledAmount);
  const dates = items.map((item) => item.matchDate).filter(Boolean).sort();
  const dateRange = dates.length ? dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} ～ ${dates.at(-1)}` : "沒有資料";
  statsRangeLabel.textContent = `統計區間：${dateRange} · ${items.length} 筆紀錄`;
  filteredSummary.innerHTML = [
    ["紀錄筆數", items.length, ""],
    ["投注總額", formatCurrency(settlement.totalAmount), ""],
    ["已開獎本金", formatCurrency(settlement.settledAmount), ""],
    ["未開獎", formatCurrency(settlement.pendingAmount), ""],
    ["派彩", formatCurrency(settlement.payout), ""],
    ["淨輸贏", formatCurrency(netAmount), getMoneyToneClass(netAmount)],
  ].map(([label, value, tone]) => `<div class="summary-item"><span>${label}</span><strong class="${tone}">${value}</strong></div>`).join("");
}

function initializeSettlementRange() {
  if (settlementRangeInitialized) return;
  const dates = records
    .filter((item) => !item.settlementId && (item.result === "win" || item.result === "loss"))
    .map(getRecordCreatedDate)
    .filter(Boolean)
    .sort();
  settlementStartInput.value = dates[0] || toLocalDateValue();
  settlementEndInput.value = dates.at(-1) || toLocalDateValue();
  settlementRangeInitialized = true;
}

function renderSettlementMembers(target, members) {
  target.innerHTML = members.length
    ? members
        .sort((a, b) => b.netAmount - a.netAmount || a.member.localeCompare(b.member, "zh-Hant"))
        .map((member) => {
          const isSelf = member.memberUid === ADMIN_UID;
          return `
            <div class="member-money-row">
              <div class="member-money-main">
                <strong>${escapeHtml(member.member)}</strong>
                <span>${member.count} 筆</span>
              </div>
              <div class="settlement-member-result">
                <span>${isSelf ? "帳戶持有人 · 不列入成員合計" : "淨輸贏"}</span>
                <strong class="${getMoneyToneClass(member.netAmount)}">${formatSignedCurrency(member.netAmount)}</strong>
              </div>
            </div>
          `;
        })
        .join("")
    : '<p class="empty">這個日期區間沒有可結算的單據</p>';
}

function formatSettlementDateTime(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "同步中";
}

function renderSettlementHistory() {
  settlementHistory.innerHTML = settlements.length
    ? settlements
        .slice()
        .sort((a, b) => {
          const aTime = a.settledAt?.toMillis?.() || new Date(a.settledAt || 0).getTime();
          const bTime = b.settledAt?.toMillis?.() || new Date(b.settledAt || 0).getTime();
          return bTime - aTime;
        })
        .map((settlement) => {
          const totals = settlement.totals || {};
          const memberRows = (settlement.members || [])
            .map((member) => {
              const isSelf = member.memberUid === ADMIN_UID;
              const label = `${member.member}${isSelf ? " · 帳戶持有人" : ""}`;
              return `<div><span>${escapeHtml(label)}</span><strong class="${getMoneyToneClass(member.netAmount)}">${formatSignedCurrency(member.netAmount)}</strong></div>`;
            })
            .join("");
          return `
            <article class="settlement-node">
              <div class="settlement-node-header">
                <div>
                  <span class="settlement-node-label">結算區間</span>
                  <h3>${escapeHtml(settlement.periodStart)} ～ ${escapeHtml(settlement.periodEnd)}</h3>
                </div>
                <p>${formatSettlementDateTime(settlement.settledAt)} · ${Number(settlement.recordCount || 0)} 筆</p>
              </div>
              <div class="settlement-node-totals">
                <span>正數合計 <strong class="is-positive">${formatSignedCurrency(totals.payable)}</strong></span>
                <span>負數合計 <strong class="is-negative">${formatSignedCurrency(-totals.receivable)}</strong></span>
                <span>結算淨額 <strong class="${getMoneyToneClass(totals.netAmount)}">${formatSignedCurrency(totals.netAmount)}</strong></span>
              </div>
              <div class="settlement-node-members">${memberRows}</div>
            </article>
          `;
        })
        .join("")
    : '<p class="empty">尚未建立結算節點</p>';
}

function renderSettlementPage() {
  initializeSettlementRange();
  const startDate = settlementStartInput.value;
  const endDate = settlementEndInput.value;
  const validRange = Boolean(startDate && endDate && startDate <= endDate);
  const candidates = validRange ? getSettlementCandidates(startDate, endDate) : [];
  const members = getMemberSettlementSummary(candidates);
  const totals = getSettlementTotals(candidates);
  const pendingCount = validRange
    ? records.filter((item) => {
        const createdDate = getRecordCreatedDate(item);
        return !item.settlementId && item.result === "pending" && createdDate >= startDate && createdDate <= endDate;
      }).length
    : 0;

  settlementRangeHint.textContent = validRange
    ? `依填表日期選取；${pendingCount} 筆未開獎單不會納入本次結算。`
    : "結束日期不可早於起始日期。";
  settlementPreview.innerHTML = [
    ["可結算單據", `${candidates.length} 筆`, ""],
    ["正數合計", formatSignedCurrency(totals.payable), totals.payable ? "is-positive" : ""],
    ["負數合計", formatSignedCurrency(-totals.receivable), totals.receivable ? "is-negative" : ""],
    ["結算淨額", formatSignedCurrency(totals.netAmount), getMoneyToneClass(totals.netAmount)],
  ].map(([label, value, tone]) => `<div class="summary-item"><span>${label}</span><strong class="${tone}">${value}</strong></div>`).join("");
  renderSettlementMembers(settlementMemberStats, members);
  renderSettlementHistory();

  const isAdmin = isCurrentUserAdmin();
  createSettlementBtn.hidden = !isAdmin;
  createSettlementBtn.disabled = !validRange || !candidates.length;
  createSettlementBtn.title = isAdmin ? "" : "只有管理員可以建立結算節點";
}

function getAuditActionLabel(action) {
  return {
    create: "新增投注",
    delete: "刪除投注",
    schedule_sync: "場次對齊",
    foreground_settle: "前端自動判定",
    background_settle: "背景自動判定",
    legacy_migration: "舊資料遷移",
    create_settlement: "建立款項結算",
    admin_correction: "管理員修正",
  }[action] || action || "未知操作";
}

function populateAdminRecordSelect() {
  const currentValue = adminRecordSelect.value;
  const editableRecords = records.filter((record) => !record.settlementId);
  const options = editableRecords
    .slice()
    .sort((a, b) => String(b.createdAt || b.createdDate).localeCompare(String(a.createdAt || a.createdDate)))
    .map((record) => `<option value="${escapeHtml(record.id)}">${escapeHtml(
      `${record.createdDate || "日期未填"} · ${record.member} · ${record.match} · ${record.note}`
    )}</option>`)
    .join("");
  adminRecordSelect.innerHTML = '<option value="">選擇要修正的投注</option>' + options;
  adminRecordSelect.value = editableRecords.some((record) => record.id === currentValue) ? currentValue : "";
}

function renderAdminPage() {
  if (!isCurrentUserAdmin()) return;
  const pendingCount = records.filter((record) => record.result === "pending").length;
  const latestBackground = auditLogs.find((log) => log.action === "background_settle");
  adminSystemSummary.innerHTML = [
    ["投注文件", `${records.length} 筆`],
    ["待判定", `${pendingCount} 筆`],
    ["已載入異動", `${auditLogs.length} 筆`],
    ["最近背景判定", latestBackground ? formatSettlementDateTime(latestBackground.occurredAt) : "尚無異動"],
  ].map(([label, value]) => `<div class="summary-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");

  adminMaintenanceStatus.innerHTML = maintenanceRuns.length
    ? maintenanceRuns.map((run) => `
        <div class="admin-status-row">
          <div><strong>${escapeHtml(run.label || run.type || run.id)}</strong><span>${formatSettlementDateTime(run.completedAt)}</span></div>
          <span>${escapeHtml(run.summary || "執行完成")}</span>
        </div>
      `).join("")
    : '<p class="empty">排程狀態會在下一次背景工作完成後顯示</p>';

  adminAuditLogs.innerHTML = auditLogs.length
    ? auditLogs.map((log) => `
        <div class="admin-audit-row">
          <div><strong>${escapeHtml(getAuditActionLabel(log.action))}</strong><span>${escapeHtml(log.actorName || log.actorUid || "系統")}</span></div>
          <div><span>${escapeHtml(log.recordId || log.settlementId || "—")}</span><time>${formatSettlementDateTime(log.occurredAt)}</time></div>
        </div>
      `).join("")
    : '<p class="empty">尚無異動紀錄</p>';
  populateAdminRecordSelect();
}

function getCombinedPersonalRecords() {
  const legacy = personalHistoryRecords.map((record) => ({
    ...record,
    sourceGroup: "legacy",
    sourceLabel: "網站建立前",
    payout: Number(record.payout || 0),
    netAmount: Number(record.netAmount || 0),
  }));
  const current = records
    .filter((record) => record.memberUid === ADMIN_UID || (!record.memberUid && record.member === "Wei"))
    .map((record) => {
      const settled = record.result === "win" || record.result === "loss";
      const payout = settled ? getRecordPayout(record) : 0;
      return {
        ...record,
        id: `current:${record.id}`,
        sourceGroup: "current",
        sourceLabel: "目前網站",
        betType: "correct_score",
        selection: normalizeScore(record.note),
        actualScore: record.settledScore || "",
        payout,
        netAmount: settled ? roundMoney(payout - Number(record.amount || 0)) : 0,
      };
    });
  return [...legacy, ...current];
}

function getPersonalHistoryStats(items) {
  return items.reduce((stats, item) => {
    const amount = Number(item.amount || 0);
    stats.count += 1;
    stats.totalAmount = roundMoney(stats.totalAmount + amount);
    if (item.result === "win" || item.result === "loss") {
      stats.settledCount += 1;
      stats.payout = roundMoney(stats.payout + Number(item.payout || 0));
      stats.netAmount = roundMoney(stats.netAmount + Number(item.netAmount || 0));
      if (item.result === "win") stats.winCount += 1;
    } else {
      stats.pendingCount += 1;
    }
    if (item.betType === "correct_score") stats.correctScoreCount += 1;
    if (item.betType === "match_winner") stats.matchWinnerCount += 1;
    return stats;
  }, {
    count: 0, totalAmount: 0, settledCount: 0, pendingCount: 0,
    payout: 0, netAmount: 0, winCount: 0, correctScoreCount: 0, matchWinnerCount: 0,
  });
}

function getPersonalFixtureStats(items) {
  const fixtures = new Map();
  items
    .filter((item) => item.betType === "correct_score" && (item.result === "win" || item.result === "loss"))
    .forEach((item) => {
      const matchKey = normalizeMatchKey(item.match);
      const fixtureKey = `${item.matchDate || "unknown-date"}::${matchKey || item.matchId || item.id}`;
      fixtures.set(fixtureKey, (fixtures.get(fixtureKey) || false) || item.result === "win");
    });

  const won = [...fixtures.values()].filter(Boolean).length;
  return { total: fixtures.size, won };
}

function getFilteredPersonalHistory() {
  return getCombinedPersonalRecords().filter((record) =>
    (personalSourceFilter.value === "all" || record.sourceGroup === personalSourceFilter.value)
    && (personalTypeFilter.value === "all" || record.betType === personalTypeFilter.value)
  );
}

function getPersonalBreakdownRow(label, items) {
  const stats = getPersonalHistoryStats(items);
  return `<div class="personal-breakdown-row"><span>${escapeHtml(label)} · ${stats.count} 筆</span><strong class="${getMoneyToneClass(stats.netAmount)}">${formatSignedCurrency(stats.netAmount)}</strong></div>`;
}

function renderPersonalHistory() {
  if (!isCurrentUserAdmin()) return;
  const allItems = getCombinedPersonalRecords();
  const items = getFilteredPersonalHistory().sort((a, b) =>
    String(b.matchDate || "").localeCompare(String(a.matchDate || ""))
    || String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );
  const stats = getPersonalHistoryStats(items);
  const fixtureStats = getPersonalFixtureStats(items);
  const fixtureHitRate = fixtureStats.total
    ? `${fixtureStats.won} / ${fixtureStats.total} 場（${((fixtureStats.won / fixtureStats.total) * 100).toFixed(1)}%）`
    : "—";

  personalHistorySummary.innerHTML = [
    ["投注筆數", `${stats.count} 筆`, ""],
    ["投注金額", formatCurrency(stats.totalAmount), ""],
    ["總派彩", formatCurrency(stats.payout), ""],
    ["淨輸贏", formatSignedCurrency(stats.netAmount), getMoneyToneClass(stats.netAmount)],
    ["場次命中率", fixtureHitRate, ""],
    ["待開獎", `${stats.pendingCount} 筆`, ""],
  ].map(([label, value, tone]) => `<div class="summary-item"><span>${escapeHtml(label)}</span><strong class="${tone}">${escapeHtml(value)}</strong></div>`).join("");

  personalSourceBreakdown.innerHTML = [
    getPersonalBreakdownRow("網站建立前", allItems.filter((item) => item.sourceGroup === "legacy")),
    getPersonalBreakdownRow("目前網站", allItems.filter((item) => item.sourceGroup === "current")),
  ].join("");
  personalPerformanceBreakdown.innerHTML = [
    getPersonalBreakdownRow("正確比分", items.filter((item) => item.betType === "correct_score")),
    getPersonalBreakdownRow("全場獨贏", items.filter((item) => item.betType === "match_winner")),
  ].join("");

  const dates = items.map((item) => item.matchDate).filter(Boolean).sort();
  personalHistoryRange.textContent = dates.length
    ? `${dates[0]} ～ ${dates.at(-1)} · ${items.length} 筆`
    : "尚無資料";
  personalHistoryBody.innerHTML = items.length
    ? items.map((item) => `
        <tr>
          <td>${escapeHtml(item.sourceLabel)}</td>
          <td>${escapeHtml(item.matchDate || "—")}</td>
          <td>${escapeHtml(item.match || "—")}</td>
          <td>${item.betType === "match_winner" ? "全場獨贏" : "正確比分"}</td>
          <td>${escapeHtml(item.selection || item.note || "—")}</td>
          <td>${Number(item.odds || 0).toFixed(2)}</td>
          <td>${formatCurrency(item.amount)}</td>
          <td><span class="badge ${escapeHtml(item.result)}">${getResultLabel(item.result)}</span></td>
          <td class="${getMoneyToneClass(item.netAmount)}">${item.result === "pending" ? "—" : formatSignedCurrency(item.netAmount)}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="9" class="empty">這個篩選條件沒有個人投注紀錄</td></tr>';
}

function renderRecords() {
  const searchText = searchInput.value.trim().toLowerCase();
  const memberValue = filterMember.value;
  const resultValue = filterResult.value;

  const filtered = records
    .filter((item) => {
      const member = String(item.member || "");
      const match = String(item.match || "");
      return (
        (member.toLowerCase().includes(searchText) || match.toLowerCase().includes(searchText)) &&
        (memberValue === "all" || member === memberValue) &&
        (resultValue === "all" || item.result === resultValue)
      );
    })
    .sort((a, b) => String(b.createdAt || b.createdDate).localeCompare(String(a.createdAt || a.createdDate)));

  recordsToggleSummary.textContent = `展開紀錄（${filtered.length} 筆）`;

  if (!filtered.length) {
    recordsBody.innerHTML = '<tr><td colspan="9" class="empty">找不到符合條件的紀錄</td></tr>';
    return;
  }

  recordsBody.innerHTML = filtered
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.member)}</td>
          <td><span class="badge ${escapeHtml(item.result)}">${getResultLabel(item.result)}</span></td>
          <td>${escapeHtml(item.note || "—")}</td>
          <td>${escapeHtml(item.match)}</td>
          <td>${Number(item.odds || 0).toFixed(2)}</td>
          <td>${formatCurrency(item.amount)}</td>
          <td>${escapeHtml(item.matchDate || "—")}</td>
          <td>${escapeHtml(item.createdDate || "—")}</td>
          <td>${isCurrentUserAdmin() ? `<button class="delete-button" data-id="${escapeHtml(item.id)}" type="button">刪除</button>` : ""}</td>
        </tr>
      `
    )
    .join("");
}

function populateMemberFilter() {
  const members = Array.from(new Set(records.map((item) => item.member).filter(Boolean))).sort();
  const currentValue = filterMember.value;
  filterMember.innerHTML =
    '<option value="all">所有成員</option>' +
    members.map((member) => `<option value="${escapeHtml(member)}">${escapeHtml(member)}</option>`).join("");
  filterMember.value = members.includes(currentValue) ? currentValue : "all";
}

function render() {
  renderSummary();
  renderOverallStats();
  populateMemberFilter();
  populateAnalysisFilters();
  populateStatsFilters();
  const analysisRecords = getAnalysisRecords();
  const statsRecords = getStatsRecords();
  renderVisualStats(analysisRecords);
  renderStatsPanels(statsRecords);
  renderFilteredSummary(statsRecords);
  renderSettlementPage();
  renderRecords();
  renderAdminPage();
  renderPersonalHistory();
}

function setActivePage(pageName, { updateHash = true } = {}) {
  const allowedPages = ["entry", "records", "overview", "analysis", "stats", "settlements", "team-guide"];
  if (isCurrentUserAdmin()) allowedPages.push("admin", "personal-history");
  const validPage = allowedPages.includes(pageName) ? pageName : "entry";
  const pageLabels = {
    entry: "01　新增紀錄",
    records: "02　紀錄明細",
    overview: "03　總覽",
    analysis: "04　比分分析",
    stats: "05　分類統計",
    settlements: "06　款項結算",
    "team-guide": "07　淘汰賽戰力參考",
    admin: "08　管理員中心",
    "personal-history": "09　個人歷史總覽",
  };
  pageViews.forEach((view) => {
    view.hidden = view.dataset.page !== validPage;
  });
  pageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pageTarget === validPage);
  });
  pageMenu.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  currentPageLabel.textContent = pageLabels[validPage];
  menuToggle.setAttribute("aria-label", `開啟頁面選單，目前位於${pageLabels[validPage]}`);
  if (updateHash) history.replaceState(null, "", validPage === "entry" ? "#entry" : `#${validPage}`);
  if (validPage === "team-guide" && !teamGuideEvents.length) refreshTeamGuide();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateAuthUI(user = auth?.currentUser) {
  const isLoggedIn = Boolean(user);
  authStatus.textContent = isLoggedIn ? getMemberDisplayName(user) : "未登入";
  authStatus.classList.toggle("is-online", isLoggedIn);
  googleLoginBtn.hidden = isLoggedIn;
  logoutBtn.hidden = !isLoggedIn;
  memberInput.value = isLoggedIn ? getMemberDisplayName(user) : "";
  adminMenuButton.hidden = user?.uid !== ADMIN_UID;
  personalHistoryMenuButton.hidden = user?.uid !== ADMIN_UID;
  submitButton.disabled = !isLoggedIn;
  submitButton.title = isLoggedIn ? "" : "請先使用 Google 登入";
  syncHint.textContent = isLoggedIn
    ? "已連接共享雲端資料；所有登入成員會看到相同紀錄。"
    : "未登入時，資料只會儲存在這台裝置。";
  if (user?.uid !== ADMIN_UID && ["#admin", "#personal-history"].includes(location.hash)) setActivePage("entry");
}

function startAdminSync() {
  stopAuditSync?.();
  stopMaintenanceSync?.();
  stopPersonalHistorySync?.();
  stopAuditSync = null;
  stopMaintenanceSync = null;
  stopPersonalHistorySync = null;
  auditLogs = [];
  maintenanceRuns = [];
  personalHistoryRecords = [];
  if (!isCurrentUserAdmin() || !firestore) return;

  stopAuditSync = firestore.collection("auditLogs").orderBy("occurredAt", "desc").limit(100).onSnapshot(
    (snapshot) => {
      auditLogs = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
      renderAdminPage();
    },
    (error) => console.error("無法讀取異動紀錄：", error)
  );
  stopMaintenanceSync = firestore.collection("maintenanceRuns").onSnapshot(
    (snapshot) => {
      maintenanceRuns = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
      renderAdminPage();
    },
    (error) => console.error("無法讀取排程狀態：", error)
  );
  stopPersonalHistorySync = firestore.collection("personalHistoryBets").onSnapshot(
    (snapshot) => {
      personalHistoryRecords = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
      renderPersonalHistory();
    },
    (error) => console.error("無法讀取個人歷史紀錄：", error)
  );
}

function startFirestoreSync() {
  if (!auth?.currentUser || !firestore) return;
  stopFirestoreSync?.();
  stopSettlementsSync?.();
  startAdminSync();

  stopSettlementsSync = firestore
    .collection("settlements")
    .onSnapshot(
      (snapshot) => {
        settlements = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
        renderSettlementPage();
      },
      (error) => {
        console.error("無法讀取結算節點：", error);
      }
    );

  stopFirestoreSync = firestore
    .collection("bets")
    .onSnapshot(
      async (snapshot) => {
        const cloudRecords = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
        if (Array.isArray(cloudRecords)) {
          records = cloudRecords;
          const migrated = migrateLegacyRecordDates();
          let settlementMatches = availableMatches;
          try {
            const pendingMatches = await fetchMatchesForDates(getPendingRecordDates());
            settlementMatches = mergeMatches(availableMatches, pendingMatches);
          } catch (error) {
            console.error("無法取得待結算賽事：", error);
          }
          const aligned = reconcileRecordsWithMatches(settlementMatches);
          const settled = applyMatchResultsToRecords(settlementMatches);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
          render();
          if (migrated.length) await saveRecords(migrated, "legacy_migration");
          if (aligned.length) await saveRecords(aligned, "schedule_sync");
          if (settled.length) await saveRecords(settled, "foreground_settle");
        }
      },
      (error) => {
        console.error("無法讀取雲端資料：", error);
        syncHint.textContent = `雲端同步失敗：${error.message}`;
      }
    );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth?.currentUser) {
    window.alert("請先使用 Google 登入後再新增紀錄。");
    return;
  }
  const formData = new FormData(form);
  const matchedFixture = availableMatches.find((match) => match.id === String(formData.get("matchId") || ""));
  if (!matchedFixture) {
    window.alert("請從賽程清單選擇有效場次；若清單尚未載入，請先更新賽程。");
    return;
  }
  const createdAt = new Date();
  const entry = {
    id: activeSubmissionId,
    idempotencyKey: activeSubmissionId,
    member: getMemberDisplayName(auth.currentUser),
    memberUid: auth.currentUser.uid,
    memberEmail: auth.currentUser.email || "",
    createdAt: createdAt.toISOString(),
    createdDate: toLocalDateValue(createdAt),
    matchDate: matchedFixture?.date || matchDateInput.value || toLocalDateValue(createdAt),
    date: matchedFixture?.date || matchDateInput.value || toLocalDateValue(createdAt),
    match: matchedFixture.label,
    matchId: matchedFixture.id,
    homeCode: matchedFixture.homeCode,
    awayCode: matchedFixture.awayCode,
    amount: Number(formData.get("amount")),
    odds: Number(formData.get("odds")),
    result: "pending",
    predictedHome: Number(formData.get("homeScore")),
    predictedAway: Number(formData.get("awayScore")),
    note: `${Number(formData.get("homeScore"))}-${Number(formData.get("awayScore"))}`,
  };

  if (!entry.member || !entry.match) {
    window.alert("請確認登入成員與賽事。");
    return;
  }
  const duplicate = records.find((record) => isLikelyDuplicateBet(entry, record));
  if (duplicate && !window.confirm(
    `這筆投注與既有紀錄完全相同：\n${duplicate.member} · ${duplicate.match} · ${duplicate.note} · 賠率 ${Number(duplicate.odds).toFixed(2)} · ${formatCurrency(duplicate.amount)}\n\n仍要新增嗎？`
  )) return;

  submitButton.disabled = true;
  submitButton.textContent = "儲存中...";
  try {
    records = [entry, ...records.filter((record) => record.id !== entry.id)];
    const settled = applyMatchResultsToRecords(availableMatches);
    render();
    const savedEntry = records.find((record) => record.id === entry.id) || entry;
    const saved = await saveRecords([savedEntry], "create");
    if (saved) activeSubmissionId = createId();
    if (settled.length) await saveRecords(settled, "foreground_settle");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '加入紀錄 <span aria-hidden="true">→</span>';
  }
});

recordsBody.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;
  if (!isCurrentUserAdmin()) {
    window.alert("只有管理員可以刪除紀錄。");
    return;
  }
  if (!window.confirm("確定要刪除這筆紀錄嗎？")) return;

  records = records.filter((item) => item.id !== button.dataset.id);
  render();
  await deleteRecord(button.dataset.id);
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fifa-bet-records.json";
  link.click();
  URL.revokeObjectURL(url);
});

[searchInput, filterMember, filterResult].forEach((element) => {
  element.addEventListener("input", renderRecords);
  element.addEventListener("change", renderRecords);
});

[analysisDateFilter, analysisMatchFilter].forEach((element) => {
  element.addEventListener("change", () => {
    const analysisRecords = getAnalysisRecords();
    renderVisualStats(analysisRecords);
  });
});

[statsDateFilter, statsMatchFilter, statsMemberFilter].forEach((element) => {
  element.addEventListener("change", () => {
    const statsRecords = getStatsRecords();
    renderStatsPanels(statsRecords);
    renderFilteredSummary(statsRecords);
  });
});

[personalSourceFilter, personalTypeFilter].forEach((element) => {
  element.addEventListener("change", renderPersonalHistory);
});

[settlementStartInput, settlementEndInput].forEach((element) => {
  element.addEventListener("change", renderSettlementPage);
});

createSettlementBtn.addEventListener("click", async () => {
  if (!isCurrentUserAdmin() || !firestore || !auth?.currentUser) {
    window.alert("只有管理員可以建立結算節點。");
    return;
  }

  const periodStart = settlementStartInput.value;
  const periodEnd = settlementEndInput.value;
  const candidates = getSettlementCandidates(periodStart, periodEnd);
  if (!periodStart || !periodEnd || periodStart > periodEnd || !candidates.length) {
    window.alert("這個日期區間沒有可結算的已開獎單據。");
    return;
  }
  if (candidates.length > 450) {
    window.alert("單次結算最多 450 筆，請縮小日期區間。");
    return;
  }

  const previewTotals = getSettlementTotals(candidates);
  const confirmation = [
    `結算 ${periodStart} ～ ${periodEnd}`,
    `共 ${candidates.length} 筆`,
    `正數合計 ${formatSignedCurrency(previewTotals.payable)}`,
    `負數合計 ${formatSignedCurrency(-previewTotals.receivable)}`,
    `結算淨額 ${formatSignedCurrency(previewTotals.netAmount)}`,
    "",
    "建立後這批單據會從待結算區移除，確定繼續？",
  ].join("\n");
  if (!window.confirm(confirmation)) return;

  createSettlementBtn.disabled = true;
  createSettlementBtn.textContent = "結算中...";
  try {
    const settlementRef = firestore.collection("settlements").doc();
    const auditRef = firestore.collection("auditLogs").doc();
    await firestore.runTransaction(async (transaction) => {
      const betRefs = candidates.map((item) => firestore.collection("bets").doc(item.id));
      const snapshots = await Promise.all(betRefs.map((ref) => transaction.get(ref)));
      const freshRecords = snapshots.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id }));
      const stillValid = freshRecords.every((item) => {
        const createdDate = getRecordCreatedDate(item);
        return !item.settlementId
          && (item.result === "win" || item.result === "loss")
          && createdDate >= periodStart
          && createdDate <= periodEnd;
      });
      if (!stillValid || freshRecords.length !== candidates.length) {
        throw new Error("資料已被更新，請重新確認結算內容。");
      }

      const members = getMemberSettlementSummary(freshRecords);
      const totals = getSettlementTotals(freshRecords);
      const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp();
      transaction.set(settlementRef, {
        id: settlementRef.id,
        periodStart,
        periodEnd,
        settledAt: serverTimestamp,
        settledByUid: auth.currentUser.uid,
        settledByName: getMemberDisplayName(auth.currentUser),
        recordIds: freshRecords.map((item) => item.id),
        recordCount: freshRecords.length,
        totals,
        members,
      });
      transaction.set(auditRef, {
        id: auditRef.id,
        action: "create_settlement",
        actorUid: auth.currentUser.uid,
        actorName: getMemberDisplayName(auth.currentUser),
        settlementId: settlementRef.id,
        recordIds: freshRecords.map((item) => item.id),
        occurredAt: serverTimestamp,
      });
      betRefs.forEach((ref) => {
        transaction.update(ref, {
          settlementId: settlementRef.id,
          settlementPeriodStart: periodStart,
          settlementPeriodEnd: periodEnd,
          settlementAt: serverTimestamp,
        });
      });
    });
    const settledIds = new Set(candidates.map((item) => item.id));
    records = records.map((item) => settledIds.has(item.id)
      ? {
          ...item,
          settlementId: settlementRef.id,
          settlementPeriodStart: periodStart,
          settlementPeriodEnd: periodEnd,
          settlementAt: new Date().toISOString(),
        }
      : item);
    settlementRangeInitialized = false;
    window.alert("結算節點已建立，待結算金額已重新歸零。");
  } catch (error) {
    console.error("建立結算節點失敗：", error);
    window.alert(`建立結算節點失敗：${error.message}`);
  } finally {
    createSettlementBtn.textContent = "建立結算節點";
    renderSettlementPage();
  }
});

menuToggle.addEventListener("click", () => {
  const willOpen = pageMenu.hidden;
  pageMenu.hidden = !willOpen;
  menuToggle.setAttribute("aria-expanded", String(willOpen));
});

pageButtons.forEach((button) => {
  button.addEventListener("click", () => setActivePage(button.dataset.pageTarget));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".page-navigation")) {
    pageMenu.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

matchInput.addEventListener("change", updateMatchMode);
matchDateInput.addEventListener("change", () => refreshWorldCupData({ saveAfterUpdate: false }));
refreshMatchesBtn.addEventListener("click", () => refreshWorldCupData());
refreshTeamGuideBtn.addEventListener("click", refreshTeamGuide);

adminRecordSelect.addEventListener("change", () => {
  const record = records.find((item) => item.id === adminRecordSelect.value);
  adminHomeScoreInput.value = record?.predictedHome ?? "";
  adminAwayScoreInput.value = record?.predictedAway ?? "";
  adminOddsInput.value = record?.odds ?? "";
  adminAmountInput.value = record?.amount ?? "";
});

adminRefreshBtn.addEventListener("click", async () => {
  if (!isCurrentUserAdmin()) return;
  adminRefreshBtn.disabled = true;
  adminRefreshBtn.textContent = "同步中...";
  try {
    await refreshWorldCupData();
    window.alert("賽程與待判定投注已重新同步。");
  } finally {
    adminRefreshBtn.disabled = false;
    adminRefreshBtn.textContent = "立即同步賽程／賽果";
  }
});

adminCorrectionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isCurrentUserAdmin()) return;
  const original = records.find((record) => record.id === adminRecordSelect.value);
  if (!original) return;
  if (original.settlementId) {
    window.alert("這筆紀錄已完成款項結算，不可直接修改。");
    return;
  }

  const nextValues = {
    predictedHome: Number(adminHomeScoreInput.value),
    predictedAway: Number(adminAwayScoreInput.value),
    odds: Number(adminOddsInput.value),
    amount: Number(adminAmountInput.value),
  };
  if (!Object.values(nextValues).every(Number.isFinite)) {
    window.alert("請確認比分、賠率與金額格式。");
    return;
  }
  if (!window.confirm(`確定修正 ${original.member} 的「${original.match} ${original.note}」嗎？`)) return;

  const baseRecord = { ...original };
  delete baseRecord.settledScore;
  delete baseRecord.settledAt;
  delete baseRecord.resultProvider;
  const corrected = {
    ...baseRecord,
    ...nextValues,
    note: `${nextValues.predictedHome}-${nextValues.predictedAway}`,
    result: "pending",
    correctedAt: new Date().toISOString(),
    correctedByUid: auth.currentUser.uid,
  };
  records = records.map((record) => record.id === corrected.id ? corrected : record);
  adminCorrectionBtn.disabled = true;
  try {
    const saved = await saveRecords([corrected], "admin_correction", {
      before: `${original.note}|${original.odds}|${original.amount}`,
      after: `${corrected.note}|${corrected.odds}|${corrected.amount}`,
    });
    if (!saved) return;
    const matches = await fetchMatchesForDates([corrected.matchDate || corrected.date]);
    const settled = applyMatchResultsToRecords(matches);
    if (settled.length) await saveRecords(settled, "foreground_settle");
    render();
    window.alert("資料已修正並重新檢查賽果。");
  } finally {
    adminCorrectionBtn.disabled = false;
  }
});

googleLoginBtn.addEventListener("click", async () => {
  if (!auth) {
    window.alert("Firebase 尚未正確初始化，請檢查 firebase-config.js。");
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error("Google 登入失敗：", error);
    window.alert(`Google 登入失敗：${error.message}`);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    stopFirestoreSync?.();
    stopFirestoreSync = null;
    stopSettlementsSync?.();
    stopSettlementsSync = null;
    stopAuditSync?.();
    stopAuditSync = null;
    stopMaintenanceSync?.();
    stopMaintenanceSync = null;
    stopPersonalHistorySync?.();
    stopPersonalHistorySync = null;
    settlements = [];
    auditLogs = [];
    maintenanceRuns = [];
    personalHistoryRecords = [];
    await auth?.signOut();
  } catch (error) {
    window.alert(`登出失敗：${error.message}`);
  }
});

if (auth) {
  auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
    render();
    if (user) {
      startFirestoreSync();
      setActivePage(location.hash.replace("#", ""), { updateHash: false });
    }
  });
} else {
  googleLoginBtn.disabled = true;
  googleLoginBtn.textContent = "Firebase 未設定";
  updateAuthUI(null);
}

matchDateInput.value = toLocalDateValue();
setActivePage(location.hash.replace("#", ""), { updateHash: false });
refreshWorldCupData();
window.setInterval(() => {
  refreshWorldCupData();
  if (teamGuideEvents.length || location.hash === "#team-guide") refreshTeamGuide();
}, MATCH_REFRESH_INTERVAL);
render();
