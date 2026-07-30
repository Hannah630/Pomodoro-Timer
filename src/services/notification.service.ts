/** How loud the chime peaks, on the 0-1 gain scale. */
const TONE_PEAK_GAIN = 0.3;
const TONE_FREQUENCY_HZ = 880;
const TONE_DURATION_S = 0.6;

/** Gain has to stay above zero for an exponential ramp to be legal. */
const SILENCE_GAIN = 0.0001;

export interface NotificationService {
  /**
   * Unlocks audio and asks for notification permission.
   *
   * Must be called from a user gesture: browsers refuse to start audio or to
   * prompt for permission otherwise.
   */
  enable(): void;

  /** Announces a finished session. Silently does less if it is not allowed. */
  notify(title: string, body: string): void;
}

/**
 * Sound and desktop notifications.
 *
 * Every capability here can be refused by the browser or the user, so each one
 * degrades on its own: no permission still chimes, no audio still notifies,
 * and neither one throws.
 */
export function createNotificationService(): NotificationService {
  let audio: AudioContext | null = null;

  return {
    enable() {
      audio ??= new AudioContext();

      // An AudioContext created outside a gesture starts suspended. Resuming
      // it here is the unlock the autoplay policy asks for.
      void audio.resume().catch(() => undefined);

      if (canNotify() && Notification.permission === 'default') {
        void Notification.requestPermission().catch(() => undefined);
      }
    },

    notify(title, body) {
      playChime(audio);
      showNotification(title, body);
    },
  };
}

function playChime(audio: AudioContext | null): void {
  if (!audio) {
    return;
  }

  const startedAt = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = TONE_FREQUENCY_HZ;

  // Rise fast, decay slowly, so it reads as a chime rather than a beep that
  // gets cut off.
  gain.gain.setValueAtTime(SILENCE_GAIN, startedAt);
  gain.gain.exponentialRampToValueAtTime(TONE_PEAK_GAIN, startedAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(
    SILENCE_GAIN,
    startedAt + TONE_DURATION_S,
  );

  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(startedAt);
  oscillator.stop(startedAt + TONE_DURATION_S);
}

function showNotification(title: string, body: string): void {
  if (!canNotify() || Notification.permission !== 'granted') {
    return;
  }

  try {
    new Notification(title, { body });
  } catch {
    // Some browsers, Chrome on Android among them, only allow notifications
    // through a service worker and throw on the constructor.
  }
}

function canNotify(): boolean {
  return 'Notification' in window;
}
