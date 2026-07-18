#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { readFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const PROJECT_ID = "fifa2026-53511";
const ADMIN_UID = "qnPcedb81rXsq5o6BjMS4FiqycZ2";
const ADMIN_EMAIL = "k35082005@gmail.com";
const ADMIN_MEMBER = "Wei";
const DATABASE_ID = "(default)";
const DOCUMENTS_PATH = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/${DOCUMENTS_PATH}`;
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const VALID_BET_TYPES = new Set([
  "correct_score",
  "half_time_correct_score",
  "match_winner",
  "half_time_winner",
  "half_full_time",
  "exact_goals",
  "tournament_champion",
]);

const TEAM_ALIASES = Object.freeze({
  "英格蘭": "ENG",
  "ENGLAND": "ENG",
  "ENG": "ENG",
  "阿根廷": "ARG",
  "ARGENTINA": "ARG",
  "ARG": "ARG",
  "西班牙": "ESP",
  "SPAIN": "ESP",
  "ESP": "ESP",
  "葡萄牙": "POR",
  "PORTUGAL": "POR",
  "POR": "POR",
  "法國": "FRA",
  "FRANCE": "FRA",
  "FRA": "FRA",
  "德國": "GER",
  "GERMANY": "GER",
  "GER": "GER",
  "巴西": "BRA",
  "BRAZIL": "BRA",
  "BRA": "BRA",
  "荷蘭": "NED",
  "NETHERLANDS": "NED",
  "NED": "NED",
  "義大利": "ITA",
  "ITALY": "ITA",
  "ITA": "ITA",
  "克羅埃西亞": "CRO",
  "克羅地亞": "CRO",
  "CROATIA": "CRO",
  "CRO": "CRO",
  "瑞士": "SUI",
  "SWITZERLAND": "SUI",
  "SUI": "SUI",
  "奧地利": "AUT",
  "AUSTRIA": "AUT",
  "AUT": "AUT",
});

function usage() {
  return [
    "Usage:",
    "  node scripts/import-daily-bets.js <bets.json> [--apply]",
    "",
    "Default mode is dry-run. Use --apply only after checking the summary.",
  ].join("\n");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[（）()]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function normalizeTeamCode(value) {
  const text = normalizeText(value);
  return TEAM_ALIASES[text] || text;
}

function splitMatch(match) {
  const parts = String(match || "").split(/\s*(?:VS|對|v)\s*/i).map((item) => item.trim()).filter(Boolean);
  if (parts.length !== 2) throw new Error(`Invalid match format, expected "主隊 VS 客隊": ${match}`);
  return { homeName: parts[0], awayName: parts[1] };
}

function toLocalDateValue(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function toEspnDateValue(date) {
  return toLocalDateValue(date).replaceAll("-", "");
}

function getEspnRangeForLocalDate(dateValue) {
  const selected = new Date(`${dateValue}T12:00:00+08:00`);
  const previous = new Date(selected);
  previous.setDate(previous.getDate() - 1);
  return `${toEspnDateValue(previous)}-${toEspnDateValue(selected)}`;
}

function parseTaipeiTimestamp(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required`);
  const normalized = text
    .replace("(GMT+8)", "+08:00")
    .replace("(GMT+08:00)", "+08:00")
    .replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${label}: ${value}`);
  return date;
}

function parseMatchDate(bet) {
  if (bet.matchDate) return String(bet.matchDate);
  if (bet.kickoffAt) return toLocalDateValue(parseTaipeiTimestamp(bet.kickoffAt, "kickoffAt"));
  throw new Error(`matchDate or kickoffAt is required for sourceBetId ${bet.sourceBetId}`);
}

function parseScore(value, label) {
  const match = String(value || "").normalize("NFKC").trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!match) throw new Error(`Invalid ${label}, expected score like 2-1: ${value}`);
  return { home: Number(match[1]), away: Number(match[2]), text: `${Number(match[1])}-${Number(match[2])}` };
}

function normalizeBetType(value) {
  const text = normalizeText(value);
  const aliases = {
    CORRECT_SCORE: "correct_score",
    "全場波膽": "correct_score",
    "正確比分": "correct_score",
    HALF_TIME_CORRECT_SCORE: "half_time_correct_score",
    "上半場波膽": "half_time_correct_score",
    "半場波膽": "half_time_correct_score",
    MATCH_WINNER: "match_winner",
    "全場獨贏": "match_winner",
    "獨贏": "match_winner",
    HALF_TIME_WINNER: "half_time_winner",
    "上半場獨贏": "half_time_winner",
    "半場獨贏": "half_time_winner",
    HALF_FULL_TIME: "half_full_time",
    "半/全場": "half_full_time",
    "半全場": "half_full_time",
    EXACT_GOALS: "exact_goals",
    "準確進球數": "exact_goals",
    TOURNAMENT_CHAMPION: "tournament_champion",
    "冠軍": "tournament_champion",
  };
  const type = VALID_BET_TYPES.has(value) ? value : aliases[text];
  if (!type) throw new Error(`Unsupported betType/playType: ${value}`);
  return type;
}

function normalizeSide(value, fixture) {
  const text = normalizeText(value);
  if (["DRAW", "平", "平局", "和局", "和"].includes(text)) return "draw";
  const code = normalizeTeamCode(value);
  if (code && code === normalizeTeamCode(fixture.homeCode || fixture.homeName)) return "home";
  if (code && code === normalizeTeamCode(fixture.awayCode || fixture.awayName)) return "away";
  if (text === "HOME" || text === "主隊") return "home";
  if (text === "AWAY" || text === "客隊") return "away";
  throw new Error(`Cannot map selection "${value}" to home/draw/away for ${fixture.match}`);
}

function normalizeSelection(bet, betType, fixture) {
  const raw = bet.selection || bet.pick || bet.prediction || bet.note;
  if (["correct_score", "half_time_correct_score"].includes(betType)) {
    const score = parseScore(raw, `score for ${bet.sourceBetId}`);
    return {
      selection: score.text,
      note: score.text,
      predictedHome: score.home,
      predictedAway: score.away,
    };
  }
  if (["match_winner", "half_time_winner"].includes(betType)) {
    const side = normalizeSide(raw, fixture);
    const label = side === "draw" ? "和局" : side === "home" ? fixture.homeName : fixture.awayName;
    return { selection: side, note: label };
  }
  if (betType === "half_full_time") {
    const parts = String(raw || "").split("/").map((item) => item.trim()).filter(Boolean);
    if (parts.length !== 2) throw new Error(`Invalid half/full selection for ${bet.sourceBetId}: ${raw}`);
    const half = normalizeSide(parts[0], fixture);
    const full = normalizeSide(parts[1], fixture);
    const label = parts.join("/");
    return { selection: `${half}/${full}`, note: label };
  }
  if (betType === "exact_goals") {
    const goals = String(raw || "").trim();
    if (!/^\d+$/.test(goals)) throw new Error(`Invalid exact goals selection for ${bet.sourceBetId}: ${raw}`);
    return { selection: goals, note: goals };
  }
  return { selection: String(raw || "").trim(), note: String(raw || "").trim() };
}

function getSettlementRule(betType) {
  if (betType === "correct_score") return "regulation_score";
  if (betType === "half_time_correct_score") return "half_time_score";
  if (betType === "match_winner") return "regulation_winner";
  if (betType === "half_time_winner") return "half_time_winner";
  if (betType === "half_full_time") return "half_full_time";
  if (betType === "exact_goals") return "regulation_total_goals";
  return "tournament_champion";
}

function locateFirebaseToolsRoot() {
  const candidates = [];
  try {
    candidates.push(path.join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "firebase-tools"));
  } catch {}
  candidates.push(
    path.join(os.homedir(), ".local/lib/node_modules/firebase-tools"),
    path.join(os.homedir(), "AppData/Roaming/npm/node_modules/firebase-tools"),
    "/opt/homebrew/lib/node_modules/firebase-tools",
    "/usr/local/lib/node_modules/firebase-tools"
  );
  for (const candidate of candidates) {
    try {
      require.resolve(path.join(candidate, "lib/auth.js"));
      return candidate;
    } catch {}
  }
  throw new Error("Cannot locate firebase-tools. Install/login with Firebase CLI first.");
}

function readFirebaseConfig() {
  const configPath = path.join(os.homedir(), ".config/configstore/firebase-tools.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const email = config.user?.email || config.account || "";
  const refreshToken = config.tokens?.refresh_token || config.refresh_token || config.user?.tokens?.refresh_token;
  if (email !== ADMIN_EMAIL) throw new Error(`Unexpected Firebase CLI account: ${email || "unknown"}`);
  if (!refreshToken) throw new Error("Firebase CLI refresh_token missing. Run firebase login first.");
  return { config, refreshToken };
}

async function getAuthContext() {
  const root = locateFirebaseToolsRoot();
  const { getAccessToken } = require(path.join(root, "lib/auth.js"));
  const scopes = require(path.join(root, "lib/scopes.js"));
  const { config, refreshToken } = readFirebaseConfig();
  const loginScopes = config.loginScopes || [
    scopes.EMAIL,
    scopes.OPENID,
    scopes.CLOUD_PROJECTS_READONLY,
    scopes.FIREBASE_PLATFORM,
    scopes.CLOUD_PLATFORM,
  ];
  return { getAccessToken, refreshToken, loginScopes, account: config.user?.email };
}

async function getToken(authContext) {
  const token = await authContext.getAccessToken(authContext.refreshToken, authContext.loginScopes);
  return token.access_token;
}

async function firestoreRequest(authContext, url, options = {}) {
  const token = await getToken(authContext);
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  return body;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function toFirestoreFields(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, toFirestoreValue(value)]));
}

function fromFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  return value;
}

function fromFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

async function getBetCount(authContext) {
  const rows = await firestoreRequest(authContext, `${FIRESTORE_BASE}:runAggregationQuery`, {
    method: "POST",
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: "bets" }] },
        aggregations: [{ alias: "count", count: {} }],
      },
    }),
  });
  return Number(rows?.[0]?.result?.aggregateFields?.count?.integerValue || 0);
}

async function getExistingBet(authContext, recordId) {
  const token = await getToken(authContext);
  const response = await fetch(`${FIRESTORE_BASE}/bets/${recordId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(`${recordId} lookup failed: ${response.status} ${JSON.stringify(body)}`);
  return { id: recordId, ...fromFirestoreFields(body.fields) };
}

function getCompetitor(competition, homeAway) {
  return (competition?.competitors || []).find((competitor) => competitor.homeAway === homeAway);
}

async function resolveFixture(inputFixture) {
  if (inputFixture.matchId) {
    const { homeName, awayName } = splitMatch(inputFixture.match);
    return {
      matchId: String(inputFixture.matchId),
      match: inputFixture.match,
      homeName,
      awayName,
      homeCode: inputFixture.homeCode || normalizeTeamCode(homeName),
      awayCode: inputFixture.awayCode || normalizeTeamCode(awayName),
      matchDate: inputFixture.matchDate,
    };
  }

  const { homeName, awayName } = splitMatch(inputFixture.match);
  const homeCode = normalizeTeamCode(homeName);
  const awayCode = normalizeTeamCode(awayName);
  const url = `${ESPN_SCOREBOARD_URL}?limit=100&dates=${getEspnRangeForLocalDate(inputFixture.matchDate)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`ESPN scoreboard failed ${response.status} for ${inputFixture.matchDate}`);
  const payload = await response.json();
  const matches = (payload.events || []).map((event) => {
    const competition = event.competitions?.[0];
    const home = getCompetitor(competition, "home");
    const away = getCompetitor(competition, "away");
    return {
      event,
      homeCode: normalizeTeamCode(home?.team?.abbreviation || home?.team?.shortDisplayName || home?.team?.displayName),
      awayCode: normalizeTeamCode(away?.team?.abbreviation || away?.team?.shortDisplayName || away?.team?.displayName),
    };
  }).filter((item) => item.homeCode === homeCode && item.awayCode === awayCode);

  if (matches.length !== 1) {
    throw new Error(`Expected one ESPN match for ${inputFixture.matchDate} ${inputFixture.match}; found ${matches.length}`);
  }

  return {
    matchId: String(matches[0].event.id),
    match: inputFixture.match,
    homeName,
    awayName,
    homeCode,
    awayCode,
    matchDate: inputFixture.matchDate,
  };
}

function validateInput(input) {
  if (!input || !Array.isArray(input.bets) || !input.bets.length) {
    throw new Error("Input JSON must contain a non-empty bets array");
  }
  const sourceIds = new Set();
  input.bets.forEach((bet, index) => {
    ["sourceBetId", "placedAt", "match", "odds", "amount"].forEach((field) => {
      if (bet[field] === undefined || bet[field] === null || bet[field] === "") {
        throw new Error(`bets[${index}].${field} is required`);
      }
    });
    if (!bet.betType && !bet.playType) throw new Error(`bets[${index}].betType or playType is required`);
    const sourceBetId = String(bet.sourceBetId);
    if (sourceIds.has(sourceBetId)) throw new Error(`Duplicate sourceBetId in input: ${sourceBetId}`);
    sourceIds.add(sourceBetId);
    parseTaipeiTimestamp(bet.placedAt, `bets[${index}].placedAt`);
  });
}

async function buildRecords(input) {
  const fixtureCache = new Map();
  const records = [];
  for (const bet of input.bets) {
    const sourceBetId = String(bet.sourceBetId);
    const betType = normalizeBetType(bet.betType || bet.playType);
    const matchDate = parseMatchDate(bet);
    const fixtureKey = `${matchDate}|${bet.match}|${bet.matchId || ""}`;
    if (!fixtureCache.has(fixtureKey)) {
      fixtureCache.set(fixtureKey, await resolveFixture({ ...bet, matchDate }));
    }
    const fixture = fixtureCache.get(fixtureKey);
    const placedAt = parseTaipeiTimestamp(bet.placedAt, `placedAt for ${sourceBetId}`);
    const selectionFields = normalizeSelection(bet, betType, fixture);
    const record = {
      id: `ticket-${sourceBetId}`,
      idempotencyKey: `ticket-${sourceBetId}`,
      member: input.member || ADMIN_MEMBER,
      memberUid: input.memberUid || ADMIN_UID,
      memberEmail: input.memberEmail || ADMIN_EMAIL,
      createdAt: placedAt.toISOString(),
      createdDate: toLocalDateValue(placedAt),
      betType,
      settlementRule: getSettlementRule(betType),
      matchDate,
      date: matchDate,
      match: fixture.match,
      matchId: fixture.matchId,
      homeCode: fixture.homeCode,
      awayCode: fixture.awayCode,
      amount: Number(bet.amount),
      odds: Number(bet.odds),
      result: "pending",
      ...selectionFields,
      sourceBetId,
      sourceProvider: input.sourceProvider || bet.sourceProvider || "RG",
    };
    records.push(record);
  }
  return records;
}

async function createPlan(authContext, records) {
  const before = await getBetCount(authContext);
  const existing = [];
  const create = [];
  for (const record of records) {
    const found = await getExistingBet(authContext, record.id);
    if (found) existing.push(found);
    else create.push(record);
  }
  return { before, existing, create };
}

async function applyPlan(authContext, plan) {
  if (!plan.create.length) return;
  await firestoreRequest(authContext, `${FIRESTORE_BASE}:commit`, {
    method: "POST",
    body: JSON.stringify({
      writes: plan.create.map((record) => ({
        update: {
          name: `${DOCUMENTS_PATH}/bets/${record.id}`,
          fields: toFirestoreFields(record),
        },
        currentDocument: { exists: false },
      })),
    }),
  });
}

function summarizeRecord(record) {
  return {
    id: record.id,
    betType: record.betType,
    selection: record.selection,
    note: record.note,
    match: record.match,
    matchId: record.matchId,
    odds: record.odds,
    amount: record.amount,
    result: record.result,
  };
}

async function readBack(authContext, records) {
  const output = [];
  for (const record of records) {
    const found = await getExistingBet(authContext, record.id);
    output.push(found ? summarizeRecord(found) : { id: record.id, missing: true });
  }
  return output;
}

async function main() {
  const inputPath = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!inputPath) throw new Error(usage());
  const input = JSON.parse(await readFile(path.resolve(inputPath), "utf8"));
  validateInput(input);

  const authContext = await getAuthContext();
  const records = await buildRecords(input);
  const plan = await createPlan(authContext, records);
  const summary = {
    mode: apply ? "apply" : "dry-run",
    project: PROJECT_ID,
    account: authContext.account,
    totalBefore: plan.before,
    input: records.length,
    create: plan.create.length,
    existing: plan.existing.map(summarizeRecord),
    createRecords: plan.create.map(summarizeRecord),
    totalAmountToCreate: plan.create.reduce((sum, record) => sum + Number(record.amount || 0), 0),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!apply) return;
  if (plan.existing.length) {
    throw new Error(`Refusing to apply because ${plan.existing.length} ticket(s) already exist. Remove duplicates from input and retry.`);
  }
  await applyPlan(authContext, plan);
  const after = await getBetCount(authContext);
  console.log(JSON.stringify({
    ok: true,
    totalBefore: plan.before,
    totalAfter: after,
    added: after - plan.before,
    readBack: await readBack(authContext, records),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
