const STORAGE_KEY = 'fifa-bet-tracker-v1';

const form = document.getElementById('betForm');
const authStatus = document.getElementById('authStatus');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const recordsBody = document.getElementById('recordsBody');
const summaryStats = document.getElementById('summaryStats');
const memberStats = document.getElementById('memberStats');
const dateStats = document.getElementById('dateStats');
const dockAmount = document.getElementById('dockAmount');
const dockPending = document.getElementById('dockPending');
const filterMember = document.getElementById('filterMember');
const filterResult = document.getElementById('filterResult');
const searchInput = document.getElementById('searchInput');
const resetDataBtn = document.getElementById('resetDataBtn');
const exportBtn = document.getElementById('exportBtn');

let records = loadRecords();
let auth = null;
let firestore = null;

if (window.firebase) {
  firebase.initializeApp(window.__FIREBASE_CONFIG__);
  auth = firebase.auth();
  firestore = firebase.firestore();
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('無法讀取資料', error);
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (auth?.currentUser && firestore) {
    firestore.collection('betRecords').doc('shared').set({ records, updatedAt: new Date().toISOString() }, { merge: true });
  }
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getResultLabel(result) {
  switch (result) {
    case 'win':
      return '贏';
    case 'loss':
      return '輸';
    default:
      return '未結算';
  }
}

function getResultClass(result) {
  switch (result) {
    case 'win':
      return 'win';
    case 'loss':
      return 'loss';
    default:
      return 'pending';
  }
}

function calculateSummary(items) {
  const totalCount = items.length;
  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingCount = items.filter((item) => item.result === 'pending').length;
  const winCount = items.filter((item) => item.result === 'win').length;
  const lossCount = items.filter((item) => item.result === 'loss').length;

  return {
    totalCount,
    totalAmount,
    pendingCount,
    winCount,
    lossCount,
  };
}

function buildMemberStats(items) {
  const map = new Map();
  items.forEach((item) => {
    const existing = map.get(item.member) || { member: item.member, count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += Number(item.amount || 0);
    map.set(item.member, existing);
  });

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function buildDateStats(items) {
  const map = new Map();
  items.forEach((item) => {
    const existing = map.get(item.date) || { date: item.date, count: 0, amount: 0 };
    existing.count += 1;
    existing.amount += Number(item.amount || 0);
    map.set(item.date, existing);
  });

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function renderSummary() {
  const summary = calculateSummary(records);
  dockAmount.textContent = formatCurrency(summary.totalAmount);
  dockPending.textContent = summary.pendingCount;

  summaryStats.innerHTML = `
    <div class="summary-item">
      <span>總筆數</span>
      <strong>${summary.totalCount}</strong>
    </div>
    <div class="summary-item">
      <span>總下注金額</span>
      <strong>${formatCurrency(summary.totalAmount)}</strong>
    </div>
    <div class="summary-item">
      <span>未結算</span>
      <strong>${summary.pendingCount}</strong>
    </div>
    <div class="summary-item">
      <span>已結算</span>
      <strong>${summary.winCount + summary.lossCount}</strong>
    </div>
  `;
}

function renderStatsPanels() {
  const memberList = buildMemberStats(records);
  const dateList = buildDateStats(records);

  memberStats.innerHTML = memberList.length
    ? memberList
        .map(
          (entry) => `
            <div class="stat-row">
              <span>${entry.member}</span>
              <strong>${entry.count} 筆 · ${formatCurrency(entry.amount)}</strong>
            </div>
          `
        )
        .join('')
    : '<p class="empty">目前還沒有任何投注資料。</p>';

  dateStats.innerHTML = dateList.length
    ? dateList
        .map(
          (entry) => `
            <div class="stat-row">
              <span>${entry.date}</span>
              <strong>${entry.count} 筆 · ${formatCurrency(entry.amount)}</strong>
            </div>
          `
        )
        .join('')
    : '<p class="empty">目前還沒有任何投注資料。</p>';
}

function renderRecords() {
  const searchText = searchInput.value.trim().toLowerCase();
  const memberFilter = filterMember.value;
  const resultFilter = filterResult.value;

  const filtered = records.filter((item) => {
    const matchesSearch =
      item.member.toLowerCase().includes(searchText) || item.match.toLowerCase().includes(searchText);
    const matchesMember = memberFilter === 'all' || item.member === memberFilter;
    const matchesResult = resultFilter === 'all' || item.result === resultFilter;
    return matchesSearch && matchesMember && matchesResult;
  });

  if (!filtered.length) {
    recordsBody.innerHTML = '<tr><td colspan="8" class="empty">沒有符合條件的記錄。</td></tr>';
    return;
  }

  recordsBody.innerHTML = filtered
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (item) => `
        <tr>
          <td>${item.member}</td>
          <td>${item.date}</td>
          <td>${item.match}</td>
          <td>${formatCurrency(Number(item.amount || 0))}</td>
          <td>${Number(item.odds || 0).toFixed(2)}</td>
          <td><span class="badge ${getResultClass(item.result)}">${getResultLabel(item.result)}</span></td>
          <td>${item.note || '—'}</td>
          <td><button class="delete-btn" data-id="${item.id}" type="button">刪除</button></td>
        </tr>
      `
    )
    .join('');
}

function updateAuthUI() {
  if (!auth?.currentUser) {
    authStatus.textContent = '尚未登入';
    loginBtn.style.display = 'inline-flex';
    registerBtn.style.display = 'inline-flex';
    logoutBtn.style.display = 'none';
    return;
  }

  authStatus.textContent = `已登入：${auth.currentUser.email || auth.currentUser.uid}`;
  loginBtn.style.display = 'none';
  registerBtn.style.display = 'none';
  logoutBtn.style.display = 'inline-flex';
}

function syncFromFirestore() {
  if (!auth?.currentUser || !firestore) return;
  firestore.collection('betRecords').doc('shared').onSnapshot((doc) => {
    const data = doc.data();
    if (data?.records) {
      records = data.records;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      render();
    }
  });
}

function render() {
  renderSummary();
  renderStatsPanels();
  renderRecords();
  populateMemberFilter();
}

function populateMemberFilter() {
  const members = Array.from(new Set(records.map((item) => item.member))).sort();
  const currentValue = filterMember.value;
  filterMember.innerHTML = '<option value="all">所有人</option>' + members.map((member) => `<option value="${member}">${member}</option>`).join('');
  filterMember.value = members.includes(currentValue) ? currentValue : 'all';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const entry = {
    id: createId(),
    member: String(formData.get('member')).trim(),
    date: String(formData.get('date')).trim(),
    match: String(formData.get('match')).trim(),
    amount: Number(formData.get('amount')),
    odds: Number(formData.get('odds')),
    result: String(formData.get('result')).trim(),
    note: String(formData.get('note')).trim(),
  };

  if (!entry.member || !entry.date || !entry.match) {
    alert('請完整填寫下注人、日期與賽事 / 玩法。');
    return;
  }

  records.unshift(entry);
  saveRecords();
  form.reset();
  document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);
  render();
});

recordsBody.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.getAttribute('data-id');
  if (!id) return;
  const confirmed = window.confirm('確定要刪除此筆記錄嗎？');
  if (!confirmed) return;
  records = records.filter((item) => item.id !== id);
  saveRecords();
  render();
});

resetDataBtn.addEventListener('click', () => {
  const confirmed = window.confirm('確定要清空所有投注記錄嗎？');
  if (!confirmed) return;
  records = [];
  saveRecords();
  render();
});

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fifa-bet-records.json';
  link.click();
  URL.revokeObjectURL(url);
});

[searchInput, filterMember, filterResult].forEach((element) => {
  element.addEventListener('input', renderRecords);
  element.addEventListener('change', renderRecords);
});

document.getElementById('dateInput').value = new Date().toISOString().slice(0, 10);

loginBtn.addEventListener('click', async () => {
  const email = window.prompt('請輸入登入 Email');
  const password = window.prompt('請輸入登入密碼');
  if (!email || !password) return;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    updateAuthUI();
    syncFromFirestore();
  } catch (error) {
    alert('登入失敗：' + error.message);
  }
});

registerBtn.addEventListener('click', async () => {
  const email = window.prompt('請輸入註冊 Email');
  const password = window.prompt('請輸入註冊密碼');
  if (!email || !password) return;

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    updateAuthUI();
    syncFromFirestore();
  } catch (error) {
    alert('註冊失敗：' + error.message);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    updateAuthUI();
  } catch (error) {
    alert('登出失敗：' + error.message);
  }
});

auth?.onAuthStateChanged((user) => {
  if (user) {
    updateAuthUI();
    syncFromFirestore();
  } else {
    updateAuthUI();
  }
});

updateAuthUI();
render();
