
/**
 * Utility to manage browser-level notifications for HSE Guardian.
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return false;
    }
  }

  return false;
};

export const sendNotification = (title: string, body: string) => {
  if (!("Notification" in window)) return;
  
  // Re-check permission in case it was granted recently
  if (Notification.permission !== "granted") {
    console.warn("Notifications are not enabled by the user.");
    return;
  }

  try {
    // FIX: Cast options to any to satisfy TypeScript for properties like 'renotify' and 'vibrate' which are valid but often missing in standard type definitions
    const n = new Notification(title, {
      body,
      icon: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      badge: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      tag: 'hse-guardian-notification',
      renotify: true, // Overwrite existing if tag matches
      requireInteraction: false, // Don't hang on screen forever
      vibrate: [200, 100, 200]
    } as any);

    // Mobile vibration fallback
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    console.error("Failed to send notification:", err);
    // Silent fail if browser prevents instantiation (common in non-secure or restricted contexts)
  }
};
