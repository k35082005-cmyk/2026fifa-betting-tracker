# 2026 FIFA Betting Tracker

私人小組使用的 2026 FIFA 世界盃投注紀錄與統計網站，支援正確比分、全場獨贏與冠軍單。前端使用原生 HTML、CSS、JavaScript，資料儲存在 Firebase Authentication／Cloud Firestore，並部署於 Vercel。

## 主要功能

- Google 登入與固定成員識別。
- 從 ESPN 世界盃賽程選擇場次，使用穩定的 `matchId` 儲存投注。
- ESPN 失敗時，已存在投注可使用 OpenLigaDB 的正規時間結果作為備援。
- 依成員、場次、玩法、選擇與日期統計；正確比分分布圖只統計正確比分單。
- 正確比分與全場獨贏只依正規時間判定，不含延長賽與 PK；冠軍單於決賽完成後依 ESPN 冠軍結果判定。
- 重複投注提醒與單次送出的 idempotency key。
- 管理員結算、資料修正、手動同步、排程狀態與異動紀錄。
- 管理員專屬個人歷史總覽，合併 `personalHistoryBets` 的網站建立前投注與目前 Wei 紀錄，不影響群組頁面。
- 淘汰賽戰力參考頁，依 ESPN 本屆已完成賽事計算勝和敗、進失球、淨勝球、零封、場均進球、近期戰績與樹狀圖。
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

## 每日注單匯入 SOP

少量日常注單固定使用 Firebase CLI 登入狀態與 `scripts/import-daily-bets.js`，不要再臨時改寫 Firestore REST 腳本。

1. 確認 Firebase CLI 登入帳號：

```bash
firebase login:list
```

應顯示 `k35082005@gmail.com`。

2. 將注單整理成 JSON，例如：

```json
{
  "bets": [
    {
      "sourceBetId": "5352364649562276",
      "placedAt": "2026-07-15 21:19:09(GMT+8)",
      "playType": "全場波膽",
      "prediction": "3-3",
      "match": "英格蘭 VS 阿根廷",
      "kickoffAt": "2026-07-16 03:00(GMT+8)",
      "odds": 61,
      "amount": 50
    },
    {
      "sourceBetId": "5352331439796823",
      "placedAt": "2026-07-15 18:14:39(GMT+8)",
      "playType": "半/全場",
      "prediction": "阿根廷/平局",
      "match": "英格蘭 VS 阿根廷",
      "kickoffAt": "2026-07-16 03:00(GMT+8)",
      "odds": 18.5,
      "amount": 50
    }
  ]
}
```

`playType` 可用中文或正式 `betType`：`correct_score`、`half_time_correct_score`、`match_winner`、`half_time_winner`、`half_full_time`、`exact_goals`、`over_under`、`tournament_champion`。全場大小以 `大 2.5` 或 `小 2.5` 格式匯入，只接受半球盤，並以正規時間總進球數判定。腳本會用 ESPN 依比賽日期與隊伍補 `matchId`，文件 ID 固定為 `ticket-{sourceBetId}`。

3. 先 dry-run：

```bash
npm run import:bets -- path/to/bets.json
```

4. 確認 `createRecords`、總金額、票號與玩法正確後才寫入：

```bash
npm run import:bets -- path/to/bets.json --apply
```

腳本會拒絕新增已存在的票號，寫入後會 read back 驗證新增筆數與欄位。

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
