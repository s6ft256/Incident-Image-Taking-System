import React, { useState, useEffect, useCallback } from 'react';
import { IncidentForm, UploadedImage, UserProfile } from '../types';
import { MIN_IMAGES } from '../constants';
import { submitIncidentReport } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { saveOfflineReport } from '../services/offlineStorage';

const PROFILE_KEY = 'hse_guardian_profile';

export type SubmitStatus = 'idle' | 'success' | 'error' | 'offline-saved';

export const useIncidentReport = (baseId: string) => {
  const [formData, setFormData] = useState<IncidentForm>({
    name: '',
    role: '',
    site: '',
    category: '',
    observation: '',
    actionTaken: '' 
  });
  
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Pre-fill from profile if available
    const savedProfile = localStorage.getItem(PROFILE_KEY);
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

  // Fix: Add React import and ensure React namespace is available for Event types
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  // Fix: Add React namespace availability for ChangeEvent
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
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const processImageUpload = useCallback(async (imageId: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      let file: File | undefined;
      setImages(prev => {
        file = prev.find(img => img.id === imageId)?.file;
        return prev;
      });

      if (!file) {
        reject(new Error("Image file not found in state."));
        return;
      }

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 5;
        if (progress > 90) progress = 90;
        setImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, status: 'uploading', progress: progress } : img
        ));
      }, 200);

      try {
        const fileToUpload = await compressImage(file!);
        const publicUrl = await uploadImageToStorage(fileToUpload);
        clearInterval(interval);
        setImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, status: 'success', progress: 100, serverUrl: publicUrl } : img
        ));
        resolve(publicUrl);
      } catch (error: any) {
        clearInterval(interval);
        setImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, status: 'error', progress: 0 } : img
        ));
        reject(new Error(`"${file?.name}" failed: ${error.message}`));
      }
    });
  }, []);

  // Fix: Ensure React namespace is available for FormEvent
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!baseId) { setErrorMessage("Base ID missing."); setSubmitStatus('error'); return; }
    if (!formData.name || !formData.site || !formData.category || !formData.observation) {
      setErrorMessage("All fields are required."); setSubmitStatus('error'); return;
    }
    if (images.length < MIN_IMAGES) {
      setErrorMessage(`Capture at least ${MIN_IMAGES} evidence photo.`); setSubmitStatus('error'); return;
    }

    if (!isOnline) {
       setIsSubmitting(true);
       try {
         await saveOfflineReport(formData, images);
         setSubmitStatus('offline-saved');
       } catch (err: any) {
         setErrorMessage("Offline save failed: " + err.message);
         setSubmitStatus('error');
       } finally { setIsSubmitting(false); }
       return;
    }

    setIsSubmitting(true);
    try {
      const pendingImages = images.filter(img => img.status !== 'success');
      const uploadResults = await Promise.allSettled(pendingImages.map(img => processImageUpload(img.id)));
      
      const attachments = images
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));
        
      uploadResults.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          attachments.push({ 
            url: (res as PromiseFulfilledResult<string>).value, 
            filename: pendingImages[idx].file.name 
          });
        }
      });

      await submitIncidentReport(formData, attachments, { baseId });
      setSubmitStatus('success');
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || "Submission failed.");
    } finally { setIsSubmitting(false); }
  }, [baseId, formData, images, isOnline, processImageUpload]);

  return {
    formData,
    images,
    isSubmitting,
    submitStatus,
    errorMessage,
    isOnline,
    handleInputChange,
    handleAddImage,
    handleRemoveImage,
    handleRetry: processImageUpload,
    handleSubmit,
    resetStatus: () => setSubmitStatus('idle')
  };
};