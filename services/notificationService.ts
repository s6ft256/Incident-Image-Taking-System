
/**
 * Utility to manage browser-level notifications and auditory alerts for HSE Guardian.
 */

let audioContext: AudioContext | null = null;

const playNotificationTone = (isCritical = false) => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') audioContext.resume();

    const now = audioContext.currentTime;
    
    if (isCritical) {
      // Urgent triple-pulse digital alert
      [0, 0.15, 0.3].forEach(delay => {
        const osc = audioContext!.createOscillator();
        const gain = audioContext!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now + delay);
        osc.frequency.exponentialRampToValueAtTime(880, now + delay + 0.1);
        gain.gain.setValueAtTime(0.05, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
        osc.connect(gain);
        gain.connect(audioContext!.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.1);
      });
    } else {
      // Professional "Ding-Dong" resonant chime
      const tones = [880, 660];
      tones.forEach((freq, i) => {
        const osc = audioContext!.createOscillator();
        const gain = audioContext!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (i * 0.15));
        gain.gain.setValueAtTime(0.1, now + (i * 0.15));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.15) + 0.5);
        osc.connect(gain);
        gain.connect(audioContext!.destination);
        osc.start(now + (i * 0.15));
        osc.stop(now + (i * 0.15) + 0.5);
      });
    }
  } catch (err) { console.warn(err); }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  return (await Notification.requestPermission()) === "granted";
};

export const sendToast = (message: string, type: 'info' | 'success' | 'warning' | 'critical' | 'ai' = 'info', id?: string, progress?: number, action?: { label: string, onClick: () => void }) => {
  window.dispatchEvent(new CustomEvent('app-toast', { 
    detail: { message, type, id, progress, action } 
  }));
};

export const sendNotification = (title: string, body: string, isCritical: boolean = false) => {
  playNotificationTone(isCritical);
  if ("vibrate" in navigator) {
    navigator.vibrate(isCritical ? [500, 100, 500, 100, 500] : [100]);
  }

  if (!("Notification" in window) || Notification.permission !== "granted") {
    sendToast(body, isCritical ? 'critical' : 'info');
    return;
  }

  try {
    const n = new Notification(title, {
      body,
      icon: 'https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png',
      tag: isCritical ? 'critical-alert' : 'standard',
      requireInteraction: isCritical
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (err) {
    sendToast(body, isCritical ? 'critical' : 'info');
  }
};
