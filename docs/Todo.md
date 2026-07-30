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

- [ ] `src/ui/timer-view.ts`、`src/ui/controls-view.ts`
- [ ] `src/styles/base.css`
- [ ] 驗收：Start 每秒跳動、Pause 停住、Resume 接續、Reset 回到 25:00

## Stage 3 — 輪次與自動切換　`feat/round-cycle`

- [ ] 完成次數累計、4 輪進長休息、輪次指示點
- [ ] 驗收：第 4 輪結束進長休息，第 5 輪回短休息

## Stage 4 — 設定面板　`feat/settings`

- [ ] `src/ui/settings-view.ts`（含輸入驗證 clamp 1–120）
- [ ] 驗收：改成 1 分鐘後 Reset 從 01:00 開始；輸入 0 / -5 / "abc" 不會壞

## Stage 5 — 本地儲存　`feat/persistence`

- [ ] `src/services/storage.service.ts`
- [ ] 驗收：重整後設定與完成次數保留；localStorage 存亂碼仍能正常開啟

## Stage 6 — 通知與音效　`feat/notification`

- [ ] `src/services/notification.service.ts`、`public/sounds/bell.mp3`
- [ ] 驗收：歸零聽得到聲音；允許權限看得到通知；拒絕權限仍有畫面提示且 console 無錯

## Stage 7 — RWD 與收尾　`feat/responsive-polish`

- [ ] `src/styles/layout.css`、色彩隨模式變化
- [ ] 驗收：375px 與 1440px 皆正常；`npm run build` 成功；打上 `v0.1` tag

## 第二階段（MVP 之後）

- [ ] 進行中的計時在重整後續跑
- [ ] 休息結束自動接續下一輪（auto-start）
- [ ] Web Worker 計時，解決背景分頁通知延遲
- [ ] 統計、任務標籤、歷史紀錄
- [ ] 深色模式、音效選擇、音量控制
- [ ] `document.title` 同步倒數
- [ ] PWA、鍵盤快捷鍵、i18n
