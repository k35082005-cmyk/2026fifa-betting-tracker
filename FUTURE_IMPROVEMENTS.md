# 2026 FIFA Betting Tracker：未來改善清單

## 已完成

- 每筆投注改為獨立儲存在 `bets/{recordId}`，舊的 `betRecords/shared` 僅保留為遷移備份。
- 場次分組與篩選優先使用 ESPN `matchId`。
- 移除手動輸入場次，避免產生缺少 `matchId` 的新紀錄。
- 新增每日 Firestore JSON artifact 備份與新增、刪除、同步、結算操作紀錄。
- 新增 GitHub Actions 背景結算；即使沒有人開啟網站，也會同步已完賽場次。
- 新增重複投注提醒及單次送出 idempotency key，避免連點或重試重複寫入。
- 新增管理員中心，可查看異動與排程狀態、手動同步及受控修正未結算資料。
- ESPN 讀取失敗時，以 OpenLigaDB 明確標示的正規時間結果作為備援。
- 開放瀏覽器手勢縮放，並補強手機版管理表單與統計表格欄位對齊。

## 待辦

### 備份復原演練

- 建立從 GitHub Actions gzip JSON artifact 還原到測試 Firestore 的腳本。
- 定期核對備份筆數、文件 ID 與必要欄位。
- 設定備份保留期限及失敗通知。
