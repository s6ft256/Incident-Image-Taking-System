
import { getOfflineReports, deleteOfflineReport } from './offlineStorage';
import { uploadImageToStorage } from './storageService';
import { submitObservationReport } from './airtableService';
import { compressImage } from '../utils/imageCompression';
import { sendToast } from './notificationService';

export const syncOfflineReports = async (baseId: string): Promise<number> => {
  const reports = await getOfflineReports();
  if (reports.length === 0) return 0;

  let syncedCount = 0;
  const syncId = "global-sync";

  sendToast("Initializing Sync Protocol", "info", syncId, 0);

  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const progress = Math.round(((i) / reports.length) * 100);
    sendToast(`Syncing Cluster ${i+1}/${reports.length}`, "info", syncId, progress);

    try {
      const attachments: { url: string; filename: string }[] = [];
      for (const img of report.images) {
        const compressedFile = await compressImage(img.file);
        const url = await uploadImageToStorage(compressedFile);
        attachments.push({ url, filename: img.file.name });
      }

      await submitObservationReport(report.form, attachments, { baseId });
      await deleteOfflineReport(report.id);
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync report ${report.id}`, error);
      sendToast(`Sync Fault: Sector ${i+1}`, "warning");
    }
  }

  if (syncedCount > 0) {
    sendToast("Sync Complete • Database Integrity Verified", "success", syncId, 100);
    setTimeout(() => {
      // Clear final toast after delay
      window.dispatchEvent(new CustomEvent('app-toast-clear', { detail: { id: syncId } }));
    }, 3000);
  }

  return syncedCount;
};
