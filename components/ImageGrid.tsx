
import React, { useState, memo } from 'react';
import { UploadedImage } from '../types';
import { MAX_IMAGES, MIN_IMAGES } from '../constants';

interface ImageGridProps {
  images: UploadedImage[];
  onRemove: (id: string) => void;
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetry: (id: string) => void;
  appTheme?: 'dark' | 'light';
}

export const ImageGrid: React.FC<ImageGridProps> = memo(({ images, onRemove, onAdd, onRetry, appTheme = 'dark' }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isLimitReached = images.length >= MAX_IMAGES;
  const isLight = appTheme === 'light';
  
  const showAddButton = !isLimitReached;

  return (
    <div className="space-y-5">
      <div className={`relative flex items-center justify-center pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-700/50'}`}>
        <label className={`text-lg font-bold tracking-wide text-center flex flex-col items-center ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <span className="flex items-center gap-2">
            Incident Evidence
            <span className={`inline-flex items-center justify-center h-6 px-2 text-xs font-bold rounded-full transition-colors duration-300 ${
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {images.map((img) => (
          <div key={img.id} className="relative group">
            <div 
              className={`
                relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-300
                ${img.status === 'error' ? (isLight ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-500/10' : 'border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-500/20') : 
                  img.status === 'success' ? (isLight ? 'border-red-500 bg-red-50 shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-1 ring-red-500/20' : 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.7)] ring-2 ring-red-500/40 animate-pulse') : 
                  img.status === 'uploading' ? (isLight ? 'border-blue-500 bg-blue-50' : 'border-blue-500 ring-2 ring-blue-500/20') :
                  (isLight ? 'border-slate-200 hover:border-blue-400' : 'border-slate-700 hover:border-blue-500/50')}
                ${img.status !== 'uploading' && img.status !== 'error' ? 'cursor-zoom-in' : ''}
              `}
              onClick={() => img.status !== 'uploading' && img.status !== 'error' && setSelectedImage(img.previewUrl)}
            >
              <img 
                src={img.previewUrl} 
                alt="Evidence" 
                className={`h-full w-full object-cover transition-transform duration-500 ${
                  img.status === 'uploading' ? 'blur-[2px] opacity-70 grayscale-[0.3]' : 
                  img.status === 'error' ? 'grayscale opacity-40 blur-[1px]' :
                  'group-hover:scale-110'
                }`}
              />
              
              {img.status === 'uploading' && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 z-10 ${isLight ? 'bg-white/70' : 'bg-slate-900/60'}`}>
                   <div className="w-full space-y-2">
                      <div className="flex justify-between items-center px-1 text-[10px] font-black text-blue-500">
                        <span>SAVING...</span>
                        <span>{img.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${img.progress}%` }}
                        />
                      </div>
                   </div>
                </div>
              )}

              {img.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/40 backdrop-blur-[2px] z-10">
                   <svg className="w-8 h-8 text-rose-500 mb-2 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                   <p className="text-[9px] font-black uppercase text-white leading-tight mb-3 drop-shadow-md px-1">
                     {img.errorMessage || "System Connection Failure"}
                   </p>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onRetry(img.id); }}
                     className="w-full py-2 bg-rose-500 text-white text-[9px] font-black uppercase rounded-lg shadow-xl hover:bg-rose-600 active:scale-95 transition-all border border-rose-400/30"
                   >
                     Retry Capture
                   </button>
                </div>
              )}

              {img.status === 'success' && (
                <div className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg border border-red-400/50 animate-bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {img.status !== 'uploading' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(img.id);
                }}
                className={`absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-rose-500 hover:text-white border shadow-xl z-30 transition-all ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        ))}

        {showAddButton && (
          <div className={`flex aspect-square flex-col overflow-hidden rounded-xl border-2 border-dashed transition-all ${
            isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900/40 border-slate-700'
          }`}>
            <label className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all active:bg-blue-600/10 group ${
              isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Camera</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onAdd} />
            </label>
            <div className={`h-[1px] w-full ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}></div>
            <label className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all active:bg-blue-600/10 group ${
              isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={onAdd} />
            </label>
          </div>
        )}
      </div>
      
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Evidence Preview" className="max-h-[85vh] w-auto rounded-lg shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
});
