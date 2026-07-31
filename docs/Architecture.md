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

### tick 由誰來敲

頻率密了之後，「誰來敲」變成一個要選的問題，而它由 `TickScheduler` 注入，理由
與 `now()` 相同：

| 實作 | 誰用 | 內容 |
| --- | --- | --- |
| `createIntervalScheduler()` | `TimerService` 的**預設** | 單純的 `setInterval`，node 也有，所以測試不必 stub 任何東西 |
| `createFrameScheduler()` | `main.ts` 注入 | `requestAnimationFrame` + 1 秒的 `setInterval`，兩個一起 |

瀏覽器版**必須是兩個時鐘**：

- 只有 rAF 是錯的。分頁隱藏時 rAF 完全停止，在背景跑完的那一段不會響、不會發
  通知，要等使用者切回來才補——而「人不在的時候通知他」正是通知存在的理由。
- 只有 interval 是浪費。分頁沒人在看的時候，沒有人需要那 60fps。

所以 rAF 負責看得見的時候的流暢度，底下那個 1 秒的 interval 負責「這段結束了」
仍然有人發現。`tick()` 是冪等的（每次從 deadline 重算），兩個來源同時敲只多花
一次減法。

隱藏時的成本從每秒 60 次降到每秒 1 次——而且那 1 次還會被瀏覽器再節流。

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

### 兩套主題，五個值

淺色主題整個是 `base.css` 裡的一個 media query，覆寫 **5 個 token**：`--ink`、
`--text`、`--muted`、`--surface`、`--scrim`（外加水印濃度）。`--field`、
`--line`、`--control`、`--control-hover` 全部是 `--ink` 與 `--text` 的
`color-mix`，兩端一換就自己翻過去了。**這是「顏色一律走 token」那條規則的回報**
——它在這一刻才真正付清。

有兩個不能自動跟著翻的：

| Token | 為什麼要獨立 |
| --- | --- |
| `--on-mode` | 疊在模式色上的文字色。兩個強調色都是中亮度，深色文字在兩種主題下都讀得到；原本這裡寫的是 `--ink`，在淺色主題下就變成淡字壓在紅底上，只有 **3.1:1** |
| `--surface` | 平常是 `--ink` 往 `--text` 靠一點，但在淺色主題下那會讓抽屜比它蓋住的頁面更暗。浮起來的東西應該更亮，所以直接指定 |

對比度是**算出來的，不是看出來的**：全部文字組合在兩套主題下都 ≥ 4.5:1，錶盤與
色場的邊線（非文字）≥ 3:1。最緊的一處是淺色主題下 Task 欄位的 placeholder
（`--muted` 疊在 `--control` 上），`--muted` 的值就是被它決定的。

### 標籤的三個層級

`uppercase` + 寬字距是這個 app 說「這是標籤」的方式，但它一度出現在十個元素上，
於是**每個東西都在強調，等於沒有東西被強調**。現在字距分三級：

| Token | 用在 | 為什麼 |
| --- | --- | --- |
| `--tracking-label` | 命名控制項的標籤（Task、Settings、模式名） | 掃視用的，拉開比較好認 |
| `--tracking-action` | 控制項自己的文字（按鈕） | 比標籤窄，因為它是一句話不是一個名字 |
| `--tracking-meta` | 數字與狀態文字（今日次數、時長、暫停原因） | 這些是**讀**的不是掃的，字距只會拖慢閱讀 |

同時「今日次數」與「暫停原因」不再 uppercase：它們是資訊，不是標籤。

### 焦點框只有一種

`--focus-ring` 與 `--focus-ring-offset`。原本六個元素之間有兩種顏色與兩種
offset。用 `--text` 而不是 `--mode`，因為框必須在**模式色上面**也看得見——被選
中的模式按鈕整塊就是模式色。

### 時間到了要說幾次

一段結束時同時發生三件事，因為每一件都有它到不了的人：

| 管道 | 到不了誰 |
| --- | --- |
| 畫面上的三層動畫 | 沒在看螢幕的人 |
| 提示音 + 桌面通知 | 靜音的、拒絕權限的 |
| `role="status"` 的 live region | ——（不需要聲音也不需要權限） |

第三個是這一階段補的。錶盤是 `aria-hidden`，時鐘是 `aria-live="off"`（一個每秒
唸六十次的倒數沒有人受得了），所以在此之前，**螢幕閱讀器使用者完全收不到結束
訊號**。

三個管道的文案來自同一個 `formatCompletion()`，不是三份手寫字串。

#### 第一個管道的三層

`timerView.flash()` 只把 `is-alerting` 掛到 `<html>` 上，動畫全在 CSS——TypeScript
不設樣式這條線在這裡也一樣。同一個 class 底下有三件事，各自跟自己的元件放在一起：

| 層 | 效果 | 時長 |
| --- | --- | --- |
| `.level::after` | 整頁 mode 色淡出 | 900ms |
| `.dial` | 兩圈向外擴散的環 | 600ms × 2 |
| `.session__time` | 時鐘 1.08 → 1 落定一次 | 700ms |

原本只有第一層。單次淡出讀起來是「顏色變了一下」，不是「時間到了」，所以補上
會發聲的那個部位：上發條的計時器在錶盤上響，環就從錶盤出去。**跑兩圈不是一圈**
——一次擴散跟一次淡出一樣平，是第二聲讓它讀起來像聲音。

環用 `box-shadow` 而不是新的元素：`.dial` 的兩個偽元素分別給了刻度和弧，都用掉
了，而擴散陰影不佔版面，不會在動畫期間把上面的天氣或下面的模式按鈕推開。

時鐘是**落定一次，不是來回脈動**：會抽動的數字讀起來像出錯，從放大處落下讀起來
像抵達。`complete()` 之後 status 已經是 `idle`，時鐘不再跳動，所以這個縮放不會跟
百分秒的每幀重繪打架。

`ALERT_DURATION_MS`（1200）是 class 掛著的時間，必須撐過最長的那一層，否則環會
在半路被拔掉。

#### 減少動態：一個調弱，兩個關掉

`prefers-reduced-motion` 把色彩淡出**調弱而不是關掉**（0.5 → 0.18）：它是權限被
拒時唯一還在的提示，關掉等於讓那個使用者什麼都收不到。而它是單次的透明度變化，
不是位移——那正是這個偏好比較不介意的那一類。

環與時鐘則是整個關掉。它們會位移、會改變大小，正是這個偏好在意的東西，而且兩者
都不是任何人唯一的管道——留下調弱過的淡出，訊號就沒有斷。

### 可操作的東西要看起來可操作

番茄工作法的原型是「一個計時器加一張紙」，所以 Task 欄位做成**有標籤的橫線**而不是
無邊框的置中文字——填空題長什麼樣，它就長什麼樣。Settings 的開關也加了外框，跟按鈕
同一套語彙。這兩處原本都只是灰字，看起來像說明而不像控制項。

### 鍵盤快捷鍵：規則全在「什麼時候不要動作」

Space 走主按鈕、`R` 走 Reset。難的不是這兩條對應，是**四種不該觸發的情況**，
所以它們被收進一個吃純資料的 `resolveShortcut()`，可以在 node 環境測完：

| 情況 | 為什麼要讓開 |
| --- | --- |
| 焦點在輸入欄位 | 在 Task 欄位打「start the report」會一路把計時器開了又停 |
| 焦點在按鈕上 | 按鈕自己就會回應 Space，再攔一次等於**一次按鍵切換兩次** |
| 抽屜開著 | 抽屜有遮罩，是模態；模態底下的東西不該還在聽鍵盤 |
| 按著 Ctrl / Alt / Meta | `Ctrl` + `R` 是瀏覽器的重新整理，不是我們的 |

轉發的方式是**呼叫按鈕的 `click()`**，不是直接呼叫 handler。這樣「現在按下去
是 start 還是 pause」只有 `controls-view.ts` 一份；而且在 keydown 裡派送的
click 仍然帶著 user activation，全螢幕、音效解鎖與通知授權才不會因為改用鍵盤
就失效。

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
  "totalFocusMs": 4500000,
  "title": "Write the report"
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

`title` 走的是跟 `settings` 一樣的分工：storage 只確認它是不是字串，長度上限與
去空白由 `SessionService.normalizeTitle()` 負責——那條規則已經寫在那裡，複製一份
到 storage 就會有兩個地方要改上限。

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
pomodoro-timer:weather  { "version": 1, "fetchedAt": …, "weather": {...} }
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

## 錶盤上方的當地時間

`2026/07/31 14:32`，在天氣那一行之上。

**自己組字串，不用 `toLocaleString`。** 兩個理由：介面規定全英文，而瀏覽器設成中
文的機器會寫出「2026年7月31日 下午2:32」；還有欄位順序會跟著使用者的機器跑，
`07/31/2026` 與 `31/07/2026` 都可能出現，而一個意思取決於讀者機器的日期比不寫還糟。

日期與時間之間是**空白**，不是天氣那行的 `·`。後者分隔的是四件互不相干的事，這裡
是一個讀數。

不顯示秒。秒針在倒數上方是「會動但沒有訊息」，而這個畫面的整個主張就是「會動的那
個數字才是重點」。

**每秒問一次，但只有變了才寫。** 顯示的最小單位是分，醒來的頻率是秒——view 自己
比對上一次寫進去的字串，六十次裡有五十九次不碰 DOM，作法跟分頁標題一樣。改成
「剛好在整分醒來」要重新安排 timeout，而背景分頁本來就會被瀏覽器節流，划不來。
分頁被隱藏時那個 interval 會被壓到大約一分鐘一次，所以回到前景時
`visibilitychange` 會再畫一次。

`padTwoDigits()` 從 `utils/format.ts` 匯出共用——倒數與牆上的鐘補零的方式一樣，
沒有理由寫兩份。

## 天氣：定位、快取與三種失敗

一行天氣放在**錶盤正上方**，`.session__instrument` 的第一個子元素。

這是被推翻過一次的決定。原本放在 Settings 抽屜底部，理由是專注鎖定：這支 app 會
在使用者一離開就暫停 focus，那就沒道理在倒數旁邊擺一個自己會變的數字。使用者選
了主畫面，於是排版上用另外兩件事把代價壓下來——`--muted` 加最小級字（它永遠不會
贏過下面的數字），以及**沒有讀數時整行留白**，不留一句錯誤訊息在倒數上面。

CSS 保留了 `min-height: 1lh`。天氣是非同步填進去的，不保留的話，錶盤、時鐘、按鈕
會在頁面看似已經穩定的一兩秒後整組往下掉一行。

### 資料來源為什麼是 Open-Meteo

這個站部署在 GitHub Pages，**靜態主機沒有地方藏祕密**。任何需要 API key 的服務，
那把 key 都會跟著 bundle 一起送到每個訪客手上。Open-Meteo 不需要金鑰，這是選它
的唯一理由，不是因為它的資料比較好。

送出的座標會先 `toFixed(2)`（約一公里）。天氣不會隔一條街就不同，一個離開這台
機器的請求沒有必要帶著比答案更精確的位置。

### 什麼時候問定位

載入時就問，只有第一次。天氣在主畫面上，沒有一個「使用者打開它才需要資料」的面板
可以等——原本為此而加的 `DrawerConfig.onOpen` 也就跟著移除了，一個沒人用的擴充點
比沒有它更糟。

被拒絕過的瀏覽器不會再跳視窗，它會直接回絕，那一行就一直是空的。

### 兩個觸發點

| 時機 | 為什麼 |
| --- | --- |
| 載入 | 那一行從一開始就在畫面上 |
| `visibilitychange` 回到前景 | 早上抓的讀數沒有理由晚上還掛在錶盤上面 |

兩個都先問快取，所以半小時內回到分頁不會有請求也不會重新定位。`locating` 這個
旗標擋的是兩個觸發點同時發生。

### 三種失敗都是 null

沒有 geolocation API（純 HTTP）、使用者拒絕、裝置定不到位而逾時、網路不通、回
傳的形狀變了——`WeatherService` 一律回 `null`，不丟例外。天氣是倒數旁邊的裝飾
品，它的任何一種失敗都不值得打斷任何人。

畫面上的處理跟著位置改變了：在抽屜裡，`Weather unavailable` 是誠實的回答；掛在倒
數正上方，它變成一句使用者無能為力、卻要一直看著的抱怨。所以現在是留白。

### 兩種形狀，兩個驗證

`toWeather()` 認的是 Open-Meteo 的回應，`isWeather()` 認的是存進 localStorage 的
那四個值。看起來重複，但**存檔裡放的是本專案決定的欄位名，不是對方的**——否則
對方改一次欄位名，就變成一次使用者端的資料遷移。

快取 30 分鐘（`WEATHER_MAX_AGE_MS`）。夠久，所以反覆開關抽屜只會有一次請求與一
次定位；夠短，所以數字不會過期，也限制了「帶著舊位置移動」最多能錯多久。

### 地名是時區推出來的

`Asia/Taipei` → `Taipei`。省掉一次反向地理編碼的請求，代價是它其實是**時區的代表
城市**：人在高雄也會看到 Taipei。接受這個誤差，因為這個名字的用途是「確認定位成
功了」，不是報出所在地。

`geolocation.service.ts` 與 `network.ts` 沒有測試，理由跟 `notification.service`
一樣：裡面除了呼叫瀏覽器 API 之外沒有別的東西。有規則的部分都在
`weather.service.ts`（注入 port）與 `weather-format.ts`（純函式）裡，那兩個有測。

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
| Service | 完整的單元測試 | `timer.service`、`session.service`、兩個 storage、`weather.service` |
| 純函式 | 從使用它的模組匯出，就地測 | `labels.ts`、`history-format.ts`、`weather-format.ts`、`settings-view.ts` 的 `parseCount` |
| 純副作用 | **不測** | `notification.service.ts`、`focus-guard.ts`、`geolocation.service.ts`、`network.ts` |

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
| DOM 更新過於頻繁 | 見下節「兩種更新速度」 |

## 兩種更新速度

`main.ts` 的 `render()` 把 view 分成兩組，因為它們的輸入根本不是同一個節奏：

| 速度 | 誰 | 為什麼 |
| --- | --- | --- |
| 每一幀 | `timer-view`、`document-title-view` | 倒數本來就是每幀在變 |
| 有變才畫 | `modes-view`、`title-view`、`controls-view` | 模式、狀態、完成次數一小時才動幾次 |

五個 view 全部每幀畫的話，`modes-view` 會對兩顆按鈕每秒呼叫 60 次
`setAttribute`，寫的還是同一個值。

即使是每幀那一組，內部仍然再比對一次：`timer-view` 只在 `mm:ss` 真的變了才寫
大字（小字每幀寫，它本來就每幀在變），`document-title-view` 記住上次寫進
`document.title` 的字串。**比對放在 `main.ts`**——它是接線層，這是接線問題；
下放到各 view 就會變成三份一模一樣、而且各自有機會走鐘的比較邏輯。
