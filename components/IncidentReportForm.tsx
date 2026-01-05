
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InputField } from './InputField';
import { ImageGrid } from './ImageGrid';
import { INCIDENT_TYPES, SEVERITY_LEVELS, STORAGE_KEYS, MIN_IMAGES, AIRTABLE_CONFIG, DEPARTMENTS, MAX_IMAGES } from '../constants';
import { UserProfile, IncidentForm, UploadedImage } from '../types';
import { getAddress } from '../services/weatherService';
import { compressImage } from '../utils/imageCompression';
import { uploadImageToStorage } from '../services/storageService';
import { getAllProfiles } from '../services/profileService';
import { submitIncidentReport } from '../services/airtableService';
import { sendToast, sendNotification } from '../services/notificationService';
import { GoogleGenAI, Type } from "@google/genai";

interface IncidentReportFormProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

export const IncidentReportForm: React.FC<IncidentReportFormProps> = ({ appTheme, onBack }) => {
  const isLight = appTheme === 'light';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [userEmail, setUserEmail] = useState('');
  
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [showDirectory, setShowDirectory] = useState(false);
  const directoryRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<IncidentForm>({
    title: '',
    type: '',
    severity: 'Minor',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    location: '',
    department: 'Operations',
    description: '',
    involvedParties: '',
    equipmentInvolved: '',
    witnesses: '',
    immediateAction: '',
    reporterName: '',
    reporterRole: '',
    concernedEmail: ''
  });

  useEffect(() => {
    const initForm = async () => {
      const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (savedProfile) {
        try {
          const profile: UserProfile = JSON.parse(savedProfile);
          setFormData(prev => ({
            ...prev,
            reporterName: profile.name,
            reporterRole: profile.role
          }));
          if (profile.email) setUserEmail(profile.email);
        } catch (e) {}
      }

      try {
        const users = await getAllProfiles();
        setPersonnel(users.filter(u => u.email));
      } catch (err) {
        console.error("Directory sync failed", err);
      }
    };
    initForm();

    const handleClickOutside = (event: MouseEvent) => {
      if (directoryRef.current && !directoryRef.current.contains(event.target as Node)) {
        setShowDirectory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const addr = await getAddress(pos.coords.latitude, pos.coords.longitude);
          setFormData(prev => ({ ...prev, location: `${addr} | GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` }));
        } catch (e) {
          setFormData(prev => ({ ...prev, location: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` }));
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false),
      { timeout: 10000 }
    );
  }, []);

  const uploadImage = async (img: UploadedImage) => {
    try {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'uploading', progress: 10 } : i));
      const compressed = await compressImage(img.file);
      const url = await uploadImageToStorage(compressed, 'incident_evidence');
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'success', progress: 100, serverUrl: url } : i));
    } catch (e: any) {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'error', errorMessage: e.message } : i));
    }
  };

  const handleAddFiles = useCallback((files: FileList) => {
    const remainingSlots = MAX_IMAGES - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    const newImages: UploadedImage[] = filesToProcess.map(file => {
      const newImg: UploadedImage = {
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0
      };
      uploadImage(newImg);
      return newImg;
    });

    setImages(prev => [...prev, ...newImages]);
  }, [images.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type || !formData.description || images.length < MIN_IMAGES) {
      sendToast("Mandatory fields and evidence required.", "warning");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const successfulImages = images.filter(img => img.status === 'success' && img.serverUrl);
      const attachments = successfulImages.map(img => ({
        url: img.serverUrl!,
        filename: img.file.name
      }));

      if (attachments.length === 0 && images.length > 0) {
        throw new Error("Evidence sync is in progress. Please wait for the 'Verified' status.");
      }

      await submitIncidentReport(formData, attachments, { baseId: AIRTABLE_CONFIG.BASE_ID });
      sendToast("Incident Log Successfully Dispatched", "success");
      onBack();
    } catch (err: any) {
      sendToast(err.message || "Dispatch failed.", "critical");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-24 max-w-4xl mx-auto">
      <div className={`mb-8 p-8 rounded-[2.5rem] border shadow-2xl overflow-hidden backdrop-blur-md form-container-glow ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-blue-500/20'
      }`}>
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onBack} className={`p-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Incident Report</h2>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1 block text-left">Reactive Event Documentation</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1">1. Event Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField id="title" label="Incident Title" value={formData.title} onChange={handleInputChange} placeholder="Brief summary" required />
              <InputField id="type" label="Incident Type" value={formData.type} onChange={handleInputChange} list={INCIDENT_TYPES} required />
              <InputField id="department" label="Involved Department" value={formData.department} onChange={handleInputChange} list={DEPARTMENTS} required />
              <InputField id="severity" label="Initial Severity" value={formData.severity} onChange={handleInputChange} list={SEVERITY_LEVELS} required />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">2. Evidence Acquisition</h3>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Supports Drag & Drop</span>
            </div>
            <div className={`p-6 rounded-[2rem] border ${isLight ? 'bg-slate-50 border-slate-200 shadow-inner' : 'bg-black/20 border-white/5'}`}>
              <ImageGrid 
                images={images} 
                onAdd={handleAddFiles} 
                onRemove={(id) => setImages(prev => prev.filter(i => i.id !== id))} 
                onRetry={(id) => {
                  const img = images.find(i => i.id === id);
                  if (img) uploadImage(img);
                }} 
                appTheme={appTheme} 
                hideHeader={true}
              />
            </div>
            {images.length < MIN_IMAGES && (
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-2 animate-pulse">Minimum {MIN_IMAGES} evidence image required.</p>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1">3. Narrative Description</h3>
            <InputField 
              id="description" 
              label="Chronological Account" 
              type="textarea" 
              value={formData.description} 
              onChange={handleInputChange} 
              placeholder="Describe exactly what happened, step by step..." 
              required 
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-[0.98] border ${isSubmitting ? 'bg-slate-800 text-slate-500 border-white/5' : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400/20'}`}
          >
            {isSubmitting ? "Serializing Report..." : "Dispatch Incident Log"}
          </button>
        </form>
      </div>
    </div>
  );
};
