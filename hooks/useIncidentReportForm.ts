
import React, { useState, useEffect, useCallback } from 'react';
import { IncidentForm, UploadedImage, UserProfile, FetchedIncident } from '../types';
import { STORAGE_KEYS, MIN_IMAGES, MAX_IMAGES, INCIDENT_STATUS } from '../constants';
import { createIncidentRecord, attachEvidenceToRecord } from '../services/airtableService';
import { compressImage } from '../utils/imageCompression';
import { getAddress } from '../services/weatherService';
import { sendNotification, sendToast } from '../services/notificationService';
import { getPositionWithRefinement } from '../utils/geolocation';
import { saveOfflineIncident } from '../services/offlineStorage';
import { can } from '../services/permissions';
import { useAppContext } from '../context/AppContext';

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error' | 'offline-saved';

const buildOptimisticIncident = (recordId: string, form: IncidentForm): FetchedIncident => ({
  id: recordId,
  createdTime: new Date().toISOString(),
  fields: {
    "Title": form.title,
    "Description": form.description,
    "Incident Date": `${form.date}T${form.time}:00.000Z`,
    "Location": form.location,
    "Department": form.department,
    "Site / Project": form.site,
    "Status": INCIDENT_STATUS.PENDING_REVIEW as FetchedIncident['fields']['Status'],
    "Severity": form.severityScore,
    "Likelihood": form.likelihoodScore,
    "Category": form.type,
    "Reporter ID": form.reporterName,
  } as FetchedIncident['fields'],
});

export const useIncidentReportForm = () => {
  const { refetchData, addIncidentOptimistic } = useAppContext();
  const [formData, setFormData] = useState<IncidentForm>({
    title: '',
    type: '',
    severityScore: 1,
    likelihoodScore: 1,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    location: '',
    site: '',
    department: 'Operations',
    description: '',
    involvedParties: '',
    equipmentInvolved: '',
    witnesses: '',
    rootCause: '',
    recommendedControls: '',
    reporterName: '',
    deviceMetadata: navigator.userAgent,
    // Workflow Initializations
    reviewer: '',
    reviewDate: '',
    reviewComments: '',
    correctiveAction: '',
    actionAssignedTo: '',
    actionDueDate: '',
    verificationComments: '',
    closedBy: '',
    closureDate: ''
  });
  
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLocating, setIsLocating] = useState(false);
  const [isAnalyzing] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (savedProfile) {
      try {
        const profile: UserProfile = JSON.parse(savedProfile);
        setUserRole(profile.role || '');
        setFormData(prev => ({
          ...prev,
          reporterName: profile.name || prev.reporterName,
          site: profile.site || prev.site
        }));
      } catch (e) {
        console.error("Profile load fail", e);
      }
    }

    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  const fetchCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      sendToast("Geolocation hardware not detected.", "warning");
      return;
    }
    setIsLocating(true);
    void (async () => {
      try {
        await getPositionWithRefinement(async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          // Set something immediately (fast path), then try reverse-geocoding.
          setFormData(prev => ({
            ...prev,
            location: `GPS: ${coords}${Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)}m)` : ''}`
          }));

          try {
            const streetAddress = await getAddress(latitude, longitude);
            setFormData(prev => ({
              ...prev,
              location: `${streetAddress} (${coords})${Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)}m)` : ''}`
            }));
          } catch {
            // keep GPS coords if reverse geocode fails
          }
        });

        sendToast("GPS Lock Established", "success");
      } catch {
        sendToast("Could not acquire GPS signal.", "warning");
      } finally {
        setIsLocating(false);
      }
    })();
  }, []);
  
  const processImageUpload = useCallback(async (img: UploadedImage) => {
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'uploading', progress: 0 } : i));
    try {
      // Compress locally and stage the file. Upload happens directly to the
      // Airtable attachment field at submit time (bypassing Firestore).
      const compressedFile = await compressImage(img.file, p => {
        setImages(prev => prev.map(i => i.id === img.id ? { ...i, progress: Math.round(p) } : i));
      });

      setImages(prev => prev.map(i => i.id === img.id ? {
        ...i,
        file: compressedFile,
        status: 'success',
        progress: 100,
      } : i));
    } catch (error: any) {
      setImages(prev => prev.map(i => i.id === img.id ? { 
        ...i, 
        status: 'error', 
        errorMessage: error.message 
      } : i));
      sendToast(`Staging Fault: ${img.file.name}`, "critical");
    }
  }, []);

  const handleAddFiles = useCallback((files: FileList) => {
    const filesToAdd = Array.from(files).filter(f => f.type.startsWith('image/'));
    const remainingSlots = MAX_IMAGES - images.length;
    
    if (filesToAdd.length === 0) return;
    
    const limitedFiles = filesToAdd.slice(0, remainingSlots);
    const newImages: UploadedImage[] = limitedFiles.map(file => ({
      id: crypto.randomUUID(), 
      file, 
      previewUrl: URL.createObjectURL(file), 
      status: 'pending', 
      progress: 0 
    }));
    
    setImages(prev => [...prev, ...newImages]);
    newImages.forEach(img => processImageUpload(img));
  }, [images.length, processImageUpload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!can(userRole, 'submit-incident')) {
      setErrorMessage('Access denied: your role is not authorized to file incident reports.');
      setSubmitStatus('error');
      return;
    }

    if (!formData.title || !formData.type || !formData.site || !formData.description) {
      setErrorMessage("Mandatory operational fields missing.");
      return;
    }
    
    if (images.length < MIN_IMAGES) {
      setErrorMessage(`Evidence required: Capture at least ${MIN_IMAGES} photo.`);
      return;
    }

    if (images.some(img => img.status === 'uploading')) {
      setErrorMessage("Please wait for evidence synchronization to complete.");
      return;
    }

    setSubmitStatus('submitting');
    
    if (!isOnline) {
      try {
        await saveOfflineIncident(formData, images);
        setSubmitStatus('offline-saved');
        sendToast('Offline: Incident queued for sync', 'info');
      } catch (error: any) {
        setSubmitStatus('error');
        setErrorMessage(error?.message || 'Offline storage fault.');
      }
      return;
    }

    try {
      const evidence = images
        .filter(img => img.status === 'success')
        .map(img => ({ file: img.file, filename: img.file.name }));

      // 1. Create the record first (fast) so the save is confirmed instantly.
      const created = await createIncidentRecord(formData);
      // 2. Reflect it on the dashboard immediately (optimistic).
      addIncidentOptimistic(buildOptimisticIncident(created.recordId, formData));
      setSubmitStatus('success');
      sendNotification("Incident Dispatched", `Record ID generated for "${formData.title}"`);
      sendToast("Incident saved • uploading evidence…", "success");

      // 3. Upload evidence in the background, then reconcile with live data.
      void (async () => {
        try {
          if (evidence.length > 0) {
            await attachEvidenceToRecord({
              tableName: created.tableName,
              recordId: created.recordId,
              fieldName: created.evidenceField,
              files: evidence,
              config: created.config,
            });
          }
        } catch (uploadError) {
          console.warn('Background evidence upload failed', uploadError);
          sendToast('Incident saved, but some images failed to attach. You can re-add them from the registry.', 'warning');
        } finally {
          void refetchData();
        }
      })();
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || "Cloud link lost.");
    }
  };

  return {
    formData,
    setFormData,
    images,
    setImages,
    submitStatus,
    isLocating,
    isAnalyzing,
    errorMessage,
    fetchCurrentLocation,
    handleInputChange,
    handleAddFiles,
    handleRemoveImage: (id: string) => {
      setImages(prev => {
        const img = prev.find(i => i.id === id);
        if (img) URL.revokeObjectURL(img.previewUrl);
        return prev.filter(i => i.id !== id);
      });
    },
    handleRetryUpload: (id: string) => {
      const img = images.find(i => i.id === id);
      if (img) processImageUpload(img);
    },
    handleSubmit,
  };
};
