
import React, { useState } from 'react';

interface TutorialModalProps {
  onClose: () => void;
  appTheme?: 'dark' | 'light';
}

const steps = [
  {
    title: "Welcome to HSE Guardian",
    description: "Your professional command center for Health, Safety, and Environmental management. This system ensures every observation is captured, tracked, and resolved with high-integrity evidence.",
    icon: (
      <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  },
  {
    title: "The Command Dashboard",
    description: "Monitor real-time safety metrics. Use the 'Safety Status Map' to visualize open vs closed observations and 'Site Criticality Analysis' to identify high-risk zones.",
    icon: (
      <svg className="w-12 h-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    title: "Rapid Incident Logging",
    description: "Tap 'Report Incident' to acquire data. Capture up to 3 high-resolution evidence photos. The system compresses images locally and supports full offline logging.",
    icon: (
      <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <circle cx="12" cy="13" r="3" strokeWidth={2} />
      </svg>
    )
  },
  {
    title: "Closing the Loop",
    description: "Open observations must be remediated. Review logs, provide details of corrective actions, and attach closing evidence to archive the incident as 'Resolved'.",
    icon: (
      <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002 2m-6 9l2 2 4-4" />
      </svg>
    )
  },
  {
    title: "Security & Personalization",
    description: "Head to your Profile to personalize security and privacy settings. You can also switch between Dark and Light interface protocols.",
    icon: (
      <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose, appTheme = 'dark' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const isLight = appTheme === 'light';

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => onClose();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500"
        onClick={handleSkip}
      ></div>
      
      <div className={`relative w-full max-w-lg rounded-[2.5rem] border shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500 overflow-hidden flex flex-col ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
      }`}>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
           <div 
             className="h-full bg-blue-600 transition-all duration-500 ease-out"
             style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
           ></div>
        </div>

        <div className="p-8 sm:p-12 text-center flex flex-col items-center">
            <div className={`mb-8 p-6 rounded-[2rem] border transition-all duration-500 ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-lg' : 'bg-white/5 border-white/10 shadow-2xl'
            }`}>
               {steps[currentStep].icon}
            </div>
            
            <h2 className={`text-2xl sm:text-3xl font-black mb-4 tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {steps[currentStep].title}
            </h2>
            
            <p className={`text-sm sm:text-base leading-relaxed mb-8 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {steps[currentStep].description}
            </p>

            <div className="flex justify-center gap-2 mb-8">
              {steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-8 bg-blue-600' : `w-2 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`
                  }`}
                />
              ))}
            </div>
        </div>

        <div className={`p-6 sm:p-8 flex gap-3 border-t ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.02] border-white/5'}`}>
          <button 
            onClick={handleSkip}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
              isLight ? 'bg-white text-slate-400 border border-slate-200 hover:text-slate-600' : 'bg-white/5 text-slate-500 border border-white/5 hover:text-slate-300'
            }`}
          >
            Skip Tutorial
          </button>
          <button 
            onClick={handleNext}
            className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/20"
          >
            {currentStep === steps.length - 1 ? "Get Started" : "Next Step"}
          </button>
        </div>
      </div>
    </div>
  );
};
