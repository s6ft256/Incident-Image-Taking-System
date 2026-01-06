
import React, { useState, useEffect, useCallback } from 'react';
import { TraineeRow, UploadedImage } from '../types';
import { getAddress } from '../services/weatherService';
import { ImageGrid } from './ImageGrid';
import { compressImage } from '../utils/imageCompression';
import { uploadImageToStorage } from '../services/storageService';
import { saveTrainingRoster, getTrainingHistory, TrainingSessionData } from '../services/trainingService';
import { submitTrainingRoster } from '../services/airtableService';
import { sendToast } from '../services/notificationService';
import { MAX_IMAGES } from '../constants';
import { getPositionWithRefinement } from '../utils/geolocation';
import { useEdgeSwipeBack } from '../hooks/useSwipeGesture';

interface TrainingManagementProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

const BG_IMAGE = 'https://images.unsplash.com/photo-1504307651254-35680f3366d4?auto=format&fit=crop&q=80&w=2000';

export const TrainingManagement: React.FC<TrainingManagementProps> = ({ appTheme, onBack }) => {
  // Enable swipe from left edge to go back
  useEdgeSwipeBack();

  const isLight = appTheme === 'light';
  
  const [view, setView] = useState<'list' | 'create'>('list');
  const [history, setHistory] = useState<TrainingSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<TrainingSessionData | null>(null);

  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('Acquiring GPS...');
  const [contractor, setContractor] = useState('');
  const [topicDiscussed, setTopicDiscussed] = useState('');
  const [conductedBy, setConductedBy] = useState('');
  const [conductorSigned, setConductorSigned] = useState(false);
  const [trainingImages, setTrainingImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [trainees, setTrainees] = useState<TraineeRow[]>([
    { id: crypto.randomUUID(), name: '', companyNo: '', designation: '', isSigned: false }
  ]);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTrainingHistory();
      setHistory(data);
    } catch (e: any) {
      sendToast(e.message, "critical");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (view === 'create') {
      if (!navigator.geolocation) {
        setLocation("GPS Hardware Not Detected");
        return;
      }

      void (async () => {
        try {
          await getPositionWithRefinement(async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocation(`GPS: ${coords}${Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)}m)` : ''}`);
            try {
              const addr = await getAddress(latitude, longitude);
              setLocation(`${addr} (${coords})${Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)}m)` : ''}`);
            } catch {
              // keep coords
            }
          });
        } catch {
          setLocation("GPS Signal Unavailable");
        }
      })();
    }
  }, [view]);

  const processImageUpload = async (img: UploadedImage) => {
    const imageId = img.id;
    setTrainingImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'uploading', progress: 10 } : i));
    try {
      const compressed = await compressImage(img.file);
      const url = await uploadImageToStorage(compressed, 'training_photos');
      setTrainingImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'success', progress: 100, serverUrl: url } : i));
    } catch (err: any) {
      setTrainingImages(prev => prev.map(i => i.id === imageId ? { ...i, status: 'error', progress: 0, errorMessage: err.message } : i));
    }
  };

  const handleAddFiles = useCallback((files: FileList) => {
    const remainingSlots = MAX_IMAGES - trainingImages.length;
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
      processImageUpload(newImg);
      return newImg;
    });

    setTrainingImages(prev => [...prev, ...newImages]);
  }, [trainingImages.length]);

  const handleSubmit = async () => {
    if (!projectName || !topicDiscussed || !conductedBy || !conductorSigned) {
      sendToast("Mandatory fields required.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const trainingData = {
        projectName,
        locationText: location,
        contractor,
        topicDiscussed,
        conductedBy,
        conductorSignature: conductedBy,
        trainees,
        images: trainingImages
      };
      const successfulImages = trainingImages
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));

      await saveTrainingRoster(trainingData);
      await submitTrainingRoster(trainingData, successfulImages);

      sendToast("Training Record Dispatched", "success");
      setView('list');
      loadHistory();
      setProjectName(''); setTopicDiscussed(''); setTrainees([{ id: crypto.randomUUID(), name: '', companyNo: '', designation: '', isSigned: false }]); setTrainingImages([]);
    } catch (err: any) {
      sendToast(err.message, "critical");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'list') {
    return (
      <div className="animate-in slide-in-from-right duration-500 pb-24 max-w-5xl mx-auto relative">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-5 sm:opacity-10">
          <img src={BG_IMAGE} className="w-full h-full object-cover rounded-[3rem]" alt="BG" />
          <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white via-white/80 to-white' : 'from-[#020617] via-transparent to-[#020617]'}`}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button onClick={onBack} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="flex flex-col">
                <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Training Ledger</h2>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">EHS Digital Registry History</span>
              </div>
            </div>
            <button 
              onClick={() => setView('create')}
              className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl hover:bg-blue-500 transition-all active:scale-90 border border-blue-400/20 group"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:rotate-90 transition-transform"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-[10px] font-black uppercase text-slate-500">Retrieving Secure Roster...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map(session => (
                <div 
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${isLight ? 'bg-white/90 border-slate-200 hover:border-blue-500' : 'bg-white/[0.03] border-white/5 hover:border-blue-500/50'}`}
                >
                   <div className="flex justify-between items-start mb-4">
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{new Date(session.created_at!).toLocaleDateString()}</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">{session.trainees.length} Trainees</span>
                   </div>
                   <h3 className={`text-sm font-black mb-2 truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{session.projectName}</h3>
                   <p className="text-[10px] font-bold text-slate-500 mb-4 line-clamp-2">{session.topicDiscussed}</p>
                   <div className="flex items-center justify-between pt-4 border-t border-white/5 opacity-60">
                      <span className="text-[8px] font-black uppercase truncate">{session.conductedBy}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
             <div className={`w-full max-w-5xl max-h-full overflow-y-auto rounded-[3rem] border shadow-2xl p-8 sm:p-12 ${isLight ? 'bg-white' : 'bg-[#020617] border-white/10'}`}>
                <div className="flex justify-between items-start mb-10 border-b border-white/5 pb-8">
                   <div>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Official Training Document</span>
                      <h1 className={`text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedSession.projectName}</h1>
                      <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{selectedSession.contractor}</p>
                   </div>
                   <button onClick={() => setSelectedSession(null)} className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                   </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                   <div className="space-y-6">
                      <div className="p-6 rounded-[2rem] bg-black/20 border border-white/5">
                         <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Topic Discussed</h4>
                         <p className={`text-sm font-bold leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{selectedSession.topicDiscussed}</p>
                      </div>
                      <div className="p-6 rounded-[2rem] bg-black/20 border border-white/5">
                         <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Location Record</h4>
                         <p className="text-[11px] font-mono text-slate-500">{selectedSession.locationText}</p>
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-2">Evidence Photos</h4>
                      <div className="grid grid-cols-3 gap-3">
                         {selectedSession.images.map((img, i) => (
                           <a key={i} href={img.serverUrl} target="_blank" className="aspect-square rounded-2xl overflow-hidden border-2 border-white/5 hover:border-blue-500 transition-all shadow-xl">
                              <img src={img.serverUrl} className="w-full h-full object-cover" alt="Evidence" />
                           </a>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-10 border-t border-white/5">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Authorized Conductor</span>
                        <span className="text-lg font-black text-emerald-500 uppercase tracking-widest">{selectedSession.conductedBy}</span>
                      </div>
                   </div>
                   <button onClick={() => setSelectedSession(null)} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-blue-500 transition-all border border-blue-400/30">Close Record</button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-24 max-w-5xl mx-auto relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5 sm:opacity-10">
        <img src={BG_IMAGE} className="w-full h-full object-cover rounded-[3rem]" alt="Form BG" />
        <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white via-white/80 to-white' : 'from-[#020617] via-transparent to-[#020617]'}`}></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center mb-8">
          <button onClick={() => setView('list')} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className={`text-xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Initialize Training</h2>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">EHS Digital Record Entry</span>
          </div>
        </div>

        <div className={`p-8 sm:p-12 rounded-[2.5rem] border shadow-2xl relative overflow-hidden backdrop-blur-[2px] ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-white/[0.02] border-white/10'
        }`}>
          <div className="text-center mb-12 space-y-2 border-b border-white/5 pb-8">
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
              EHS TRAINING ROSTER
            </h1>
            <h2 className="text-sm font-black text-blue-500 uppercase tracking-[0.3em]">NEW SESSION ENTRY</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project Name</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project ID" className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm ${isLight ? 'bg-slate-50' : 'bg-black/40 border-white/5 text-white'}`} />
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contractor</label>
                <input type="text" value={contractor} onChange={(e) => setContractor(e.target.value)} placeholder="Firm Name" className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm ${isLight ? 'bg-slate-50' : 'bg-black/40 border-white/5 text-white'}`} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-12">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Topic Discussed:</label>
            <textarea rows={4} value={topicDiscussed} onChange={(e) => setTopicDiscussed(e.target.value)} className={`w-full p-6 rounded-[2rem] border outline-none font-bold text-sm resize-none ${isLight ? 'bg-slate-50' : 'bg-black/40 border-white/5 text-white'}`} />
          </div>

          <div className="mb-10 pt-8 border-t border-white/5">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mb-4 block">Evidence Acquisition (Drag & Drop Supported):</label>
             <ImageGrid 
               images={trainingImages} 
               onAdd={handleAddFiles} 
               onRemove={(id) => setTrainingImages(trainingImages.filter(i => i.id !== id))} 
               onRetry={(id) => {
                 const img = trainingImages.find(i => i.id === id);
                 if (img) processImageUpload(img);
               }} 
               appTheme={appTheme} 
               hideHeader 
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end mt-12 border-t border-white/5 pt-12">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase px-1">Conducted By:</label>
                <input type="text" value={conductedBy} onChange={(e) => setConductedBy(e.target.value)} className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm ${isLight ? 'bg-white' : 'bg-black/40 border-white/5 text-white'}`} />
             </div>
             <button onClick={() => setConductorSigned(!conductorSigned)} className={`w-full h-14 rounded-2xl border transition-all flex items-center justify-center ${conductorSigned ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-white/5 text-slate-700'}`}>
                {conductorSigned ? <span className="font-serif italic text-lg">{conductedBy || 'Authorized'}</span> : <span className="text-[9px] font-black uppercase tracking-widest">Verify Authorization</span>}
             </button>
          </div>

          <div className="mt-12 flex justify-center">
             <button onClick={handleSubmit} disabled={isSubmitting} className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.4em] text-xs shadow-2xl hover:bg-blue-500 transition-all border border-blue-400/30">
               {isSubmitting ? "Syncing..." : "Finalize & Submit Roster"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
