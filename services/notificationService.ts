
/**
 * Utility to manage browser-level notifications and auditory alerts for HSE Guardian.
 */

let audioContext: AudioContext | null = null;

/**
 * Plays a professional multi-tone notification sound.
 * Uses Web Audio API to ensure functionality without external assets.
 */
const playNotificationTone = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    
    // First high tone
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second slightly higher tone for a professional "ding-ling"
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.1); // C6
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.1, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);

  } catch (err) {
    console.warn("Audio feedback failed:", err);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("Desktop notifications not supported in this environment.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.error("Critical: Notification permission handshake failed:", err);
    return false;
  }
};

export const sendNotification = (title: string, body: string, isCritical: boolean = false) => {
  // Always attempt auditory feedback on successful action
  playNotificationTone();

  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.warn("Notifications restricted or denied by user. Auditory tone only played.");
    return;
  }

  try {
    // Specialized vibration for critical hazards
    const criticalVibrate = [500, 100, 500, 100, 500, 100, 500];
    const standardVibrate = [200, 100, 200];

    const options: any = {
      body,
      icon: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      badge: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      tag: isCritical ? 'critical-incident' : 'standard-update',
      renotify: true,
      requireInteraction: isCritical, // Persistent until dismissed for high-risk
      vibrate: isCritical ? criticalVibrate : standardVibrate,
      silent: false
    };

    const n = new Notification(title, options);

    if ("vibrate" in navigator) {
      navigator.vibrate(options.vibrate);
    }

    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    console.error("Notification system fault:", err);
  }
};
