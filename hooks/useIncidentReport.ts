
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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
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
      const imageToRemove = prev.find(img => id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
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
      throw new Error(`Evidence upload failed for "${file.name}": ${friendlyError}`);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!baseId) { 
      setErrorMessage("Safety Database Configuration Error: Base ID missing."); 
      setSubmitStatus('error'); 
      return; 
    }
    
    if (!formData.name || !formData.site || !formData.category || !formData.observation) {
      setErrorMessage("Report Validation Failed: All mandatory information fields must be completed."); 
      setSubmitStatus('error'); 
      return;
    }
    
    if (images.length < MIN_IMAGES) {
      setErrorMessage(`Evidence Required: Please capture/upload at least ${MIN_IMAGES} evidence photo(s).`); 
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
      const existingAttachments = images
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));

      const pendingImages = images.filter(img => img.status !== 'success');
      const uploadResults = await Promise.allSettled(pendingImages.map(img => processImageUpload(img)));
      
      const newAttachments: { url: string; filename: string }[] = [];
      let uploadFailureCount = 0;

      uploadResults.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          newAttachments.push({ 
            url: (res as PromiseFulfilledResult<string>).value, 
            filename: pendingImages[idx].file.name 
          });
        } else {
          uploadFailureCount++;
        }
      });

      const totalAttachments = [...existingAttachments, ...newAttachments];

      if (totalAttachments.length === 0) {
        throw new Error("Critical Failure: No evidence could be uploaded to the safety server.");
      }

      if (uploadFailureCount > 0) {
        console.warn(`${uploadFailureCount} images failed to upload, but proceeding with ${newAttachments.length} successful ones.`);
      }

      await submitIncidentReport(formData, totalAttachments, { baseId });
      setSubmitStatus('success');
    } catch (error: any) {
      console.error("Submission pipeline failure:", error);
      setSubmitStatus('error');
      setErrorMessage(error.message || "The safety report transmission was interrupted. Please retry.");
    } finally { 
      setIsSubmitting(false); 
    }
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
    handleRetry: (id: string) => {
      const img = images.find(i => i.id === id);
      if (img) processImageUpload(img);
    },
    handleSubmit,
    resetStatus: () => setSubmitStatus('idle')
  };
};
