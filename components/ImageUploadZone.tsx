import React, { useCallback, useState } from 'react';

interface ImageUploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  isUploading: boolean;
  isLight?: boolean;
  label?: string;
  helperText?: string;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({ 
  onFilesSelected, 
  isUploading, 
  isLight = false, 
  label = "Upload Evidence",
  helperText = "Supports: JPG, PNG, WEBP"
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  }, [isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!isUploading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [isUploading, onFilesSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div>
      {label && (
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{label}</label>
      )}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer transition-all duration-300 rounded-2xl border-2 border-dashed overflow-hidden ${
          isLight 
            ? (isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-slate-100')
            : (isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/30 bg-black/20 hover:bg-white/5')
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={isUploading}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          {isUploading ? (
             <div className="flex flex-col items-center animate-pulse">
                <svg className="w-8 h-8 text-blue-500 animate-spin mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-white'}`}>
                  Uploading Evidence...
                </span>
             </div>
          ) : (
            <>
              <div className={`p-3 rounded-full ${isLight ? 'bg-white shadow-sm text-blue-600' : 'bg-white/10 text-blue-400'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div>
                <span className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-white'}`}>
                  Drop images here or click to upload
                </span>
                <span className="block text-[9px] font-medium text-slate-500 mt-1 uppercase tracking-wider">
                  {helperText}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
