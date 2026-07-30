import './styles/base.css';
import './styles/layout.css';

import type { TimerSettings, TimerState } from './models/timer.model';
import { createNotificationService } from './services/notification.service';
import { createSessionService } from './services/session.service';
import { createStorageService } from './services/storage.service';
import { TimerService } from './services/timer.service';
import { createControlsView } from './ui/controls-view';
import { queryElement } from './ui/dom';
import { MODE_LABELS } from './ui/labels';
import { createRoundsView } from './ui/rounds-view';
import { createSettingsView } from './ui/settings-view';
import { createTimerView } from './ui/timer-view';
import { createTitleView } from './ui/title-view';

/**
 * Application entry point.
 *
 * This layer only wires things together: it creates the service, mounts the
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
const session = createSessionService();

const timerView = createTimerView(app);
const roundsView = createRoundsView(app);
const titleView = createTitleView(app, {
  onTitleChange: (raw) => applyTitle(raw),
});
const notifications = createNotificationService();
const controlsView = createControlsView(app, {
  onStart: () => {
    // Audio and notification permission both have to originate from a user
    // gesture, and this click is the first one the app is guaranteed to get.
    notifications.enable();
    timer.start();
  },
  onPause: () => timer.pause(),
  onReset: () => timer.reset(),
});
const settingsView = createSettingsView(app, {
  onChange: (patch) => applySettings(patch),
});

function render(state: TimerState): void {
  timerView.render(state, timer.getSessionDurationMs());
  roundsView.render(state, timer.getSettings().roundsPerLongBreak);
  titleView.render(state.mode);
  controlsView.render(state);
}

/** Show the title the service kept, not the raw text that produced it. */
function applyTitle(raw: string): void {
  session.setTitle(raw);
  titleView.setValue(session.getTitle());
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
 * Saving on every state change would write four times a second. The two
 * persisted values only move when a session finishes or the settings change,
 * so those are the only moments worth writing.
 */
function persist(): void {
  storage.save({
    settings: timer.getSettings(),
    completedFocusCount: timer.getState().completedFocusCount,
  });
}

timer.subscribe(render);
timer.onComplete((finished, next) => {
  persist();
  timerView.flash();
  notifications.notify(
    `${MODE_LABELS[finished]} finished`,
    `Up next: ${MODE_LABELS[next].toLowerCase()}`,
  );
});

render(timer.getState());
settingsView.render(timer.getSettings());

// A background tab throttles the interval, so the display can be several
// seconds stale by the time the user comes back. One tick on return recomputes
// it from the deadline.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    timer.tick();
  }
});
