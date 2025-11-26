import React, { useState } from 'react';
import { Match, Team } from '../types';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy, Plus, X, Save, Loader2 } from 'lucide-react';
import { scheduleMatch } from '../services/sheetService';

interface ScheduleListProps {
  matches: Match[];
  teams: Team[];
  onBack: () => void;
  isAdmin?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ matches, teams, onBack, isAdmin, isLoading, onRefresh }) => {
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

  const resolveTeamName = (teamIdOrName: string | Team) => {
      if (typeof teamIdOrName === 'object') return teamIdOrName.name;
      const t = teams.find(t => t.id === teamIdOrName || t.name === teamIdOrName);
      return t ? t.name : teamIdOrName;
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
          alert("กรุณากรอกข้อมูลให้ครบถ้วน");
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
          alert("เพิ่มตารางแข่งเรียบร้อย");
          setIsAddModalOpen(false);
          setNewMatch({ teamA: '', teamB: '', date: '', time: '', venue: '', roundLabel: 'Group Stage' });
          if(onRefresh) onRefresh();
      } catch(e) {
          alert("เกิดข้อผิดพลาด");
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
                    // Skeleton Loader
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
                    scheduledMatches.map(match => (
                        <div key={match.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center gap-4 hover:shadow-md transition">
                            <div className="flex flex-col items-center md:items-start min-w-[120px] text-slate-500 text-sm">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(match.scheduledTime || match.date)}</span>
                                {match.scheduledTime && <span className="flex items-center gap-1 text-indigo-600 font-bold"><Clock className="w-3 h-3" /> {formatTime(match.scheduledTime)}</span>}
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-4 w-full">
                                <div className="text-right flex-1 font-bold text-slate-800 text-lg truncate">{resolveTeamName(match.teamA)}</div>
                                <div className="px-3 py-1 bg-slate-100 rounded text-xs text-slate-500 font-bold whitespace-nowrap">VS</div>
                                <div className="text-left flex-1 font-bold text-slate-800 text-lg truncate">{resolveTeamName(match.teamB)}</div>
                            </div>
                            <div className="min-w-[150px] flex flex-col items-center md:items-end text-sm gap-1">
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">{match.roundLabel || 'รอบทั่วไป'}</span>
                                {match.venue && <span className="flex items-center gap-1 text-slate-500 text-xs"><MapPin className="w-3 h-3" /> {match.venue}</span>}
                            </div>
                        </div>
                    ))
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
                    finishedMatches.map(match => (
                        <div key={match.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center gap-4 opacity-80 hover:opacity-100 transition">
                             <div className="flex flex-col items-center md:items-start min-w-[120px] text-slate-400 text-xs">
                                <span>{formatDate(match.date)}</span>
                                <span>{match.roundLabel}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center gap-4 w-full">
                                <div className={`text-right flex-1 font-bold text-lg ${match.winner === 'A' || match.winner === resolveTeamName(match.teamA) ? 'text-green-600' : 'text-slate-600'}`}>
                                    {resolveTeamName(match.teamA)}
                                </div>
                                <div className="bg-slate-800 text-white px-4 py-1 rounded-lg font-mono font-bold text-lg shadow-inner">
                                    {match.scoreA} - {match.scoreB}
                                </div>
                                <div className={`text-left flex-1 font-bold text-lg ${match.winner === 'B' || match.winner === resolveTeamName(match.teamB) ? 'text-green-600' : 'text-slate-600'}`}>
                                    {resolveTeamName(match.teamB)}
                                </div>
                            </div>
                            <div className="min-w-[100px] flex justify-end">
                                 <Trophy className="w-5 h-5 text-yellow-500" />
                            </div>
                        </div>
                    ))
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500">ทีมเหย้า</label>
                                <select value={newMatch.teamA} onChange={e => setNewMatch({...newMatch, teamA: e.target.value})} className="w-full p-2 border rounded text-sm">
                                    <option value="">เลือกทีม...</option>
                                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">ทีมเยือน</label>
                                <select value={newMatch.teamB} onChange={e => setNewMatch({...newMatch, teamB: e.target.value})} className="w-full p-2 border rounded text-sm">
                                    <option value="">เลือกทีม...</option>
                                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">รายการ/รอบ</label>
                            <input type="text" value={newMatch.roundLabel} onChange={e => setNewMatch({...newMatch, roundLabel: e.target.value})} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500">วันที่</label>
                                <input type="date" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="w-full p-2 border rounded text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">เวลา</label>
                                <input type="time" value={newMatch.time} onChange={e => setNewMatch({...newMatch, time: e.target.value})} className="w-full p-2 border rounded text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">สนามแข่ง</label>
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