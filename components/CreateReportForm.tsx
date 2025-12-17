import React, { useState, useEffect } from 'react';
import { InputField } from './InputField';
import { ImageGrid } from './ImageGrid';
import { IncidentForm, UploadedImage } from '../types';
import { MIN_IMAGES, INCIDENT_TYPES, ROLES, SITES } from '../constants';
import { submitIncidentReport } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { saveOfflineReport } from '../services/offlineStorage';

interface CreateReportFormProps {
  baseId: string;
  onBack: () => void;
}

export const CreateReportForm: React.FC<CreateReportFormProps> = ({ baseId, onBack }) => {
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
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

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
    if (!imageRecord) throw new Error("Image not found in state");

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
          img.id === imageId ? { 
            ...img, 
            status: 'success', 
            progress: 100, 
            serverUrl: publicUrl 
          } : img
        ));
        resolve(publicUrl);

      } catch (error: any) {
        clearInterval(interval);
        console.error("Upload failed", error);
        setImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, status: 'error', progress: 0 } : img
        ));
        reject(new Error(`"${imageRecord.file.name}" failed: ${error.message || 'Unknown error'}`));
      }
    });
  };

  const handleRetry = (id: string) => {
     processImageUpload(id).catch(err => {
         console.warn("Retry failed:", err);
     });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitStatus('idle');

    if (!baseId) {
      setErrorMessage("Configuration Error: Base ID is missing.");
      setSubmitStatus('error');
      return;
    }

    if (!formData.name || !formData.role || !formData.site || !formData.category || !formData.observation) {
      setErrorMessage("Please fill in all required fields.");
      setSubmitStatus('error');
      return;
    }

    if (images.length < MIN_IMAGES) {
      setErrorMessage(`Please upload at least ${MIN_IMAGES} images (Current: ${images.length}).`);
      setSubmitStatus('error');
      return;
    }

    // Offline Handling
    if (!isOnline) {
       setIsSubmitting(true);
       try {
         await saveOfflineReport(formData, images);
         setSubmitStatus('offline-saved');
         setFormData({ name: '', role: '', site: '', category: '', observation: '', actionTaken: '' });
         setImages([]);
       } catch (err: any) {
         setErrorMessage("Failed to save offline: " + err.message);
         setSubmitStatus('error');
       } finally {
         setIsSubmitting(false);
       }
       return;
    }

    // Standard Online Submission
    if (images.some(img => img.status === 'error')) {
        const failedNames = images.filter(i => i.status === 'error').map(i => i.file.name).join(', ');
        setErrorMessage(`Please resolve upload errors for: ${failedNames} before submitting.`);
        setSubmitStatus('error');
        return;
    }

    setIsSubmitting(true);

    try {
      const pendingImages = images.filter(img => img.status !== 'success');
      
      const uploadResults = await Promise.allSettled(
        pendingImages.map(img => processImageUpload(img.id))
      );

      const rejectedUploads = uploadResults.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (rejectedUploads.length > 0) {
          const uniqueErrors = Array.from(new Set(rejectedUploads.map(r => r.reason.message)));
          throw new Error(`One or more images failed to upload: ${uniqueErrors.join('; ')}`);
      }

      const finalAttachments: { url: string; filename: string }[] = [];
      const newUrls = new Map<string, string>();
      pendingImages.forEach((img, index) => {
          const result = uploadResults[index];
          if (result.status === 'fulfilled') {
              newUrls.set(img.id, result.value);
          }
      });

      images.forEach(img => {
          if (img.status === 'success' && img.serverUrl) {
              finalAttachments.push({ url: img.serverUrl, filename: img.file.name });
          } else if (newUrls.has(img.id)) {
              finalAttachments.push({ url: newUrls.get(img.id)!, filename: img.file.name });
          }
      });

      await submitIncidentReport(formData, finalAttachments, { baseId });
      
      setSubmitStatus('success');
      setFormData({ name: '', role: '', site: '', category: '', observation: '', actionTaken: '' });
      setImages([]);
    } catch (error: any) {
      setSubmitStatus('error');
      const msg = error.message || "Failed to submit report.";
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success' || submitStatus === 'offline-saved') {
    const isOfflineSuccess = submitStatus === 'offline-saved';
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ${
            isOfflineSuccess ? 'bg-amber-500 shadow-amber-500/30' : 'bg-green-500 shadow-green-500/30'
        }`}>
          {isOfflineSuccess ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
             </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <h2 className="text-2xl font-bold text-white">
            {isOfflineSuccess ? 'Saved to Outbox' : 'Submission Successful'}
        </h2>
        <p className="text-slate-300">
            {isOfflineSuccess 
                ? 'Your report has been saved locally. It will automatically upload when an internet connection is restored.'
                : 'Report successfully saved to Airtable. It is now marked as Open.'
            }
        </p>
        <div className="flex gap-4 pt-4">
          <button 
            onClick={onBack}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Back to Home
          </button>
          <button 
            onClick={() => setSubmitStatus('idle')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            New Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right duration-300">
      
      {!isOnline && (
         <div className="mb-4 bg-amber-600/20 border border-amber-500/50 p-3 rounded-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-100">You are offline. Reports will be saved locally.</p>
         </div>
      )}
      
      <div className="mb-6 relative h-48 rounded-xl overflow-hidden shadow-lg border border-slate-700 group">
        <img 
            src="https://fatfinger.io/wp-content/uploads/2024/04/foreman-control-loading-containers-box-from-cargo-2024-02-27-21-53-26-utc-min-scaled.jpg" 
            alt="New Incident Context" 
            className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        
        <button 
            onClick={onBack} 
            className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all border border-white/20 z-10"
        >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
             <h2 className="text-3xl font-bold text-white drop-shadow-lg shadow-black">New Incident Report</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-3">
            Reporter Details
          </h2>
          
          <InputField 
            id="name" 
            label="Full Name" 
            value={formData.name} 
            onChange={handleInputChange} 
            required
            placeholder="Enter full name"
            autoComplete="name"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              id="role" 
              label="Role / Position" 
              value={formData.role} 
              onChange={handleInputChange} 
              placeholder="Site Supervisor"
              required
              list={ROLES}
              autoComplete="organization-title"
            />
            
            <InputField 
              id="site" 
              label="Site / Location" 
              value={formData.site} 
              onChange={handleInputChange} 
              placeholder="Warehouse A"
              required
              list={SITES}
              autoComplete="on"
            />
          </div>

          <div className="border-t border-slate-700/50 pt-4">
            <InputField 
              id="category" 
              label="Incident Category" 
              value={formData.category} 
              onChange={handleInputChange} 
              list={INCIDENT_TYPES}
              required
              placeholder="Select or type Category"
              autoComplete="on"
            />
          </div>

          <InputField
            id="observation"
            label="Observation"
            value={formData.observation}
            onChange={handleInputChange}
            type="textarea"
            placeholder="Describe the unsafe act, condition, or incident..."
            required
            autoComplete="off"
          />
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 space-y-6">
          <ImageGrid 
            images={images} 
            onAdd={handleAddImage} 
            onRemove={handleRemoveImage} 
            onRetry={handleRetry}
          />
        </div>

        {submitStatus === 'error' && (
          <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2 text-sm justify-center text-center">
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="sticky bottom-4 z-10">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center items-center gap-2 py-4 px-6 rounded-lg text-white font-bold text-lg shadow-lg transition-transform active:scale-[0.99] ${
              isSubmitting 
                ? 'bg-slate-600 cursor-not-allowed' 
                : isOnline 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-black/30'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-black/30'
            }`}
          >
            {isSubmitting 
                ? 'Processing...' 
                : isOnline 
                    ? 'Submit Incident Report' 
                    : 'Save Report Offline'
            }
          </button>
        </div>
      </form>
    </div>
  );
};