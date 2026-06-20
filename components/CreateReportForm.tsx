
import React, { useEffect, useState, useCallback } from 'react';
import { InputField } from './InputField';
import { ImageGrid } from './ImageGrid';
import { OBSERVATION_TYPES, ROLES, SITES, MIN_IMAGES } from '../constants';
import { useObservationReport } from '../hooks/useIncidentReport';
import { getAllProfiles } from '../services/profileService';
import { UserProfile } from '../types';
import { sendNotification } from '../services/notificationService';
import { GoogleGenAI, Type } from "@google/genai";
import { handleError } from '../utils/errorHandler';
import { useEdgeSwipeBack } from '../hooks/useSwipeGesture';

interface CreateReportFormProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
}

interface AISuggestion {
  category: string;
  recommendation: string;
  severity: 'Low' | 'Medium' | 'High';
}

export const CreateReportForm: React.FC<CreateReportFormProps> = ({ baseId, onBack, appTheme = 'dark' }) => {
  // Enable swipe from left edge to go back (uses browser history)
  useEdgeSwipeBack();

  const {
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
    handleRetry,
    handleSubmit,
    resetStatus,
    setFormData
  } = useObservationReport(baseId);

  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [aiResult, setAiResult] = useState<AISuggestion | null>(null);
  const isLight = appTheme === 'light';

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const profiles = await getAllProfiles();
        setTeamMembers(profiles.map(p => p.name));
      } catch (err) {
        handleError(err, { operation: 'fetch-team-members' }, { silent: true });
      }
    };
    fetchTeam();
  }, []);

  // AI Analysis Logic for Text
  const analyzeHazardText = useCallback(async () => {
    if (!formData.observation || formData.observation.length < 20 || !isOnline) return;
    
    setIsAnalyzingText(true);
    setAiResult(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('Gemini API key not configured. Skipping AI analysis.');
        setIsAnalyzingText(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this safety observation: "${formData.observation}".`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'The most relevant safety category for the observation.',
                enum: OBSERVATION_TYPES,
              },
              recommendation: {
                type: Type.STRING,
                description: 'A brief, actionable corrective measure.',
              },
              severity: {
                type: Type.STRING,
                description: 'The assessed risk level.',
                enum: ['Low', 'Medium', 'High'],
              },
            },
            required: ['category', 'recommendation', 'severity'],
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.category && OBSERVATION_TYPES.includes(result.category)) {
        setAiResult(result);
      }
    } catch (e) {
      // Silent fail for AI - it's an enhancement, not critical
      handleError(e, { operation: 'ai-text-analysis' }, { silent: true });
    } finally {
      setIsAnalyzingText(false);
    }
  }, [formData.observation, isOnline]);

  // Debounced AI call for text
  useEffect(() => {
    const timer = setTimeout(analyzeHazardText, 2000);
    return () => clearTimeout(timer);
  }, [formData.observation, analyzeHazardText]);

  const applyAISuggestion = () => {
    if (aiResult) {
      setFormData(prev => ({ ...prev, category: aiResult.category }));
      setAiResult(null);
    }
  };

  // Trigger Notification on Success
  useEffect(() => {
    if (submitStatus === 'success') {
      sendNotification(
        "Observation Logged Successfully", 
        `Observation at ${formData.site || 'Site'} has been synced to the safety database.`
      );
    } else if (submitStatus === 'offline-saved') {
      sendNotification(
        "Report Saved Locally", 
        "Network unavailable. Report stored in offline queue and will sync automatically."
      );
    }
  }, [submitStatus, formData.site]);

  if (submitStatus === 'success' || submitStatus === 'offline-saved') {
    return (
      <div className={`${isLight ? 'bg-white' : 'bg-white/10'} backdrop-blur-2xl border ${isLight ? 'border-slate-200' : 'border-white/20'} rounded-3xl shadow-2xl p-10 text-center space-y-6 animate-in zoom-in duration-500 form-container-glow`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl ${
            submitStatus === 'offline-saved' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-emerald-500 shadow-emerald-500/30'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{submitStatus === 'offline-saved' ? 'Report Logged Offline' : 'Evidence Submitted'}</h2>
        <p className={`${isLight ? 'text-slate-600' : 'text-slate-300'} text-sm leading-relaxed max-w-xs mx-auto`}>
            {submitStatus === 'offline-saved' 
                ? 'Your report is stored locally and will sync once network is available.'
                : 'Observation successfully logged. All photographic evidence has been securely stored.'
            }
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <button onClick={resetStatus} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all">NEW REPORT</button>
          <button onClick={onBack} className={`w-full ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-300'} hover:bg-opacity-20 font-bold py-4 rounded-2xl transition-all`}>EXIT TO DASHBOARD</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-20">
      <div className={`mb-8 relative h-56 rounded-[2.5rem] overflow-hidden shadow-2xl border ${isLight ? 'border-slate-200' : 'border-white/20'}`}>
        <img src="https://fatfinger.io/wp-content/uploads/2024/04/foreman-control-loading-containers-box-from-cargo-2024-02-27-21-53-26-utc-min-scaled.jpg" className="w-full h-full object-cover" alt="Safety Header" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
        <button onClick={onBack} className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-xl border border-white/20 transition-all z-10">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
             <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-2xl">Log Observation</h2>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Evidence Acquisition</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'} backdrop-blur-xl rounded-[2rem] border p-8 space-y-6 shadow-2xl form-container-glow`}>
          <h2 className={`text-[10px] font-black ${isLight ? 'text-slate-400 border-slate-100' : 'text-slate-50 border-white/5'} uppercase tracking-widest border-b pb-4`}>Observer Identification</h2>
          
          <InputField 
            id="observation" 
            label="Detailed Description" 
            value={formData.observation} 
            onChange={handleInputChange} 
            onBlur={handleBlur}
            error={validationErrors.observation}
            touched={touched.observation}
            type="textarea" 
            rows={4} 
            placeholder="Describe the findings and immediate hazards..." 
          />

          {(isAnalyzingText || isAnalyzingImage) && (
            <div className="flex items-center gap-2 px-2 animate-pulse">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div>
              <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest">
                {isAnalyzingImage ? 'Gemini Analyzing Evidence...' : 'Gemini Analyzing Hazard Profile...'}
              </span>
            </div>
          )}

          {aiResult && !isAnalyzingText && (
            <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl animate-in fade-in slide-in-from-top-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2">
                 <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase ${
                   aiResult.severity === 'High' ? 'bg-rose-500 text-white' : 
                   aiResult.severity === 'Medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                 }`}>
                   {aiResult.severity} Risk
                 </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-500"><path d="M12 2v8m0 4v8m-10-10h8m4 0h8"/></svg>
                <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest">AI Safety Assessment</span>
              </div>
              <div className="space-y-3">
                 <div>
                    <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Recommended Category</span>
                    <div className="flex items-center justify-between gap-4">
                       <p className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{aiResult.category}</p>
                       <button 
                         type="button" 
                         onClick={applyAISuggestion}
                         className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-blue-500 transition-all active:scale-95"
                       >
                         Apply Suggestion
                       </button>
                    </div>
                 </div>
                 <div>
                    <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Suggested Remediation</span>
                    <p className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{aiResult.recommendation}</p>
                 </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
                id="category" 
                label="Observation Type" 
                value={formData.category} 
                onChange={handleInputChange} 
                onBlur={handleBlur}
                error={validationErrors.category}
                touched={touched.category}
                list={OBSERVATION_TYPES} 
            />
            <InputField 
                id="assignedTo" 
                label="Assign To Team Member" 
                type="select"
                value={formData.assignedTo || ""} 
                onChange={handleInputChange} 
                onBlur={handleBlur}
                options={["None", ...teamMembers]}
                placeholder="Select Assignee"
                error={validationErrors.assignedTo}
                touched={touched.assignedTo}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
            <InputField 
              id="name" 
              label="Full Name" 
              value={formData.name} 
              onChange={handleInputChange} 
              onBlur={handleBlur}
              error={validationErrors.name}
              touched={touched.name}
              placeholder="Your Name" 
            />
            <InputField 
              id="role" 
              label="Current Role" 
              value={formData.role} 
              onChange={handleInputChange} 
              onBlur={handleBlur}
              error={validationErrors.role}
              touched={touched.role}
              list={ROLES} 
            />
          </div>

          <div className="space-y-2">
            <InputField 
              id="site" 
              label="Work Location" 
              value={formData.site} 
              onChange={handleInputChange} 
              onBlur={handleBlur}
              error={validationErrors.site}
              touched={touched.site}
              list={SITES} 
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <InputField 
                    id="location" 
                    label="Precise Coordinates (GPS)" 
                    value={formData.location || ''} 
                    onChange={handleInputChange} 
                    placeholder="Lat, Long"
                    autoComplete="off"
                  />
                </div>
                <button 
                  type="button"
                  onClick={fetchCurrentLocation}
                  disabled={isLocating}
                  className={`mt-6 p-4 rounded-xl border transition-all flex items-center justify-center gap-2 group ${
                    isLight 
                      ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100' 
                      : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
                  }`}
                  title="Get Current Coordinates"
                >
                  {isLocating ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:scale-110 transition-transform">
                      <path d="M12 2c3.31 0 6 2.69 6 6 0 5.25-6 13-6 13S6 13.25 6 8c0-3.31 2.69-6 6-6z"/>
                      <circle cx="12" cy="8" r="2"/>
                    </svg>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">GPS</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'} backdrop-blur-xl rounded-[2rem] border p-8 shadow-2xl form-container-glow`}>
          <ImageGrid images={images} onAdd={handleAddFiles} onRemove={handleRemoveImage} onRetry={handleRetry} appTheme={appTheme} />
          {images.length < MIN_IMAGES && (
            <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               Evidence photos are optional
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="bg-red-500/20 backdrop-blur-lg border border-red-500/30 text-red-200 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-xl animate-in shake duration-500">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-lg border border-blue-400/20"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </div>
          ) : isOnline ? 'Submit Evidence' : 'Store Locally'}
        </button>
      </form>
    </div>
  );
};
