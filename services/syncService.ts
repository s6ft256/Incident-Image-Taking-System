
import { getOfflineReports, deleteOfflineReport } from './offlineStorage';
import { uploadImageToStorage } from './storageService';
import { submitObservationReport } from './airtableService';
import { compressImage } from '../utils/imageCompression';

export const syncOfflineReports = async (baseId: string): Promise<number> => {
  const reports = await getOfflineReports();
  if (reports.length === 0) return 0;

  let syncedCount = 0;

  for (const report of reports) {
    try {
      console.log(`Syncing report ${report.id}...`);
      
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
    }
  }

  return syncedCount;
};
