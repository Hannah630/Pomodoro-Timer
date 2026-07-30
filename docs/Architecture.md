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

- `start()` / `resume()`：`endAt = now() + remainingMs`，啟動 250ms 的 interval。
- `tick()`：`remainingMs = Math.max(0, endAt - now())` — **每次重算，不累加**，
  因此 interval 晚到多久都不會漂移。
- `pause()`：`remainingMs = endAt - now()`，清掉 interval。

`now()` 由建構子注入（預設 `() => Date.now()`），單元測試可以餵假時間，
不需要真的等 25 分鐘。

## 模式切換規則

```
focus 結束 → completedFocusCount + 1
           → (completedFocusCount % roundsPerLongBreak === 0) ? longBreak : shortBreak
break 結束 → focus
```

切換後 `status` 回到 `idle`，等使用者按 Start（MVP 不自動開始）。

## 已決定的取捨（MVP）

| 決策 | 理由 |
| --- | --- |
| 重整後只保留 settings 與 completedFocusCount，進行中的倒數不續跑 | 續跑需處理離線時間補算，複雜度明顯上升 |
| 休息結束不自動開始下一輪 | 狀態組合最單純 |
| Start / Pause 合併成一顆按鈕（文字隨狀態變化）+ Reset，共兩顆 | 減少 UI 狀態組合 |
| 計時中修改設定只影響「下一次」該模式的時長，不中斷當前倒數 | 不打斷使用者，行為可預期 |
| 只對 `timer.service` 寫單元測試 | 它是唯一含業務規則的地方；UI 與副作用以手動驗收 |

## 瀏覽器限制與對策

| 問題 | 對策 |
| --- | --- |
| 分頁切到背景被節流 | 顯示層由 deadline 法自動修正；另監聽 `visibilitychange`，回前景時立刻 tick 一次 |
| localStorage 讀到壞資料 | 存檔帶 `version` 欄位；讀取一律 try/catch + 欄位驗證，失敗回退預設值 |
| 音效被 autoplay policy 擋掉 | 第一次點 Start 時做 audio unlock（`play()` 後立刻 `pause()` 並歸零） |
| Notification 權限 | `requestPermission()` 綁在 Start 按鈕（必須源自使用者手勢），拒絕時降級為畫面提示 |
| Notification 需要 secure context | `localhost` 與 https 可用，`file://` 不可 — 這也是不採用「無建置純 HTML」的實際理由 |
| DOM 更新過於頻繁 | tick 為 250ms，但只有顯示的「秒數」改變時才寫 DOM |
