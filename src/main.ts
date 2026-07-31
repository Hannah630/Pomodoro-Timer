import './styles/base.css';
import './styles/layout.css';

import type { TimerSettings, TimerState } from './models/timer.model';
import { createHistoryStorage } from './services/history-storage';
import { createNotificationService } from './services/notification.service';
import { createSessionService } from './services/session.service';
import { createStorageService } from './services/storage.service';
import { TimerService } from './services/timer.service';
import { createControlsView } from './ui/controls-view';
import { createDocumentTitleView } from './ui/document-title-view';
import { queryElement } from './ui/dom';
import { createDrawerGroup } from './ui/drawer';
import {
  enterFullscreen,
  exitFullscreen,
  watchForLeaving,
} from './ui/focus-guard';
import { createHistoryView } from './ui/history-view';
import { summarizeToday } from './ui/history-format';
import { MODE_LABELS } from './ui/labels';
import { createModesView } from './ui/modes-view';
import { createSettingsView } from './ui/settings-view';
import { watchForShortcuts } from './ui/shortcuts';
import { createTimerView } from './ui/timer-view';
import { createTitleView } from './ui/title-view';

/**
 * Application entry point.
 *
 * This layer only wires things together: it creates the services, mounts the
 * views and forwards state changes between them. Business rules live in
 * src/services, never here.
 */
const app = queryElement(document, '#app');

const storage = createStorageService(localStorage);
const restored = storage.load();

const timer = new TimerService({
  settings: restored?.settings,
  completedFocusCount: restored?.completedFocusCount,
});
const historyStorage = createHistoryStorage(localStorage);
const session = createSessionService({
  history: historyStorage.load(),
  totalFocusMs: restored?.totalFocusMs,
  title: restored?.title,
});

/**
 * Set when a focus session was paused because the user switched away, and
 * cleared the moment they take an action of their own.
 */
let pausedByLeaving = false;

const timerView = createTimerView(app);
const documentTitleView = createDocumentTitleView();
const modesView = createModesView(app, {
  onSelect: (mode) => {
    pausedByLeaving = false;
    timer.selectMode(mode);
  },
});
const titleView = createTitleView(app, {
  onTitleChange: (raw) => applyTitle(raw),
});
// The drawers sit outside #app so they can span the viewport, not the layout.
const historyView = createHistoryView(document, {
  onClear: () => {
    session.clearHistory();
    saveHistory();
  },
});
const notifications = createNotificationService();
const controlsView = createControlsView(app, {
  onStart: () => {
    pausedByLeaving = false;

    // Start first. Everything below is an enhancement, and a browser that
    // refuses one of them must not be able to stop the timer — which is what
    // happened on iOS, where requesting fullscreen on an ordinary element
    // threw and took the rest of this handler with it.
    timer.start();

    // Still inside the click, which is what audio, notification permission
    // and fullscreen all require of their gesture.
    try {
      notifications.enable();

      if (timer.getState().mode === 'focus') {
        enterFullscreen();
      }
    } catch {
      // A capability the browser will not give us is not worth a broken start.
    }
  },
  onPause: () => timer.pause(),
  onReset: () => {
    pausedByLeaving = false;
    exitFullscreen();
    timer.reset();
  },
});
const settingsView = createSettingsView(document, {
  onChange: (patch) => applySettings(patch),
});

const drawers = createDrawerGroup(queryElement(document, '[data-scrim]'));

drawers.add({
  toggle: queryElement(document, '[data-settings-toggle]'),
  panel: queryElement(document, '[data-settings-drawer]'),
  openClass: 'is-settings-open',
});

drawers.add({
  toggle: queryElement(document, '[data-history-toggle]'),
  panel: queryElement(document, '[data-history-drawer]'),
  openClass: 'is-history-open',
  onClose: () => historyView.resetConfirm(),
});

watchForShortcuts(
  {
    onPrimary: () => controlsView.pressPrimary(),
    onReset: () => controlsView.pressReset(),
  },
  () => drawers.isAnyOpen(),
);

function render(state: TimerState): void {
  timerView.render(state, {
    sessionDurationMs: timer.getSessionDurationMs(),
    pausedByLeaving,
  });
  documentTitleView.render(state);
  modesView.render(state);
  titleView.render(state.mode);
  controlsView.render(state);
}

/** Show the title the service kept, not the raw text that produced it. */
function applyTitle(raw: string): void {
  session.setTitle(raw);
  titleView.setValue(session.getTitle());
  persist();
}

function saveHistory(): void {
  historyStorage.save(session.getHistory());
  renderHistory();
}

function renderHistory(): void {
  historyView.render(session.getHistory(), {
    sessions: timer.getState().completedFocusCount,
    focusMs: session.getTotalFocusMs(),
  });

  // Derived from the list, so it only needs recomputing when the list moves,
  // never on a tick.
  modesView.setTodayCount(
    summarizeToday(session.getHistory(), Date.now()).sessions,
  );
}

/**
 * The form is rendered from what the service accepted, not from what was
 * typed, so a clamped value appears in the field straight away.
 */
function applySettings(patch: Partial<TimerSettings>): void {
  timer.updateSettings(patch);
  settingsView.render(timer.getSettings());
  persist();
}

/**
 * Saving on every state change would write sixty times a second. The
 * persisted values only move when a session finishes, the settings change or
 * the task is renamed, so those are the only moments worth writing.
 */
function persist(): void {
  storage.save({
    settings: timer.getSettings(),
    completedFocusCount: timer.getState().completedFocusCount,
    totalFocusMs: session.getTotalFocusMs(),
    title: session.getTitle(),
  });
}

timer.subscribe(render);
timer.onComplete((finished, next, durationMs) => {
  // Record before persisting: the lifetime total is written by persist, and
  // recording is what moves it.
  if (finished === 'focus') {
    session.recordCompletedFocus(durationMs);
    saveHistory();
    exitFullscreen();
  }

  persist();
  timerView.flash();
  notifications.notify(
    `${MODE_LABELS[finished]} finished`,
    `Up next: ${MODE_LABELS[next].toLowerCase()}`,
  );
});

/**
 * Time spent in another window is not focus, so the timer refuses to count it.
 * The page cannot stop anyone leaving; it can decline to pretend they stayed.
 */
watchForLeaving(() => {
  const state = timer.getState();

  if (state.mode !== 'focus' || state.status !== 'running') {
    return;
  }

  // Set before pausing, since pausing is what triggers the re-render that
  // shows the reason.
  pausedByLeaving = true;
  timer.pause();
});

render(timer.getState());
settingsView.render(timer.getSettings());
titleView.setValue(session.getTitle());
renderHistory();

// A background tab throttles the interval, so the display can be several
// seconds stale by the time the user comes back. One tick on return recomputes
// it from the deadline.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    timer.tick();
  }
});
