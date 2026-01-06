
import React, { useState, useEffect, useCallback } from 'react';
import { IncidentForm, UploadedImage, UserProfile } from '../types';
import { STORAGE_KEYS, MIN_IMAGES, MAX_IMAGES } from '../constants';
import { submitIncidentReport } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { getAddress } from '../services/weatherService';
import { sendNotification, sendToast } from '../services/notificationService';

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export const useIncidentReportForm = () => {
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (savedProfile) {
      try {
        const profile: UserProfile = JSON.parse(savedProfile);
        setFormData(prev => ({
          ...prev,
          reporterName: profile.name || prev.reporterName,
          site: profile.site || prev.site
        }));
      } catch (e) {
        console.error("Profile load fail", e);
      }
    }
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
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const streetAddress = await getAddress(latitude, longitude);
          setFormData(prev => ({ 
            ...prev, 
            location: `${streetAddress} (${latitude.toFixed(6)}, ${longitude.toFixed(6)})` 
          }));
        } catch (e) {
          setFormData(prev => ({ 
            ...prev, 
            location: `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
          }));
        } finally {
          setIsLocating(false);
          sendToast("GPS Lock Established", "success");
        }
      },
      () => {
        sendToast("Could not acquire GPS signal.", "warning");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);
  
  const processImageUpload = useCallback(async (img: UploadedImage) => {
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'uploading', progress: 0 } : i));
    try {
      // 1. Local Compression
      const compressedFile = await compressImage(img.file, p => {
        setImages(prev => prev.map(i => i.id === img.id ? { ...i, progress: Math.round(p * 0.4) } : i));
      });
      
      // 2. Cloud Sync (Supabase)
      const publicUrl = await uploadImageToStorage(compressedFile, 'incident_evidence');
      
      setImages(prev => prev.map(i => i.id === img.id ? { 
        ...i, 
        status: 'success', 
        progress: 100, 
        serverUrl: publicUrl 
      } : i));
    } catch (error: any) {
      setImages(prev => prev.map(i => i.id === img.id ? { 
        ...i, 
        status: 'error', 
        errorMessage: error.message 
      } : i));
      sendToast(`Upload Fault: ${img.file.name}`, "critical");
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
    
    try {
      const attachments = images
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));

      await submitIncidentReport(formData, attachments);
      
      setSubmitStatus('success');
      sendNotification("Incident Dispatched", `Record ID generated for "${formData.title}"`);
      sendToast("Cloud Synchronization Verified", "success");
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
