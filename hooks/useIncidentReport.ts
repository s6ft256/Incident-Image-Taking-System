import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ObservationForm, UploadedImage, UserProfile, FetchedObservation } from '../types';
import { MAX_IMAGES, STORAGE_KEYS } from '../constants';
import { createObservationRecord, attachEvidenceToRecord } from '../services/airtableService';
import { compressImage } from '../utils/imageCompression';
import { saveOfflineReport } from '../services/offlineStorage';
import { sendToast } from '../services/notificationService';
import { getAddress } from '../services/weatherService';
import { getPositionWithRefinement } from '../utils/geolocation';
import { useAppContext } from '../context/AppContext';

export type SubmitStatus = 'idle' | 'success' | 'error' | 'offline-saved';

const buildOptimisticObservation = (recordId: string, form: ObservationForm): FetchedObservation => ({
  id: recordId,
  createdTime: new Date().toISOString(),
  fields: {
    "Name": form.name,
    "Role / Position": form.role,
    "Site / Location": form.site,
    "Observation Type": form.category,
    "Observation": form.observation,
    "Action Taken": form.actionTaken,
    "Assigned To": form.assignedTo,
    "Closed By": form.closedBy,
    "Location": form.location,
  } as FetchedObservation['fields'],
});

export const useObservationReport = (baseId: string) => {
  const { refetchData, addObservationOptimistic } = useAppContext();
  const [formData, setFormData] = useState<ObservationForm>({
    name: '',
    role: '',
    site: '',
    category: '',
    observation: '',
    actionTaken: '',
    assignedTo: '',
    location: '',
    rootCause: '',
    closedBy: ''
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (savedProfile) {
      try {
        const profile: UserProfile = JSON.parse(savedProfile);
        setFormData(prev => ({
          ...prev,
          name: profile.name || prev.name,
          role: profile.role || prev.role
        }));
      } catch (e) {
        console.error("Failed to load profile for pre-fill", e);
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

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    // All fields are optional - allow submission even with missing data
    if (formData.observation.trim() && formData.observation.length < 10) {
      errors.observation = "Please provide more detail (min 10 chars)";
    }
    
    return errors;
  }, [formData]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    const normalizedValue = (id === 'assignedTo' && value === 'None') ? '' : value;
    setFormData(prev => ({ ...prev, [id]: normalizedValue }));
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id } = e.target;
    setTouched(prev => ({ ...prev, [id]: true }));
  }, []);

  const fetchCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMessage("System Error: Geolocation hardware not detected on this terminal.");
      return;
    }

    setIsLocating(true);
    setErrorMessage('');

    void (async () => {
      try {
        await getPositionWithRefinement(async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setFormData(prev => ({
            ...prev,
            location: `GPS: ${coords}${Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)}m)` : ''}`,
          }));

          try {
            const streetAddress = await getAddress(latitude, longitude);
            const locationStr = `${streetAddress} | GPS: ${coords}${Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)}m)` : ''}`;
            setFormData(prev => ({ ...prev, location: locationStr }));
            setErrorMessage('');
          } catch {
            // keep GPS coords if reverse geocode fails
          }
        });
      } catch (error: any) {
        const code = error?.code;
        let msg = "Geolocation protocol failed.";
        if (code === 1) msg = "GPS Access Denied. Please enable location permissions in your browser or device settings to map this hazard.";
        if (code === 2) msg = "Site Signal Failure. Unable to establish a stable satellite link. Please move to an outdoor area with a clear sky view.";
        if (code === 3) msg = "GPS Sync Timeout. The system could not acquire your precise coordinates in time. Please try again or enter the location manually.";
        setErrorMessage(msg);
      } finally {
        setIsLocating(false);
      }
    })();
  }, []);
  
  const processImageUpload = useCallback(async (img: UploadedImage) => {
    const onProgress = (p: number) => {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, progress: p } : i));
    };

    setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'uploading', progress: 0, errorMessage: undefined } : i));
    try {
      onProgress(10);
      // Compress locally and stage the file. The binary is uploaded directly to
      // the Airtable attachment field at submit time (bypassing Firestore), so
      // no network round-trip happens here.
      const fileToUpload = await compressImage(img.file, p => onProgress(10 + Math.round(p * 0.9)));
      onProgress(100);
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, file: fileToUpload, status: 'success' } : i));
    } catch (error: any) {
      const friendlyError = error.message || "Compression Error";
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'error', progress: 0, errorMessage: friendlyError } : i));
    }
  }, []);

  const handleAddFiles = useCallback((files: FileList) => {
    const filesToAdd = Array.from(files).filter(f => f.type.startsWith('image/'));
    const remainingSlots = MAX_IMAGES - images.length;
    
    if (filesToAdd.length === 0) return;

    const limitedFiles = filesToAdd.slice(0, remainingSlots);
    
    if (filesToAdd.length > remainingSlots) {
      setErrorMessage(`Transmission limit reached. Only ${remainingSlots} additional images accepted.`);
      setTimeout(() => setErrorMessage(''), 3000);
    }

    const newImages: UploadedImage[] = limitedFiles.map(file => ({
      id: crypto.randomUUID(),
      file: file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }));

    setImages(prev => [...prev, ...newImages]);

    // Upload evidence in parallel with the form update.
    newImages.forEach(img => processImageUpload(img));
    
  }, [images.length, processImageUpload]);

  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => id === img.id);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl);
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);

    // Allow submission even with validation errors or missing images
    if (Object.keys(validationErrors).length > 0) {
      // Just show warning but don't prevent submission
      console.warn("Form has validation errors, but allowing submission:", validationErrors);
    }

    setIsSubmitting(true);
    
    if (!isOnline) {
       try {
         await saveOfflineReport(formData, images);
         setSubmitStatus('offline-saved');
       } catch (err: any) {
         setErrorMessage("Offline Storage Fault: " + err.message);
         setSubmitStatus('error');
       } finally { setIsSubmitting(false); }
       return;
    }

    const isUploadingOrAnalyzing = images.some(img => ['uploading', 'analyzing'].includes(img.status));
    if (isUploadingOrAnalyzing) {
      setErrorMessage("Please wait for evidence sync to complete.");
      setIsSubmitting(false);
      return;
    }
      
    const successfulImages = images.filter(img => img.status === 'success');
    if (successfulImages.length < images.length) {
      setErrorMessage(`Evidence staging failed for some images. Retry failed items before submitting.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const evidence = successfulImages.map(img => ({ file: img.file, filename: img.file.name }));
      // 1. Create the record first (fast) so the save is confirmed instantly.
      const created = await createObservationRecord(formData, { baseId });
      // 2. Reflect it on the dashboard immediately (optimistic).
      addObservationOptimistic(buildOptimisticObservation(created.recordId, formData));
      setSubmitStatus('success');

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
          sendToast('Report saved, but some images failed to attach. You can re-add them from the registry.', 'warning');
        } finally {
          void refetchData();
        }
      })();
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || "Transmission interrupted. Please check your connection and try again.");
    } finally { 
      setIsSubmitting(false); 
    }
  }, [baseId, formData, images, isOnline, refetchData, addObservationOptimistic, validationErrors]);

  return {
    formData,
    touched,
    validationErrors,
    images,
    isSubmitting,
    submitStatus,
    errorMessage,
    isOnline,
    isLocating,
    handleInputChange,
    handleBlur,
    fetchCurrentLocation,
    handleAddFiles,
    handleRemoveImage,
    handleRetry: (id: string) => {
      const img = images.find(i => i.id === id);
      if (img) processImageUpload(img);
    },
    handleSubmit,
    setFormData,
    resetStatus: () => {
      setSubmitStatus('idle');
      setErrorMessage('');
      setTouched({});
      setFormData({
        name: '',
        role: '',
        site: '',
        category: '',
        observation: '',
        actionTaken: '',
        assignedTo: '',
        location: '',
        rootCause: '',
        closedBy: ''
      });
      setImages([]);
    }
  };
};