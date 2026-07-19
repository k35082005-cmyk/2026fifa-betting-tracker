# 2026 FIFA Betting Tracker：Agent 專案脈絡

這份文件提供給日後接手本專案的 AI agent。開始修改前，先閱讀本文件與 `FUTURE_IMPROVEMENTS.md`，不要只根據畫面猜測資料規則。

## 產品用途

- 這是私人小組使用的 2026 FIFA 世界盃「正確比分投注紀錄與統計網站」，不是公開博弈平台，也不在網站內處理金流。
- 成員把投注網站上的下注內容登記進來，系統依成員、場次、玩法、選擇與日期整理統計，並在 ESPN 公布賽果後自動判定輸贏與派彩。
- 主要使用情境是手機，約 90% 的操作會發生在手機瀏覽器。
- UI 語言以繁體中文為主；國名與隊名應盡量翻譯為台灣使用者熟悉的繁體中文。

## 使用者與角色

- 專案擁有者／管理員：張韡。
- 管理員 Firebase UID：`qnPcedb81rXsq5o6BjMS4FiqycZ2`。
- 已知早期成員：張韡(Wei)、侯雅淇(Vicky)、辰辰(Hou)、林昀澍(Sam)；未來預期可能擴充到 5～6 人。
- 成員名稱應優先取 Google 登入資料，不讓使用者自由輸入名字，以免同一人因名稱差異被拆成多個統計對象。
- 張韡在成員視覺識別中偏好藕粉色。
- 刪除、清空、資料修正等高風險功能只能由管理員使用；一般成員不應看到危險的全域操作。

## 核心資料規則

- Firestore 正式資料位於 `bets/{recordId}`，每筆投注是一份獨立文件。
- 舊的 `betRecords/shared` 目前只保留為遷移備份，不可讓新版前端繼續寫入。
- 管理員的網站建立前私人投注獨立存於 `personalHistoryBets/{sourceBetId}`；只有管理員可讀寫，且 02～06 不得讀取或納入群組統計、派彩與結算。
- 不可因重構、重新同步或場次對齊而遺失既有投注。涉及資料遷移時，必須先備份，再核對筆數、ID 與欄位內容。
- 「填表日期」是實際建立紀錄的本地日期，由系統自動產生，使用者不可手動選擇。
- 「比賽日期」來自所選賽事的真實開賽時間，用於場次分組及比分分布統計。
- 同一場比賽的統計應優先依穩定的 `matchId` 合併；不能只依使用者曾經填錯的日期或隊名字串分類。
- `betType` 目前支援 `correct_score`、`half_time_correct_score`、`match_winner`、`half_time_winner`、`half_full_time`、`exact_goals`、`over_under`、`tournament_champion`。正確比分與上半場波膽必須拆成主隊、客隊兩個數值欄位；全場與上半場獨贏以 `selection` 儲存 `home`、`draw` 或 `away`，半/全場以 `selection` 儲存 `半場/全場`（例如 `home/draw`），準確進球數以 `selection` 儲存正規時間總進球數字串（例如 `4`）；全場大小以 `over:2.5` 或 `under:2.5` 儲存，另存數值 `goalLine`，只接受半球盤以避免和局退款。其他玩法也以 `selection` 儲存選擇，不能把所有玩法硬轉成比分。
- 新增下一筆紀錄時，常用欄位應保留上一筆內容，方便連續輸入大量投注。
- 金額計算要處理浮點誤差並以貨幣精度顯示。

## 每日注單匯入流程

- 張韡會不定期直接在對話貼上投注網站的純文字注單，並要求 agent 協助新增；若未另外指定成員，這類由張韡貼出的本人注單一律登記為 `Wei`。
- 目前已 SOP 化的正式新增方式，是把注單整理成 JSON 後執行 `node scripts/import-daily-bets.js <json>` 先 dry-run，再執行 `node scripts/import-daily-bets.js <json> --apply` 寫入。腳本會使用本機 Firebase CLI 的登入狀態取得 OAuth token，透過 Firestore REST API 寫入 `bets/{recordId}`；不要使用過期的 access token 快取，也不要把服務帳號、存取 token 或其他憑證寫入 Git。
- 執行前先確認 Firebase CLI 已登入正確帳號與專案：帳號應為 `k35082005@gmail.com`，專案應為 `fifa2026-53511`。若直接讀 `~/.config/configstore/firebase-tools.json` 裡的 `access_token` 遇到 Firestore `ACCESS_TOKEN_TYPE_UNSUPPORTED`，改用 `firebase-tools/lib/auth.js` 的 `getAccessToken(refresh_token, loginScopes)` 重新換 token。
- 日常少量新增（例如使用者貼 5～20 張注單）優先使用 `scripts/import-daily-bets.js`，不要在新視窗重新發明匯入方式。寫入前腳本必須先用來源投注 ID 檢查 `bets/ticket-{投注ID}` 是否已存在；存在則停止，不可重複新增。
- 新建立的注單文件 ID 目前採用 `ticket-{來源投注ID}`，例如 `ticket-5350801780626462`。文件欄位至少包含：`id`、`member`、`memberUid`、`memberEmail`、`createdAt`、`createdDate`、`betType`、`settlementRule`、`matchDate`、`date`、`match`、`matchId`、`homeCode`、`awayCode`、`amount`、`odds`、`result`、`selection`、`note`；比分玩法另需包含 `predictedHome`、`predictedAway`。
- 時間欄位規則：投注網站貼出的 `(GMT+8)` 時間要轉成 UTC ISO 字串寫入 `createdAt`，例如 `2026-07-09 20:36:33(GMT+8)` 寫成 `2026-07-09T12:36:33.000Z`；`createdDate` 保留台灣本地日期 `2026-07-09`；比賽開賽日期寫入 `matchDate` 與 `date`，例如 `2026-07-10`。
- `member` 若是張韡本人，固定寫 `Wei`，`memberUid` 固定寫 `qnPcedb81rXsq5o6BjMS4FiqycZ2`，`memberEmail` 固定寫 `k35082005@gmail.com`。其他已知成員 UID／email 依本文件「使用者與角色」或 `app.js` 的成員設定核對，不可只憑暱稱猜。
- 比分玩法的 `note` 寫原始預測比分字串（例如 `2-1`），並同步拆成 `predictedHome: 2`、`predictedAway: 1`。非比分玩法以 `selection` 儲存正式選項，例如半/全場 `阿根廷/平局` 在 `英格蘭 VS 阿根廷` 應存成 `away/draw`。尚未開獎的新注單 `result` 一律寫 `pending`。`matchId` 應優先由腳本查 ESPN scoreboard 補入；若目前無法可靠取得才可先空字串，不要自造看似正式的 `matchId`。
- 寫入後必須逐張 read back 驗證 `bets/ticket-{投注ID}` 已存在，並向使用者回報新增筆數、總下注額、比賽、票號與狀態。
- 若一次要處理大量混合成員注單，先用票號查 Firestore。若票號不存在，再用「同場次、比分、賠率、下注時間批次、既有成員紀錄」交叉比對；遇到同比分同賠率的重複注單，不可只因內容相同就判斷是同一人，必須向使用者標示不確定處或取得更多上下文。
- `scripts/import-daily-bets.js` 是日常匯入 SOP 工具，必須維持文件 ID `ticket-{sourceBetId}`、dry-run 預設、`--apply` 寫入、重複票號拒絕、ESPN `matchId` 對齊、read back 驗證。若未來修改此腳本，先用 dry-run 與少量測試核對欄位，不可退回 `rg-{sourceBetId}` 或只支援比分的舊格式。
- 每筆取用欄位：注單編號／來源投注 ID、玩法、預測比分、賠率、主客隊、開賽時間與下注金額。畫面最後一欄的可贏金額僅供核對，不可誤填成下注金額或派彩；尚未開賽且沒有賽果的注單保持未開獎。
- 批次開始前先讀取 Firestore 目前總筆數；匯入後總筆數應只增加實際新增筆數，並核對每個來源投注 ID、場次、比分、賠率、金額、比賽日期與文件 ID。
- 來源投注 ID 才是判斷兩張原始注單是否為不同投注的最高優先依據。同一場次、比分、賠率與金額完全相同，只要來源投注 ID 不同，就仍是兩筆真實投注；網站跳出重複紀錄確認時應保留兩筆。若來源投注 ID 相同，則視為同一張注單，不可重複新增。

## 賽程、賽果與派彩

- 賽程與賽果主要取自 ESPN 世界盃 scoreboard API；只有 ESPN 對特定日期讀取失敗時，才以 OpenLigaDB 明確標示的正規時間結果備援。
- 下拉選單依選定賽事日期載入比賽，並清楚標示已結束或未開賽。
- 正確比分、全場獨贏、準確進球數與全場大小只判定正規時間比分／勝平負／總進球數，不包含延長賽與 PK 大戰；上半場波膽與上半場獨贏只依 ESPN 可驗證的上半場比分／勝平負結算；半/全場依 ESPN 可驗證的上半場勝平負與正規時間勝平負共同判定；冠軍單在決賽正式完成後，以 ESPN 標示的晉級／勝方判定。
- 尚未正式結束或無可靠正規時間比分的賽事，不得提早結算。
- 預測比分與正規時間比分完全一致才算贏；否則算輸。
- 派彩與淨輸贏必須沿用網站既有定義。修改計算前，先以實際投注案例驗算，不可自行重新解釋欄位名稱。
- 前端開啟網頁時仍會同步結算；GitHub Actions 另每 30 分鐘執行背景結算，並以系統身分寫入 `auditLogs`。
- 賽果來源必須寫入 `resultProvider`，不可在無法判斷正規時間比分時勉強結算。

## 資訊架構與 UI 原則

- 網站採漢堡選單分頁，避免所有區塊在單頁無限向下延伸。
- 目前主要頁面包含：新增紀錄、紀錄明細、總覽、各場預測比分分布、分類統計、款項結算，以及依 ESPN 本屆賽事計算的淘汰賽戰力參考。
- 管理員另有「個人歷史總覽」，只合併 `personalHistoryBets` 與目前 `bets` 中 Wei 自己的紀錄，並可同時統計正確比分與其他玩法。
- 手機版不可因展開明細、寬表格或聚焦輸入欄位而讓整個 viewport 自動縮小或產生大片右側空白。
- 寬表格應在自己的容器內水平捲動，不可撐寬整份文件。
- 漢堡選單在手機上必須明顯、易發現，尤其是預設開啟「新增紀錄」時。
- 所有成員統計版面至少要能容納 6 人；不要把四位成員寫死在欄寬、顏色或資料結構中。
- 紀錄明細的主要欄位順序是：成員、結果、預測比數、賽事／隊伍、賠率、金額、比賽日期、填表日期。
- 各場比分統計要依場次分開，再依預測比分分組列出成員、賠率與金額；不要把不同場次的相同比分混成一張無意義的圓餅圖。
- 分類統計的永久總表不可受篩選條件影響；下方明細表才依日期、場次、成員等條件篩選。

## 技術與部署

- 前端為原生 HTML、CSS、JavaScript：`index.html`、`styles.css`、`app.js`。
- 身分驗證與資料庫使用 Firebase Authentication／Cloud Firestore。
- 網站部署於 Vercel；正式網址為 `https://2026fifa-betting-tracker.vercel.app`。
- Firebase 專案 ID：`fifa2026-53511`。
- GitHub 主要分支是 `master`，使用者不希望為一般修改另開分支。
- 使用者說「PUSH」時，才整理本次相關變更、提交並推送到 `master`；不要混入不相干的本機檔案。
- 推送後若 Vercel webhook 沒有正確發布最新版，可執行 `vercel --prod --yes`，並確認正式 alias 已更新。
- Firestore 規則使用 `firebase deploy --only firestore:rules` 部署；部署前先確認目前登入的 Firebase 帳號與專案。
- 每日 Firestore JSON 備份由 GitHub Actions 產生 gzip artifact，保留 90 天；背景工作使用 repository secret `FIREBASE_SERVICE_ACCOUNT_BASE64`，不得寫入 Git。
- Firebase 設定、備份、除錯記錄與本機筆記不應因網站部署而意外進入 Git；以 `.gitignore` 為準。

## 修改與驗證準則

- 修改前先執行 `git status --short`，保留使用者尚未提交的變更。
- JavaScript 修改後至少執行 `node --check app.js` 與 `git diff --check`。
- 涉及 UI 時，以手機寬度為優先驗證，再檢查桌面版；特別測試表單聚焦、漢堡選單、展開全部明細及 6 位成員情境。
- 涉及 Firestore 時，先確認安全規則不會讓一般成員刪除或覆寫他人完整資料。
- 涉及自動結算時，至少測試：未開賽、正規時間結束、延長賽、PK、ESPN 暫缺比分及重複同步。
- 不要以清空正式資料作為修復方式。需要校正舊資料時，建立可核對、可重跑、不中途遺失資料的遷移流程。
- 未經使用者明確要求，不要刪除舊備份、重設正式資料庫或更改管理員 UID。

## 文件分工

- `AGENTS.md`：穩定的產品背景、規則與協作方式。
- `FUTURE_IMPROVEMENTS.md`：尚未完成或可繼續強化的技術項目。
- `README.md`：給一般開發者看的啟動與部署說明。
- 功能或資料架構有實質變更時，應同步更新相應文件，避免文件與正式站分叉。
