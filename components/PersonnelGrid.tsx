
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile } from '../types';
import { getAllProfiles } from '../services/profileService';
import { AUTHORIZED_ADMIN_ROLES } from '../constants';

interface PersonnelGridProps {
  appTheme?: 'dark' | 'light';
  onBack: () => void;
}

export const PersonnelGrid: React.FC<PersonnelGridProps> = ({ appTheme = 'dark', onBack }) => {
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  const isLight = appTheme === 'light';

  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        setLoading(true);
        const data = await getAllProfiles();
        setPersonnel(data);
      } catch (err) {
        console.error("Failed to load personnel", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPersonnel();
  }, []);

  const roles = useMemo(() => {
    const uniqueRoles = Array.from(new Set(personnel.map(p => p.role))).sort();
    return ['All Roles', ...uniqueRoles];
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.site || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'All Roles' || p.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [personnel, searchTerm, filterRole]);

  const getClearance = (role: string) => {
    return AUTHORIZED_ADMIN_ROLES.includes(role.toLowerCase()) ? 'Level 2' : 'Level 1';
  };

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-20">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button onClick={onBack} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Personnel List</h2>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 text-left">Identity Access Directory</span>
          </div>
        </div>
        <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{personnel.length} Registered</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-grow relative group">
          <input 
            type="text" 
            placeholder="Search identity..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full p-4 rounded-2xl border outline-none transition-all pl-12 text-sm font-medium ${
              isLight ? 'bg-white border-slate-200 focus:border-blue-500 shadow-sm' : 'bg-white/5 border-white/10 focus:border-blue-500 text-white'
            }`}
          />
          <svg className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isLight ? 'text-slate-400 group-focus-within:text-blue-500' : 'text-slate-500 group-focus-within:text-blue-500'}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <select 
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className={`px-6 py-4 rounded-2xl border outline-none text-xs font-black uppercase tracking-widest cursor-pointer ${
            isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-white/10 text-white'
          }`}
        >
          {roles.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
      </div>

      {/* List Container */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
           <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Retrieving Identity Records...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredPersonnel.length === 0 ? (
            <div className="py-20 text-center opacity-30 border-2 border-dashed border-slate-700 rounded-[2.5rem]">
               <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">No matching personnel found</p>
            </div>
          ) : (
            filteredPersonnel.map((person, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedUser(selectedUser === person.name ? null : person.name)}
                className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-[1.5rem] border transition-all duration-300 cursor-pointer group hover:translate-x-1 ${
                  selectedUser === person.name 
                    ? (isLight ? 'bg-blue-50 border-blue-400 shadow-lg' : 'bg-blue-600/10 border-blue-500/50 shadow-2xl')
                    : (isLight ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/20')
                }`}
              >
                {/* Avatar Column */}
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 shadow-md shrink-0 transition-transform group-hover:scale-105 ${
                    isLight ? 'border-white bg-slate-100' : 'border-white/10 bg-black/40'
                  }`}>
                    {person.profileImageUrl ? (
                      <img src={person.profileImageUrl} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-500 font-black text-xl">
                        {person.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* Primary Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-black truncate leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{person.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                         getClearance(person.role) === 'Level 2' 
                           ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                           : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                       }`}>
                         {getClearance(person.role)}
                       </span>
                       <span className={`text-[8px] font-bold uppercase text-slate-500 truncate`}>{person.role}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Details (Hidden on Mobile row, shown in expanded or side) */}
                <div className="hidden sm:flex flex-1 items-center justify-center gap-8">
                   <div className="flex flex-col items-center">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Primary Site</span>
                      <span className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{person.site || 'Global Hub'}</span>
                   </div>
                   <div className="h-8 w-[1px] bg-white/5"></div>
                   <div className="flex flex-col items-center">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Status</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className={`text-[10px] font-bold text-emerald-500 uppercase`}>Active</span>
                      </div>
                   </div>
                </div>

                {/* Action Column */}
                <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                   <div className="flex sm:hidden flex-col">
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Site</span>
                      <span className={`text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{person.site || 'Global Hub'}</span>
                   </div>
                   <button className={`p-3 rounded-xl transition-all ${
                     selectedUser === person.name 
                       ? 'bg-blue-500 text-white' 
                       : (isLight ? 'bg-slate-50 text-slate-400' : 'bg-white/5 text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10')
                   }`}>
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                     </svg>
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 opacity-50">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Biometric Verification Enabled • Standard Protocol</p>
          <div className="flex gap-4">
             <span className="text-[8px] font-black uppercase tracking-widest">Privacy Compliant</span>
             <span className="text-[8px] font-black uppercase tracking-widest">AES-256 Encrypted</span>
          </div>
      </div>
    </div>
  );
};
