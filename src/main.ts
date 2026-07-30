import './styles/base.css';
import './styles/layout.css';

import type { TimerSettings, TimerState } from './models/timer.model';
import { TimerService } from './services/timer.service';
import { createControlsView } from './ui/controls-view';
import { queryElement } from './ui/dom';
import { createRoundsView } from './ui/rounds-view';
import { createSettingsView } from './ui/settings-view';
import { createTimerView } from './ui/timer-view';

/**
 * Application entry point.
 *
 * This layer only wires things together: it creates the service, mounts the
 * views and forwards state changes between them. Business rules live in
 * src/services, never here.
 */
const app = queryElement(document, '#app');

const timer = new TimerService();
const timerView = createTimerView(app);
const roundsView = createRoundsView(app);
const controlsView = createControlsView(app, {
  onStart: () => timer.start(),
  onPause: () => timer.pause(),
  onReset: () => timer.reset(),
});
const settingsView = createSettingsView(app, {
  onChange: (patch) => applySettings(patch),
});

function render(state: TimerState): void {
  timerView.render(state, timer.getSessionDurationMs());
  roundsView.render(state, timer.getSettings().roundsPerLongBreak);
  controlsView.render(state);
}

/**
 * The form is rendered from what the service accepted, not from what was
 * typed, so a clamped value appears in the field straight away.
 */
function applySettings(patch: Partial<TimerSettings>): void {
  timer.updateSettings(patch);
  settingsView.render(timer.getSettings());
}

timer.subscribe(render);
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
