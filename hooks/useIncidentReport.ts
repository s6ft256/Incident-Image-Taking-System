
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IncidentForm, UploadedImage, UserProfile } from '../types';
import { MIN_IMAGES, STORAGE_KEYS } from '../constants';
import { submitIncidentReport } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { saveOfflineReport } from '../services/offlineStorage';
import { getAddress } from '../services/weatherService';

export type SubmitStatus = 'idle' | 'success' | 'error' | 'offline-saved';

export const useIncidentReport = (baseId: string) => {
  const [formData, setFormData] = useState<IncidentForm>({
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
    if (!formData.name.trim()) errors.name = "Observer name is required";
    if (!formData.role.trim()) errors.role = "Current role is required";
    if (!formData.site.trim()) errors.site = "Site location is required";
    if (!formData.category.trim()) errors.category = "Incident type is required";
    if (!formData.observation.trim()) errors.observation = "Description is required";
    else if (formData.observation.length < 10) errors.observation = "Please provide more detail (min 10 chars)";
    
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
      setErrorMessage("System Error: Geolocation hardware not detected.");
      return;
    }

    setIsLocating(true);
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const address = await getAddress(latitude, longitude);
          const locationStr = `${address} (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
          setFormData(prev => ({ ...prev, location: locationStr }));
        } catch (e) {
          const fallbackStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setFormData(prev => ({ ...prev, location: fallbackStr }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        let msg = "GPS Signal Denied. Check browser permissions.";
        if (error.code === error.TIMEOUT) msg = "GPS Signal Search Timed Out.";
        else if (error.code === error.POSITION_UNAVAILABLE) msg = "GPS Satellite Link Unavailable.";
        setErrorMessage(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  const handleAddImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImage: UploadedImage = {
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0
      };
      setImages(prev => [...prev, newImage]);
      e.target.value = '';
    }
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => id === img.id);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl);
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const processImageUpload = useCallback(async (img: UploadedImage): Promise<string> => {
    const imageId = img.id;
    const file = img.file;

    setImages(prev => prev.map(i => 
      i.id === imageId ? { ...i, status: 'uploading', progress: 10, errorMessage: undefined } : i
    ));

    try {
      const fileToUpload = await compressImage(file);
      const publicUrl = await uploadImageToStorage(fileToUpload, 'incident_evidence');
      
      setImages(prev => prev.map(i => 
        i.id === imageId ? { ...i, status: 'success', progress: 100, serverUrl: publicUrl } : i
      ));
      return publicUrl;
    } catch (error: any) {
      const friendlyError = error.message || "Connection Error";
      setImages(prev => prev.map(i => 
        i.id === imageId ? { ...i, status: 'error', progress: 0, errorMessage: friendlyError } : i
      ));
      throw new Error(`Evidence upload failed: ${friendlyError}`);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);

    if (!baseId) { 
      setErrorMessage("Safety Database Configuration Error: Base ID missing."); 
      setSubmitStatus('error'); 
      return; 
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrorMessage("Report Validation Failed."); 
      setSubmitStatus('error'); 
      return;
    }
    
    if (images.length < MIN_IMAGES) {
      setErrorMessage(`Evidence Required: At least ${MIN_IMAGES} photo(s).`); 
      setSubmitStatus('error'); 
      return;
    }

    if (!isOnline) {
       setIsSubmitting(true);
       try {
         await saveOfflineReport(formData, images);
         setSubmitStatus('offline-saved');
       } catch (err: any) {
         setErrorMessage("Offline Storage Fault: " + err.message);
         setSubmitStatus('error');
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
          newAttachments.push({ 
            url: (res as PromiseFulfilledResult<string>).value, 
            filename: pendingOrErrorImages[idx].file.name 
          });
        }
      });

      const totalAttachments = [...existingAttachments, ...newAttachments];

      if (totalAttachments.length === 0) {
        throw new Error("Critical Failure: Evidence upload failed.");
      }

      await submitIncidentReport(formData, totalAttachments, { baseId });
      setSubmitStatus('success');
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || "Transmission interrupted.");
    } finally { 
      setIsSubmitting(false); 
    }
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
    isLocating,
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
        name: '',
        role: '',
        site: '',
        category: '',
        observation: '',
        actionTaken: '',
        assignedTo: '',
        location: ''
      });
      setImages([]);
    }
  };
};
