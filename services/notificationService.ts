
/**
 * Utility to manage browser-level notifications and auditory alerts for HSE Guardian.
 */

let audioContext: AudioContext | null = null;

/**
 * Plays a professional multi-tone notification sound.
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

    // Second higher tone
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
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    return false;
  }
};

export const sendNotification = (title: string, body: string, isCritical: boolean = false) => {
  // Always attempt auditory & haptic feedback on successful action
  playNotificationTone();
  if ("vibrate" in navigator) {
    navigator.vibrate(isCritical ? [500, 100, 500] : [200]);
  }

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    const options: any = {
      body,
      icon: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      badge: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      tag: isCritical ? 'critical-incident' : 'standard-update',
      renotify: true,
      requireInteraction: isCritical,
      vibrate: isCritical ? [500, 100, 500, 100, 500] : [200, 100, 200],
      silent: false
    };

    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    console.error("Notification system fault:", err);
  }
};
