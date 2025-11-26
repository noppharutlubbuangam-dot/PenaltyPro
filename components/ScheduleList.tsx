
import React, { useState, useRef, useEffect } from 'react';
import { Match, Team } from '../types';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy, Plus, X, Save, Loader2, Search, ChevronDown, Check } from 'lucide-react';
import { scheduleMatch } from '../services/sheetService';

interface ScheduleListProps {
  matches: Match[];
  teams: Team[];
  onBack: () => void;
  isAdmin?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  showNotification?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

// Searchable Select Component (Select2 Style)
const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder 
}: { 
    options: Team[], 
    value: string, 
    onChange: (val: string) => void, 
    placeholder: string 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedTeam = options.find(t => t.name === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className="w-full p-2 border rounded text-sm flex items-center justify-between bg-white cursor-pointer hover:border-indigo-400 transition"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selectedTeam ? (
                        <>
                            {selectedTeam.logoUrl ? (
                                <img src={selectedTeam.logoUrl} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{selectedTeam.name.substring(0,1)}</div>
                            )}
                            <span className="truncate font-medium text-slate-800">{selectedTeam.name}</span>
                        </>
                    ) : (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full bg-white border rounded-lg shadow-xl mt-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b bg-slate-50">
                        <div className="relative">
                            <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                autoFocus
                                className="w-full pl-8 p-1.5 border rounded text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                placeholder="ค้นหาทีม..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(t => (
                                <div 
                                    key={t.id}
                                    className={`p-2 text-sm cursor-pointer hover:bg-indigo-50 flex items-center gap-2 ${value === t.name ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                                    onClick={() => {
                                        onChange(t.name);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    {t.logoUrl ? (
                                        <img src={t.logoUrl} className="w-6 h-6 rounded-full object-cover bg-white border" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{t.name.substring(0,1)}</div>
                                    )}
                                    <span className="flex-1">{t.name}</span>
                                    {value === t.name && <Check className="w-4 h-4 text-indigo-600" />}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-400">ไม่พบทีมที่ค้นหา</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ScheduleList: React.FC<ScheduleListProps> = ({ matches, teams, onBack, isAdmin, isLoading, onRefresh, showNotification }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New Match Form State
  const [newMatch, setNewMatch] = useState({
      teamA: '',
      teamB: '',
      date: '',
      time: '',
      venue: '',
      roundLabel: 'Group Stage'
  });

  // Sort matches
  const scheduledMatches = matches
    .filter(m => !m.winner)
    .sort((a, b) => new Date(a.scheduledTime || a.date).getTime() - new Date(b.scheduledTime || b.date).getTime());

  const finishedMatches = matches
    .filter(m => m.winner)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const resolveTeam = (teamIdOrName: string | Team) => {
      if (typeof teamIdOrName === 'object') return teamIdOrName;
      return teams.find(t => t.id === teamIdOrName || t.name === teamIdOrName) || { name: teamIdOrName, id: 'unknown', color: '#ccc', logoUrl: '' } as Team;
  };

  const formatDate = (dateStr: string) => {
      try {
          return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch(e) { return dateStr; }
  };

  const formatTime = (dateStr: string) => {
      try {
          return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      } catch(e) { return ''; }
  };

  const handleAddMatch = async () => {
      if (!newMatch.teamA || !newMatch.teamB || !newMatch.date || !newMatch.time) {
          if (showNotification) showNotification("ข้อมูลไม่ครบ", "กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
          else alert("กรุณากรอกข้อมูลให้ครบถ้วน");
          return;
      }
      
      setIsSaving(true);
      const scheduledTime = new Date(`${newMatch.date}T${newMatch.time}`).toISOString();
      
      try {
          await scheduleMatch(
              `M_EXT_${Date.now()}`,
              newMatch.teamA,
              newMatch.teamB,
              newMatch.roundLabel,
              newMatch.venue,
              scheduledTime
          );
          if (showNotification) showNotification("สำเร็จ", "เพิ่มตารางแข่งเรียบร้อย", "success");
          setIsAddModalOpen(false);
          setNewMatch({ teamA: '', teamB: '', date: '', time: '', venue: '', roundLabel: 'Group Stage' });
          if(onRefresh) onRefresh();
      } catch(e) {
          if (showNotification) showNotification("ผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition text-slate-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-blue-600" /> ตารางการแข่งขัน
                </h1>
            </div>
            {isAdmin && (
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition font-bold text-sm"
                >
                    <Plus className="w-4 h-4" /> เพิ่มคู่แข่ง
                </button>
            )}
        </div>

        {/* Scheduled Matches */}
        <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-700 mb-4 px-2 border-l-4 border-blue-500">โปรแกรมการแข่งขัน</h2>
            <div className="space-y-3">
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-4 animate-pulse">
                            <div className="w-24 h-4 bg-slate-200 rounded"></div>
                            <div className="flex-1 flex justify-between items-center px-8">
                                <div className="w-20 h-6 bg-slate-200 rounded"></div>
                                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                                <div className="w-20 h-6 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : scheduledMatches.length === 0 ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center text-slate-400 border border-slate-200">
                        ไม่มีโปรแกรมการแข่งขันที่กำลังจะมาถึง
                    </div>
                ) : (
                    scheduledMatches.map(match => {
                        const tA = resolveTeam(match.teamA);
                        const tB = resolveTeam(match.teamB);
                        return (
                            <div key={match.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center gap-4 hover:shadow-md transition">
                                <div className="flex flex-col items-center md:items-start min-w-[120px] text-slate-500 text-sm">
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(match.scheduledTime || match.date)}</span>
                                    {match.scheduledTime && <span className="flex items-center gap-1 text-indigo-600 font-bold"><Clock className="w-3 h-3" /> {formatTime(match.scheduledTime)}</span>}
                                </div>
                                <div className="flex-1 flex items-center justify-center gap-4 w-full">
                                    <div className="flex items-center justify-end gap-3 flex-1">
                                        <span className="font-bold text-slate-800 text-lg truncate">{tA.name}</span>
                                        {tA.logoUrl ? <img src={tA.logoUrl} className="w-8 h-8 object-contain rounded bg-slate-50"/> : <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">A</div>}
                                    </div>
                                    <div className="px-3 py-1 bg-slate-100 rounded text-xs text-slate-500 font-bold whitespace-nowrap">VS</div>
                                    <div className="flex items-center justify-start gap-3 flex-1">
                                        {tB.logoUrl ? <img src={tB.logoUrl} className="w-8 h-8 object-contain rounded bg-slate-50"/> : <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs font-bold">B</div>}
                                        <span className="font-bold text-slate-800 text-lg truncate">{tB.name}</span>
                                    </div>
                                </div>
                                <div className="min-w-[150px] flex flex-col items-center md:items-end text-sm gap-1">
                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">{match.roundLabel || 'รอบทั่วไป'}</span>
                                    {match.venue && <span className="flex items-center gap-1 text-slate-500 text-xs"><MapPin className="w-3 h-3" /> {match.venue}</span>}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Finished Matches */}
        <div>
            <h2 className="text-lg font-bold text-slate-700 mb-4 px-2 border-l-4 border-green-500">ผลการแข่งขัน</h2>
             <div className="space-y-3">
                {isLoading ? (
                     Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-4 h-16 animate-pulse"></div>
                    ))
                ) : finishedMatches.length === 0 ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center text-slate-400 border border-slate-200">
                        ยังไม่มีผลการแข่งขัน
                    </div>
                ) : (
                    finishedMatches.map(match => {
                        const tA = resolveTeam(match.teamA);
                        const tB = resolveTeam(match.teamB);
                        return (
                            <div key={match.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center gap-4 opacity-80 hover:opacity-100 transition">
                                <div className="flex flex-col items-center md:items-start min-w-[120px] text-slate-400 text-xs">
                                    <span>{formatDate(match.date)}</span>
                                    <span>{match.roundLabel}</span>
                                </div>
                                <div className="flex-1 flex items-center justify-center gap-4 w-full">
                                    <div className={`flex items-center justify-end gap-3 flex-1 ${match.winner === 'A' || match.winner === tA.name ? 'text-green-600' : 'text-slate-600'}`}>
                                        <span className="font-bold text-lg truncate">{tA.name}</span>
                                        {tA.logoUrl && <img src={tA.logoUrl} className="w-6 h-6 object-contain rounded opacity-80"/>}
                                    </div>
                                    <div className="bg-slate-800 text-white px-4 py-1 rounded-lg font-mono font-bold text-lg shadow-inner">
                                        {match.scoreA} - {match.scoreB}
                                    </div>
                                    <div className={`flex items-center justify-start gap-3 flex-1 ${match.winner === 'B' || match.winner === tB.name ? 'text-green-600' : 'text-slate-600'}`}>
                                        {tB.logoUrl && <img src={tB.logoUrl} className="w-6 h-6 object-contain rounded opacity-80"/>}
                                        <span className="font-bold text-lg truncate">{tB.name}</span>
                                    </div>
                                </div>
                                <div className="min-w-[100px] flex justify-end">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Add Match Modal */}
        {isAddModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-slate-800">เพิ่มตารางการแข่งขัน</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ทีมเหย้า</label>
                                <SearchableSelect 
                                    options={teams} 
                                    value={newMatch.teamA} 
                                    onChange={(val) => setNewMatch({...newMatch, teamA: val})} 
                                    placeholder="เลือกทีมเหย้า" 
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ทีมเยือน</label>
                                <SearchableSelect 
                                    options={teams} 
                                    value={newMatch.teamB} 
                                    onChange={(val) => setNewMatch({...newMatch, teamB: val})} 
                                    placeholder="เลือกทีมเยือน" 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">รายการ/รอบ</label>
                            <input type="text" value={newMatch.roundLabel} onChange={e => setNewMatch({...newMatch, roundLabel: e.target.value})} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">วันที่</label>
                                <input type="date" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="w-full p-2 border rounded text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">เวลา</label>
                                <input type="time" value={newMatch.time} onChange={e => setNewMatch({...newMatch, time: e.target.value})} className="w-full p-2 border rounded text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">สนามแข่ง</label>
                            <input type="text" value={newMatch.venue} onChange={e => setNewMatch({...newMatch, venue: e.target.value})} className="w-full p-2 border rounded text-sm" placeholder="เช่น สนาม 1" />
                        </div>
                        
                        <button 
                            onClick={handleAddMatch}
                            disabled={isSaving}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} บันทึกตารางแข่ง
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ScheduleList;
