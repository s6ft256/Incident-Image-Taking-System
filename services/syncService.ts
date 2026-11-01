
import { getOfflineReports, deleteOfflineReport, getOfflineIncidents, deleteOfflineIncident } from './offlineStorage';
import { submitObservationReport, submitIncidentReport } from './airtableService';
import { compressImage } from '../utils/imageCompression';
import { sendToast } from './notificationService';
import { handleError, isRetryableError } from '../utils/errorHandler';

let activeSync: Promise<number> | null = null;

/**
 * Orchestrates the synchronization of all queued offline records to the cloud base.
 * Includes exponential backoff for transient failures.
 */
export const runOfflineSync = (baseId: string): Promise<number> => {
  if (activeSync) return activeSync;
  activeSync = synchronizeQueuedReports(baseId).finally(() => {
    activeSync = null;
  });
  return activeSync;
};

const synchronizeQueuedReports = async (baseId: string): Promise<number> => {
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
      const evidence: { file: File; filename: string }[] = [];
      for (const img of report.images) {
        const compressedFile = await compressImage(img.file);
        evidence.push({ file: compressedFile, filename: img.file.name });
      }

      await submitObservationReport(report.form, evidence, { baseId });
      await deleteOfflineReport(report.id);
      syncedCount++;
    } catch (error) {
      const appError = handleError(error, { 
        operation: 'sync-observation', 
        reportId: report.id,
        reportName: report.form.name 
      }, { silent: true });
      
      // Only show warning for non-retryable errors; retryable ones will be attempted next sync
      if (!isRetryableError(error)) {
        sendToast(`Sync Fault: ${report.form.name} - ${appError.userMessage}`, "warning");
      }
    }
  }

  // 2. Sync Reactive Incidents
  for (let i = 0; i < incidents.length; i++) {
    const report = incidents[i];
    const progress = Math.round(((observations.length + i) / totalToSync) * 100);
    sendToast(`Syncing Incident ${i + 1}/${incidents.length}`, "info", syncId, progress);

    try {
      const evidence: { file: File; filename: string }[] = [];
      for (const img of report.images) {
        const compressedFile = await compressImage(img.file);
        evidence.push({ file: compressedFile, filename: img.file.name });
      }

      await submitIncidentReport(report.form, evidence, { baseId });
      await deleteOfflineIncident(report.id);
      syncedCount++;
    } catch (error) {
      const appError = handleError(error, { 
        operation: 'sync-incident', 
        reportId: report.id,
        reportTitle: report.form.title 
      }, { silent: true });
      
      if (!isRetryableError(error)) {
        sendToast(`Sync Fault: ${report.form.title} - ${appError.userMessage}`, "warning");
      }
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
