
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ObservationForm, UploadedImage, UserProfile } from '../types';
import { MIN_IMAGES, MAX_IMAGES, STORAGE_KEYS } from '../constants';
import { submitObservationReport } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { saveOfflineReport } from '../services/offlineStorage';
import { getAddress } from '../services/weatherService';

export type SubmitStatus = 'idle' | 'success' | 'error' | 'offline-saved';
export type GPSStatus = 'idle' | 'searching' | 'resolving' | 'validating' | 'success' | 'error';

export const useObservationReport = (baseId: string) => {
  const [formData, setFormData] = useState<ObservationForm>({
    name: '',
    role: '',
    site: '',
    category: '',
    observation: '',
    actionTaken: '',
    assignedTo: '',
    location: ''
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('idle');

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
        console.error("Failed to load profile", e);
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
    if (!formData.name.trim()) errors.name = "Observer name is required";
    if (!formData.role.trim()) errors.role = "Current role is required";
    if (!formData.site.trim()) errors.site = "Site location is required";
    if (!formData.category.trim()) errors.category = "Observation type is required";
    if (!formData.observation.trim()) errors.observation = "Description is required";
    else if (formData.observation.length < 10) errors.observation = "Min 10 characters required";
    
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
      setErrorMessage("GPS hardware not detected.");
      return;
    }

    setGpsStatus('searching');
    setErrorMessage('');

    // Request high accuracy for construction precision
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGpsStatus('resolving');
        const { latitude, longitude, accuracy } = position.coords;
        
        try {
          const streetAddress = await getAddress(latitude, longitude);
          setGpsStatus('validating');
          
          const coords = `${latitude.toFixed(7)}, ${longitude.toFixed(7)}`;
          const locationStr = `${streetAddress} | Accuracy: ±${Math.round(accuracy)}m | Lat/Lon: ${coords}`;
          
          setFormData(prev => ({ ...prev, location: locationStr }));
          setGpsStatus('success');
          setTimeout(() => setGpsStatus('idle'), 3000);
        } catch (e) {
          const fallbackStr = `Sector [${latitude.toFixed(6)}, ${longitude.toFixed(6)}] | Acc: ${Math.round(accuracy)}m`;
          setFormData(prev => ({ ...prev, location: fallbackStr }));
          setGpsStatus('success');
        }
      },
      (error) => {
        setGpsStatus('error');
        let msg = "GPS Synchronization Failure.";
        if (error.code === error.PERMISSION_DENIED) msg = "GPS Access Denied.";
        if (error.code === error.POSITION_UNAVAILABLE) msg = "Satellite Link Interrupted.";
        if (error.code === error.TIMEOUT) msg = "Search Time Limit Reached.";
        setErrorMessage(msg);
        setTimeout(() => setGpsStatus('idle'), 4000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleAddImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesToAdd = Array.from(e.target.files) as File[];
      const remainingSlots = MAX_IMAGES - images.length;
      const limitedFiles = filesToAdd.slice(0, remainingSlots);

      const newImages: UploadedImage[] = limitedFiles.map(file => ({
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0
      }));

      setImages(prev => [...prev, ...newImages]);
      e.target.value = '';
    }
  }, [images.length]);

  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const processImageUpload = useCallback(async (img: UploadedImage): Promise<string> => {
    const imageId = img.id;
    setImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'uploading', progress: 10 } : i));

    try {
      const fileToUpload = await compressImage(img.file);
      const publicUrl = await uploadImageToStorage(fileToUpload, 'incident_evidence');
      setImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'success', progress: 100, serverUrl: publicUrl } : i));
      return publicUrl;
    } catch (error: any) {
      setImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'error', progress: 0, errorMessage: error.message } : i));
      throw error;
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(validationErrors).length > 0 || images.length < MIN_IMAGES) {
      setErrorMessage("Mandatory evidence and data required.");
      return;
    }

    if (!isOnline) {
       setIsSubmitting(true);
       try {
         await saveOfflineReport(formData, images);
         setSubmitStatus('offline-saved');
       } catch (err: any) {
         setErrorMessage("Local Cache Error");
       } finally { setIsSubmitting(false); }
       return;
    }

    setIsSubmitting(true);
    try {
      const successfulImages = images.filter(img => img.status === 'success');
      const pendingOrErrorImages = images.filter(img => img.status !== 'success');

      const existingAttachments = successfulImages.map(img => ({ url: img.serverUrl!, filename: img.file.name }));
      const uploadResults = await Promise.allSettled(pendingOrErrorImages.map(img => processImageUpload(img)));
      
      const newAttachments: { url: string; filename: string }[] = [];
      uploadResults.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          newAttachments.push({ url: res.value, filename: pendingOrErrorImages[idx].file.name });
        }
      });

      const totalAttachments = [...existingAttachments, ...newAttachments];
      if (totalAttachments.length === 0) throw new Error("Evidence Transmission Failure");

      await submitObservationReport(formData, totalAttachments, { baseId });
      setSubmitStatus('success');
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || "Protocol Interrupted");
    } finally { setIsSubmitting(false); }
  }, [baseId, formData, images, isOnline, processImageUpload, validationErrors]);

  return {
    formData,
    touched,
    validationErrors,
    images,
    isSubmitting,
    submitStatus,
    errorMessage,
    isOnline,
    gpsStatus,
    handleInputChange,
    handleBlur,
    fetchCurrentLocation,
    handleAddImage,
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
        name: '', role: '', site: '', category: '', observation: '', actionTaken: '', assignedTo: '', location: ''
      });
      setImages([]);
    }
  };
};
