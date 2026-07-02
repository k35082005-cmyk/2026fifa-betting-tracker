# 2026 FIFA 運彩記錄中心

這是一個簡單、精美的共用 UI，專門用來記錄多位同事共用帳號下的 2026 FIFA 運彩投注內容。

## 功能

- 新增投注紀錄：下注人、日期、賽事、下注金額、賠率、結果、備註
- 即時統計：總筆數、總下注金額、未結算、已結算
- 分組統計：按人分組、按日期分組
- 搜尋與篩選：依照下注人、賽事、結果快速查找
- 本機資料保存：使用瀏覽器 localStorage，自動保存
- 匯出資料：可匯出 JSON，方便後續結帳

## 本機使用

直接開啟 index.html 即可使用，或使用簡單的靜態伺服器：

```bash
python -m http.server 3000
```

然後打開 http://localhost:3000

## 部署到 Vercel

1. 將專案推到 GitHub
2. 在 Vercel 中新增專案，選擇這個 GitHub repository
3. 直接部署即可，Vercel 會把這個靜態網站自動上線

## 推到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```
