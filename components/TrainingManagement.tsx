import React, { useState, useEffect, useCallback } from 'react';
import { TraineeRow } from '../types';
import { getAddress } from '../services/weatherService';

interface TrainingManagementProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

const BG_IMAGE = 'https://images.unsplash.com/photo-1504307651254-35680f3366d4?auto=format&fit=crop&q=80&w=2000';

export const TrainingManagement: React.FC<TrainingManagementProps> = ({ appTheme, onBack }) => {
  const isLight = appTheme === 'light';
  
  // Form State
  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('Acquiring GPS...');
  const [contractor, setContractor] = useState('');
  const [topicDiscussed, setTopicDiscussed] = useState('');
  const [conductedBy, setConductedBy] = useState('');
  const [conductorSigned, setConductorSigned] = useState(false);
  
  // Date/Time
  const [now] = useState(new Date());
  const formattedDate = now.toLocaleDateString();
  const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Trainee Roster State
  const [trainees, setTrainees] = useState<TraineeRow[]>([
    { id: crypto.randomUUID(), name: '', companyNo: '', designation: '', isSigned: false }
  ]);

  // GPS Acquisition
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation("GPS Hardware Not Detected");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const addr = await getAddress(pos.coords.latitude, pos.coords.longitude);
          setLocation(`${addr} (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        } catch (e) {
          setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
      },
      () => setLocation("GPS Signal Unavailable"),
      { timeout: 10000 }
    );
  }, []);

  const addTraineeRow = () => {
    setTrainees([...trainees, { id: crypto.randomUUID(), name: '', companyNo: '', designation: '', isSigned: false }]);
  };

  const updateTrainee = (id: string, field: keyof TraineeRow, value: any) => {
    setTrainees(trainees.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const toggleTraineeSign = (id: string) => {
    setTrainees(trainees.map(t => t.id === id ? { 
      ...t, 
      isSigned: !t.isSigned, 
      signTimestamp: !t.isSigned ? new Date().toLocaleTimeString() : undefined 
    } : t));
  };

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-24 max-w-5xl mx-auto relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5 sm:opacity-10">
        <img 
          src={BG_IMAGE} 
          className="w-full h-full object-cover rounded-[3rem]" 
          alt="Management Suite Background" 
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white via-white/80 to-white' : 'from-[#020617] via-transparent to-[#020617]'}`}></div>
      </div>

      <div className="relative z-10">
        {/* Header Back Button */}
        <div className="flex items-center mb-8">
          <button onClick={onBack} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className={`text-xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Safety Training Terminal</h2>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">EHS Digital Record Management</span>
          </div>
        </div>

        <div className={`p-8 sm:p-12 rounded-[2.5rem] border shadow-2xl relative overflow-hidden backdrop-blur-[2px] ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-white/[0.02] border-white/10'
        }`}>
          {/* 1 & 2: Main Headers */}
          <div className="text-center mb-12 space-y-2 border-b border-white/5 pb-8">
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
              HEALTH, SAFETY AND ENVIRONMENTAL
            </h1>
            <h2 className="text-sm sm:text-lg font-black text-blue-500 uppercase tracking-[0.3em]">
              EHS TRAINING TBT ROSTER
            </h2>
          </div>

          {/* 3 & 4: Project Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">3. Project Name</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project designation"
                  className={`w-full p-4 rounded-2xl border outline-none transition-all font-bold text-sm ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Location (Auto GPS)</label>
                <div className={`w-full p-4 rounded-2xl border font-mono text-[11px] truncate ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-blue-400'}`}>
                  {location}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">4. Contractor</label>
                <input 
                  type="text" 
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  placeholder="Name of contracting firm"
                  className={`w-full p-4 rounded-2xl border outline-none transition-all font-bold text-sm ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Date</label>
                  <div className={`p-4 rounded-2xl border font-bold text-center text-sm ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-white'}`}>
                    {formattedDate}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Time</label>
                  <div className={`p-4 rounded-2xl border font-bold text-center text-sm ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-white'}`}>
                    {formattedTime}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5: Consent Text */}
          <div className={`p-6 rounded-3xl border-2 mb-10 text-center italic ${isLight ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-blue-500/5 border-blue-500/20 text-blue-300'}`}>
            <p className="text-[11px] sm:text-xs font-bold leading-relaxed">
              "I the undersigned, having been advised of the above issues, having fully understood the Hazards and their related Risks and my role in controlling them"
            </p>
          </div>

          {/* 6: Topic Discussed */}
          <div className="flex flex-col gap-2 mb-12">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">6. TOPIC DISCUSSED:</label>
            <textarea 
              rows={5}
              value={topicDiscussed}
              onChange={(e) => setTopicDiscussed(e.target.value)}
              placeholder="Outline training items, hazard controls, and specific safety protocols discussed..."
              className={`w-full p-6 rounded-[2rem] border outline-none transition-all font-bold text-sm leading-relaxed resize-none ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500 shadow-inner' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`}
            />
          </div>

          {/* 7: Trainee Roster Table */}
          <div className="mb-10 overflow-x-auto">
            <div className="min-w-[600px]">
              <div className={`grid grid-cols-[60px_1fr_120px_1fr_100px] gap-4 p-4 mb-2 text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>S.No</span>
                <span>Full Name</span>
                <span>Company No</span>
                <span>Designation</span>
                <span className="text-center">Sign</span>
              </div>
              
              <div className="space-y-3">
                {trainees.map((trainee, index) => (
                  <div key={trainee.id} className="grid grid-cols-[60px_1fr_120px_1fr_100px] gap-4 items-center">
                    <div className={`h-12 flex items-center justify-center rounded-xl border font-black text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                      {index + 1}
                    </div>
                    <input 
                      type="text" 
                      value={trainee.name}
                      onChange={(e) => updateTrainee(trainee.id, 'name', e.target.value)}
                      className={`h-12 px-4 rounded-xl border outline-none text-xs font-bold ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/20 border-white/5 focus:border-blue-500 text-white'}`}
                    />
                    <input 
                      type="text" 
                      value={trainee.companyNo}
                      onChange={(e) => updateTrainee(trainee.id, 'companyNo', e.target.value)}
                      className={`h-12 px-4 rounded-xl border outline-none text-xs font-bold ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/20 border-white/5 focus:border-blue-500 text-white'}`}
                    />
                    <input 
                      type="text" 
                      value={trainee.designation}
                      onChange={(e) => updateTrainee(trainee.id, 'designation', e.target.value)}
                      className={`h-12 px-4 rounded-xl border outline-none text-xs font-bold ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/20 border-white/5 focus:border-blue-500 text-white'}`}
                    />
                    <button 
                      onClick={() => toggleTraineeSign(trainee.id)}
                      disabled={!trainee.name}
                      className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        trainee.isSigned 
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' 
                          : (isLight ? 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-slate-600 hover:bg-white/10')
                      }`}
                    >
                      {trainee.isSigned ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>
                          <span className="text-[6px] font-black uppercase">{trainee.signTimestamp}</span>
                        </>
                      ) : (
                        <span className="text-[8px] font-black uppercase">Sign</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={addTraineeRow}
                className="mt-6 w-full py-4 border-2 border-dashed border-blue-500/30 rounded-2xl flex items-center justify-center gap-3 group hover:bg-blue-500/5 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Register New Trainee Row</span>
              </button>
            </div>
          </div>

          {/* last: Conducted By section */}
          <div className={`mt-16 p-8 rounded-[2rem] border-2 border-white/5 grid grid-cols-1 md:grid-cols-4 gap-8 items-end ${isLight ? 'bg-slate-50' : 'bg-black/20'}`}>
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">8. Conducted By:</label>
              <input 
                type="text" 
                value={conductedBy}
                onChange={(e) => setConductedBy(e.target.value)}
                className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5 text-white'}`}
              />
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 text-center block">Signature (Digital)</label>
              <button 
                onClick={() => setConductorSigned(!conductorSigned)}
                className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-center h-14 ${
                  conductorSigned 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-xl rotate-1' 
                    : (isLight ? 'bg-white border-slate-200 text-slate-300' : 'bg-slate-900 border-white/5 text-slate-700')
                }`}
              >
                {conductorSigned ? (
                  <span className="font-serif italic text-lg tracking-widest drop-shadow-md">{conductedBy || 'Authorized'}</span>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-widest">Verify Authorization</span>
                )}
              </button>
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Date</label>
              <div className={`p-4 rounded-2xl border font-bold text-center text-sm h-14 flex items-center justify-center ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5 text-slate-400'}`}>
                {formattedDate}
              </div>
            </div>
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Time</label>
              <div className={`p-4 rounded-2xl border font-bold text-center text-sm h-14 flex items-center justify-center ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5 text-slate-400'}`}>
                {formattedTime}
              </div>
            </div>
          </div>

          {/* Submission Mock */}
          <div className="mt-12 flex justify-center">
             <button 
               className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.4em] text-xs shadow-2xl hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/30"
               onClick={() => {
                 alert("EHS Training Roster Serialized and Queued for Submission.");
               }}
             >
               Finalize & Submit Roster
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};