# 架構決策

## 分層與依賴方向

```
ui  →  services  →  models
```

依賴永遠單向，`models` 不依賴任何東西。

| 層 | 職責 | 不可以做的事 |
| --- | --- | --- |
| `models/` | 型別定義、預設值常數 | 任何邏輯 |
| `services/` | 業務規則、副作用封裝 | 碰 DOM |
| `ui/` | 渲染畫面、綁定事件 | 包含業務規則 |
| `main.ts` | 組裝：建立 service、掛載 view、轉發狀態 | 包含業務規則 |

`TimerService` 不碰 DOM、不碰 localStorage、不播音效（SRP）。持久化與通知由
`main.ts` 訂閱狀態後轉發給 `StorageService` / `NotificationService`。

## 計時演算法：deadline 法

**不使用**「每秒 `remaining -= 1000`」的累加式計時。瀏覽器不保證 `setInterval`
準時，誤差會累積，分頁切到背景後被節流得更嚴重。

改為記錄目標結束時間：

- `start()` / `resume()`：`endAt = now() + remainingMs`，啟動 16ms 的 interval。
- `tick()`：`remainingMs = Math.max(0, endAt - now())` — **每次重算，不累加**，
  因此 tick 晚到多久都不會漂移。
- `pause()`：`remainingMs = endAt - now()`，清掉 interval。

`now()` 由建構子注入（預設 `() => Date.now()`），單元測試可以餵假時間，
不需要真的等 25 分鐘。

`TICK_INTERVAL_MS` 是 **16ms**，大約一個畫面幀。這麼密不是為了準度——deadline
法讓準度與頻率無關——而是因為顯示帶了百分秒，一秒跳四格的話小字會用肉眼看得見
的方式抖動。

## 模式切換規則

```
focus 結束 → completedFocusCount + 1   ← 休息不計入次數
           → break
break 結束 → focus
```

**只有一種休息。** 「每 4 輪進長休息」是番茄工作法的經典形狀，但它為了一個實際上
沒有人在區分的差異，撐起了一個週期長度、第二組時長、以及一套編號規則。現在整條
規則就是「交替」。

切換後 `status` 回到 `idle`，等使用者按 Start（不自動開始）。因為不自動開始，
**主按鈕必須說出它要開始什麼**（`Start break` 而不只是 `Start`），否則使用者只看到
顏色變了卻沒在倒數。

模式也可以隨時手動切換（`selectMode()`）：切到另一個模式會停下並重設成該模式的完整
時長；**切到當前模式則什麼都不做**，這樣誤點不會毀掉正在跑的一段。想重新開始當前
模式是 Reset 的工作。

## 時長的單位是秒

`TimerSettings` 存的是**秒**（`focusSeconds` / `breakSeconds`），下限
`MIN_SESSION_SECONDS` 是 5 秒，上限 120 分鐘。原本只能設整數分鐘，改成秒是為了
兩件事：驗收時不必真的等 25 分鐘，以及「番茄鐘一定是 25 分鐘」本來就不該由程式
決定。

表單上它是兩個欄位（分、秒），model 裡仍然只有**一個數字**。拆在表單這一層，是
因為拆分只是輸入方式的問題：存成一對數字的話，就會多出「61 秒」這種兩個欄位互相
矛盾的狀態要驗證，而它們表達的其實是同一個值。`settings-view.ts` 每次變動都讀兩
個欄位、算出總秒數送出，回來再由 `render` 拆回兩欄顯示——所以被 clamp 過的值會
立刻出現在畫面上。

## 專注鎖定

網頁**沒有辦法**阻止使用者切到其他 app，而且不會有——能鎖住你機器的網頁就是勒索
軟體。所以這裡做的是兩件做得到的事：

| 機制 | 作用 |
| --- | --- |
| Fullscreen | 按 Start 開始專注時進入全螢幕，清掉分頁列與書籤。必須源自使用者手勢，所以綁在點擊上；離開不需要手勢 |
| 離開就暫停 | 切走時自動暫停，**離開的時間不計入這一輪**。擋不住人離開，但可以拒絕假裝他留下 |

偵測用兩個事件：`visibilitychange` 抓分頁被隱藏，`window.blur` 抓「切到同一螢幕的
另一個視窗」——後者分頁其實仍然可見，只有 blur 會報。代價是打開 DevTools 或點網址列
也會觸發。

## 樣式系統

`styles/base.css` 放 token（顏色、字級、間距、動態變數），`styles/layout.css`
放版面與元件。規則：**顏色一律走 token，`layout.css` 裡不出現任何色碼**；共用的
字級與間距尺度也走 token；只有元件自身的一次性尺寸（例如按鈕圓角）才直接寫。

兩個由 JavaScript 寫入 `:root` 的動態 token：

| Token | 意義 | 誰寫入 |
| --- | --- | --- |
| `--mode` | 指向當前模式的強調色（`--mode-focus` / `--mode-break` 二選一） | `ui/timer-view.ts` |
| `--fill` | 剩餘時間佔整段的比例，1 → 0 | `ui/timer-view.ts` |

視覺主體是 `.dial`：一個類比錶盤，轉一圈等於一整段時間，弧長是剩餘時間，指針
在弧的前緣。刻度、弧、指針三個都只讀 `--fill`，**完全沒有對應的 JavaScript**。
背景的 `.level` 色場保留為氛圍，同樣由 `--fill` 決定高度。

`--fill` 用 `@property` 註冊成 `<number>`，因此它變成可以被 transition 的屬性。
`:root` 上一行 `transition: --fill` 就同時讓色場、弧與指針三者平滑——不註冊的話
它們會跟著每一次 tick 硬跳，而且模式切換時（`--fill` 從 0 回到 1）會是瞬移。

**JavaScript 只寫 `--mode` 與 `--fill` 兩個變數，不直接操作任何樣式**——渲染完全
交給 CSS，這讓邏輯層與表現層的界線在程式碼裡看得見。

### 可操作的東西要看起來可操作

番茄工作法的原型是「一個計時器加一張紙」，所以 Task 欄位做成**有標籤的橫線**而不是
無邊框的置中文字——填空題長什麼樣，它就長什麼樣。Settings 的開關也加了外框，跟按鈕
同一套語彙。這兩處原本都只是灰字，看起來像說明而不像控制項。

### 歷史抽屜為什麼不用 `<details>`

其他面板都用原生 `<details>`，但抽屜不行：**`<details>` 關閉時內容是
`display: none`，沒有東西可以滑動**。所以開合狀態是 `:root` 上的一個 class，抽屜
本身用 `transform: translateX(100%)` 收起。

代價是 `<details>` 免費給的鍵盤與無障礙支援要自己補：`aria-expanded`、Escape 關閉、
點擊遮罩關閉、開合時把焦點在抽屜與按鈕之間移回去，以及關閉時掛 `inert`——不然焦點會
跑進畫面外的清單裡。

## 持久化

localStorage key 為 `pomodoro-timer`，內容是：

```json
{
  "version": 3,
  "settings": { "focusSeconds": 1500, "breakSeconds": 300 },
  "completedFocusCount": 3,
  "totalFocusMs": 4500000
}
```

職責切分：

| 層 | 檢查什麼 |
| --- | --- |
| `StorageService` | **信封**：能不能解析、是不是物件、版本認不認得。不認得就回 `null`，讓 app 用預設值開起來 |
| `TimerService` | **內容**：時長是不是合法（範圍、整數）。存檔裡的 `settings` 原封不動傳進去，由它過濾 |

這樣「什麼算合法的時長」只寫一份。`completedFocusCount` 與 `totalFocusMs` 的外部
來源只有 storage 一個，所以就在 storage 檢查一次（非數字或負數 → 0，小數 → 無條件
捨去）。

### 版本與遷移

| 版本 | 差異 |
| --- | --- |
| 1 | 時長以「分」為單位，有獨立的長休息與週期長度 |
| 2 | 時長改以「秒」為單位，其餘不變 |
| 3 | 只剩一種休息，長休息與週期長度消失 |

遷移是**鏈式**的：v1 先升成 v2，再由 v2 升成 v3，而不是每個舊版本各寫一條直達
現況的路。這樣下一次升版只需要描述它自己引入的那一個差異，不必重寫 N 條路線。

**舊存檔升級而不是丟掉**：一個只是舊的存檔不等於一個壞掉的存檔，丟掉它會無聲地
重設使用者自己選的時長。

新增欄位則連版本都不必動——`totalFocusMs` 就是這樣加的：舊存檔沒有這個欄位，讀到
`undefined` 就回退成 0，而那正好是誠實的答案。**改變既有欄位的意義才需要升版本，
補一個新欄位不需要。**

`StorageService` 依賴的是自己宣告的 `KeyValueStorage` 介面（只有 `getItem` /
`setItem`），不是瀏覽器的 `Storage`。這讓它在 node 環境下也能測，也明確說出它
真正需要的能力（ISP）。

**寫入時機**：只在「完成一輪」與「修改設定」時寫。訂閱每次狀態變化去寫的話，
一秒會寫四次，而這兩個值根本不會在 tick 時改變。

### 歷史記錄用第二個 key

```
pomodoro-timer          設定與完成次數
pomodoro-timer:history  { "version": 1, "records": [...] }
```

分開的理由：歷史會一直長大而設定不會，寫一邊不必重寫另一邊；而且**歷史壞掉不會
連帶弄掉設定**。兩個 storage 都依賴同一個 `KeyValueStorage` 介面
（`services/key-value-storage.ts`）。

`HistoryStorage` 的驗證比 `StorageService` 嚴格——它會**逐筆檢查記錄的欄位**，
壞的那一筆丟掉、其餘保留。差別在於設定有 `TimerService` 在下游把關，而記錄是直接
拿去畫面上顯示的，沒有下一道關卡。

保留上限有**兩道，而且刻意不一樣**：

| 限制 | 值 | 擋的是 |
| --- | --- | --- |
| `MAX_HISTORY_RECORDS` | 500 筆 | 存檔無限長大 |
| `MAX_HISTORY_AGE_DAYS` | 90 天 | 久到已經沒有人在看的記錄 |

只有筆數限制的話，一天做 20 輪的人三週就把半年前的記錄擠掉了，而一週做兩輪的
人會看到兩年前的東西；只有天數限制的話，存檔大小沒有上界。兩道一起，兩種使用
強度看到的都是「最近這一陣子」。

筆數在三個地方裁：`SessionService` 新增時裁、`HistoryStorage` 讀與寫時各裁一次。
看起來重複，但守的是不同的東西——後兩者防的是被手動編輯過的存檔，那條路徑不
經過 `SessionService`。天數只在讀取時算，因為「幾天前」這件事會隨時間改變，寫
入時算等於把答案凍結在寫入的那一刻。

`HistoryStorage` 的 `now()` 一樣是注入的，否則 90 天的期限得等 90 天才能測。

## 已決定的取捨（MVP）

| 決策 | 理由 |
| --- | --- |
| 重整後只保留設定與累計數字，進行中的倒數不續跑 | 續跑要先回答「關掉分頁的那段時間算不算專注」，而這個問題跟「離開就暫停」的專注鎖定直接衝突。複雜度不在存檔，在語意 |
| 休息結束不自動開始下一輪 | 狀態組合最單純 |
| Start / Pause 合併成一顆按鈕（文字隨狀態變化）+ Reset，共兩顆 | 減少 UI 狀態組合 |
| 計時中修改設定只影響「下一次」該模式的時長，不中斷當前倒數 | 不打斷使用者，行為可預期 |
| 設定的合法性由 `TimerService` 守住（建構子與 `updateSettings` 都會過濾） | 設定也會從 localStorage 還原，那條路徑不經過表單。驗證寫在表單層的話，壞掉的存檔就能繞過它 |
| 測試只寫在「有規則可言」的地方，不追求覆蓋率數字 | 見下節。UI 的排版與副作用以手動驗收 |

## 測試策略

Vitest 跑在 **node** 環境，沒有 jsdom。這是刻意的：不裝 jsdom 就不可能不小心
把 DOM 依賴寫進 service 裡——寫進去了測試當場就掛。代價是**一個在 import 時就
碰 `document` 的模組沒辦法被測**。

於是測試分成三類：

| 對象 | 怎麼測 | 例子 |
| --- | --- | --- |
| Service | 完整的單元測試 | `timer.service`、`session.service`、兩個 storage |
| 純函式 | 從使用它的模組匯出，就地測 | `labels.ts`、`history-format.ts`、`settings-view.ts` 的 `parseCount` |
| 純副作用 | **不測** | `notification.service.ts`、`focus-guard.ts` |

第二類是關鍵：一個 view 裡真正有規則的部分（怎麼算今天的總計、按鈕該顯示什麼
字、打進去的字算不算數字）都可以抽成不碰 DOM 的函式，抽出來之後它就跟 service
一樣好測。剩下沒抽出來的部分只有「把值寫進元素」，那沒有規則可以測錯。

第三類是**刻意的缺口**，不是遺漏：mock 掉 `AudioContext` 與 `Notification` 之
後，測試斷言的只會是「我寫的呼叫就是我寫的呼叫」。這兩個檔案的改動需要人在瀏
覽器前確認，`docs/Todo.md` 末尾的手動驗收清單就是為此存在。

## 工具鏈：為什麼 lint 用 oxlint 而不是 ESLint

原本要裝的是 ESLint + typescript-eslint，裝不起來：**typescript-eslint 明確
拒絕 TypeScript 7**（不是 peer 版本警告，是啟動時直接丟錯），而本專案用的是
TS 7.0。官方的追蹤在 typescript-eslint#10940，在它支援之前只有三條路：

| 選項 | 為什麼不選 |
| --- | --- |
| 把 TypeScript 降回 6.x | 為了 lint 工具而讓語言版本倒退，本末倒置 |
| 並存安裝一份 TS 6 給 lint 用 | 兩份 TypeScript、一套 npm alias 覆寫，CI 上還要裝兩次。設定的複雜度超過它擋下的 bug |
| 只用 Prettier，不 lint | 格式一致但沒有規則檢查 |

選 **oxlint**：它自己解析 TypeScript，不透過 TypeScript 的 API，所以跟語言版本
無關——這正是眼前這個問題的成因，換掉就沒有了。

值得說清楚的是**這裡的 lint 本來就不需要做太多**。tsconfig 已經開了 `strict`、
`noUnusedLocals`、`noUnusedParameters`、`noImplicitReturns`、
`noFallthroughCasesInSwitch` 與 `noUncheckedIndexedAccess`——一般把 lint 找進來
要抓的東西，編譯器已經在抓了，而且抓得更準。留給 oxlint 的是型別檢查沒有意見的
那幾條（`no-console`、`no-explicit-any`、type import 的一致性）。

Prettier 負責格式，`.prettierignore` 排除 `*.md`：Prettier 以**字元數**對齊
Markdown 表格，而一個中文字是一個字元、兩欄寬，`docs/` 裡的表格會被排歪。

## 瀏覽器限制與對策

| 問題 | 對策 |
| --- | --- |
| 分頁切到背景被節流 | 顯示層由 deadline 法自動修正；另監聽 `visibilitychange`，回前景時立刻 tick 一次 |
| localStorage 讀到壞資料 | 存檔帶 `version` 欄位；讀取一律 try/catch + 欄位驗證，失敗回退預設值 |
| 音效被 autoplay policy 擋掉 | 提示音用 Web Audio API 合成，不用音檔。`AudioContext` 建立時是 `suspended`，在 Start 按鈕裡 `resume()` 完成解鎖 |
| Notification 權限 | `requestPermission()` 綁在 Start 按鈕（必須源自使用者手勢），且只在 `permission === 'default'` 時才問 |
| `new Notification()` 在部分瀏覽器直接丟例外 | Chrome on Android 只允許透過 service worker 發通知，所以建構子包 try/catch |
| 通知被拒絕或使用者靜音 | 每次結束一律播放一次畫面色彩淡出（`.level::after`），不依賴任何權限 |
| Notification 需要 secure context | `localhost` 與 https 可用，`file://` 不可 — 這也是不採用「無建置純 HTML」的實際理由 |
| DOM 更新過於頻繁 | tick 為 16ms，但寫入分兩種：小字（百分秒）每幀寫，大字（`mm:ss`）比對過才寫。同一個字串重寫一次雖然不會重繪，比對仍然省下每秒 59 次的無謂寫入 |
