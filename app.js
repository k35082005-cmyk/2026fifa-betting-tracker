const STORAGE_KEY = "fifa-bet-tracker-v1";
const SHARED_DOCUMENT = "shared";

const form = document.getElementById("betForm");
const authStatus = document.getElementById("authStatus");
const syncHint = document.getElementById("syncHint");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const recordsBody = document.getElementById("recordsBody");
const summaryStats = document.getElementById("summaryStats");
const memberStats = document.getElementById("memberStats");
const dateStats = document.getElementById("dateStats");
const filterMember = document.getElementById("filterMember");
const filterResult = document.getElementById("filterResult");
const searchInput = document.getElementById("searchInput");
const resetDataBtn = document.getElementById("resetDataBtn");
const exportBtn = document.getElementById("exportBtn");

let records = loadRecords();
let auth = null;
let firestore = null;
let stopFirestoreSync = null;

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

function getResultLabel(result) {
  return { win: "贏", loss: "輸", pending: "未開獎" }[result] || "未開獎";
}

function calculateSummary(items) {
  return {
    totalCount: items.length,
    totalAmount: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
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

function renderSummary() {
  const summary = calculateSummary(records);
  const items = [
    ["總筆數", summary.totalCount],
    ["下注總額", formatCurrency(summary.totalAmount)],
    ["未開獎", summary.pendingCount],
    ["已結算", summary.completedCount],
  ];

  summaryStats.innerHTML = items
    .map(
      ([label, value]) => `
        <div class="summary-item">
          <span>${label}</span>
          <strong>${value}</strong>
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

function renderStatsPanels() {
  const byMember = groupStats(records, "member").sort((a, b) => b.amount - a.amount);
  const byDate = groupStats(records, "date").sort((a, b) => b.label.localeCompare(a.label));
  renderStatList(memberStats, byMember);
  renderStatList(dateStats, byDate);
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
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!filtered.length) {
    recordsBody.innerHTML = '<tr><td colspan="8" class="empty">找不到符合條件的紀錄</td></tr>';
    return;
  }

  recordsBody.innerHTML = filtered
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.member)}</td>
          <td>${escapeHtml(item.date)}</td>
          <td>${escapeHtml(item.match)}</td>
          <td>${formatCurrency(item.amount)}</td>
          <td>${Number(item.odds || 0).toFixed(2)}</td>
          <td><span class="badge ${escapeHtml(item.result)}">${getResultLabel(item.result)}</span></td>
          <td>${escapeHtml(item.note || "—")}</td>
          <td><button class="delete-button" data-id="${escapeHtml(item.id)}" type="button">刪除</button></td>
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
  renderStatsPanels();
  populateMemberFilter();
  renderRecords();
}

function updateAuthUI(user = auth?.currentUser) {
  const isLoggedIn = Boolean(user);
  authStatus.textContent = isLoggedIn ? user.displayName || user.email || "已登入" : "未登入";
  authStatus.classList.toggle("is-online", isLoggedIn);
  googleLoginBtn.hidden = isLoggedIn;
  logoutBtn.hidden = !isLoggedIn;
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
          render();
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
  const formData = new FormData(form);
  const entry = {
    id: createId(),
    member: String(formData.get("member") || "").trim(),
    date: String(formData.get("date") || "").trim(),
    match: String(formData.get("match") || "").trim(),
    amount: Number(formData.get("amount")),
    odds: Number(formData.get("odds")),
    result: String(formData.get("result") || "pending"),
    note: String(formData.get("note") || "").trim(),
  };

  if (!entry.member || !entry.date || !entry.match) {
    window.alert("請填寫成員、日期與賽事。");
    return;
  }

  records.unshift(entry);
  render();
  await saveRecords();
  form.reset();
  document.getElementById("dateInput").value = new Date().toISOString().slice(0, 10);
});

recordsBody.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;
  if (!window.confirm("確定要刪除這筆紀錄嗎？")) return;

  records = records.filter((item) => item.id !== button.dataset.id);
  render();
  await saveRecords();
});

resetDataBtn.addEventListener("click", async () => {
  if (!window.confirm("確定要清空所有紀錄嗎？這個動作無法復原。")) return;
  records = [];
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
    if (user) startFirestoreSync();
  });
} else {
  googleLoginBtn.disabled = true;
  googleLoginBtn.textContent = "Firebase 未設定";
  updateAuthUI(null);
}

document.getElementById("dateInput").value = new Date().toISOString().slice(0, 10);
render();
