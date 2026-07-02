const STORAGE_KEY = "fifa-bet-tracker-v1";
const SHARED_DOCUMENT = "shared";
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const MATCH_REFRESH_INTERVAL = 5 * 60 * 1000;
const ADMIN_UID = "qnPcedb81rXsq5o6BjMS4FiqycZ2";

const form = document.getElementById("betForm");
const authStatus = document.getElementById("authStatus");
const syncHint = document.getElementById("syncHint");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const matchInput = document.getElementById("matchInput");
const matchIdInput = document.getElementById("matchIdInput");
const manualMatchInput = document.getElementById("manualMatchInput");
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
const submitButton = form.querySelector('[type="submit"]');
const menuToggle = document.getElementById("menuToggle");
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
  Ecuador: "厄瓜多", "South Korea": "韓國", Korea: "韓國", Iran: "伊朗", Qatar: "卡達", "Saudi Arabia": "沙烏地阿拉伯"
};

let records = loadRecords();
let availableMatches = [];
let auth = null;
let firestore = null;
let stopFirestoreSync = null;
let statsDateInitialized = false;
let latestUpcomingStatsDate = "";

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

if (migrateLegacyRecordDates()) {
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

async function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

  if (!auth?.currentUser || !firestore) return;

  try {
    await firestore.collection("betRecords").doc(SHARED_DOCUMENT).set({
      records,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("雲端同步失敗：", error);
    window.alert(`資料已保存在本機，但雲端同步失敗：${error.message}`);
  }
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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

function isCurrentUserAdmin() {
  return auth?.currentUser?.uid === ADMIN_UID;
}

function migrateLegacyRecordDates() {
  let changed = false;
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
    changed = true;
    return migrated;
  });
  return changed;
}

function reconcileRecordsWithMatches(matches) {
  if (!matches.length) return false;
  const byId = new Map(matches.map((match) => [match.id, match]));
  const byKey = new Map(matches.map((match) => [normalizeMatchKey(match.label), match]));
  let changed = false;

  records = records.map((record) => {
    const matched = byId.get(String(record.matchId || "")) || byKey.get(normalizeMatchKey(record.match));
    if (!matched) return record;
    if (record.matchId === matched.id && record.match === matched.label && record.matchDate === matched.date) return record;
    changed = true;
    return {
      ...record,
      matchId: matched.id,
      match: matched.label,
      matchDate: matched.date,
      date: matched.date,
      alignedAt: new Date().toISOString(),
    };
  });

  return changed;
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
    <option value="__manual__">手動輸入其他賽事</option>
  `;

  matchInput.value = matches.some((match) => match.label === currentValue) ? currentValue : "";
  updateMatchMode();
}

function updateMatchMode() {
  const selectedOption = matchInput.selectedOptions?.[0];
  const isManual = matchInput.value === "__manual__";
  manualMatchInput.hidden = !isManual;
  manualMatchInput.required = isManual;
  matchIdInput.value = isManual ? "" : selectedOption?.dataset.id || "";
  const selectedMatch = availableMatches.find((match) => match.id === matchIdInput.value);
  matchInput.classList.remove("is-completed", "is-live", "is-scheduled");
  if (selectedMatch) {
    matchInput.classList.add(selectedMatch.completed ? "is-completed" : selectedMatch.statusState === "in" ? "is-live" : "is-scheduled");
  }
  const hasMatch = isManual ? Boolean(manualMatchInput.value.trim()) : Boolean(selectedMatch);
  const manualTeams = manualMatchInput.value.split(/\s+vs\s+/i).map((name) => name.trim());
  homeScoreLabel.textContent = selectedMatch?.homeName || manualTeams[0] || "A 隊";
  awayScoreLabel.textContent = selectedMatch?.awayName || manualTeams[1] || "B 隊";
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
  const groups = await Promise.all(uniqueDates.map((date) => fetchWorldCupMatches(date)));
  return Array.from(new Map(groups.flat().map((match) => [match.id, match])).values());
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
    if ((aligned || settled) && saveAfterUpdate) await saveRecords();
    syncHint.textContent = aligned
      ? "已更新賽程，並自動對齊舊紀錄的場次、名稱與日期。"
      : `已更新 ${selectedDate} 賽程/賽果；自動判定只採正規時間，不含延長賽與 PK。`;
  } catch (error) {
    console.error("無法更新世界盃賽程/賽果：", error);
    matchInput.innerHTML = `
      <option value="">${escapeHtml(selectedDate)} 賽程載入失敗</option>
      <option value="__manual__">手動輸入其他賽事</option>
    `;
    updateMatchMode();
    syncHint.textContent = `賽程/賽果更新失敗，可先手動輸入：${error.message}`;
  } finally {
    refreshMatchesBtn.disabled = false;
    refreshMatchesBtn.textContent = "更新賽程/賽果";
  }
}

function applyMatchResultsToRecords(matches) {
  const resultsById = new Map(matches.filter((match) => match.completed && match.regulationScore).map((match) => [match.id, match]));
  let changed = false;

  records = records.map((record) => {
    const match = resultsById.get(String(record.matchId || ""));
    const predictedScore = Number.isInteger(record.predictedHome) && Number.isInteger(record.predictedAway)
      ? `${record.predictedHome}-${record.predictedAway}`
      : parseScore(record.note);
    if (!match || !predictedScore || record.result !== "pending") return record;

    const result = predictedScore === match.regulationScore ? "win" : "loss";
    changed = true;
    return { ...record, result, settledScore: match.regulationScore, settledAt: new Date().toISOString() };
  });

  return changed;
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
    (item) => normalizeMatchKey(item.match)
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
    { label: "已結算", value: summary.completedCount },
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
    const label = item.member || "未填寫";
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
                <span>已結算 <strong>${formatCurrency(entry.settledAmount)}</strong></span>
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
  const currentName = auth?.currentUser?.displayName || auth?.currentUser?.email;
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
  const matches = Array.from(
    new Map(records.filter((item) => item.match).map((item) => [normalizeMatchKey(item.match), item.match])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1], "zh-Hant"));

  analysisDateFilter.innerHTML = '<option value="all">所有比賽日期</option>' + dates.map((date) => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`).join("");
  analysisMatchFilter.innerHTML = '<option value="all">所有場次</option>' + matches.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("");
  analysisDateFilter.value = dates.includes(currentDate) ? currentDate : "all";
  analysisMatchFilter.value = matches.some(([key]) => key === currentMatch) ? currentMatch : "all";
}

function getAnalysisRecords() {
  return records.filter((item) =>
    (analysisDateFilter.value === "all" || item.matchDate === analysisDateFilter.value) &&
    (analysisMatchFilter.value === "all" || normalizeMatchKey(item.match) === analysisMatchFilter.value)
  );
}

function populateStatsFilters() {
  const currentDate = statsDateFilter.value;
  const currentMatch = statsMatchFilter.value;
  const currentMember = statsMemberFilter.value;
  const dates = Array.from(new Set(records.map((item) => item.matchDate).filter(Boolean))).sort().reverse();
  const matches = Array.from(new Map(records.filter((item) => item.match).map((item) => [normalizeMatchKey(item.match), item.match])).entries())
    .sort((a, b) => a[1].localeCompare(b[1], "zh-Hant"));
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
    (statsMatchFilter.value === "all" || normalizeMatchKey(item.match) === statsMatchFilter.value) &&
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
    ["已結算", formatCurrency(settlement.settledAmount), ""],
    ["未開獎", formatCurrency(settlement.pendingAmount), ""],
    ["派彩", formatCurrency(settlement.payout), ""],
    ["淨輸贏", formatCurrency(netAmount), getMoneyToneClass(netAmount)],
  ].map(([label, value, tone]) => `<div class="summary-item"><span>${label}</span><strong class="${tone}">${value}</strong></div>`).join("");
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
  renderRecords();
}

function setActivePage(pageName, { updateHash = true } = {}) {
  const validPage = ["entry", "records", "overview", "analysis", "stats"].includes(pageName) ? pageName : "entry";
  pageViews.forEach((view) => {
    view.hidden = view.dataset.page !== validPage;
  });
  pageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.pageTarget === validPage);
  });
  pageMenu.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  if (updateHash) history.replaceState(null, "", validPage === "entry" ? "#entry" : `#${validPage}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateAuthUI(user = auth?.currentUser) {
  const isLoggedIn = Boolean(user);
  authStatus.textContent = isLoggedIn ? user.displayName || user.email || "已登入" : "未登入";
  authStatus.classList.toggle("is-online", isLoggedIn);
  googleLoginBtn.hidden = isLoggedIn;
  logoutBtn.hidden = !isLoggedIn;
  memberInput.value = isLoggedIn ? user.displayName || user.email || "Google 成員" : "";
  submitButton.disabled = !isLoggedIn;
  submitButton.title = isLoggedIn ? "" : "請先使用 Google 登入";
  syncHint.textContent = isLoggedIn
    ? "已連接共享雲端資料；所有登入成員會看到相同紀錄。"
    : "未登入時，資料只會儲存在這台裝置。";
}

function startFirestoreSync() {
  if (!auth?.currentUser || !firestore) return;
  stopFirestoreSync?.();

  stopFirestoreSync = firestore
    .collection("betRecords")
    .doc(SHARED_DOCUMENT)
    .onSnapshot(
      async (snapshot) => {
        if (!snapshot.exists) {
          if (records.length) await saveRecords();
          return;
        }

        const cloudRecords = snapshot.data()?.records;
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
          if (migrated || aligned || settled) await saveRecords();
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
  const isManualMatch = matchInput.value === "__manual__";
  const matchedFixture = availableMatches.find((match) => match.id === String(formData.get("matchId") || ""));
  const selectedMatch = isManualMatch ? manualMatchInput.value : matchedFixture?.label || formData.get("match");
  const createdAt = new Date();
  const entry = {
    id: createId(),
    member: auth.currentUser.displayName || auth.currentUser.email || "Google 成員",
    memberUid: auth.currentUser.uid,
    memberEmail: auth.currentUser.email || "",
    createdAt: createdAt.toISOString(),
    createdDate: toLocalDateValue(createdAt),
    matchDate: matchedFixture?.date || matchDateInput.value || toLocalDateValue(createdAt),
    date: matchedFixture?.date || matchDateInput.value || toLocalDateValue(createdAt),
    match: String(selectedMatch || "").trim(),
    matchId: matchedFixture?.id || "",
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

  submitButton.disabled = true;
  submitButton.textContent = "儲存中...";
  try {
    records.unshift(entry);
    applyMatchResultsToRecords(availableMatches);
    render();
    await saveRecords();
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
  await saveRecords();
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
manualMatchInput.addEventListener("input", updateMatchMode);
refreshMatchesBtn.addEventListener("click", () => refreshWorldCupData());

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
    await auth?.signOut();
  } catch (error) {
    window.alert(`登出失敗：${error.message}`);
  }
});

if (auth) {
  auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
    render();
    if (user) startFirestoreSync();
  });
} else {
  googleLoginBtn.disabled = true;
  googleLoginBtn.textContent = "Firebase 未設定";
  updateAuthUI(null);
}

matchDateInput.value = toLocalDateValue();
setActivePage(location.hash.replace("#", ""), { updateHash: false });
refreshWorldCupData();
window.setInterval(() => refreshWorldCupData(), MATCH_REFRESH_INTERVAL);
render();
