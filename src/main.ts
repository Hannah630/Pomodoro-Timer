/**
 * Application entry point.
 *
 * This layer is only responsible for wiring things together:
 * creating services, mounting views and forwarding state changes.
 * Business rules live in src/services, never here.
 */
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Root element #app was not found in index.html');
}

app.textContent = 'Pomodoro';
