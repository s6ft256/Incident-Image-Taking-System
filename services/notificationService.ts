
/**
 * Utility to manage browser-level notifications for HSE Guardian.
 */

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
  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.warn("Notifications restricted or denied by user.");
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
