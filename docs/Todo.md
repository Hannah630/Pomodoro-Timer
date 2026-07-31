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

### 19.3 三個小功能　`feat/small-affordances`

- [x] Task 標題存進主存檔，重整後還在（不需升版本，缺欄位就回退成空字串）
- [x] 還原的標題也走 `normalizeTitle()`——storage 只檢查型別，不檢查長度
- [x] `document-title-view.ts`：計時中分頁標題顯示 `25:00 · Focus`
- [x] `formatDocumentTitle()` 抽成純函式並就地測；只有 running 才掛倒數
- [x] `shortcuts.ts`：Space 走主按鈕、R 走 Reset
- [x] `resolveShortcut()` 純函式，四個「不該觸發」的條件全部可測
- [x] 快捷鍵呼叫按鈕的 `click()` 而不是複製 handler——順帶保住 user
      activation，全螢幕與音效解鎖才不會失效
- [x] `DrawerGroup.isAnyOpen()`：抽屜是模態，開著時全域快捷鍵不作用
- [ ] 驗收：見手動驗收清單

### 19.4 排程與渲染　`perf/tick-scheduling`

- [x] `tick-scheduler.ts`：`TickScheduler` 介面 + 預設的 interval 實作
- [x] `frame-scheduler.ts`：rAF + 1 秒 interval 混合，`main.ts` 注入
- [x] **既有 119 個測試一行都沒改**——預設值選對了才會這樣
- [x] `startInterval` / `stopInterval` 更名為 `startTicking` / `stopTicking`
      （它們已經不是 interval 了）
- [x] `main.ts` 的 `render()` 分成「每幀」與「有變才畫」兩組
- [x] `format.ts` 不再自己宣告一份 `SECONDS_PER_MINUTE`
- [ ] 驗收：見手動驗收清單，特別是「背景分頁歸零仍會通知」那一項

## Stage 20 — 主題與可近用性　`stage-20/design`

### 20.1 缺陷修正

- [x] `prefers-reduced-motion` 原本沒管到 `alert-wash`——全 app 幅度最大的動態
      反而是唯一沒被處理的。改成**調弱**（0.5 → 0.18）而不是關掉：它是通知被拒
      時唯一剩下的提示
- [x] 加 `role="status"` 的 live region，時間到會播報。錶盤 `aria-hidden`、時鐘
      `aria-live="off"`，在此之前螢幕閱讀器完全收不到結束訊號
- [x] 通知與播報共用 `formatCompletion()`，不再各寫一份字串
- [x] `--focus-ring` / `--focus-ring-offset`：六個元素原本有兩色兩 offset
- [x] `--muted` 提亮（深色 4.8:1 → 6.0:1）

### 20.2 淺色主題

- [x] `@media (prefers-color-scheme: light)` 覆寫 5 個 token，其餘由
      `color-mix` 自動翻面
- [x] `--on-mode`：疊在模式色上的文字色，**不跟主題變**。原本用 `--ink`，
      淺色主題下是 3.1:1
- [x] `--surface` 在淺色主題要獨立指定——浮起來的面應該比背景亮
- [x] `theme-color` 拆成兩個，各帶 `media`
- [x] 兩套主題的所有文字組合都算過 ≥ 4.5:1，非文字 ≥ 3:1

### 20.3 排版層級

- [x] 字距分三級（`label` / `action` / `meta`），原本十個元素共用一種
- [x] 今日次數與暫停原因改為「讀」的排版：不 uppercase、窄字距
- [x] 今日次數移到時鐘下方，不再插在模式與時鐘之間
- [x] 暫停原因不再用模式色（在 focus 是紅字，讀起來像錯誤）
- [x] 時鐘字重 800 → 700：系統字體沒有 800，瀏覽器是合成出來的
- [ ] 驗收：見手動驗收清單
- [ ] **未做**：把時鐘移進錶盤中心。需要在瀏覽器裡反覆看，留給有畫面的人

## Stage 21 — 天氣　`feat/weather`

範圍刻意小：**一行**，不是一塊。

- [x] `models/weather.model.ts`：型別、WMO 代碼對照、30 分鐘的快取期限
- [x] `services/geolocation.service.ts`：`navigator.geolocation` 的包裝。沒有
      API、被拒絕、逾時，三種都收斂成 `null`
- [x] 位置：**錶盤正上方**。原本放在 Settings 抽屜底部，使用者要求改到主畫面。
      代價用排版壓下來——`--muted` 最小級字、沒讀數就留白、`min-height: 1lh`
      保留行高避免版面位移
- [x] 載入時就定位（第一次會跳權限視窗），回到前景時再試一次。
      隨之移除只有抽屜用得到的 `DrawerConfig.onOpen`
- [x] `services/weather.service.ts`：Open-Meteo（**免金鑰**，因為 Pages 是靜態
      主機藏不住 key）、座標降到小數兩位、第三把 storage key、注入
      `fetchJson` / `locate` / `now` 三個 port
- [x] `ui/weather-format.ts`：WMO 代碼轉字、時區轉地名、整數度數（純函式，有測）
- [x] `ui/weather-view.ts`：有讀數就寫上去，沒有就留白
- [x] 28 個新測試（133 → 161）
- [ ] 驗收：見手動驗收清單
- [ ] **未做**：把天氣接進休息建議（「外面在下雨，這次休息待在室內」）。那才是
      讓天氣不只是裝飾的做法，但它會動到 `formatCompletion()` 的語意，不屬於
      「小」這個範圍

## Stage 22 — 當地時間　`feat/local-time`

- [x] `ui/local-time-view.ts`：`2026/07/31 14:32`，排在天氣那一行上面
- [x] 自己組字串不用 `toLocaleString`——避免中文機器寫出中文，也避免
      `07/31` 與 `31/07` 兩種順序都可能出現
- [x] 每秒 render 一次，但比對過才寫 DOM；`visibilitychange` 回前景補畫一次
- [x] `padTwoDigits()` 改成從 `utils/format.ts` 匯出，跟倒數共用
- [x] 版面：`--text` + `--step-title`，比天氣亮一階、比倒數小得多；負 margin
      讓它跟天氣黏成一組，而不是兩排各自獨立
- [x] 4 個新測試（161 → 166，含日期格式改動後補的一個）
- [ ] 驗收：見手動驗收清單

## Stage 23 — 結束動畫　`feat/completion-animation`

- [x] 原本只有整頁色彩淡出一層，讀起來是「顏色變了一下」而不是「時間到了」
- [x] `.dial` 加 `alert-ring`：兩圈向外擴散的環。上發條的計時器在錶盤上響，
      所以從錶盤出去；跑兩圈不是一圈，第二聲才讀得出是聲音
- [x] 環用 `box-shadow` 不用新元素——`.dial` 兩個偽元素給了刻度和弧，都用掉了，
      而擴散陰影不佔版面，不會把天氣與模式按鈕推開
- [x] `.session__time` 加 `alert-beat`：1.08 → 1 落定一次。抽動的數字像出錯，
      落下的數字像抵達。此時 status 已是 `idle`，不跟百分秒重繪打架
- [x] `ALERT_DURATION_MS` 900 → 1200，撐過最長的那一層
- [x] `prefers-reduced-motion`：環與時鐘整個關掉，淡出維持只調弱——兩者都不是
      任何人唯一的管道，淡出是
- [x] 沒有新測試：`timer-view.ts` 是純瀏覽器副作用，依慣例沒有 spec
- [ ] 驗收：見手動驗收清單

## Stage 24 — 原生外殼的前置　`feat/native-shell-prep`

不裝 Capacitor。這四件事各自站得住腳、都能在 node 測，先做掉可以讓第一次封裝
少踩幾個雷。

- [x] `vite build --mode native` 讓 `base` 回到 `/`；用 Vite 的 `--mode` 而不是
      環境變數，因為 npm script 在 Windows 走 cmd
- [x] `viewport-fit=cover` + 四個 `--safe-*` token，套到 `.app`（四邊）、
      `.toolbar`（上右）、`.drawer`（上下右）。**對現在的手機瀏覽器就有效**
- [x] `TimerService.getEndAt()` / `getNextMode()`：要預約通知就得先知道幾點響、
      要說什麼。不進 `TimerState`——沒有 view 要畫 deadline
- [x] `NotificationService` 加 `schedule()` / `cancel()`；web 實作是空的，因為
      瀏覽器沒有可以託付的排程器
- [x] `main.ts` 的 `bookCompletion()` 掛在 render 的「有變才畫」那一半——
      deadline 移動的五種情況全都會改變 mode 或 status，純 tick 不會
- [x] 6 個新測試（166 → 172）
- [ ] 驗收：見手動驗收清單

## Stage 25 — Capacitor 測試封裝　`feat/capacitor`（未開始）

- [ ] `src/platform/`，動態 import 隔開，`services` 與 `ui` 維持零 runtime 相依
- [ ] `@capacitor/local-notifications`：Android 12+ 要 `SCHEDULE_EXACT_ALARM`
      並開 `allowWhileIdle`，否則系統會為了省電把鬧鐘延後
- [ ] Android 13+ 通知改成 runtime 權限，`enable()` 要變 async
- [ ] `App.addListener('appStateChange')` 取代 `visibilitychange`
- [ ] **原生不再「離開就暫停」**：手機上拉通知中心、接電話都會觸發離開，
      而 deadline + OS 排程已經保證計時正確。web 版維持原行為
- [ ] 全螢幕在 WKWebView 無效（現有程式碼已防呆），原生換成隱藏狀態列
- [ ] 待實測：open-meteo 的 CORS 在 `capacitor://localhost` 過不過。過不了就把
      `fetchJson` 換成原生 HTTP——它已經是注入的，`weather.service` 不用動
- [ ] 待實測：`localStorage` 會不會被 WKWebView 回收。真的會掉再換
      `@capacitor/preferences`；介面不用改，注入不同的 `KeyValueStorage` 就好

## 第二階段（MVP 之後）

- [ ] 進行中的計時在重整後續跑
- [ ] 休息結束自動接續下一輪（auto-start）
- [ ] Web Worker 計時，解決背景分頁通知延遲
- [ ] 統計、任務標籤、歷史紀錄
- [ ] 深色模式、音效選擇、音量控制
- [ ] PWA、i18n

## 手動驗收清單

自動的部分（`npm run test`、`npm run build`）不列在這裡——CI 會擋。這份清單只
收**必須有人在瀏覽器前面才能確認**的事，是 Stage 2～18 那 17 項驗收去重後的
當前版本。

跑之前把 Focus 設成 10 秒、Break 設成 5 秒，否則光等就要一小時。

### 在手機上跑這份清單

用 USB 連線 + Chrome 的 port forwarding，**不要**用 `http://192.168.x.x:5173`。

原因是通知與定位都要求 **secure context**：區網 IP 不算，那兩個功能會直接壞
掉，而看起來會像程式有 bug。port forwarding 之後手機看到的網址是
`localhost:5173`，localhost **算**，所以權限流程跟正式環境一模一樣。

1. 手機：設定 → 開發者選項 → 開啟 **USB 偵錯**，接上電腦
2. 電腦 Chrome 開 `chrome://inspect/#devices` → **Port forwarding** →
   加一條 `5173` → `localhost:5173` → 勾 Enable
3. 電腦 `npm run dev`
4. 手機 Chrome 開 `http://localhost:5173`

`chrome://inspect` 那頁可以對手機上的分頁直接開 DevTools，console 與版面都看得
到。不需要 Android Studio、JDK 或任何通道服務。

沒有實機時，DevTools 的裝置模擬選有瀏海的 iPhone 機型可以代替下面的「安全區」
那幾條——它會實際餵 `env(safe-area-inset-*)` 進去——其餘的仍然要實機。

### 計時

- [ ] Start 開始倒數，百分秒流暢不抖，大字不跟著跳動
- [ ] Pause 停住、再按接續，Reset 回到整段開頭
- [ ] Focus 歸零 → 聽得到提示音、畫面跑完三層結束動畫、切到 Break
- [ ] 分頁切到背景並等歸零 → **通知仍然出現**，回到前景時倒數不落後
- [ ] 手動切換 Focus / Break 會重設成該模式的完整時長；重複點當前模式沒有反應

### 專注鎖定

- [ ] 按 Start 開始 Focus 會進入全螢幕
- [ ] 計時中切到別的視窗 → 自動暫停，並顯示「你離開了」的提示
- [ ] 拒絕通知權限的情況下，時間到仍有畫面提示，且 console 沒有錯誤

### 設定與存檔

- [ ] 改成 10 秒後 Reset 從 00:10 開始
- [ ] 輸入 0 / -5 / `abc` / 空白都不會壞，欄位會顯示被修正後的值
- [ ] 重整後設定、完成次數、All time、歷史與 **Task 標題**都還在
- [ ] localStorage 塞亂碼進 `pomodoro-timer` → 仍然用預設值開得起來
- [ ] 塞亂碼進 `pomodoro-timer:history` → 歷史清空但**設定不受影響**

### 鍵盤與分頁

- [ ] 焦點在 Task 欄位時打 `r` 與空白鍵只會打字，不會動到計時
- [ ] 點空白處後按 Space 開始 / 暫停，按 R 重設
- [ ] 焦點停在 Start 按鈕上按 Space → **只切換一次**，不是兩次
- [ ] 抽屜開著時 Space 與 R 沒有反應
- [ ] `Ctrl` + `R` 仍然是瀏覽器重新整理
- [ ] 用 Space 開始 Focus 一樣會進全螢幕、一樣聽得到提示音
- [ ] 計時中分頁標題顯示 `00:09 · Focus`；暫停後回到 `Pomodoro Timer`

### 介面

- [ ] Task 欄位一眼看得出可以打字；休息時整個欄位（含標籤）隱藏
- [ ] Settings 與 History 兩個抽屜互斥，同時只能開一個
- [ ] 抽屜可用 Escape 關閉、點遮罩關閉，關閉後焦點回到原本的按鈕
- [ ] 只用鍵盤能走完：開抽屜 → 改設定 → 關抽屜 → 開始計時
- [ ] 歷史按日期分組，捲動時日期標題吸頂，Clear history 要按兩次才清
- [ ] 介面全英文（把瀏覽器語言改成中文再看一次）
- [ ] 分頁圖示是番茄，DevTools Network 沒有 `favicon.ico` 的 404
- [ ] 375px、740×360、1440px 三個尺寸都不破版
- [ ] 用 DevTools 模擬 iPhone（有瀏海那幾台）並轉成橫式：右上角兩顆按鈕不被
      瀏海壓到，底部 Start / Reset 不被手勢條蓋住，抽屜也一樣

### 主題與可近用性

- [ ] 把系統切成淺色 → 整個介面翻面，抽屜比背景亮，瀏覽器上下欄配色跟著換
- [ ] 淺色主題下 Start 按鈕與被選中的模式按鈕**是深色字**，不是淡色字
- [ ] 兩套主題下 Task 欄位的 placeholder 都讀得清楚
- [ ] Tab 走一遍所有控制項，焦點框到處都是同一個樣子
- [ ] 開螢幕閱讀器（Windows 用 NVDA 或講述人），時間到會聽到
      "Focus finished. Up next: break"
- [ ] 時間到：錶盤向外擴散兩圈、時鐘落定一次、整頁色彩淡出，三件事同時發生，
      而且天氣列與模式按鈕**沒有跟著位移**
- [ ] 系統開啟「減少動態」後，時間到仍看得到色彩變化，只是變淡；錶盤與時鐘
      完全不動
- [ ] 連續兩段同類型的 session 結束，第二次仍然會播報，動畫也完整重播

### 當地時間

- [ ] 錶盤上方最上面一行是 `2026/07/31 14:32`，跟系統時鐘一致
- [ ] 盯著看：整分的時候會自己跳，不用重整
- [ ] 把瀏覽器語言改成中文再看一次 → 格式**不變**，仍然是 `YYYY/MM/DD HH:MM`
- [ ] 切到別的分頁放兩分鐘再切回來 → 時間立刻是對的，不是慢一分鐘

### 天氣

- [ ] 第一次載入跳定位權限視窗，允許後**錶盤上方**出現
      `Taipei · 27° · 26–35° · Partly cloudy`
- [ ] 天氣填進去的那一刻，錶盤與時鐘**沒有往下移動**（保留行高有生效）
- [ ] 重整：立刻顯示，DevTools Network 沒有新的 open-meteo 請求（走快取），
      也不會再問一次定位
- [ ] 拒絕權限 → 那一行**留白**，不是錯誤訊息；**計時完全不受影響**
- [ ] DevTools 切成 Offline 再清掉 `pomodoro-timer:weather` 重整 → 一樣留白，
      不是當掉
- [ ] localStorage 塞亂碼進 `pomodoro-timer:weather` → 重新抓，設定與歷史不受影響
- [ ] 切到別的分頁再切回來：Network 沒有新請求（半小時內）
- [ ] 螢幕閱讀器：讀數填進去時會被讀出來（`aria-live="polite"`）

### 手機實機

封裝之前要掃乾淨的一輪。進了 Capacitor 之後每個 bug 都會先被懷疑是封裝造成
的，這一輪就是用來排除那個懷疑的基準線。

**安全區**（Stage 24 新加的，第一次驗）

- [ ] 直式：右上角 Settings / History 兩顆按鈕沒有被瀏海或狀態列壓到
- [ ] 直式：底部 Start / Reset 沒有被手勢條蓋住，按得到
- [ ] **橫式**：轉過去之後上面兩條仍然成立——橫式才會有左右 inset
- [ ] 橫式開抽屜：內容沒有貼到圓角，Clear history 按得到
- [ ] 沒有瀏海的機型／桌機：版面**沒有多出空白**（inset 應為 0）

**觸控與版面**

- [ ] 所有按鈕單手按得到，不會誤觸旁邊那顆
- [ ] Task 欄位點下去鍵盤跳出來，版面沒有被推爛；收起鍵盤後恢復
- [ ] 打字時倒數繼續跑，而且**輸入的字不會被 render 蓋掉**

**權限與背景**（這幾條就是 port forwarding 的理由）

- [ ] 第一次載入會問定位權限；允許後錶盤上方出現天氣
- [ ] 按 Start 會問通知權限（Android 13+ 是 runtime 權限）
- [ ] 切到別的 App 放兩分鐘再回來 → **倒數數字是對的**，沒有落後
- [ ] 切到背景等歸零 → 通知有跳出來（Android Chrome）
- [ ] 鎖屏放三分鐘再解鎖回來 → 數字對

**測不到、不用試**

- [ ] ~~鎖屏／殺掉瀏覽器之後通知準時響~~ ——瀏覽器做不到，這是 Stage 25
      要靠 OS 排程解決的，也是整個封裝唯一非做不可的理由
