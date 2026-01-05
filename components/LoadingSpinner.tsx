import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading Module...' }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-4 animate-in fade-in duration-500">
    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{message}</span>
  </div>
);
