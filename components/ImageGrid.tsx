
import React, { useState, memo, useCallback } from 'react';
import { UploadedImage } from '../types';
import { MAX_IMAGES, MIN_IMAGES } from '../constants';

interface ImageGridProps {
  images: UploadedImage[];
  onRemove: (id: string) => void;
  onAdd: (files: FileList) => void;
  onRetry: (id: string) => void;
  appTheme?: 'dark' | 'light';
  hideHeader?: boolean;
}

export const ImageGrid: React.FC<ImageGridProps> = memo(({ 
  images, 
  onRemove, 
  onAdd, 
  onRetry, 
  appTheme = 'dark',
  hideHeader = false
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isLimitReached = images.length >= MAX_IMAGES;
  const isLight = appTheme === 'light';
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLimitReached) setIsDragging(true);
  }, [isLimitReached]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isLimitReached) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAdd(e.dataTransfer.files);
    }
  }, [isLimitReached, onAdd]);
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAdd(e.target.files);
    }
    e.target.value = '';
  };

  return (
    <div 
      className="relative space-y-5"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-600/30 border-4 border-dashed border-blue-500 rounded-[2.5rem] pointer-events-none animate-in fade-in zoom-in duration-300 backdrop-blur-[2px]">
          <div className="text-center text-white p-6 bg-slate-900/80 rounded-3xl shadow-2xl">
            <svg className="w-16 h-16 mx-auto mb-3 text-blue-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-black tracking-wider uppercase">Release to Upload</p>
            <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-widest opacity-80">Evidence Acquisition Mode</p>
          </div>
        </div>
      )}

      {!hideHeader && (
        <div className={`relative flex items-center justify-center pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-700/50'}`}>
          <label className={`text-lg font-bold tracking-wide text-center flex flex-col items-center ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <span className="flex items-center gap-2">
              Incident Evidence
              <span className={`inline-flex items-center justify-center h-6 px-2 text-xs font-bold rounded-full transition-all duration-300 ${
                images.length >= MIN_IMAGES 
                  ? (isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-emerald-900/50 text-emerald-400 border border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.2)]') 
                  : (isLight ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-amber-900/50 text-amber-400 border border-amber-800')
              }`}>
                {images.length}/{MAX_IMAGES}
              </span>
            </span>
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Evidence Acquisition Terminal</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="relative group flex flex-col gap-2">
            <div 
              className={`
                relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-300
                ${img.status === 'error' ? (isLight ? 'border-rose-500 bg-rose-50' : 'border-rose-500 bg-rose-950/20') : 
                  img.status === 'success' ? (isLight ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-600') : 
                  img.status === 'uploading' ? (isLight ? 'border-blue-500 bg-blue-50' : 'border-blue-500') :
                  (isLight ? 'border-slate-200 hover:border-blue-400' : 'border-slate-700 hover:border-blue-500/50')}
                cursor-zoom-in
              `}
              onClick={() => setSelectedImage(img.previewUrl)}
            >
              <img 
                src={img.previewUrl} 
                alt="Evidence" 
                className={`h-full w-full object-cover transition-transform duration-500 ${
                  img.status === 'uploading' ? 'blur-[2px] opacity-70' : 
                  img.status === 'error' ? 'grayscale opacity-40' :
                  'group-hover:scale-110'
                }`}
              />
              
              {img.status === 'uploading' && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 z-20 ${isLight ? 'bg-white/70' : 'bg-slate-900/60'}`}>
                   <div className="w-full space-y-2">
                      <div className="flex justify-between items-center px-1 text-[8px] font-black text-blue-500">
                        <span>SYNCING...</span>
                        <span>{img.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${img.progress}%` }} />
                      </div>
                   </div>
                </div>
              )}

              {img.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/85 backdrop-blur-[2px] z-20">
                   <svg className="w-6 h-6 text-rose-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onRetry(img.id); }}
                     className="px-3 py-1 bg-rose-500 text-white text-[8px] font-black uppercase rounded-lg active:scale-90"
                   >
                     Retry
                   </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-1">
              <span className={`text-[7px] font-black uppercase tracking-widest ${
                img.status === 'success' ? 'text-emerald-500' :
                img.status === 'error' ? 'text-rose-500' :
                img.status === 'uploading' ? 'text-blue-500' : 'text-slate-500'
              }`}>
                {img.status === 'success' ? 'Verified' : img.status === 'error' ? 'Fault' : img.status === 'uploading' ? 'Syncing' : 'Queued'}
              </span>
              
              {img.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                  className={`flex h-4 w-4 items-center justify-center rounded-md text-slate-400 hover:bg-rose-500 hover:text-white transition-all ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
            </div>
          </div>
        ))}

        {!isLimitReached && (
          <div className={`flex aspect-square flex-col overflow-hidden rounded-xl border-2 border-dashed transition-all ${
            isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900/40 border-slate-700'
          }`}>
            <label className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all active:bg-blue-600/10 group ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}>
              <svg className={`h-6 w-6 mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Capture</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInputChange} />
            </label>
            <div className={`h-[1px] w-full ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}></div>
            <label className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all active:bg-blue-600/10 group ${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}>
              <svg className={`h-6 w-6 mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Archive</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileInputChange} />
            </label>
          </div>
        )}
      </div>
      
      {/* High-Fidelity Modal Viewer */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300" 
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-6 right-6 p-4 text-white hover:text-blue-400 transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
          <img src={selectedImage} alt="Evidence Fullscreen" className="max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain animate-in zoom-in duration-300" />
          <p className="absolute bottom-8 text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Evidence Review Protocol</p>
        </div>
      )}
    </div>
  );
});
