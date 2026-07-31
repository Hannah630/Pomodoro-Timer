# 開發階段進度

每個階段 = 一條分支 + 數個 commit + 一次驗收。

> **關於未打勾的「驗收」。** 驗收有兩種：邏輯的由 `npm run test` 與
> `npm run build` 守著，會在 CI 上自動跑；畫面的需要人坐在瀏覽器前面看。
> Stage 2 起未打勾的驗收全部屬於後者，而它們**逐階段回頭補打勾已經沒有意義**
> ——那些階段的程式碼早就被後面的階段改過好幾輪，勾的會是一個不存在的版本。
>
> 取而代之的是文件末尾那份[手動驗收清單](#手動驗收清單)：去重之後的當前版本
> 該檢查什麼，一次跑完。

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

- [x] `src/models/session.model.ts`（`SessionRecord`、`MAX_HISTORY_RECORDS`）
- [x] `src/services/history-storage.ts` + spec（逐筆驗證、壞的丟掉其餘保留）
- [x] `src/services/key-value-storage.ts`（兩個 storage 共用的介面）
- [x] `session.service.ts` 擴充歷史清單 + spec（注入 `now` / `createId`）
- [x] `src/ui/history-view.ts` + spec（收合面板、Clear history）
- [x] `.settings*` 樣式重構成共用的 `.panel*`，兩個面板不重複
- [x] 修 `getSessionDurationMs()`：改記錄開始時的時長，不再即時重算
- [ ] 驗收：完成後出現在最上方、重整後還在、存亂碼不白畫面、超過 100 筆丟最舊

## Stage 11 — 介面可讀性　`feat/ui-affordances`

- [x] Task 欄位改成「標籤 + 橫線」，移到最上方，改用真正的 `<label>`
- [x] Settings 開關加外框，讀起來像控制項而不是說明文字
- [x] 歷史改成右側抽屜（class 控制開合、`inert`、Escape、遮罩、焦點管理）
- [x] `--surface` / `--scrim` token，`.app` 上緣留白避開固定的 History 按鈕
- [ ] 驗收：Task 欄位一眼看得出可以打字、抽屜開合順暢、鍵盤可完整操作

## Stage 12 — 歷史記錄紙　`feat/history-record-sheet`

- [x] Task 欄位移到 Start / Reset 下方，輪次圓點排在它下面
- [x] `src/ui/history-format.ts` + spec（日期分組、今日統計、手寫英文日期格式）
- [x] 歷史改成記錄紙：日期分組標題（sticky）、每列細橫線、右側等寬數字
- [x] 抽屜頂部加今日統計 `N sessions · M min today`
- [x] 拿掉 `Intl.DateTimeFormat`——它跟著瀏覽器語系跑，介面會冒出中文
- [x] 拿掉 `window.confirm`——原生按鈕是瀏覽器語言，改成按鈕自身兩段式確認
- [ ] 驗收：歷史分組正確、介面全英文、清除要按兩次、抽屜捲動時日期標題吸頂

## Stage 13 — 工具列與填色欄位　`feat/drawer-toolbar`

- [x] Task 欄位從底線改成填色方框（`--control` / `--control-hover` token）
- [x] 移除輪次圓點與完成次數（`rounds-view` 連測試一併刪除）
- [x] Settings 從 `<details>` 改成抽屜，與 History 並排在右上工具列
- [x] `src/ui/drawer.ts`：兩個抽屜共用開合、焦點、`inert`、Escape、遮罩
- [x] 同時只能開一個抽屜；開啟中的按鈕以模式色標示
- [x] `--dot-size` 更名為 `--dial-cap-size`（圓點沒了，只剩錶盤軸心在用）
- [ ] 驗收：Task 欄位一眼可辨、兩個抽屜互斥、鍵盤可完整操作

> 副作用：畫面上不再顯示「離長休息還有幾輪」。行為本身沒變，`TimerService`
> 的測試仍然守著；要顯示的話最省空間的位置是模式標籤（`FOCUS 3/4`）。

## Stage 14 — 番茄水印與版面分組　`feat/tomato-watermark`

- [x] `public/tomato.svg` 當 CSS mask，顏色仍由 token 決定；靜態不動畫
- [x] `--field` 改成半透明，水印能透出來
- [x] `.session__instrument` 把錶盤／模式／時間收成一組，組間才拉開
- [x] 輪次併回模式標籤（`Focus · 3/4`），`labels.ts` + spec
- [ ] 驗收：水印夠淡不干擾、三組層次清楚、輪次數字正確跨週期

## Stage 15 — 秒數精度　`feat/second-precision`

- [x] `TimerSettings` 改存秒（`focusSeconds` 等），下限 5 秒
- [x] Settings 每列拆成「分 / 秒」兩個欄位，model 仍只存一個數字
- [x] **存檔升到 v2 並寫遷移**（v1 的分鐘 × 60），舊設定不會被丟掉
- [ ] 驗收：可設 10 秒；舊存檔（v1）重整後設定仍在且值正確

## Stage 16 — 歷史保留與統計　`feat/history-totals`

- [x] 上限 100 → 500 筆，另加 90 天期限（`MAX_HISTORY_AGE_DAYS`）
- [x] `SessionService.getTotalFocusMs()` 累加器，清空歷史不會歸零
- [x] `totalFocusMs` 存進主存檔（欄位缺失自動回退 0，不需再升版本）
- [x] 抽屜加 All time 一行，日期標題加當日小計
- [ ] 驗收：完成幾輪後 All time 正確；清空歷史後 All time 仍在

## Stage 17 — 轉場說明與百分秒　`feat/transition-clarity`

- [x] 主按鈕改成 `Start short break` / `Start long break`（`formatPrimaryAction`）
- [x] 休息時也顯示週期位置，break 以它跟隨的那一輪編號
- [x] 專注中預告 `Next: long break`，規則來自 `TimerService.getNextMode()`
- [x] 時間顯示 `mm:ss·cs`，百分秒做成小字後綴、獨立元素高頻更新
- [x] `formatCountdown()` 一次進位算出兩段，避免 24:59 顯示成 `25:00 · 50`
- [x] tick 250ms → 16ms，`--transition-fill` 240ms → 120ms
- [ ] 驗收：百分秒流暢、大字不抖、按鈕文字正確、手機不爆版

## Stage 18 — 兩種模式與專注鎖定　`feat/two-modes`

- [x] 合併成單一 Break，移除 `longBreak` 與 `roundsPerLongBreak`
- [x] `selectMode()` 手動切換；切到當前模式為 no-op，避免誤點毀掉進行中的一段
- [x] `src/ui/modes-view.ts` 分段控制器，同時是模式標籤（不再有重複的 heading）
- [x] 存檔升到 **v3**，遷移改成鏈式（v1 → v2 → v3），下次升版只需描述差異
- [x] `src/ui/focus-guard.ts`：Start 進全螢幕、切走自動暫停
- [x] 移除 `Next:` 預告與週期編號——只剩兩個模式時它們已無資訊量
- [ ] 驗收：手動切換、離開自動暫停、v1/v2 舊存檔遷移正確

> 網頁無法阻止使用者切換 app，這是瀏覽器的安全邊界。這裡做的是「拒絕把離開的
> 時間算成專注」，不是真的鎖定。

## Stage 19 — 收尾、可用性與工程化　`worktree-stage-19-polish`

### 19.1 文件同步　`chore/docs-sync`

- [x] `Architecture.md`：tick 250ms → 16ms，並說明為何需要一幀的密度
- [x] `Architecture.md`：`--mode` 三選一 → 兩個模式
- [x] `Architecture.md`：存檔 v1 → v3，補上版本表與鏈式遷移的理由
- [x] `Architecture.md`：歷史 100 筆 → 500 筆 + 90 天，說明兩道限制為何都要
- [x] `Architecture.md`：新增「時長的單位是秒」（Stage 15 從未寫進文件）
- [x] `Architecture.md`：新增「測試策略」，取代過時的「只測 timer.service」
- [x] `README.md`：整數分鐘 → 秒精度；100 筆 → 500 筆 / 90 天
- [x] 刪 `.cursor/rules/02-angular.md`（空檔，且本專案無 Angular）
- [x] 刪 `docs/Notes.md`（空檔）
- [x] `index.html` 補 favicon，不再每次載入吃一個 404
- [ ] README 截圖（需要瀏覽器，留給人做）

### 19.2 工具鏈與 CI　`chore/tooling`

- [x] Prettier + `.prettierrc`，`.prettierignore` 排除 `*.md`（中文表格會被排歪）
- [x] `endOfLine: "auto"`——工作目錄是 CRLF，不設的話 42 個檔案全被判定要改
- [x] oxlint 取代 ESLint：typescript-eslint 明確拒絕 TS 7，理由寫在架構文件
- [x] `lint` / `format` / `format:check` 三個 script
- [x] 全庫格式化（16 個檔案，都是換行位置）
- [x] 移除 `vite.config.ts` 的 triple-slash reference——lint 抓到的，第 2 行的
      `import` 已經帶進同一份型別，它從一開始就是多餘的
- [x] `ci.yml`：PR 與非 main 分支跑 lint / format / test / build
- [x] `deploy.yml` 補上 lint（不含格式檢查——排版問題不該擋住線上更新）
- [ ] 驗收：開一條 PR 確認 CI 跑得起來且擋得住失敗

## 第二階段（MVP 之後）

- [ ] 進行中的計時在重整後續跑
- [ ] 休息結束自動接續下一輪（auto-start）
- [ ] Web Worker 計時，解決背景分頁通知延遲
- [ ] 統計、任務標籤、歷史紀錄
- [ ] 深色模式、音效選擇、音量控制
- [ ] `document.title` 同步倒數
- [ ] PWA、鍵盤快捷鍵、i18n

## 手動驗收清單

自動的部分（`npm run test`、`npm run build`）不列在這裡——CI 會擋。這份清單只
收**必須有人在瀏覽器前面才能確認**的事，是 Stage 2～18 那 17 項驗收去重後的
當前版本。

跑之前把 Focus 設成 10 秒、Break 設成 5 秒，否則光等就要一小時。

### 計時

- [ ] Start 開始倒數，百分秒流暢不抖，大字不跟著跳動
- [ ] Pause 停住、再按接續，Reset 回到整段開頭
- [ ] Focus 歸零 → 聽得到提示音、畫面色彩淡出一次、切到 Break
- [ ] 分頁切到背景並等歸零 → **通知仍然出現**，回到前景時倒數不落後
- [ ] 手動切換 Focus / Break 會重設成該模式的完整時長；重複點當前模式沒有反應

### 專注鎖定

- [ ] 按 Start 開始 Focus 會進入全螢幕
- [ ] 計時中切到別的視窗 → 自動暫停，並顯示「你離開了」的提示
- [ ] 拒絕通知權限的情況下，時間到仍有畫面提示，且 console 沒有錯誤

### 設定與存檔

- [ ] 改成 10 秒後 Reset 從 00:10 開始
- [ ] 輸入 0 / -5 / `abc` / 空白都不會壞，欄位會顯示被修正後的值
- [ ] 重整後設定、完成次數、All time 與歷史都還在
- [ ] localStorage 塞亂碼進 `pomodoro-timer` → 仍然用預設值開得起來
- [ ] 塞亂碼進 `pomodoro-timer:history` → 歷史清空但**設定不受影響**

### 介面

- [ ] Task 欄位一眼看得出可以打字；休息時整個欄位（含標籤）隱藏
- [ ] Settings 與 History 兩個抽屜互斥，同時只能開一個
- [ ] 抽屜可用 Escape 關閉、點遮罩關閉，關閉後焦點回到原本的按鈕
- [ ] 只用鍵盤能走完：開抽屜 → 改設定 → 關抽屜 → 開始計時
- [ ] 歷史按日期分組，捲動時日期標題吸頂，Clear history 要按兩次才清
- [ ] 介面全英文（把瀏覽器語言改成中文再看一次）
- [ ] 分頁圖示是番茄，DevTools Network 沒有 `favicon.ico` 的 404
- [ ] 375px、740×360、1440px 三個尺寸都不破版
