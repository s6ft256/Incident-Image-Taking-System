import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ImageAnnotatorProps {
  src: string;
  onSave: (annotatedFile: File) => void;
  onClose: () => void;
}

const COLORS = [
  { name: 'Hazard', hex: '#ef4444' }, // red-500
  { name: 'Note', hex: '#3b82f6' },   // blue-500
  { name: 'Asset', hex: '#22c55e' },  // green-500
  { name: 'Path', hex: '#f97316' },   // orange-500
  { name: 'Area', hex: '#eab308' },   // yellow-500
];

export const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ src, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0].hex);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  const getCanvasContext = useCallback(() => canvasRef.current?.getContext('2d'), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getCanvasContext();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      // Set canvas size to match image, but scale down for display if needed
      const MAX_DISPLAY_WIDTH = window.innerWidth * 0.9;
      const MAX_DISPLAY_HEIGHT = window.innerHeight * 0.7;

      let displayWidth = img.width;
      let displayHeight = img.height;

      if (displayWidth > MAX_DISPLAY_WIDTH) {
        displayHeight *= MAX_DISPLAY_WIDTH / displayWidth;
        displayWidth = MAX_DISPLAY_WIDTH;
      }
      if (displayHeight > MAX_DISPLAY_HEIGHT) {
        displayWidth *= MAX_DISPLAY_HEIGHT / displayHeight;
        displayHeight = MAX_DISPLAY_HEIGHT;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      ctx?.drawImage(img, 0, 0);
    };
  }, [src, getCanvasContext]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    if (coords) {
      setIsDrawing(true);
      setLastPos(coords);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoords(e);
    const ctx = getCanvasContext();
    if (coords && lastPos && ctx) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 5; // Adjust for high-res canvas
      ctx.lineCap = 'round';
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setLastPos(coords);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
  };
  
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], `annotated_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onSave(newFile);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="absolute top-4 right-4 flex gap-4">
        <button onClick={handleSave} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg">Apply Annotation</button>
        <button onClick={onClose} className="p-3 bg-rose-500/20 text-rose-500 rounded-xl"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="max-w-[90vw] max-h-[70vh] object-contain rounded-lg shadow-2xl cursor-crosshair"
      />
      
      <div className="absolute bottom-6 p-4 bg-slate-900/80 border border-white/10 rounded-3xl flex items-center gap-4">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Mark-Up:</span>
        {COLORS.map(c => (
          <button
            key={c.name}
            onClick={() => setColor(c.hex)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c.hex }}
            title={c.name}
          />
        ))}
      </div>
    </div>
  );
};
