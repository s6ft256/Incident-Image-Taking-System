/**
 * Report Comments Component
 * Displays and allows adding comments on shared reports for collaboration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getReportComments, addReportComment } from '../services/sharingService';

interface ReportCommentsProps {
  reportId: string;
  currentUserName: string;
  appTheme: 'dark' | 'light';
}

interface Comment {
  id: string;
  author: string;
  comment: string;
  createdAt: string;
}

export const ReportComments: React.FC<ReportCommentsProps> = ({
  reportId,
  currentUserName,
  appTheme
}) => {
  const isLight = appTheme === 'light';
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadComments = useCallback(() => {
    const loaded = getReportComments(reportId);
    setComments(loaded);
  }, [reportId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserName) return;

    setIsSubmitting(true);
    const success = addReportComment(reportId, currentUserName, newComment.trim());
    
    if (success) {
      setNewComment('');
      loadComments();
    }
    setIsSubmitting(false);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`rounded-2xl border transition-all ${
      isLight ? 'bg-white border-slate-200' : 'bg-white/[0.02] border-white/10'
    }`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 transition-colors ${
          isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/20 text-blue-400'
          }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </div>
          <div className="text-left">
            <span className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
              Team Discussion
            </span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] font-black ${
              isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-slate-400'
            }`}>
              {comments.length}
            </span>
          </div>
        </div>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3"
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''} ${
            isLight ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className={`border-t animate-in slide-in-from-top-2 duration-300 ${
          isLight ? 'border-slate-100' : 'border-white/5'
        }`}>
          {/* Comments List */}
          <div className="max-h-64 overflow-y-auto">
            {comments.length === 0 ? (
              <div className={`p-8 text-center ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                <svg 
                  width="32" 
                  height="32" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  className="mx-auto mb-3 opacity-50"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <p className="text-[10px] font-black uppercase tracking-widest">No comments yet</p>
                <p className="text-[10px] mt-1 opacity-70">Be the first to add a note</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {comments.map(comment => (
                  <div key={comment.id} className={`p-4 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}`}>
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
                        comment.author === currentUserName
                          ? 'bg-blue-600 text-white'
                          : isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-slate-300'
                      }`}>
                        {getInitials(comment.author)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                            {comment.author}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          {comment.comment}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Comment Form */}
          <form 
            onSubmit={handleSubmit}
            className={`p-4 border-t ${isLight ? 'border-slate-100 bg-slate-50' : 'border-white/5 bg-black/20'}`}
          >
            <div className="flex gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black bg-blue-600 text-white`}>
                {getInitials(currentUserName || 'U')}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  disabled={!currentUserName}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium outline-none transition-all ${
                    isLight 
                      ? 'bg-white border border-slate-200 focus:border-blue-500' 
                      : 'bg-white/5 border border-white/10 focus:border-blue-500 text-white placeholder-slate-500'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting || !currentUserName}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                    !newComment.trim() || isSubmitting
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                  }`}
                >
                  {isSubmitting ? '...' : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
