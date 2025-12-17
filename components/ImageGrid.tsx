import React, { useState } from 'react';
import { UploadedImage } from '../types';
import { MAX_IMAGES, MIN_IMAGES } from '../constants';

interface ImageGridProps {
  images: UploadedImage[];
  onRemove: (id: string) => void;
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetry: (id: string) => void;
}

export const ImageGrid: React.FC<ImageGridProps> = ({ images, onRemove, onAdd, onRetry }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isLimitReached = images.length >= MAX_IMAGES;
  
  const showAddButton = !isLimitReached;
  const emptySlotsCount = Math.max(0, MAX_IMAGES - images.length - (showAddButton ? 1 : 0));

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="space-y-5">
        {/* Centered Header */}
        <div className="relative flex items-center justify-center pb-3 border-b border-slate-700/50">
          <label className="text-lg font-bold text-white tracking-wide text-center flex items-center gap-2">
            Incident Images
            <span className={`inline-flex items-center justify-center h-6 px-2 text-xs font-bold rounded-full transition-colors duration-300 ${
              images.length >= MIN_IMAGES 
                ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                : 'bg-amber-900/50 text-amber-400 border border-amber-800'
            }`}>
              {images.length}/{MAX_IMAGES}
            </span>
          </label>
          
          {isLimitReached && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 hidden sm:inline-block text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/50 px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md animate-in fade-in slide-in-from-right-2">
              Max Limit
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* 1. Existing Images */}
          {images.map((img) => (
            <div key={img.id} className="relative group perspective-1000">
              <div 
                className={`
                  relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-300 shadow-lg
                  ${img.status === 'error' ? 'border-rose-500 shadow-rose-900/30 bg-rose-950/20' : 
                    img.status === 'success' ? 'border-emerald-500 shadow-emerald-900/30 ring-1 ring-emerald-500/30' : 
                    img.status === 'uploading' ? 'border-blue-500 shadow-blue-900/30 ring-2 ring-blue-500/20' :
                    'border-amber-500/30 hover:border-amber-400 shadow-black/20 hover:shadow-amber-900/10'}
                  ${img.status !== 'uploading' && img.status !== 'error' ? 'cursor-zoom-in' : ''}
                `}
                onClick={() => img.status !== 'uploading' && img.status !== 'error' && setSelectedImage(img.previewUrl)}
              >
                <img 
                  src={img.previewUrl} 
                  alt="Incident evidence" 
                  className={`h-full w-full object-cover transition-transform duration-700 ${
                    img.status === 'uploading' ? 'scale-110 blur-[3px] opacity-70 grayscale-[0.3]' : 
                    img.status === 'error' ? 'grayscale opacity-40 scale-100' :
                    'group-hover:scale-110 opacity-100'
                  }`}
                />
                
                {/* STATE: PENDING (Ready to Upload) */}
                {img.status === 'pending' && (
                  <>
                    <div className="absolute top-2 left-2 bg-amber-500/20 backdrop-blur-md rounded-lg px-1.5 py-0.5 border border-amber-500/50">
                       <span className="text-[9px] font-bold text-amber-200 uppercase tracking-wider">Ready</span>
                    </div>
                    {/* Subtle Pulse */}
                    <div className="absolute top-2 right-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-amber-200/50"></span>
                        </span>
                    </div>
                  </>
                )}

                {/* STATE: UPLOADING */}
                {img.status === 'uploading' && (
                  <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center p-4 z-10 backdrop-blur-sm animate-in fade-in duration-300">
                     <div className="w-full space-y-2">
                        <div className="flex justify-between items-center text-blue-100 px-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                            <span className="uppercase tracking-widest text-[10px] font-bold text-blue-200">Uploading</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-blue-300">{img.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden ring-1 ring-white/10 shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-300 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden" 
                            style={{ width: `${img.progress}%` }}
                          >
                             {/* Shimmer effect on progress bar */}
                             <div className="absolute inset-0 bg-white/20 w-full -translate-x-full animate-[shimmer_1s_infinite] skew-x-12"></div>
                          </div>
                        </div>
                     </div>
                  </div>
                )}

                {/* STATE: SUCCESS */}
                {img.status === 'success' && (
                  <div className="absolute inset-0 z-10 pointer-events-none">
                     <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-in zoom-in spin-in-12 duration-500 border border-emerald-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                     </div>
                     <div className="absolute bottom-2 left-2 bg-emerald-900/80 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/30">
                        <span className="text-[9px] font-bold text-emerald-200 uppercase">Saved</span>
                     </div>
                  </div>
                )}

                {/* STATE: ERROR */}
                {img.status === 'error' && (
                  <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center p-3 z-20 backdrop-blur-sm text-center animate-in fade-in duration-200">
                    <div className="bg-rose-900/50 p-2.5 rounded-full mb-2 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span className="text-[10px] text-rose-200 font-bold uppercase tracking-wide mb-3">Upload Failed</span>
                    <button 
                       onClick={(e) => { e.stopPropagation(); onRetry(img.id); }}
                       className="group/retry px-4 py-1.5 bg-white text-rose-600 hover:bg-rose-50 active:bg-rose-100 text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 group-hover/retry:-rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                       </svg>
                       RETRY
                    </button>
                  </div>
                )}

                {/* INFO OVERLAY (Only for Pending) */}
                {img.status === 'pending' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 via-slate-900/60 to-transparent p-3 pt-6 flex flex-col justify-end">
                    <p className="text-[10px] text-white truncate w-full font-semibold drop-shadow-md">
                      {img.file.name}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {formatFileSize(img.file.size)}
                    </p>
                  </div>
                )}
              </div>

              {/* Remove Button - Only if not uploading/success (locked in) */}
              {img.status !== 'uploading' && img.status !== 'success' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(img.id);
                  }}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white border border-slate-600 hover:border-rose-400 shadow-xl z-30 transition-all duration-200 hover:scale-110 group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          ))}

          {/* 2. Add Button */}
          {showAddButton && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/30 hover:bg-slate-800 hover:border-blue-400/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all group active:scale-[0.98] relative overflow-hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-2 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-lg border border-slate-700 group-hover:border-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-500 group-hover:text-blue-200 z-10 uppercase tracking-wide">Take Photo</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={onAdd}
              />
            </label>
          )}

          {/* 3. Empty Slots */}
          {[...Array(emptySlotsCount)].map((_, i) => (
            <div 
              key={`empty-${i}`} 
              className="aspect-square rounded-xl border-2 border-dashed border-slate-800/60 bg-slate-900/10 flex items-center justify-center transition-opacity hover:opacity-75"
              aria-hidden="true"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-slate-800/60"></div>
            </div>
          ))}

        </div>
      </div>
      
      {/* Lightbox Overlay */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-full flex items-center justify-center">
            <img 
              src={selectedImage} 
              alt="Full view" 
              className="max-h-[85vh] w-auto rounded-lg shadow-2xl object-contain border border-slate-700"
            />
            
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 focus:outline-none bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};