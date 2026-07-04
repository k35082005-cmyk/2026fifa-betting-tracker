# 2026 FIFA Betting Tracker

私人小組使用的 2026 FIFA 世界盃正確比分投注紀錄與統計網站。前端使用原生 HTML、CSS、JavaScript，資料儲存在 Firebase Authentication／Cloud Firestore，並部署於 Vercel。

## 主要功能

- Google 登入與固定成員識別。
- 從 ESPN 世界盃賽程選擇場次，使用穩定的 `matchId` 儲存投注。
- 依成員、場次、比分與日期統計。
- 只依正規時間比分自動判定輸贏。
- 管理員結算、刪除與異動紀錄。
- GitHub Actions 背景結算及每日 Firestore JSON 備份。

## 本機啟動

靜態前端可使用任意本機 HTTP server：

```bash
python -m http.server 3000
```

需要測試 Vercel Functions 時：

```bash
npm install
vercel dev
```

## 正式部署

- GitHub 主要分支：`master`
- 正式網址：<https://2026fifa-betting-tracker.vercel.app>
- Firebase 專案：`fifa2026-53511`

推送 `master` 後由 Vercel webhook 部署。若 webhook 沒有更新，可執行：

```bash
vercel --prod --yes
```

## GitHub Actions 密鑰

Repository Actions secret 需設定：

- `FIREBASE_SERVICE_ACCOUNT_BASE64`：最小權限 Firebase service account JSON 的 Base64。

密鑰只存放於 GitHub Actions secrets，不可提交進 Git。背景結算每 30 分鐘執行；每日備份於台灣時間 03:00 執行，gzip JSON artifact 保留 90 天。

## 驗證

修改 JavaScript 後至少執行：

```bash
node --check app.js
node --check scripts/maintenance.js
git diff --check
```

Firestore 規則需另行部署：

```bash
firebase deploy --only firestore:rules --project fifa2026-53511
```
