# Firebase 設定步驟（針對 Google 登入）

下面的步驟可以解決你在 Vercel 上使用 Google 登入時出現的「This domain is not authorized for OAuth operations」錯誤。

1) 進入 Firebase Console（https://console.firebase.google.com）→ 選擇你的專案（`fifa2026-53511`）。

2) 授權網域（Authorized domains）
   - 左側選單：Authentication → 設定（齒輪）或直接在 Sign-in method 頁面往下找到 `Authorized domains`。
   - 新增下列網域（至少加入你部署的網址與本機測試域名）：
     - `2026fifa-betting-tracker.vercel.app`
     - `2026fifa-betting-tracker-883h9sy6i-weis-projects-b96d55d0.vercel.app`  （若你看到類似的 preview domain，請一併加入）
     - `localhost`（本機測試用，可加 `localhost:3000`）
   - 儲存。

3) 啟用 Google 登入提供者
   - 左側選單：Authentication → Sign-in method
   - 點選 `Google` → 開啟（Enable）並儲存。
   - Firebase 通常會自動處理 OAuth client 的設定（不需在 Google Cloud Console 手動建立），除非你有特殊需求。

4) （可選）如果你有在 Google Cloud Console 建自訂 OAuth 用戶端，請確認：
   - Authorized JavaScript origins 包含你的 Vercel 網域（例如 `https://2026fifa-betting-tracker.vercel.app`）
   - Authorized redirect URIs 包含 Firebase 使用的 callback（一般情況 Firebase 會自動設定）

5) 測試
   - 在 Vercel 網站上重新載入並點 `使用 Google 登入`。若仍出現相同錯誤，請把完整錯誤訊息或截圖回傳給我。

6) 我已把這些步驟寫進專案檔案：`FIREBASE_SETUP.md`。

---

常見問題：
- 若你看到 `This domain is not authorized for OAuth operations`，通常就是第 (2) 步域名沒加入或與你實際使用的網域不吻合（包含子網域）。
- 若你使用 Vercel 的 alias（像 `2026fifa-betting-tracker.vercel.app`），一定要以 `https://` 或不加都能加入，但要確保輸入時沒有前後空格。

需要我代為把上面的網域加入 Firebase 嗎？
- 我沒辦法在沒有你 Firebase 帳號與權限下直接操作，但我可以把完整步驟、精確網域和要貼上的字串整理好，你只要複製貼上即可。