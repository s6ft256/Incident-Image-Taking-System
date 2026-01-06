/**
 * Report Sharing Service
 * Handles sharing reports via link, email simulation, and generating shareable URLs.
 */

import { sendToast, sendNotification } from './notificationService';
import { handleError } from '../utils/errorHandler';
import { updateObservation } from './airtableService';

export interface ShareOptions {
  reportId: string;
  reportType: 'incident' | 'observation';
  shareMethod: 'link' | 'email' | 'assign';
  recipients?: string[];
  recipientNames?: string[];
  message?: string;
  expiresIn?: number; // hours
}

export interface ShareResult {
  success: boolean;
  shareUrl?: string;
  shareCode?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Generates a unique share code for a report
 */
const generateShareCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Creates a shareable URL for a report
 */
export const createShareableLink = (reportId: string, reportType: 'incident' | 'observation', expiresIn: number = 72): ShareResult => {
  try {
    const shareCode = generateShareCode();
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
    
    // Store share info in localStorage for demo purposes
    // In production, this would be stored in a database
    const shareData = {
      reportId,
      reportType,
      shareCode,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    };
    
    const existingShares = JSON.parse(localStorage.getItem('hse_shared_reports') || '[]');
    existingShares.push(shareData);
    localStorage.setItem('hse_shared_reports', JSON.stringify(existingShares));
    
    // Generate URL with share code
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/?share=${shareCode}&type=${reportType}`;
    
    return {
      success: true,
      shareUrl,
      shareCode,
      expiresAt
    };
  } catch (error) {
    handleError(error, { operation: 'create-share-link' });
    return { success: false, error: 'Failed to generate share link' };
  }
};

/**
 * Validates a share code and returns the associated report info
 */
export const validateShareCode = (shareCode: string): { valid: boolean; reportId?: string; reportType?: string; expired?: boolean } => {
  try {
    const shares = JSON.parse(localStorage.getItem('hse_shared_reports') || '[]');
    const share = shares.find((s: any) => s.shareCode === shareCode);
    
    if (!share) {
      return { valid: false };
    }
    
    const expiresAt = new Date(share.expiresAt);
    if (expiresAt < new Date()) {
      return { valid: false, expired: true };
    }
    
    return {
      valid: true,
      reportId: share.reportId,
      reportType: share.reportType
    };
  } catch {
    return { valid: false };
  }
};

/**
 * Shares a report with specified recipients
 */
export const shareReport = async (options: ShareOptions): Promise<ShareResult> => {
  const { reportId, reportType, shareMethod, recipients, recipientNames, message } = options;
  
  try {
    if (shareMethod === 'link') {
      const result = createShareableLink(reportId, reportType, options.expiresIn);
      if (result.success) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result.shareUrl || '');
        sendToast('Share link copied to clipboard', 'success');
      }
      return result;
    }
    
    if (shareMethod === 'email' && recipients?.length) {
      const shareLink = createShareableLink(reportId, reportType, options.expiresIn);
      
      // Simulate email sending (in production, this would call an email API)
      const emailSubject = encodeURIComponent(`HSE Safety Report Shared: ${reportType.toUpperCase()} #${reportId.slice(-6)}`);
      const emailBody = encodeURIComponent(
        `You have been shared a safety ${reportType} report.\n\n` +
        `${message ? `Message: ${message}\n\n` : ''}` +
        `View the report here: ${shareLink.shareUrl}\n\n` +
        `This link expires in ${options.expiresIn || 72} hours.\n\n` +
        `— HSE Guardian Safety System`
      );
      
      // Open email client
      const mailtoLink = `mailto:${recipients.join(',')}?subject=${emailSubject}&body=${emailBody}`;
      window.open(mailtoLink, '_blank');

      // If this is an internal observation share (selected from personnel list), also mark as assigned.
      if (reportType === 'observation' && recipientNames && recipientNames.length > 0) {
        try {
          await updateObservation(reportId, { "Assigned To": recipientNames.join(', ') });
        } catch (e) {
          handleError(e, { operation: 'share-email-update-observation', reportId });
        }
      }
      
      sendToast(`Email prepared for ${recipients.length} recipient(s)`, 'success');
      return shareLink;
    }
    
    if (shareMethod === 'assign' && recipients?.length) {
      // Store assignment in localStorage (in production, this would update the database)
      const assignments = JSON.parse(localStorage.getItem('hse_report_assignments') || '[]');
      
      recipients.forEach(recipient => {
        assignments.push({
          reportId,
          reportType,
          assignedTo: recipient,
          assignedAt: new Date().toISOString(),
          message,
          status: 'pending'
        });
      });
      
      localStorage.setItem('hse_report_assignments', JSON.stringify(assignments));

      // Persist observation assignments into Airtable so the assignee sees it on their device.
      if (reportType === 'observation') {
        try {
          await updateObservation(reportId, { "Assigned To": recipients.join(', ') });
        } catch (e) {
          handleError(e, { operation: 'assign-update-observation', reportId });
        }
      }
      
      // Send notification to assigned users
      recipients.forEach(recipient => {
        sendNotification(
          'New Report Assignment',
          `You have been assigned to ${reportType} report #${reportId.slice(-6)}`,
          true
        );
      });
      
      sendToast(`Report assigned to ${recipients.length} team member(s)`, 'success');
      
      return { success: true };
    }
    
    return { success: false, error: 'Invalid share method or missing recipients' };
  } catch (error) {
    handleError(error, { operation: 'share-report', options });
    return { success: false, error: 'Failed to share report' };
  }
};

/**
 * Gets reports assigned to a specific user
 */
export const getAssignedReports = (userName: string): Array<{ reportId: string; reportType: string; assignedAt: string; message?: string }> => {
  try {
    const assignments = JSON.parse(localStorage.getItem('hse_report_assignments') || '[]');
    return assignments.filter((a: any) => 
      a.assignedTo.toLowerCase() === userName.toLowerCase() && a.status === 'pending'
    );
  } catch {
    return [];
  }
};

/**
 * Marks an assignment as completed
 */
export const completeAssignment = (reportId: string, userName: string): boolean => {
  try {
    const assignments = JSON.parse(localStorage.getItem('hse_report_assignments') || '[]');
    const updated = assignments.map((a: any) => {
      if (a.reportId === reportId && a.assignedTo.toLowerCase() === userName.toLowerCase()) {
        return { ...a, status: 'completed', completedAt: new Date().toISOString() };
      }
      return a;
    });
    localStorage.setItem('hse_report_assignments', JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
};

/**
 * Adds a comment to a shared report
 */
export const addReportComment = (reportId: string, author: string, comment: string): boolean => {
  try {
    const comments = JSON.parse(localStorage.getItem('hse_report_comments') || '[]');
    comments.push({
      id: crypto.randomUUID(),
      reportId,
      author,
      comment,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('hse_report_comments', JSON.stringify(comments));
    sendToast('Comment added successfully', 'success');
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets comments for a specific report
 */
export const getReportComments = (reportId: string): Array<{ id: string; author: string; comment: string; createdAt: string }> => {
  try {
    const comments = JSON.parse(localStorage.getItem('hse_report_comments') || '[]');
    return comments
      .filter((c: any) => c.reportId === reportId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
};
