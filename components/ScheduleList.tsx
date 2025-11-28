
import React, { useState, useRef, useEffect } from 'react';
import { Match, Team, Player, AppSettings, KickResult } from '../types';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy, Plus, X, Save, Loader2, Search, ChevronDown, Check, Share2, Edit2, Trash2, AlertTriangle, User, ListPlus, PlusCircle, Users, ArrowRight, PlayCircle, ClipboardCheck, RotateCcw, Flag, Video, Image, Youtube, Facebook, BarChart2, ImageIcon, Download, Camera, Filter, Sparkles, MessageSquare, Cpu } from 'lucide-react';
import { scheduleMatch, deleteMatch, saveMatchToSheet, fileToBase64 } from '../services/sheetService';
import { generateMatchSummary } from '../services/geminiService';
import { shareMatch, shareMatchSummary } from '../services/liffService';

interface ScheduleListProps {
  matches: Match[];
  teams: Team[];
  players?: Player[]; 
  onBack: () => void;
  isAdmin?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  showNotification?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onStartMatch: (teamA: Team, teamB: Team, matchId: string) => void;
  config: AppSettings;
  initialMatchId?: string | null;
}

const VENUE_OPTIONS = ["สนาม 1", "สนาม 2", "สนาม 3", "สนาม 4", "สนามกลาง (Main Stadium)"];
const AI_MODELS = [
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite (30 RPM - แนะนำ/โควต้าเยอะสุด)' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (15 RPM)' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (15 RPM)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (10 RPM - ฉลาดขึ้น)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy)' }
];

interface TeamSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (team: Team) => void;
    teams: Team[];
    title?: string;
}

const TeamSelectorModal: React.FC<TeamSelectorProps> = ({ isOpen, onClose, onSelect, teams, title }) => {
    const [search, setSearch] = useState('');
    
    useEffect(() => {
        if(isOpen) setSearch('');
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh] animate-in zoom-in duration-200">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">{title || "เลือกทีม"}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400"/></button>
                </div>
                <div className="p-2 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="ค้นหา..." 
                            className="w-full pl-9 p-2 bg-slate-100 rounded-lg text-sm outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="overflow-y-auto p-2 space-y-1">
                    {filtered.map(t => (
                        <button 
                            key={t.id} 
                            onClick={() => { onSelect(t); onClose(); }}
                            className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg flex items-center gap-3 transition"
                        >
                            {t.logoUrl ? <img src={t.logoUrl} className="w-8 h-8 object-contain rounded bg-white border"/> : <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center font-bold text-xs">{t.shortName}</div>}
                            <span className="font-medium text-slate-700">{t.name}</span>
                        </button>
                    ))}
                    {filtered.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>}
                </div>
            </div>
        </div>
    );
};

const ScheduleList: React.FC<ScheduleListProps> = ({ matches, teams, players, onBack, isAdmin, isLoading, onRefresh, showNotification, onStartMatch, config, initialMatchId }) => {
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Match>>({});
  const [teamSelector, setTeamSelector] = useState<{ isOpen: boolean, target: 'A' | 'B' }>({ isOpen: false, target: 'A' });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);

  // Helper to safely get team name
  const getTeamName = (t: Team | string | null | undefined): string => {
      if (!t) return '';
      if (typeof t === 'string') return t;
      if (typeof t === 'object' && 'name' in t) return t.name;
      return '';
  };

  const getTeamLogo = (t: Team | string | null | undefined): string => {
      if (!t) return '';
      if (typeof t === 'string') {
          const found = teams.find(team => team.name === t);
          return found ? found.logoUrl || '' : '';
      }
      if (typeof t === 'object' && 'logoUrl' in t) {
          return t.logoUrl || '';
      }
      return '';
  };

  // Auto-open match if initialMatchId provided
  useEffect(() => {
      if (initialMatchId && matches.length > 0) {
          const match = matches.find(m => m.id === initialMatchId);
          if (match) {
              setSelectedMatch(match);
              setAiSummary(match.summary || '');
          }
      }
  }, [initialMatchId, matches]);

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setEditForm({});
    setIsEditing(false);
    setAiSummary(match.summary || '');
    setDeleteConfirm(false);
  };

  const handleCloseModal = () => {
    setSelectedMatch(null);
    setAiSummary('');
  };

  const startEdit = () => {
      if (!selectedMatch) return;
      setEditForm({
          teamA: typeof selectedMatch.teamA === 'object' ? selectedMatch.teamA.name : selectedMatch.teamA,
          teamB: typeof selectedMatch.teamB === 'object' ? selectedMatch.teamB.name : selectedMatch.teamB,
          venue: selectedMatch.venue,
          scheduledTime: selectedMatch.scheduledTime,
          roundLabel: selectedMatch.roundLabel,
          livestreamUrl: selectedMatch.livestreamUrl,
          livestreamCover: selectedMatch.livestreamCover
      });
      setIsEditing(true);
  };

  const handleSaveEdit = async () => {
      if (!selectedMatch) return;
      setIsSaving(true);
      
      try {
          await scheduleMatch(
              selectedMatch.id,
              editForm.teamA as string || '',
              editForm.teamB as string || '',
              editForm.roundLabel || '',
              editForm.venue,
              editForm.scheduledTime,
              editForm.livestreamUrl,
              editForm.livestreamCover
          );
          
          if (onRefresh) onRefresh();
          if (showNotification) showNotification("บันทึกแล้ว", "แก้ไขข้อมูลการแข่งขันสำเร็จ", "success");
          
          // Update local state temporarily
          setSelectedMatch({ ...selectedMatch, ...editForm });
          setIsEditing(false);
      } catch (error) {
          console.error(error);
          if (showNotification) showNotification("ผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async () => {
      if (!selectedMatch) return;
      setIsSaving(true);
      try {
          await deleteMatch(selectedMatch.id);
          if (onRefresh) onRefresh();
          if (showNotification) showNotification("ลบรายการแล้ว", "", "success");
          handleCloseModal();
      } catch (error) {
          if (showNotification) showNotification("ผิดพลาด", "ลบรายการไม่สำเร็จ", "error");
      } finally {
          setIsSaving(false);
      }
  };

  const handleGenerateSummary = async () => {
      if (!selectedMatch) return;
      setIsGeneratingAI(true);
      try {
          const tA = typeof selectedMatch.teamA === 'object' ? selectedMatch.teamA.name : selectedMatch.teamA;
          const tB = typeof selectedMatch.teamB === 'object' ? selectedMatch.teamB.name : selectedMatch.teamB;
          
          // Filter match kicks if not present in match object but available in global (mock logic here, ideally pass kicks)
          // In real app, `selectedMatch` should have `kicks` populated from App.tsx
          const kicks = selectedMatch.kicks || []; 

          const summary = await generateMatchSummary(
              tA, 
              tB, 
              selectedMatch.scoreA, 
              selectedMatch.scoreB, 
              selectedMatch.winner,
              kicks,
              selectedModel
          );
          
          setAiSummary(summary);
          
          // Save to sheet (Update only summary)
          // Note: We pass skipKicks=true to prevent duplicating kick logs
          await saveMatchToSheet({ ...selectedMatch, summary }, summary, true); 
          
          if (onRefresh) onRefresh(); // Sync back to main state
          
      } catch (error) {
          console.error("AI Error", error);
          setAiSummary("ไม่สามารถสร้างสรุปได้ในขณะนี้ (API Error)");
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleCoverUpload = async (file: File) => {
      if (file.size > 1024 * 1024 * 2) {
          alert("รูปภาพต้องขนาดไม่เกิน 2MB");
          return;
      }
      try {
          const base64 = await fileToBase64(file);
          setEditForm(prev => ({ ...prev, livestreamCover: base64 }));
      } catch (e) {
          console.error(e);
      }
  };

  // Helper to safely get team name
  const getTeamNameDisplay = (t: Team | string) => typeof t === 'object' ? t.name : t;

  const filteredMatches = matches.filter(m => {
      if (!filterDate) return true;
      const mDate = new Date(m.scheduledTime || m.date).toDateString();
      const fDate = new Date(filterDate).toDateString();
      return mDate === fDate;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24">
      <TeamSelectorModal 
        isOpen={teamSelector.isOpen} 
        onClose={() => setTeamSelector({ ...teamSelector, isOpen: false })} 
        teams={teams} 
        onSelect={(t) => setEditForm(prev => teamSelector.target === 'A' ? { ...prev, teamA: t.name } : { ...prev, teamB: t.name })}
        title={`เลือกทีม ${teamSelector.target === 'A' ? 'เหย้า' : 'เยือน'}`}
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition text-slate-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-indigo-600" /> โปรแกรม/ผลการแข่งขัน
                </h1>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                    <input 
                        type="date" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {filterDate && (
                    <button onClick={() => setFilterDate('')} className="p-2 text-slate-500 hover:text-red-500 bg-white border border-slate-300 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                )}
                {isAdmin && (
                    <button onClick={() => {
                        const newMatch: Match = {
                            id: `M_${Date.now()}`,
                            teamA: 'Team A',
                            teamB: 'Team B',
                            scoreA: 0, scoreB: 0,
                            winner: null,
                            date: new Date().toISOString(),
                            status: 'Scheduled'
                        };
                        setSelectedMatch(newMatch);
                        setIsEditing(true);
                        setEditForm({
                            teamA: '', teamB: '', venue: '', scheduledTime: new Date().toISOString().slice(0, 16)
                        });
                    }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 font-bold text-sm">
                        <PlusCircle className="w-4 h-4" /> เพิ่มคู่แข่ง
                    </button>
                )}
            </div>
        </div>

        {/* Match List */}
        <div className="space-y-4">
            {isLoading ? (
                <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl shadow-sm"></div>)}
                </div>
            ) : sortedMatches.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-slate-300">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">ไม่พบรายการแข่งขัน</p>
                </div>
            ) : (
                sortedMatches.map((match) => {
                    const isLive = match.livestreamUrl && !match.winner;
                    return (
                        <div 
                            key={match.id} 
                            onClick={() => handleMatchClick(match)}
                            className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden relative group ${isLive ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}`}
                        >
                            {isLive && <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-10 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE</div>}
                            <div className="p-4 flex flex-col md:flex-row items-center gap-4">
                                {/* Time & Venue */}
                                <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-1 text-xs text-slate-500 w-full md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 pb-2 md:pb-0 md:pr-2">
                                    <div className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                        <Clock className="w-3 h-3" />
                                        {match.scheduledTime 
                                            ? new Date(match.scheduledTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) 
                                            : new Date(match.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                                        }
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(match.scheduledTime || match.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    </div>
                                    {match.venue && (
                                        <div className="flex items-center gap-1 truncate w-full" title={match.venue}>
                                            <MapPin className="w-3 h-3 shrink-0" /> {match.venue}
                                        </div>
                                    )}
                                </div>

                                {/* Teams & Score */}
                                <div className="flex-1 flex items-center justify-between w-full gap-4">
                                    {/* Team A */}
                                    <div className="flex-1 flex flex-col items-center gap-2 text-center">
                                        {getTeamLogo(match.teamA) ? (
                                            <img src={getTeamLogo(match.teamA)} className="w-12 h-12 object-contain" />
                                        ) : (
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 text-sm">A</div>
                                        )}
                                        <span className={`font-bold text-sm leading-tight ${match.winner === 'A' || match.winner === getTeamName(match.teamA) ? 'text-green-600' : 'text-slate-800'}`}>
                                            {getTeamName(match.teamA)}
                                        </span>
                                    </div>

                                    {/* VS / Score */}
                                    <div className="shrink-0 flex flex-col items-center">
                                        {match.winner ? (
                                            <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-mono font-black text-xl shadow-lg">
                                                {match.scoreA} - {match.scoreB}
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 text-xs">VS</div>
                                        )}
                                        {match.roundLabel && <span className="text-[10px] text-slate-400 mt-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{match.roundLabel}</span>}
                                    </div>

                                    {/* Team B */}
                                    <div className="flex-1 flex flex-col items-center gap-2 text-center">
                                        {getTeamLogo(match.teamB) ? (
                                            <img src={getTeamLogo(match.teamB)} className="w-12 h-12 object-contain" />
                                        ) : (
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 text-sm">B</div>
                                        )}
                                        <span className={`font-bold text-sm leading-tight ${match.winner === 'B' || match.winner === getTeamName(match.teamB) ? 'text-green-600' : 'text-slate-800'}`}>
                                            {getTeamName(match.teamB)}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Status Icon */}
                                <div className="hidden md:flex w-8 justify-center">
                                    {match.winner ? <Check className="w-5 h-5 text-green-500" /> : <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition" />}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
          <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={handleCloseModal}>
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  
                  {/* Header */}
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 sticky top-0 z-20">
                      <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-400" />
                          <h3 className="font-bold text-lg">รายละเอียดการแข่งขัน</h3>
                      </div>
                      <button onClick={handleCloseModal} className="hover:bg-slate-700 p-1 rounded-full transition"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="overflow-y-auto p-6 space-y-6">
                      
                      {/* 1. Main Scoreboard / VS */}
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col items-center relative overflow-hidden">
                          {selectedMatch.livestreamUrl && (
                              <a href={selectedMatch.livestreamUrl} target="_blank" className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm hover:bg-red-700 transition z-10">
                                  <Video className="w-3 h-3" /> ชมถ่ายทอดสด
                              </a>
                          )}
                          
                          <div className="flex items-center justify-between w-full gap-4 relative z-0">
                              {/* Team A */}
                              <div className="flex-1 flex flex-col items-center gap-3 text-center">
                                  {isEditing ? (
                                      <button onClick={() => setTeamSelector({isOpen: true, target: 'A'})} className="p-2 bg-white border border-dashed border-indigo-300 rounded-lg text-sm text-indigo-600 font-bold hover:bg-indigo-50 w-full">
                                          {editForm.teamA || 'เลือกทีม A'}
                                      </button>
                                  ) : (
                                      <>
                                          {getTeamLogo(selectedMatch.teamA) ? (
                                              <img src={getTeamLogo(selectedMatch.teamA)} className="w-20 h-20 object-contain drop-shadow-md" />
                                          ) : <div className="w-20 h-20 bg-white rounded-full shadow-inner flex items-center justify-center font-bold text-2xl text-slate-300">A</div>}
                                          <div className="font-bold text-lg leading-tight">{getTeamName(selectedMatch.teamA)}</div>
                                      </>
                                  )}
                              </div>

                              {/* Center */}
                              <div className="shrink-0 flex flex-col items-center">
                                  {selectedMatch.winner ? (
                                      <div className="text-5xl font-black text-slate-800 tracking-tighter">{selectedMatch.scoreA} - {selectedMatch.scoreB}</div>
                                  ) : (
                                      <div className="text-3xl font-black text-slate-300">VS</div>
                                  )}
                                  {isEditing ? (
                                      <input 
                                          type="text" 
                                          value={editForm.roundLabel || ''} 
                                          onChange={e => setEditForm({...editForm, roundLabel: e.target.value})} 
                                          className="mt-2 text-center text-xs border rounded p-1 w-24"
                                          placeholder="รอบการแข่ง"
                                      />
                                  ) : (
                                      <div className="mt-2 bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">{selectedMatch.roundLabel || 'รอบทั่วไป'}</div>
                                  )}
                              </div>

                              {/* Team B */}
                              <div className="flex-1 flex flex-col items-center gap-3 text-center">
                                  {isEditing ? (
                                      <button onClick={() => setTeamSelector({isOpen: true, target: 'B'})} className="p-2 bg-white border border-dashed border-indigo-300 rounded-lg text-sm text-indigo-600 font-bold hover:bg-indigo-50 w-full">
                                          {editForm.teamB || 'เลือกทีม B'}
                                      </button>
                                  ) : (
                                      <>
                                          {getTeamLogo(selectedMatch.teamB) ? (
                                              <img src={getTeamLogo(selectedMatch.teamB)} className="w-20 h-20 object-contain drop-shadow-md" />
                                          ) : <div className="w-20 h-20 bg-white rounded-full shadow-inner flex items-center justify-center font-bold text-2xl text-slate-300">B</div>}
                                          <div className="font-bold text-lg leading-tight">{getTeamName(selectedMatch.teamB)}</div>
                                      </>
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* 2. Details Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-xl border border-slate-200">
                              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-indigo-500"/> เวลาและสถานที่</h4>
                              <div className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 mb-1">เวลาแข่งขัน</label>
                                      {isEditing ? (
                                          <input 
                                              type="datetime-local" 
                                              value={editForm.scheduledTime ? new Date(editForm.scheduledTime).toISOString().slice(0, 16) : ''}
                                              onChange={e => setEditForm({...editForm, scheduledTime: e.target.value})}
                                              className="w-full p-2 border rounded text-sm"
                                          />
                                      ) : (
                                          <div className="text-sm font-medium">
                                              {new Date(selectedMatch.scheduledTime || selectedMatch.date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                                              <br/>
                                              {new Date(selectedMatch.scheduledTime || selectedMatch.date).toLocaleTimeString('th-TH', { timeStyle: 'short' })} น.
                                          </div>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 mb-1">สนามแข่งขัน</label>
                                      {isEditing ? (
                                          <div className="relative">
                                              <input 
                                                  type="text" 
                                                  list="venues"
                                                  value={editForm.venue || ''}
                                                  onChange={e => setEditForm({...editForm, venue: e.target.value})}
                                                  className="w-full p-2 border rounded text-sm"
                                                  placeholder="เลือกหรือพิมพ์ชื่อสนาม"
                                              />
                                              <datalist id="venues">
                                                  {VENUE_OPTIONS.map(v => <option key={v} value={v} />)}
                                              </datalist>
                                          </div>
                                      ) : (
                                          <div className="text-sm font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400"/> {selectedMatch.venue || 'ไม่ระบุ'}</div>
                                      )}
                                  </div>
                              </div>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-slate-200">
                              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm"><Video className="w-4 h-4 text-red-500"/> ถ่ายทอดสด (Live)</h4>
                              <div className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 mb-1">ลิงก์ถ่ายทอดสด</label>
                                      {isEditing ? (
                                          <div className="relative">
                                              <input 
                                                  type="text" 
                                                  value={editForm.livestreamUrl || ''}
                                                  onChange={e => setEditForm({...editForm, livestreamUrl: e.target.value})}
                                                  className="w-full p-2 pl-8 border rounded text-sm"
                                                  placeholder="https://..."
                                              />
                                              <Youtube className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                                          </div>
                                      ) : (
                                          selectedMatch.livestreamUrl ? (
                                              <a href={selectedMatch.livestreamUrl} target="_blank" className="text-sm text-indigo-600 hover:underline truncate block max-w-full flex items-center gap-1">
                                                  <Youtube className="w-4 h-4"/> {selectedMatch.livestreamUrl}
                                              </a>
                                          ) : <span className="text-sm text-slate-400">-</span>
                                      )}
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 mb-1">รูปปก (Cover)</label>
                                      {isEditing ? (
                                          <div className="flex gap-2 items-center">
                                              {editForm.livestreamCover && <img src={editForm.livestreamCover} className="h-10 w-16 object-cover rounded bg-black" />}
                                              <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold flex items-center gap-1">
                                                  <Image className="w-3 h-3"/> อัปโหลด
                                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
                                              </label>
                                          </div>
                                      ) : (
                                          selectedMatch.livestreamCover ? <img src={selectedMatch.livestreamCover} className="h-24 w-full object-cover rounded-lg" /> : <div className="h-24 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 text-xs">ไม่มีรูปปก</div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* 3. AI Summary Section */}
                      {selectedMatch.winner && (
                          <div className={`p-4 rounded-xl border relative transition-colors duration-300 ${aiSummary.includes('⚠️') ? 'bg-orange-50 border-orange-200' : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-100'}`}>
                              <div className="flex justify-between items-center mb-3">
                                  <h4 className={`font-bold flex items-center gap-2 text-sm ${aiSummary.includes('⚠️') ? 'text-orange-800' : 'text-indigo-800'}`}>
                                      {aiSummary.includes('⚠️') ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />} 
                                      {aiSummary.includes('⚠️') ? 'ระบบแจ้งเตือน' : 'AI Match Reporter'}
                                  </h4>
                                  <div className="flex gap-2 items-center">
                                      {isAdmin && !isGeneratingAI && (
                                          <select 
                                              value={selectedModel} 
                                              onChange={(e) => setSelectedModel(e.target.value)}
                                              className="text-[10px] p-1 border rounded bg-white max-w-[100px] sm:max-w-none"
                                          >
                                              {AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                          </select>
                                      )}
                                      <button 
                                          onClick={handleGenerateSummary} 
                                          disabled={isGeneratingAI}
                                          className="text-xs bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 flex items-center gap-1 shadow-sm"
                                      >
                                          {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin"/> : <Cpu className="w-3 h-3"/>}
                                          {aiSummary ? 'วิเคราะห์ใหม่' : 'สร้างสรุปผล'}
                                      </button>
                                      {aiSummary && !aiSummary.includes('⚠️') && (
                                          <button onClick={() => shareMatchSummary(selectedMatch, aiSummary, getTeamName(selectedMatch.teamA), getTeamName(selectedMatch.teamB))} className="text-xs bg-[#06C755] text-white px-2 py-1 rounded hover:bg-[#05b34c] flex items-center gap-1 shadow-sm font-bold">
                                              <Share2 className="w-3 h-3"/> แชร์ LINE
                                          </button>
                                      )}
                                  </div>
                              </div>
                              
                              {aiSummary ? (
                                  <div className={`text-sm leading-relaxed whitespace-pre-line animate-in fade-in ${aiSummary.includes('⚠️') ? 'text-orange-700' : 'text-slate-700'}`}>
                                      {aiSummary}
                                  </div>
                              ) : (
                                  <div className="text-center py-6 text-slate-400 text-xs italic">
                                      กดปุ่ม "สร้างสรุปผล" เพื่อให้ AI เขียนข่าวการแข่งขันนี้ให้คุณ
                                  </div>
                              )}
                          </div>
                      )}

                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 border-t bg-slate-50 flex justify-between items-center sticky bottom-0 z-20">
                      <div className="flex gap-2">
                          {isAdmin && (
                              deleteConfirm ? (
                                  <div className="flex items-center gap-2 animate-in slide-in-from-left-5">
                                      <span className="text-xs text-red-600 font-bold">ยืนยันลบ?</span>
                                      <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 font-bold">ใช่, ลบเลย</button>
                                      <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-300">ยกเลิก</button>
                                  </div>
                              ) : (
                                  <button onClick={() => setDeleteConfirm(true)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-5 h-5"/></button>
                              )
                          )}
                      </div>

                      <div className="flex gap-3">
                          {isAdmin && (
                              isEditing ? (
                                  <>
                                      <button onClick={() => { setIsEditing(false); setEditForm({}); }} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-700">ยกเลิก</button>
                                      <button onClick={handleSaveEdit} disabled={isSaving} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-green-200">
                                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} บันทึก
                                      </button>
                                  </>
                              ) : (
                                  <button onClick={startEdit} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 flex items-center gap-2">
                                      <Edit2 className="w-4 h-4"/> แก้ไข
                                  </button>
                              )
                          )}
                          
                          {!selectedMatch.winner && (
                              <button 
                                  onClick={() => {
                                      const tA = teams.find(t => t.name === getTeamName(selectedMatch.teamA)) || { id: 'tempA', name: getTeamName(selectedMatch.teamA), color: '#2563EB', shortName: 'A' } as Team;
                                      const tB = teams.find(t => t.name === getTeamName(selectedMatch.teamB)) || { id: 'tempB', name: getTeamName(selectedMatch.teamB), color: '#E11D48', shortName: 'B' } as Team;
                                      onStartMatch(tA, tB, selectedMatch.id);
                                  }}
                                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 animate-pulse"
                              >
                                  <PlayCircle className="w-5 h-5" /> เริ่มแข่ง
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ScheduleList;
