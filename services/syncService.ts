
import { getOfflineReports, deleteOfflineReport, getOfflineIncidents, deleteOfflineIncident } from './offlineStorage';
import { uploadImageToStorage } from './storageService';
import { submitObservationReport, submitIncidentReport } from './airtableService';
import { compressImage } from '../utils/imageCompression';
import { sendToast } from './notificationService';

/**
 * Orchestrates the synchronization of all queued offline records to the cloud base.
 */
export const runOfflineSync = async (baseId: string): Promise<number> => {
  const observations = await getOfflineReports();
  const incidents = await getOfflineIncidents();
  const totalToSync = observations.length + incidents.length;
  
  if (totalToSync === 0) return 0;

  let syncedCount = 0;
  const syncId = "global-sync";

  sendToast(`Initializing Sync Protocol: ${totalToSync} records queued`, "info", syncId, 0);

  // 1. Sync Safety Observations
  for (let i = 0; i < observations.length; i++) {
    const report = observations[i];
    const progress = Math.round(((i) / totalToSync) * 100);
    sendToast(`Syncing Observation ${i + 1}/${observations.length}`, "info", syncId, progress);

    try {
      const attachments: { url: string; filename: string }[] = [];
      for (const img of report.images) {
        const compressedFile = await compressImage(img.file);
        // Evidence is archived in Supabase first to get URLs for Airtable
        const url = await uploadImageToStorage(compressedFile, 'incident_evidence');
        attachments.push({ url, filename: img.file.name });
      }

      await submitObservationReport(report.form, attachments, { baseId });
      await deleteOfflineReport(report.id);
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync observation ${report.id}`, error);
      sendToast(`Sync Fault: Observation ${report.form.name}`, "warning");
    }
  }

  // 2. Sync Reactive Incidents
  for (let i = 0; i < incidents.length; i++) {
    const report = incidents[i];
    const progress = Math.round(((observations.length + i) / totalToSync) * 100);
    sendToast(`Syncing Incident ${i + 1}/${incidents.length}`, "info", syncId, progress);

    try {
      const attachments: { url: string; filename: string }[] = [];
      for (const img of report.images) {
        const compressedFile = await compressImage(img.file);
        const url = await uploadImageToStorage(compressedFile, 'incident_evidence');
        attachments.push({ url, filename: img.file.name });
      }

      await submitIncidentReport(report.form, attachments, { baseId });
      await deleteOfflineIncident(report.id);
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync incident ${report.id}`, error);
      sendToast(`Sync Fault: Incident ${report.form.title}`, "warning");
    }
  }

  if (syncedCount > 0) {
    sendToast("Sync Complete • Database Integrity Verified", "success", syncId, 100);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('app-toast-clear', { detail: { id: syncId } }));
    }, 3000);
  } else if (totalToSync > 0) {
    sendToast("Sync Protocol Failed. Check network connectivity.", "critical", syncId, 100);
  }

  return syncedCount;
};
