import React, { useCallback, useState, useEffect, useMemo } from 'react';

interface ImageUploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  isUploading: boolean;
  isLight?: boolean;
  label?: string;
  helperText?: string;
  selectedFiles?: FileList | null;
  showPreview?: boolean;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({ 
  onFilesSelected, 
  isUploading, 
  isLight = false, 
  label = "Upload Evidence",
  helperText = "Supports: JPG, PNG, WEBP",
  selectedFiles = null,
  showPreview = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Generate preview URLs when selectedFiles change
  useEffect(() => {
    if (!selectedFiles || selectedFiles.length === 0 || !showPreview) {
      setPreviewUrls([]);
      return;
    }
    
    const urls: string[] = [];
    const fileList = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'));
    
    fileList.forEach(file => {
      const url = URL.createObjectURL(file);
      urls.push(url);
    });
    
    setPreviewUrls(urls);
    
    // Cleanup URLs on unmount or when files change
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles, showPreview]);

  // File names for display
  const fileNames = useMemo(() => {
    if (!selectedFiles || selectedFiles.length === 0) return [];
    return Array.from(selectedFiles).filter(f => f.type.startsWith('image/')).map(f => f.name);
  }, [selectedFiles]);

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
      
      {/* Image Preview Grid */}
      {showPreview && previewUrls.length > 0 && (
        <div className="mt-4">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Preview ({previewUrls.length} {previewUrls.length === 1 ? 'image' : 'images'})
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {previewUrls.map((url, index) => (
              <div 
                key={index}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 ${
                  isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-black/30'
                }`}
              >
                <img 
                  src={url} 
                  alt={fileNames[index] || `Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-[8px] font-bold truncate ${
                  isLight ? 'bg-white/90 text-slate-700' : 'bg-black/70 text-white'
                }`}>
                  {fileNames[index]?.slice(0, 15) || `Image ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
