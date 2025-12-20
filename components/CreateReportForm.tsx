
import React, { useEffect, useState } from 'react';
import { InputField } from './InputField';
import { ImageGrid } from './ImageGrid';
import { INCIDENT_TYPES, ROLES, SITES, MIN_IMAGES } from '../constants';
import { useIncidentReport } from '../hooks/useIncidentReport';
import { getAllProfiles } from '../services/profileService';
import { UserProfile } from '../types';

interface CreateReportFormProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
}

export const CreateReportForm: React.FC<CreateReportFormProps> = ({ baseId, onBack, appTheme = 'dark' }) => {
  const {
    formData,
    touched,
    validationErrors,
    images,
    isSubmitting,
    submitStatus,
    errorMessage,
    isOnline,
    handleInputChange,
    handleBlur,
    handleAddImage,
    handleRemoveImage,
    handleRetry,
    handleSubmit,
    resetStatus
  } = useIncidentReport(baseId);

  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const isLight = appTheme === 'light';

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const profiles = await getAllProfiles();
        setTeamMembers(profiles.map(p => p.name));
      } catch (err) {
        console.error("Failed to load team members", err);
      }
    };
    fetchTeam();
  }, []);

  if (submitStatus === 'success' || submitStatus === 'offline-saved') {
    return (
      <div className={`${isLight ? 'bg-white' : 'bg-white/10'} backdrop-blur-2xl border ${isLight ? 'border-slate-200' : 'border-white/20'} rounded-3xl shadow-2xl p-10 text-center space-y-6 animate-in zoom-in duration-500`}>
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
                : 'Incident successfully logged. All photographic evidence has been securely stored.'
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
             <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-2xl">Log Incident</h2>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Evidence Acquisition</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'} backdrop-blur-xl rounded-[2rem] border p-8 space-y-6 shadow-2xl`}>
          <h2 className={`text-[10px] font-black ${isLight ? 'text-slate-400 border-slate-100' : 'text-slate-500 border-white/5'} uppercase tracking-widest border-b pb-4`}>Observer Identification</h2>
          <InputField 
            id="name" 
            label="Full Name" 
            value={formData.name} 
            onChange={handleInputChange} 
            onBlur={handleBlur}
            error={validationErrors.name}
            touched={touched.name}
            required 
            placeholder="Your Name" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              id="role" 
              label="Current Role" 
              value={formData.role} 
              onChange={handleInputChange} 
              onBlur={handleBlur}
              error={validationErrors.role}
              touched={touched.role}
              required 
              list={ROLES} 
            />
            <InputField 
              id="site" 
              label="Work Location" 
              value={formData.site} 
              onChange={handleInputChange} 
              onBlur={handleBlur}
              error={validationErrors.site}
              touched={touched.site}
              required 
              list={SITES} 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
                id="category" 
                label="Incident Type" 
                value={formData.category} 
                onChange={handleInputChange} 
                onBlur={handleBlur}
                error={validationErrors.category}
                touched={touched.category}
                list={INCIDENT_TYPES} 
                required 
            />
            <InputField 
                id="assignedTo" 
                label="Assign To Team Member" 
                type="select"
                value={formData.assignedTo || ""} 
                onChange={handleInputChange} 
                options={["None", ...teamMembers]}
                placeholder="Select Assignee"
            />
          </div>

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
            required 
          />
        </div>

        <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'} backdrop-blur-xl rounded-[2rem] border p-8 shadow-2xl`}>
          <ImageGrid images={images} onAdd={handleAddImage} onRemove={handleRemoveImage} onRetry={handleRetry} appTheme={appTheme} />
          {images.length < MIN_IMAGES && (
            <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest px-2 animate-pulse">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
               Min {MIN_IMAGES} evidence photo required
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
