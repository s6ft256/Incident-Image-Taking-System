import { getOfflineReports, deleteOfflineReport } from './offlineStorage';
import { uploadImageToStorage } from './storageService';
import { submitIncidentReport } from './airtableService';
import { compressImage } from '../utils/imageCompression';

export const syncOfflineReports = async (baseId: string): Promise<number> => {
  const reports = await getOfflineReports();
  if (reports.length === 0) return 0;

  let syncedCount = 0;

  for (const report of reports) {
    try {
      console.log(`Syncing report ${report.id}...`);
      
      // 1. Upload Images
      const attachments: { url: string; filename: string }[] = [];
      
      for (const img of report.images) {
        // Re-compress might not be needed if stored compressed, but good for safety
        const compressedFile = await compressImage(img.file);
        const url = await uploadImageToStorage(compressedFile);
        attachments.push({ url, filename: img.file.name });
      }

      // 2. Submit to Airtable
      await submitIncidentReport(report.form, attachments, { baseId });

      // 3. Delete from Local DB
      await deleteOfflineReport(report.id);
      syncedCount++;
      
    } catch (error) {
      console.error(`Failed to sync report ${report.id}`, error);
      // We leave it in the DB to try again later
    }
  }

  return syncedCount;
};