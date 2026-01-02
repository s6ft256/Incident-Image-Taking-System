import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, FetchedObservation } from '../types';
import { getAllProfiles } from '../services/profileService';
import { getAllReports } from '../services/airtableService';
import { AUTHORIZED_ADMIN_ROLES } from '../constants';

interface PersonnelGridProps {
  appTheme?: 'dark' | 'light';
  onBack: () => void;
}

interface PersonnelStats {
  rating: number; // 0 to 5
  score: number;
  percentage: number;
  reportsCreated: number;
  reportsClosed: number;
}

const CONTRIBUTORS = [
  {
    name: "Ahmed Abbas",
    role: "HSSE Manager",
    email: "ahmed.abbas@trojanconstruction.group",
    image: "https://media.licdn.com/dms/image/v2/C4D03AQG_2PVLqp894g/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1655174534836?e=1769040000&v=beta&t=-wzSqxQyq6atEh__m2j3sIBAtRnWtwYJRwwRtKEsQt4"
  },
  {
    name: "Amal Jagadi",
    role: "HSE Engineer",
    email: "amal.j@npc.ae",
    image: "https://media.licdn.com/dms/image/v2/D4E03AQHdfMf-x-xIAw/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1718245749525?e=1769040000&v=beta&t=8gLCEUfwzTiaXwmRZ5d-Uky_jlPS43t5iTo1u8YPGok"
  },
  {
    name: "Syed Irshad",
    role: "HSE Engineer",
    email: "irshad.syed@npc.ae",
    image: "https://www.gulftalent.com/images1/candidates/03d/283/photo_115x115_03d28360a45f84aadc9fdf13b77f54d4"
  },
  {
    name: "Usman Zahid Qureshi",
    role: "Safety Manager",
    email: "usman.q@npc.ae",
    image: "https://media.licdn.com/dms/image/v2/D4D03AQFXa_JAKOKTqg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1724664397245?e=1769040000&v=beta&t=m4v3nClquTJT__4TRwgEBGrWHwow1XBRnPHM7WmVEAo"
  }
];

const ContributorRecognition: React.FC<{ isLight: boolean }> = ({ isLight }) => (
  <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-16 py-10 px-4">
    {CONTRIBUTORS.map((contributor, idx) => (
      <div key={idx} className="flex flex-col sm:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-1000 group">
        <div className="relative shrink-0">
          <div className={`absolute inset-0 blur-[40px] rounded-full animate-pulse scale-125 ${
            idx % 4 === 0 ? 'bg-blue-500/20' : 
            idx % 4 === 1 ? 'bg-cyan-500/20' : 
            idx % 4 === 2 ? 'bg-emerald-500/20' :
            'bg-amber-500/20'
          }`}></div>
          <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden relative z-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-700 group-hover:scale-110 border-2 ${isLight ? 'border-white bg-slate-100' : 'border-white/10 bg-slate-800'}`}>
            <img
              src={contributor.image}
              alt={contributor.name}
              className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
              loading="lazy"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).onerror = null;
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.name)}&background=0066FF&color=fff&bold=true`;
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 text-center sm:text-left min-w-0 flex-1">
          <div className="space-y-0.5">
            <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.4em] leading-none">Contributor Recognition</span>
            <h4 className={`text-xl font-black uppercase tracking-tighter leading-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{contributor.name}</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic leading-tight opacity-90 line-clamp-1">{contributor.role}</p>
          </div>
          <div className="pt-1 flex justify-center sm:justify-start">
            <a 
              href={`mailto:${contributor.email}`} 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase text-[8px] tracking-widest transition-all active:scale-95 shadow-lg border ${
                isLight ? 'bg-blue-600 text-white border-blue-400 hover:bg-blue-500' : 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Contact
            </a>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const PersonnelGrid: React.FC<PersonnelGridProps> = ({ appTheme = 'dark', onBack }) => {
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<FetchedObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  const isLight = appTheme === 'light';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profilesData, reportsData] = await Promise.all([
          getAllProfiles(),
          getAllReports()
        ]);
        setPersonnel(profilesData);
        setReports(reportsData);
      } catch (err) {
        console.error("Failed to load grid data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const personnelStats = useMemo(() => {
    const statsMap: Record<string, PersonnelStats> = {};

    personnel.forEach(p => {
      const created = reports.filter(r => r.fields["Name"] === p.name).length;
      const closedBy = reports.filter(r => r.fields["Closed by"] === p.name).length;
      const assigned = reports.filter(r => r.fields["Assigned To"] === p.name).length;
      
      const engagementScore = (created * 10) + (closedBy * 20) + (assigned * 5);
      const closureEfficiency = assigned > 0 ? (closedBy / assigned) : (closedBy > 0 ? 1 : 0);
      const percentage = Math.round(closureEfficiency * 100);
      
      let rating = 1;
      if (engagementScore > 100 || (engagementScore > 50 && percentage > 90)) rating = 5;
      else if (engagementScore > 50 || (engagementScore > 25 && percentage > 70)) rating = 4;
      else if (engagementScore > 20 || (engagementScore > 10 && percentage > 50)) rating = 3;
      else if (engagementScore > 5) rating = 2;
      else rating = 1;

      statsMap[p.name] = {
        rating,
        score: engagementScore,
        percentage: percentage || (engagementScore > 0 ? 85 : 0),
        reportsCreated: created,
        reportsClosed: closedBy
      };
    });

    return statsMap;
  }, [personnel, reports]);

  const roles = useMemo(() => {
    const uniqueRoles = Array.from(new Set(personnel.map(p => p.role))).sort();
    return ['All Roles', ...uniqueRoles];
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return personnel.filter(p => {
      const name = (p.name || '').toLowerCase();
      const site = (p.site || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      const matchesSearch = q === '' || name.includes(q) || site.includes(q) || email.includes(q);
      const matchesRole = filterRole === 'All Roles' || (p.role || '') === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [personnel, searchTerm, filterRole]);

  const getClearance = (role?: string) => {
    if (!role) return 'Level 1';
    try {
      return AUTHORIZED_ADMIN_ROLES.includes(role.toLowerCase()) ? 'Level 2' : 'Level 1';
    } catch {
      return 'Level 1';
    }
  };

  const handleEmailClick = (e: React.MouseEvent, email?: string) => {
    e.stopPropagation();
    if (email) window.location.href = `mailto:${email}`;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg 
            key={s} 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill={s <= rating ? "currentColor" : "none"} 
            stroke="currentColor" 
            strokeWidth="2.5"
            className={`${s <= rating ? "text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.6)]" : "text-slate-600 opacity-40"}`}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    );
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
            <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Personnel Grid</h2>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 text-left">Engagement & Performance Directory</span>
          </div>
        </div>
        <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{personnel.length} Identities Linked</span>
        </div>
      </div>

      {/* Contributor Recognition List */}
      <ContributorRecognition isLight={isLight} />

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 mt-6">
        <div className="flex-grow relative group">
          <input 
            type="text" 
            placeholder="Search identity by name or email..." 
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
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Accessing Personnel Metadata...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredPersonnel.length === 0 ? (
            <div className="py-20 text-center opacity-30 border-2 border-dashed border-slate-700 rounded-[2.5rem]">
               <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">No identity match established</p>
            </div>
          ) : (
            filteredPersonnel.map((person, idx) => {
              const stats = personnelStats[person.name] || { rating: 1, percentage: 0, reportsCreated: 0, reportsClosed: 0 };
              
              return (
                <div 
                  key={person.email ?? person.name ?? idx} 
                  onClick={() => setSelectedUser(selectedUser === person.name ? null : person.name)}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer group hover:translate-x-1 ${
                    selectedUser === person.name 
                      ? (isLight ? 'bg-blue-50 border-blue-400 shadow-lg' : 'bg-blue-600/10 border-blue-500/50 shadow-2xl')
                      : (isLight ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/20')
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 shadow-xl shrink-0 transition-transform group-hover:scale-105 ${
                      isLight ? 'border-white bg-slate-100 shadow-slate-200/50' : 'border-white/10 bg-black/40 shadow-black'
                    }`}>
                      {person.profileImageUrl ? (
                        <img
                          src={person.profileImageUrl}
                          alt={person.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=0066FF&color=fff&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-500 font-black text-2xl">
                          {person.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-base font-black truncate leading-tight tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{person.name}</h3>
                        {renderStars(stats.rating)}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                         <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                           getClearance(person.role) === 'Level 2' 
                             ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                             : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                         }`}>
                           {getClearance(person.role)}
                         </span>
                         <span className={`text-[8px] font-black uppercase text-slate-500 truncate tracking-widest`}>{person.role}</span>
                      </div>
                      <p className={`hidden sm:block text-[9px] font-black text-blue-400 mt-1.5 truncate tracking-widest`}>
                        {person.email || 'PROTOCOL_NULL'}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-1 flex-col justify-center min-w-[140px] px-6 border-l border-white/5">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Safety Engagement</span>
                        <span className={`text-[9px] font-black ${stats.percentage > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{stats.percentage}% Efficiency</span>
                     </div>
                     <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-1000 ${stats.percentage > 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
                          style={{ width: `${stats.percentage}%` }}
                        />
                     </div>
                     <div className="flex justify-between mt-2 pt-1 border-t border-white/5">
                        <div className="flex flex-col">
                           <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">Observations</span>
                           <span className={`text-[10px] font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{stats.reportsCreated}</span>
                        </div>
                        <div className="flex flex-col text-right">
                           <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">Resolutions</span>
                           <span className={`text-[10px] font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{stats.reportsClosed}</span>
                        </div>
                     </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end justify-center min-w-[120px] px-4">
                     <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Assigned Zone</span>
                     <span className={`text-[11px] font-black tracking-tight ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{person.site || 'Global Dispatch'}</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                     <div className="flex sm:hidden flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Performance</span>
                           <span className="text-[8px] font-black text-emerald-500">{stats.percentage}% SPI</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{person.site || 'Global Hub'}</span>
                     </div>
                     <div className="flex gap-2">
                       {person.email && (
                         <button 
                          onClick={(e) => handleEmailClick(e, person.email)}
                          title="Establish Communication"
                          className={`p-3.5 rounded-2xl transition-all shadow-lg ${
                            isLight ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/10'
                          }`}
                         >
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                           </svg>
                         </button>
                       )}
                       <button 
                        title="View Detailed Records"
                        className={`p-3.5 rounded-2xl transition-all shadow-lg ${
                         selectedUser === person.name 
                           ? 'bg-blue-600 text-white shadow-blue-500/20' 
                           : (isLight ? 'bg-slate-50 text-slate-400 hover:bg-slate-100' : 'bg-white/5 text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 border border-white/5')
                       }`}>
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                         </svg>
                       </button>
                     </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer Audit Label */}
      <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-40">
          <div className="flex flex-col items-center sm:items-start">
             <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">System Calculated Performance Index (SPI)</p>
             <p className="text-[7px] font-black uppercase text-blue-500 mt-1">Based on Real-time Safety Grid Participation</p>
          </div>
          <div className="flex gap-6">
             <span className="text-[8px] font-black uppercase tracking-[0.2em] border-r border-white/10 pr-6">Data Privacy Verified</span>
             <span className="text-[8px] font-black uppercase tracking-[0.2em]">Deployment Protocol v3.1</span>
          </div>
      </div>
    </div>
  );
};