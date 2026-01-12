import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ObservationForm, UploadedImage, UserProfile } from '../types';
import { MIN_IMAGES, MAX_IMAGES, STORAGE_KEYS, OBSERVATION_TYPES } from '../constants';
import { submitObservationReport } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { saveOfflineReport } from '../services/offlineStorage';
import { getAddress } from '../services/weatherService';
import { fileToBase64 } from '../utils/fileToBase64';
import { GoogleGenAI, Type } from "@google/genai";
import { sendToast } from '../services/notificationService';
import { getPositionWithRefinement } from '../utils/geolocation';

export type SubmitStatus = 'idle' | 'success' | 'error' | 'offline-saved';

export const useObservationReport = (baseId: string) => {
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
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

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
  
  const analyzeImageWithAI = useCallback(async (image: UploadedImage) => {
    if (!isOnline) return;
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not configured. Skipping AI image analysis.');
      return;
    }
    
    setIsAnalyzingImage(true);
    setImages(prev => prev.map(i => i.id === image.id ? { ...i, status: 'analyzing' } : i));

    try {
      const base64Data = await fileToBase64(image.file);
      const ai = new GoogleGenAI({ apiKey });
      const imagePart = { inlineData: { mimeType: image.file.type, data: base64Data } };
      
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: { parts: [imagePart, { text: 'Analyze this image from a construction or industrial site. In one or two sentences, describe any safety hazards you see. Then, classify the primary hazard into one of the available categories.' }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING, description: 'A detailed one or two sentence description of the safety hazard observed in the image.' },
              category: { type: Type.STRING, description: 'The most relevant safety category for the hazard.', enum: OBSERVATION_TYPES },
            },
            required: ['description', 'category'],
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (result.description && result.category) {
        setFormData(prev => ({ ...prev, observation: result.description, category: result.category }));
        sendToast("AI analysis complete. Report pre-filled.", "ai");
      }
    } catch (e: any) {
      console.error("AI Image Analysis failed", e);
      sendToast("AI analysis failed. Please proceed manually.", "warning");
    } finally {
      setIsAnalyzingImage(false);
      // Reset status to pending so it can be uploaded or re-analyzed
      setImages(prev => prev.map(i => i.id === image.id && i.status === 'analyzing' ? { ...i, status: 'pending' } : i));
    }
  }, [isOnline]);

  const processImageUpload = useCallback(async (img: UploadedImage) => {
    const onProgress = (p: number) => {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, progress: p } : i));
    };
    
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'uploading', progress: 0, errorMessage: undefined } : i));
    try {
      onProgress(10); // Initial progress
      const fileToUpload = await compressImage(img.file, p => onProgress(10 + Math.round(p * 0.4))); // Compression is 40% of the work
      onProgress(50);
      const publicUrl = await uploadImageToStorage(fileToUpload, 'incident_evidence');
      onProgress(100);
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'success', serverUrl: publicUrl } : i));
    } catch (error: any) {
      const friendlyError = error.message || "Connection Error";
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

    const wasEmpty = images.length === 0;
    setImages(prev => [...prev, ...newImages]);

    // Run uploads and AI analysis in parallel for better UX
    newImages.forEach(img => processImageUpload(img));
    if (wasEmpty && newImages.length > 0) {
      analyzeImageWithAI(newImages[0]);
    }
    
  }, [images.length, analyzeImageWithAI, processImageUpload]);

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
      
    const successfulImages = images.filter(img => img.status === 'success' && img.serverUrl);
    if (successfulImages.length < images.length) {
      setErrorMessage(`Evidence sync failed for some images. Retry failed uploads before submitting.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const attachments = successfulImages.map(img => ({ url: img.serverUrl!, filename: img.file.name }));
      await submitObservationReport(formData, attachments, { baseId });
      setSubmitStatus('success');
      // Notify app that a new report was submitted so UI can refresh and show it in Open tab
      try {
        window.dispatchEvent(new CustomEvent('report:submitted', { detail: { type: 'observation', baseId } }));
      } catch (e) {
        // ignore
      }
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || "Transmission interrupted. Please check your connection and try again.");
    } finally { 
      setIsSubmitting(false); 
    }
  }, [baseId, formData, images, isOnline, validationErrors]);

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
    isAnalyzingImage,
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