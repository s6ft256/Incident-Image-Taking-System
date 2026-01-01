
import React, { useState, memo } from 'react';
import { UploadedImage } from '../types';
import { MAX_IMAGES, MIN_IMAGES } from '../constants';

interface ImageGridProps {
  images: UploadedImage[];
  onRemove: (id: string) => void;
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  const isLimitReached = images.length >= MAX_IMAGES;
  const isLight = appTheme === 'light';
  
  const showAddButton = !isLimitReached;

  return (
    <div className="space-y-5">
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
                ${img.status === 'error' ? (isLight ? 'border-rose-500 bg-rose-50 shadow-lg shadow-rose-500/10' : 'border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-500/20') : 
                  img.status === 'success' ? (isLight ? 'border-emerald-500 bg-emerald-50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)]') : 
                  img.status === 'uploading' ? (isLight ? 'border-blue-500 bg-blue-50' : 'border-blue-500 ring-2 ring-blue-500/20') :
                  (isLight ? 'border-slate-200 hover:border-blue-400' : 'border-slate-700 hover:border-blue-500/50')}
                ${img.status !== 'uploading' && img.status !== 'error' ? 'cursor-zoom-in' : ''}
              `}
              onClick={() => img.status !== 'uploading' && img.status !== 'error' && setSelectedImage(img.previewUrl)}
            >
              <div className={`absolute inset-0 z-0 ${isLight ? 'bg-slate-100' : 'bg-slate-950'}`}></div>
              <img 
                src={img.previewUrl} 
                alt="Evidence" 
                className={`relative z-10 h-full w-full object-contain transition-transform duration-500 ${
                  img.status === 'uploading' ? 'blur-[2px] opacity-70 grayscale-[0.3]' : 
                  img.status === 'error' ? 'grayscale opacity-40 blur-[1px]' :
                  'group-hover:scale-110'
                }`}
              />
              
              {img.status === 'uploading' && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 z-20 ${isLight ? 'bg-white/70' : 'bg-slate-900/60'}`}>
                   <div className="w-full space-y-2">
                      <div className="flex justify-between items-center px-1 text-[8px] font-black text-blue-500">
                        <span>UPLOADING...</span>
                        <span>{img.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${img.progress}%` }}
                        />
                      </div>
                   </div>
                </div>
              )}

              {img.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/85 backdrop-blur-[2px] z-20 animate-in fade-in duration-300">
                   <svg className="w-6 h-6 text-rose-500 mb-2 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                   <p className="text-[7px] text-white font-black uppercase mb-3 line-clamp-3 leading-tight px-1 drop-shadow-md">
                     {img.errorMessage || "System Transmission Error"}
                   </p>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onRetry(img.id); }}
                     className="px-3 py-1.5 bg-rose-500 text-white text-[8px] font-black uppercase rounded-lg shadow-lg hover:bg-rose-600 transition-all border border-rose-400/30 active:scale-90"
                   >
                     Retry Sync
                   </button>
                </div>
              )}

              {img.status === 'success' && (
                <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white rounded-full p-1 shadow-lg border border-emerald-400/50 z-20 animate-in zoom-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Granular Feedback Label */}
            <div className="flex items-center justify-between px-1">
              <span className={`text-[7px] font-black uppercase tracking-widest ${
                img.status === 'success' ? 'text-emerald-500' :
                img.status === 'error' ? 'text-rose-500' :
                img.status === 'uploading' ? 'text-blue-500' :
                'text-slate-500'
              }`}>
                {img.status === 'success' ? 'Verified' :
                 img.status === 'error' ? 'Failed' :
                 img.status === 'uploading' ? 'Syncing' : 'Waiting'}
              </span>
              
              {img.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(img.id);
                  }}
                  className={`flex h-4 w-4 items-center justify-center rounded-md text-slate-400 hover:bg-rose-500 hover:text-white transition-all ${
                    isLight ? 'bg-slate-100' : 'bg-slate-800'
                  }`}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
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
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Gallery</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onAdd} />
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
