
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
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = isCritical ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isCritical ? 220 : 880, now);
    if (isCritical) {
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
    }
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(now + 0.4);
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
      icon: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      tag: isCritical ? 'critical-alert' : 'standard',
      requireInteraction: isCritical
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (err) {
    sendToast(body, isCritical ? 'critical' : 'info');
  }
};
