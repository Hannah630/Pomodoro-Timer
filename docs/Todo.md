# 開發階段進度

每個階段 = 一條分支 + 數個 commit + 一次驗收。

## Stage 0 — 專案初始化　`chore/project-setup`

- [x] `package.json`（dev / build / preview / test scripts）
- [x] `tsconfig.json`（strict）
- [x] `vite.config.ts`（含 Vitest 設定）
- [x] `index.html`、`src/main.ts`
- [x] `.gitignore`
- [x] 分支從 `master` 改名為 `main`
- [x] 驗收：`npm run dev` 開得起來、`npm run build` 無錯、`npm run test` 可執行

## Stage 1 — Model 與計時核心　`feat/timer-core`

- [x] `src/models/timer.model.ts`（型別 + `DEFAULT_SETTINGS`）
- [x] `src/utils/format.ts` + `format.spec.ts`（`formatTime`，秒數無條件進位）
- [x] `src/services/timer.service.ts`（deadline 法狀態機、注入 `now()`）
- [x] `src/services/timer.service.spec.ts`
- [x] 移除 `vite.config.ts` 的 `passWithNoTests`
- [x] 驗收：26 個單元測試全部通過，`npm run build` 無錯

## Stage 2 — 基本 UI 接線　`feat/timer-ui`

- [x] `src/ui/timer-view.ts`、`src/ui/controls-view.ts`、`src/ui/dom.ts`
- [x] `src/styles/base.css`（token）、`src/styles/layout.css`（版面與元件）
- [x] `index.html` 靜態骨架、`src/main.ts` 接線
- [x] `visibilitychange` 回前景補 tick 一次
- [x] `TimerService.getSessionDurationMs()`（UI 需要換算進度比例）
- [ ] 驗收：Start 每秒跳動、Pause 停住、Resume 接續、Reset 回到 25:00

## Stage 3 — 輪次與自動切換　`feat/round-cycle`

- [x] `src/ui/rounds-view.ts` + spec（輪次指示點、完成次數）
- [x] `.rounds` 樣式與 `--dot-size` / `--space-xs` token
- [x] 模式切換規則本身在 Stage 1 已完成並測過，本階段未動 service
- [ ] 驗收：第 4 輪結束進長休息，第 5 輪回短休息

## Stage 4 — 設定面板　`feat/settings`

- [x] `src/ui/settings-view.ts` + spec（解析輸入文字）
- [x] `TimerService` 建構子與 `updateSettings` 統一做範圍與整數驗證
- [x] `MIN_SESSION_MINUTES` / `MAX_SESSION_MINUTES` / `MIN_ROUNDS_PER_LONG_BREAK`
- [x] `<details>` 收合面板與 `.field` 樣式
- [ ] 驗收：改成 1 分鐘後 Reset 從 01:00 開始；輸入 0 / -5 / "abc" 不會壞

## Stage 5 — 本地儲存　`feat/persistence`

- [x] `src/services/storage.service.ts` + spec（版本化信封、壞資料容錯）
- [x] `main.ts` 啟動時還原、完成一輪與改設定時寫入
- [ ] 驗收：重整後設定與完成次數保留；localStorage 存亂碼仍能正常開啟

## Stage 6 — 通知與音效　`feat/notification`

- [x] `src/services/notification.service.ts`（Web Audio 合成提示音 + Notification）
- [x] `src/ui/labels.ts`（模式名稱抽出共用，timer-view 與通知文案不重複）
- [x] `timerView.flash()` + `.level::after` 色彩淡出（不依賴權限的降級提示）
- [x] ~~`public/sounds/bell.mp3`~~ 改用 Web Audio 合成，不加二進位資產
- [ ] 驗收：歸零聽得到聲音；允許權限看得到通知；拒絕權限仍有畫面提示且 console 無錯

## Stage 7 — RWD 與收尾　`feat/responsive-polish`

- [x] 色彩隨模式變化（Stage 2 的 `--mode` token 就已完成）
- [x] 倒數字級改用 `min(23vw, 26vh)`，橫向手機不會被字撐爆
- [x] 手機點擊不出現藍色 highlight、`theme-color` 對齊底色
- [x] README 補上功能、架構與使用說明
- [ ] 驗收：375px 與 1440px 皆正常；`npm run build` 成功；打上 `v0.1` tag
- [ ] README 截圖（我沒有瀏覽器工具，需要你自己截）

## Stage 8 — 類比錶盤　`feat/clock-dial`

- [x] `.dial` 刻度、剩餘弧、指針，全部由 `--fill` 驅動，零新增 TypeScript
- [x] `@property --fill` 註冊成 `<number>`，讓倒數變化可以被 transition
- [x] `.level` 色場降為背景氛圍（12% → 7%，亮線 2px → 1px）
- [x] 短視窗 media query（`max-height: 34rem`）收緊間距與尺寸
- [ ] 驗收：指針隨倒數轉、切模式換色、375 / 740×360 / 1440 三個尺寸不破版

## Stage 9 — 標題欄位　`feat/session-title`

- [x] `src/ui/title-view.ts`（`render` 管顯示、`setValue` 管值，分開避免蓋掉輸入）
- [x] `src/services/session.service.ts` + spec（trim、上限、不切斷 emoji）
- [x] `MAX_TITLE_LENGTH` 由 service 提供，`maxLength` 屬性從 TS 設定
- [ ] 驗收：上限 20 字、休息時隱藏、切回專注保留上次輸入

## Stage 10 — 歷史記錄　`feat/session-history`

- [ ] `src/models/session.model.ts`（`SessionRecord`）
- [ ] `src/services/history-storage.ts`（第二個 localStorage key）
- [ ] `src/ui/history-view.ts`（收合面板、Clear history）
- [ ] 驗收：完成後出現在最上方、重整後還在、存亂碼不白畫面、超過 100 筆丟最舊

## 第二階段（MVP 之後）

- [ ] 進行中的計時在重整後續跑
- [ ] 休息結束自動接續下一輪（auto-start）
- [ ] Web Worker 計時，解決背景分頁通知延遲
- [ ] 統計、任務標籤、歷史紀錄
- [ ] 深色模式、音效選擇、音量控制
- [ ] `document.title` 同步倒數
- [ ] PWA、鍵盤快捷鍵、i18n
