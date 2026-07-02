# Firebase：Google 登入與資料庫規則

這個網站使用 Google Authentication，並把所有登入成員的紀錄同步到：

```text
betRecords/shared
```

因此目前的 `firestore.rules` 是「所有已登入的 Google 使用者可共享同一份資料」。如果網站會公開給陌生人使用，建議之後再加上允許名單，不要只依賴「有登入」。

## 1. 開啟 Google 登入

1. 進入 [Firebase Console](https://console.firebase.google.com/)。
2. 選擇專案 `fifa2026-53511`。
3. 開啟 **Authentication → Sign-in method → Google**。
4. 啟用 Google，選擇支援電子郵件，然後儲存。

## 2. 加入授權網域

前往 **Authentication → Settings → Authorized domains**，加入實際會開啟網站的網域，例如：

```text
localhost
2026fifa-betting-tracker.vercel.app
```

只填網域，不要包含 `https://`、路徑或連接埠。Vercel Preview 每次可能有不同網址；測試時要把當次 Preview 的網域也加入。

若看到 `This domain is not authorized for OAuth operations`，通常就是這裡漏加。

## 3. 建立 Firestore Database

前往 **Firestore Database → Create database**。正式環境建議選擇 Production mode；接著發布本專案的 `firestore.rules`。

可直接在 Firebase Console 的 **Firestore Database → Rules** 貼上 `firestore.rules` 內容並按 **Publish**。

如果有安裝 Firebase CLI，也可以在專案目錄執行：

```bash
firebase login
firebase use fifa2026-53511
firebase deploy --only firestore:rules
```

## 目前規則的行為

- 未登入：不能讀寫雲端資料。
- 已登入：只能讀寫 `betRecords/shared`。
- 每次最多保存 500 筆紀錄。
- 其他 Firestore collection 全部拒絕。
- 網站目前沒有上傳檔案，因此 `storage.rules` 全部拒絕，避免留下不必要的入口。

> Firebase Web API key 會出現在前端是正常的；真正的資料保護來自 Authentication、Firestore Rules、Authorized domains，以及必要時的 App Check。
