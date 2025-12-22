
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
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendNotification = (title: string, body: string) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    const n = new Notification(title, {
      body,
      icon: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      badge: 'https://raw.githubusercontent.com/s6ft256/Incident-Image-Taking-System/main/Tj1.jpeg',
      tag: 'hse-guardian-notification'
    });

    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
};
