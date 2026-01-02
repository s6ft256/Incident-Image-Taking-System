
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InputField } from './InputField';
import { ImageGrid } from './ImageGrid';
import { INCIDENT_TYPES, SEVERITY_LEVELS, STORAGE_KEYS, MIN_IMAGES, AIRTABLE_CONFIG, DEPARTMENTS } from '../constants';
import { UserProfile, IncidentForm, UploadedImage } from '../types';
import { getAddress } from '../services/weatherService';
import { compressImage } from '../utils/imageCompression';
import { uploadImageToStorage } from '../services/storageService';
import { getAllProfiles } from '../services/profileService';
import { submitIncidentReport } from '../services/airtableService';
import { sendToast, sendNotification } from '../services/notificationService';
import { GoogleGenAI } from "@google/genai";

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
  
  // Stakeholder Selection States
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

  const analyzeIncident = async () => {
    if (formData.description.length < 20) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this safety incident description: "${formData.description}". 
        Return JSON with:
        1. "suggestedType": choose from [${INCIDENT_TYPES.join(', ')}]
        2. "suggestedSeverity": choose from [${SEVERITY_LEVELS.join(', ')}]
        3. "safetyTip": one immediate safety instruction.`,
        config: { responseMimeType: "application/json" }
      });
      const result = JSON.parse(response.text || '{}');
      if (result.suggestedSeverity) {
        sendToast(`AI suggests ${result.suggestedSeverity} severity based on description.`, 'ai');
      }
    } catch (e) {} finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImg: UploadedImage = {
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0
      };
      setImages(prev => [...prev, newImg]);
      uploadImage(newImg);
    }
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

  const toggleRecipient = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
    setShowDirectory(false);
  };

  const handleManualEmailAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = emailInput.trim().replace(',', '');
      if (val && val.includes('@') && !selectedEmails.includes(val)) {
        setSelectedEmails(prev => [...prev, val]);
        setEmailInput('');
      }
    }
  };

  // Reusable Alert Function
  const executeEmailDispatch = (recipients: string[]) => {
    const subject = `HSE ALERT: ${formData.severity.toUpperCase()} INCIDENT - ${formData.title || 'Untitled Report'}`;
    const body = `
SAFETY INCIDENT REPORT
----------------------
SYSTEM ID: ${Math.random().toString(36).substr(2, 5).toUpperCase()}
DATE: ${formData.date}
TIME: ${formData.time}
TYPE: ${formData.type || 'Not Specified'}
SEVERITY: ${formData.severity}
LOCATION: ${formData.location || 'Not Captured'}

DESCRIPTION:
${formData.description || 'No description provided.'}

IMMEDIATE ACTION:
${formData.immediateAction || 'None reported'}

REPORTER IDENTITY:
Name: ${formData.reporterName}
Role: ${formData.reporterRole}
Email: ${userEmail || 'Not provided'}

-- This is an automated safety alert generated from HSE Guardian --
    `.trim();

    const mailtoUrl = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

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
        throw new Error("Photographic evidence sync is still in progress. Please wait.");
      }

      // 1. Submit to Safety Database
      await submitIncidentReport(formData, attachments, { baseId: AIRTABLE_CONFIG.BASE_ID });
      
      const reportId = Math.random().toString(36).substr(2, 5).toUpperCase();
      sendNotification("CRITICAL INCIDENT LOGGED", `ID ${reportId}: ${formData.title} has been serialized and dispatched.`, true);
      sendToast("Incident Successfully Dispatched", "success");
      
      // 2. Automated Stakeholder Notification (Triggered automatically if selection exists)
      if (selectedEmails.length > 0) {
        sendToast(`Stakeholder Alert Triggered: Notifying ${selectedEmails.length} recipients...`, "info");
        executeEmailDispatch(selectedEmails);
      }

      setIsSubmitting(false);
      onBack();
    } catch (err: any) {
      sendToast(err.message || "Failed to dispatch incident log.", "critical");
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
            <button onClick={onBack} className={`p-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Incident Report</h2>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1 block text-left">Reactive Event Documentation</span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Protocol Version</span>
            <span className={`block text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>HSE-INC-2025-A</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Identification */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1">1. Event Identification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField id="title" label="Incident Title" value={formData.title} onChange={handleInputChange} placeholder="Brief summary" required />
              <InputField id="type" label="Incident Type" value={formData.type} onChange={handleInputChange} list={INCIDENT_TYPES} required />
              <InputField id="department" label="Involved Department" value={formData.department} onChange={handleInputChange} list={DEPARTMENTS} required />
              <InputField id="severity" label="Initial Severity" value={formData.severity} onChange={handleInputChange} list={SEVERITY_LEVELS} required />
              <div className="grid grid-cols-2 gap-4">
                <InputField id="date" label="Date" type="text" value={formData.date} onChange={handleInputChange} required />
                <InputField id="time" label="Time" type="text" value={formData.time} onChange={handleInputChange} required />
              </div>
            </div>
          </div>

          {/* Section 2: Precise Mapping */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1">2. Precise Mapping</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <InputField id="location" label="Verified Coordinates" value={formData.location} onChange={handleInputChange} placeholder="Fetching GPS..." required />
              </div>
              <button 
                type="button"
                onClick={fetchLocation}
                disabled={isLocating}
                className={`mt-6 p-4 rounded-xl border flex items-center justify-center transition-all ${isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'}`}
              >
                {isLocating ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2c3.31 0 6 2.69 6 6 0 5.25-6 13-6 13S6 13.25 6 8c0-3.31 2.69-6 6-6z"/><circle cx="12" cy="8" r="2"/></svg>}
              </button>
            </div>
          </div>

          {/* Section 3: Narrative */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1">3. Narrative Description</h3>
              {isAnalyzing && (
                <div className="flex items-center gap-2 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span className="text-[8px] font-black uppercase text-blue-500">AI Analyzing...</span>
                </div>
              )}
            </div>
            <InputField 
              id="description" 
              label="Chronological Account" 
              type="textarea" 
              value={formData.description} 
              onChange={handleInputChange} 
              onBlur={analyzeIncident}
              placeholder="Describe exactly what happened, step by step..." 
              required 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField id="involvedParties" label="Involved Personnel" type="textarea" rows={2} value={formData.involvedParties} onChange={handleInputChange} placeholder="Names, IDs, Companies" />
              <InputField id="equipmentInvolved" label="Equipment / Assets Involved" type="textarea" rows={2} value={formData.equipmentInvolved} onChange={handleInputChange} placeholder="Plate numbers, IDs, Types" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField id="witnesses" label="Witness Statements" type="textarea" rows={2} value={formData.witnesses} onChange={handleInputChange} placeholder="Names and contact info" />
              <InputField id="immediateAction" label="Immediate Actions Taken" type="textarea" rows={2} value={formData.immediateAction} onChange={handleInputChange} placeholder="What was done to stabilize the site?" />
            </div>
          </div>

          {/* Section 4: Stakeholder Communication */}
          <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">4. Stakeholder Communication</h3>
              {selectedEmails.length > 0 && (
                <span className="bg-emerald-500/10 text-emerald-500 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse border border-emerald-500/20">
                  Auto-Notify Enabled
                </span>
              )}
            </div>
            <div className={`p-6 rounded-[2rem] border ${isLight ? 'bg-blue-50 border-blue-100 shadow-inner' : 'bg-blue-500/5 border-blue-500/20'}`}>
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                   <label className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Concerned Stakeholders</label>
                   <span className="text-[8px] font-black text-blue-500 uppercase">{selectedEmails.length} selected</span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="relative" ref={directoryRef}>
                    <div className={`flex flex-wrap gap-2 p-2 min-h-[52px] rounded-xl border transition-all ${isLight ? 'bg-white border-slate-200 focus-within:border-blue-500' : 'bg-black/40 border-white/5 focus-within:border-blue-500'}`}>
                      {selectedEmails.map(email => (
                        <span key={email} className="flex items-center gap-1.5 px-2 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase group animate-in zoom-in">
                          {email.split('@')[0]}
                          <button type="button" onClick={() => toggleRecipient(email)} className="hover:text-rose-400 transition-colors">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        value={emailInput}
                        onChange={(e) => { setEmailInput(e.target.value); if(!showDirectory) setShowDirectory(true); }}
                        onKeyDown={handleManualEmailAdd}
                        onFocus={() => setShowDirectory(true)}
                        placeholder={selectedEmails.length === 0 ? "Select or enter emails..." : "Add more..."}
                        className={`flex-1 bg-transparent border-none outline-none text-xs min-w-[120px] py-1 px-1 ${isLight ? 'text-slate-900' : 'text-white'}`}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowDirectory(!showDirectory)}
                        className={`p-1.5 rounded-lg transition-all ${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </button>
                    </div>

                    {showDirectory && (
                      <div className={`absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-y-auto rounded-2xl border shadow-2xl z-[100] animate-in slide-in-from-bottom-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                        <div className="p-3 border-b border-white/5">
                           <span className="text-[8px] font-black uppercase text-blue-500 tracking-[0.2em]">Personnel Directory</span>
                        </div>
                        {personnel.filter(p => !selectedEmails.includes(p.email!) && (p.name.toLowerCase().includes(emailInput.toLowerCase()) || p.email!.toLowerCase().includes(emailInput.toLowerCase()))).length === 0 ? (
                          <div className="p-4 text-center opacity-40 text-[9px] font-black uppercase">No unselected matches</div>
                        ) : (
                          personnel.filter(p => !selectedEmails.includes(p.email!) && (p.name.toLowerCase().includes(emailInput.toLowerCase()) || p.email!.toLowerCase().includes(emailInput.toLowerCase()))).map(p => (
                            <button 
                              key={p.email} 
                              type="button"
                              onClick={() => toggleRecipient(p.email!)}
                              className={`w-full flex items-center justify-between p-4 text-left border-b border-white/5 transition-all ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
                            >
                              <div>
                                <p className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.name}</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{p.role} • {p.site || 'Global'}</p>
                              </div>
                              <span className="text-[9px] font-mono text-blue-500">{p.email}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 px-1">
                   {selectedEmails.length > 0 ? "Notifications will be triggered automatically upon report submission." : "No stakeholders will be notified via email."}
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Photographic Evidence */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1">5. Photographic Evidence</h3>
            <div className={`p-6 rounded-[2rem] border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'}`}>
              <ImageGrid 
                images={images} 
                onAdd={handleAddImage} 
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
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-2 animate-pulse">Minimum 1 primary evidence image required.</p>
            )}
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-[0.98] border ${isSubmitting ? 'bg-slate-800 text-slate-500 border-white/5' : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400/20'}`}
          >
            {isSubmitting ? "Serializing Report..." : (selectedEmails.length > 0 ? "Dispatch & Notify Stakeholders" : "Dispatch Incident Log")}
          </button>
        </form>
      </div>
    </div>
  );
};
