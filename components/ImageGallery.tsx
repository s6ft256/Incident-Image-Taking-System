import React from 'react';

interface ImageGalleryProps {
  reportType: 'incident' | 'observation';
  fields: Record<string, any>;
  isLight?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ reportType, fields, isLight = false }) => {
  const isIncident = reportType === 'incident';
  
  // Initial Evidence
  const initialImages = isIncident 
    ? (fields.Attachments || fields.Image || []) 
    : (fields["Open observations"] || fields.Attachments || []);
    
  // Resolution Evidence
  const resolutionImages = isIncident
    ? (fields["Verification Photos"] || [])
    : (fields["Closed observations"] || []);

  const hasInitial = initialImages && initialImages.length > 0;
  const hasResolution = resolutionImages && resolutionImages.length > 0;

  if (!hasInitial && !hasResolution) {
    // If absolutely no images, show a minimal placeholder or nothing? 
    // The original code showed a placeholder for each section if empty.
  }

  return (
    <div className="space-y-8 pt-8 border-t border-white/5">
      <h3 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
         Photographic Evidence Repository
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Initial Acquisition */}
         <div>
            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4">Initial Acquisition (Detection)</h4>
            <div className="grid grid-cols-2 gap-4">
               {hasInitial ? (
                 initialImages.map((att: any, i: number) => (
                   <a href={att.url} target="_blank" rel="noopener noreferrer" key={i} className="group/img aspect-video rounded-2xl overflow-hidden border-2 border-white/5 shadow-xl transition-all hover:border-blue-500/50">
                      <img src={att.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="evidence-initial" />
                   </a>
                 ))
               ) : (
                 <div className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center opacity-20 ${isLight ? 'border-slate-300 bg-slate-100/50' : 'border-white/5 bg-white/5'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                 </div>
               )}
            </div>
         </div>

         {/* Resolution Acquisition */}
         <div>
            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Verification Acquisition (Resolution)</h4>
            <div className="grid grid-cols-2 gap-4">
               {hasResolution ? (
                 resolutionImages.map((att: any, i: number) => (
                   <a href={att.url} target="_blank" rel="noopener noreferrer" key={i} className="group/img aspect-video rounded-2xl overflow-hidden border-2 border-white/5 shadow-xl transition-all hover:border-blue-500/50">
                      <img src={att.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="evidence-resolution" />
                   </a>
                 ))
               ) : (
                 <div className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center opacity-20 ${isLight ? 'border-slate-300 bg-slate-100/50' : 'border-white/5 bg-white/5'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
