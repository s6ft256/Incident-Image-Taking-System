/**
 * Share Report Modal
 * Provides UI for sharing reports via link, email, or direct assignment.
 */

import React, { useState, useMemo } from 'react';
import { shareReport, ShareOptions } from '../services/sharingService';
import { useAppContext } from '../context/AppContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportType: 'incident' | 'observation';
  reportTitle: string;
  appTheme: 'dark' | 'light';
}

type ShareTab = 'link' | 'email' | 'assign';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  reportId,
  reportType,
  reportTitle,
  appTheme
}) => {
  const isLight = appTheme === 'light';
  const { state, refetchData } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<ShareTab>('link');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [customEmail, setCustomEmail] = useState('');
  const [message, setMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [expiresIn, setExpiresIn] = useState(72);

  const personnelList = useMemo(() => {
    return state.personnel.map(p => ({ name: p.name, email: p.email || '' }));
  }, [state.personnel]);

  const handleShare = async () => {
    setIsSharing(true);
    
    const options: ShareOptions = {
      reportId,
      reportType,
      shareMethod: activeTab,
      recipients: activeTab === 'email' 
        ? customEmail ? [customEmail] : selectedRecipients.map(name => personnelList.find(p => p.name === name)?.email || '')
        : selectedRecipients,
      recipientNames: activeTab === 'email' ? selectedRecipients : undefined,
      message,
      expiresIn
    };
    
    const result = await shareReport(options);
    
    if (result.success && result.shareUrl) {
      setShareUrl(result.shareUrl);
    }
    
    setIsSharing(false);

    if (result.success && (activeTab === 'assign' || activeTab === 'email')) {
      // Refresh so the recipient sees it under My Tasks after Airtable assignment.
      refetchData();
    }
    
    if (result.success && activeTab !== 'link') {
      setTimeout(onClose, 1500);
    }
  };

  const toggleRecipient = (name: string) => {
    setSelectedRecipients(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Share Report
              </h3>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                {reportType} • {reportId.slice(-8)}
              </p>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-400'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          {/* Report Preview */}
          <div className={`mt-4 p-4 rounded-2xl ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
            <p className={`text-sm font-bold truncate ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
              {reportTitle}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex p-1 mx-6 mt-4 rounded-xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`}>
          {(['link', 'email', 'assign'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'link' && '🔗 '}
              {tab === 'email' && '📧 '}
              {tab === 'assign' && '👤 '}
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'link' && (
            <>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Link Expiration
                </label>
                <div className="flex gap-2">
                  {[24, 72, 168, 720].map(hours => (
                    <button
                      key={hours}
                      onClick={() => setExpiresIn(hours)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        expiresIn === hours
                          ? 'bg-blue-600 text-white'
                          : isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {hours < 48 ? `${hours}h` : `${hours / 24}d`}
                    </button>
                  ))}
                </div>
              </div>
              
              {shareUrl && (
                <div className={`p-4 rounded-2xl border ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">
                    Share Link Generated
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className={`flex-1 p-3 rounded-xl text-xs font-mono ${
                        isLight ? 'bg-white border border-slate-200' : 'bg-black/40 border border-white/10 text-white'
                      }`}
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'email' && (
            <>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                    isLight 
                      ? 'bg-white border-slate-200 focus:border-blue-500' 
                      : 'bg-white/5 border-white/10 focus:border-blue-500 text-white'
                  }`}
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a note for the recipient..."
                  rows={3}
                  className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                    isLight 
                      ? 'bg-white border-slate-200 focus:border-blue-500' 
                      : 'bg-white/5 border-white/10 focus:border-blue-500 text-white'
                  }`}
                />
              </div>
            </>
          )}

          {activeTab === 'assign' && (
            <>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Assign to Team Members
                </label>
                <div className={`max-h-48 overflow-y-auto rounded-2xl border ${
                  isLight ? 'border-slate-200' : 'border-white/10'
                }`}>
                  {personnelList.length === 0 ? (
                    <div className={`p-6 text-center ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest">No team members found</p>
                    </div>
                  ) : (
                    personnelList.map(person => (
                      <button
                        key={person.name}
                        onClick={() => toggleRecipient(person.name)}
                        className={`w-full flex items-center gap-3 p-4 transition-all border-b last:border-0 ${
                          isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-white/5 hover:bg-white/5'
                        } ${selectedRecipients.includes(person.name) ? (isLight ? 'bg-blue-50' : 'bg-blue-500/10') : ''}`}
                      >
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          selectedRecipients.includes(person.name)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : isLight ? 'border-slate-300' : 'border-white/20'
                        }`}>
                          {selectedRecipients.includes(person.name) && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                            {person.name}
                          </p>
                          {person.email && (
                            <p className="text-[10px] text-slate-500">{person.email}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {selectedRecipients.length > 0 && (
                <div className={`p-3 rounded-xl ${isLight ? 'bg-blue-50' : 'bg-blue-500/10'}`}>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                    {selectedRecipients.length} member(s) selected
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Assignment Note (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Instructions for assigned team members..."
                  rows={2}
                  className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                    isLight 
                      ? 'bg-white border-slate-200 focus:border-blue-500' 
                      : 'bg-white/5 border-white/10 focus:border-blue-500 text-white'
                  }`}
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className={`p-6 border-t ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <button
            onClick={handleShare}
            disabled={isSharing || (activeTab === 'assign' && selectedRecipients.length === 0) || (activeTab === 'email' && !customEmail)}
            className={`w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-[0.98] ${
              isSharing 
                ? 'bg-slate-600 text-slate-400' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl'
            }`}
          >
            {isSharing ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Processing...
              </div>
            ) : (
              <>
                {activeTab === 'link' && (shareUrl ? 'Regenerate Link' : 'Generate Share Link')}
                {activeTab === 'email' && 'Send via Email'}
                {activeTab === 'assign' && `Assign to ${selectedRecipients.length || 0} Member(s)`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
