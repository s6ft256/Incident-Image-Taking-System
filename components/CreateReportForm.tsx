
import React, { useState, useEffect, useCallback } from 'react';
import { InputField } from './InputField';
import { ImageGrid } from './ImageGrid';
import { IncidentForm, UploadedImage, UserProfile } from '../types';
import { MIN_IMAGES, INCIDENT_TYPES, ROLES, SITES } from '../constants';
import { submitIncidentReport } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { saveOfflineReport } from '../services/offlineStorage';

interface CreateReportFormProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
}

const PROFILE_KEY = 'hse_guardian_profile';

export const CreateReportForm: React.FC<CreateReportFormProps> = ({ baseId, onBack, appTheme = 'dark' }) => {
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
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'offline-saved'>('idle');
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
      // images is stable here because useEffect dependency is empty
    };
  }, []);

  // Performance Optimization: Wrap in useCallback to ensure speed typing is lag-free
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const processImageUpload = async (imageId: string): Promise<string> => {
    const imageRecord = images.find(img => img.id === imageId);
    if (!imageRecord) throw new Error("Image not found");

    return new Promise(async (resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 5;
        if (progress > 90) progress = 90;
        setImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, status: 'uploading', progress: progress } : img
        ));
      }, 200);

      try {
        const fileToUpload = await compressImage(imageRecord.file);
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
        reject(new Error(`"${imageRecord.file.name}" failed: ${error.message}`));
      }
    });
  };

  const handleRetry = (id: string) => processImageUpload(id);

  const handleSubmit = async (e: React.FormEvent) => {
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
        if (res.status === 'fulfilled') attachments.push({ url: (res as PromiseFulfilledResult<string>).value, filename: pendingImages[idx].file.name });
      });

      await submitIncidentReport(formData, attachments, { baseId });
      setSubmitStatus('success');
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || "Submission failed.");
    } finally { setIsSubmitting(false); }
  };

  if (submitStatus === 'success' || submitStatus === 'offline-saved') {
    return (
      <div className={`${appTheme === 'dark' ? 'bg-white/10' : 'bg-white'} backdrop-blur-2xl border ${appTheme === 'dark' ? 'border-white/20' : 'border-slate-200'} rounded-3xl shadow-2xl p-10 text-center space-y-6 animate-in zoom-in duration-500`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl ${
            submitStatus === 'offline-saved' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-emerald-500 shadow-emerald-500/30'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className={`text-3xl font-black ${appTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{submitStatus === 'offline-saved' ? 'Report Logged Offline' : 'Evidence Submitted'}</h2>
        <p className={`${appTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'} text-sm leading-relaxed max-w-xs mx-auto`}>
            {submitStatus === 'offline-saved' 
                ? 'Your report is stored locally and will sync once network is available.'
                : 'Incident successfully logged. All photographic evidence has been securely stored.'
            }
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <button onClick={() => setSubmitStatus('idle')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all">NEW REPORT</button>
          <button onClick={onBack} className={`w-full ${appTheme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'} hover:bg-opacity-20 font-bold py-4 rounded-2xl transition-all`}>EXIT TO DASHBOARD</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-20">
      <div className={`mb-8 relative h-56 rounded-[2.5rem] overflow-hidden shadow-2xl border ${appTheme === 'dark' ? 'border-white/20' : 'border-slate-200'}`}>
        <img src="https://fatfinger.io/wp-content/uploads/2024/04/foreman-control-loading-containers-box-from-cargo-2024-02-27-21-53-26-utc-min-scaled.jpg" className="w-full h-full object-cover" alt="Safety Header" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
        <button onClick={onBack} className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-xl border border-white/20 transition-all z-10">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
             <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-2xl">Log Incident</h2>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Evidence Acquisition</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`${appTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} backdrop-blur-xl rounded-[2rem] border p-8 space-y-6 shadow-2xl`}>
          <h2 className={`text-[10px] font-black ${appTheme === 'dark' ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'} uppercase tracking-widest border-b pb-4`}>Observer Identification</h2>
          <InputField id="name" label="Full Name" value={formData.name} onChange={handleInputChange} required placeholder="Your Name" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField id="role" label="Current Role" value={formData.role} onChange={handleInputChange} required list={ROLES} />
            <InputField id="site" label="Work Location" value={formData.site} onChange={handleInputChange} required list={SITES} />
          </div>
          <InputField id="category" label="Incident Type" value={formData.category} onChange={handleInputChange} list={INCIDENT_TYPES} required />
          <InputField id="observation" label="Detailed Description" value={formData.observation} onChange={handleInputChange} type="textarea" rows={4} placeholder="Describe the findings and immediate hazards..." required />
        </div>

        <div className={`${appTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} backdrop-blur-xl rounded-[2rem] border p-8 shadow-2xl`}>
          <ImageGrid images={images} onAdd={handleAddImage} onRemove={handleRemoveImage} onRetry={handleRetry} appTheme={appTheme} />
        </div>

        {errorMessage && (
          <div className="bg-red-500/20 backdrop-blur-lg border border-red-500/30 text-red-200 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-lg"
        >
          {isSubmitting ? 'Acquiring Data...' : isOnline ? 'Submit Evidence' : 'Store Locally'}
        </button>
      </form>
    </div>
  );
};
