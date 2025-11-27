

import React, { useState, useRef, useEffect } from 'react';
import { Match, Team, Player, AppSettings, KickResult } from '../types';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy, Plus, X, Save, Loader2, Search, ChevronDown, Check, Share2, Edit2, Trash2, AlertTriangle, User, ListPlus, PlusCircle, Users, ArrowRight, PlayCircle, ClipboardCheck, RotateCcw } from 'lucide-react';
import { scheduleMatch, deleteMatch, saveMatchToSheet } from '../services/sheetService';
import { shareMatch } from '../services/liffService';

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
        <div className="fixed inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{title || "เลือกทีม"}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
                </div>
                <div className="p-3 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                            placeholder="ค้นหาชื่อทีม..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    {filtered.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {filtered.map(t => (
                                <button 
                                    key={t.id} 
                                    onClick={() => { onSelect(t); onClose(); }}
                                    className="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-xl transition text-left group border border-transparent hover:border-indigo-100"
                                >
                                    {t.logoUrl ? (
                                        <img src={t.logoUrl} className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-100 p-0.5" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-sm">
                                            {t.name.substring(0,1)}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-800 group-hover:text-indigo-700">{t.name}</div>
                                        {t.group && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Group {t.group}</span>}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">ไม่พบทีมที่ค้นหา</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ScheduleList: React.FC<ScheduleListProps> = ({ matches, teams, players = [], onBack, isAdmin, isLoading, onRefresh, showNotification, onStartMatch, config, initialMatchId }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [matchToReset, setMatchToReset] = useState<string | null>(null);
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  const [activeMatchType, setActiveMatchType] = useState<'group' | 'knockout' | 'custom'>('group');
  
  const [matchForm, setMatchForm] = useState({ id: '', teamA: '', teamB: '', date: '', time: '', venue: '', roundLabel: 'Group A' });
  const [bulkMatches, setBulkMatches] = useState<Array<{ tempId: string, teamA: string, teamB: string, time: string, venue: string }>>([]);

  const [quickScoreA, setQuickScoreA] = useState('');
  const [quickScoreB, setQuickScoreB] = useState('');
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  const [isEditResultOpen, setIsEditResultOpen] = useState(false);
  const [editResultForm, setEditResultForm] = useState({ matchId: '', teamA: '', teamB: '', scoreA: '', scoreB: '' });

  const [selectorConfig, setSelectorConfig] = useState<{ 
      isOpen: boolean; 
      mode: 'singleA' | 'singleB' | 'bulkA' | 'bulkB'; 
      rowIndex?: number; 
      currentValue?: string;
  }>({ isOpen: false, mode: 'singleA' });

  useEffect(() => {
    if (initialMatchId && matches.length > 0) {
        const found = matches.find(m => m.id === initialMatchId);
        if (found) setSelectedMatch(found);
    }
  }, [initialMatchId, matches]);

  useEffect(() => {
    if (selectedMatch) {
        setQuickScoreA(selectedMatch.scoreA?.toString() || '');
        setQuickScoreB(selectedMatch.scoreB?.toString() || '');
    } else {
        setQuickScoreA('');
        setQuickScoreB('');
    }
  }, [selectedMatch]);

  const scheduledMatches = matches.filter(m => !m.winner).sort((a, b) => new Date(a.scheduledTime || a.date).getTime() - new Date(b.scheduledTime || b.date).getTime());
  const finishedMatches = matches.filter(m => m.winner).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Helper function to resolve team object from ID or Name or Object
  const resolveTeam = (t: string | Team | null | undefined): Team => {
    // Safely handle null/undefined
    if (!t) return { id: 'unknown', name: 'Unknown Team', shortName: 'N/A', color: '#94a3b8', logoUrl: '' } as Team;
    
    // If it's already a Team object, return it
    if (typeof t === 'object' && 'name' in t) return t as Team;
    
    // If string, try to find in availableTeams, otherwise mock a basic team object
    const teamName = typeof t === 'string' ? t : 'Unknown';
    return teams.find(team => team.name === teamName) || { 
        id: 'temp', 
        name: teamName, 
        color: '#94a3b8', 
        logoUrl: '',
        shortName: teamName.substring(0, 3).toUpperCase()
    } as Team;
  };

  const formatDate = (dateStr: string) => { try { return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }); } catch(e) { return dateStr; } };
  const formatTime = (dateStr: string) => { try { return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); } catch(e) { return ''; } };

  const handleOpenAdd = () => { 
      const today = new Date().toISOString().split('T')[0];
      setMatchForm({ id: '', teamA: '', teamB: '', date: today, time: '09:00', venue: '', roundLabel: 'Group A' });
      setBulkMatches([{ tempId: Date.now().toString(), teamA: '', teamB: '', time: '09:00', venue: '' }]);
      setActiveMatchType('group');
      setIsAddModalOpen(true); 
  };
  
  const handleEditMatch = (e: React.MouseEvent, match: Match) => { 
      e.stopPropagation(); 
      const dateObj = new Date(match.scheduledTime || match.date); 
      
      const label = match.roundLabel || '';
      let type: 'group' | 'knockout' | 'custom' = 'custom';
      let uiLabel = label;

      if (label.match(/^Group\s+[A-H]/i) || label.includes('กลุ่ม')) {
          type = 'group';
          if (label.includes(':')) {
              uiLabel = label.split(':')[0].trim();
          }
      }
      else if (label.match(/round|final|qf|sf|ชิง|place/i)) type = 'knockout';

      setMatchForm({ 
          id: match.id, 
          teamA: typeof match.teamA === 'string' ? match.teamA : match.teamA.name, 
          teamB: typeof match.teamB === 'string' ? match.teamB : match.teamB.name, 
          date: dateObj.toISOString().split('T')[0], 
          time: dateObj.toTimeString().slice(0, 5), 
          venue: match.venue || '', 
          roundLabel: uiLabel 
      }); 
      
      setActiveMatchType(type);
      setIsAddModalOpen(true); 
  };

  const handleOpenEditResult = (e: React.MouseEvent, match: Match) => {
      e.stopPropagation();
      setEditResultForm({
          matchId: match.id,
          teamA: typeof match.teamA === 'string' ? match.teamA : match.teamA.name,
          teamB: typeof match.teamB === 'string' ? match.teamB : match.teamB.name,
          scoreA: match.scoreA.toString(),
          scoreB: match.scoreB.toString()
      });
      setIsEditResultOpen(true);
  };

  const handleSaveEditedResult = async () => {
      setIsSaving(true);
      try {
          const sA = parseInt(editResultForm.scoreA);
          const sB = parseInt(editResultForm.scoreB);
          
          if (isNaN(sA) || isNaN(sB)) {
              if (showNotification) showNotification("ข้อมูลไม่ถูกต้อง", "กรุณากรอกคะแนนเป็นตัวเลข", "warning");
              setIsSaving(false);
              return;
          }

          let winnerName = null;
          if (sA > sB) winnerName = editResultForm.teamA;
          else if (sB > sA) winnerName = editResultForm.teamB;

          const payload: any = {
            matchId: editResultForm.matchId,
            teamA: resolveTeam(editResultForm.teamA),
            teamB: resolveTeam(editResultForm.teamB),
            scoreA: sA,
            scoreB: sB,
            winner: winnerName ? (winnerName === editResultForm.teamA ? 'A' : 'B') : null,
            kicks: [], 
            isFinished: true
        };

        await saveMatchToSheet(payload, "Result Edited (Admin)");
        
        if(showNotification) showNotification("สำเร็จ", "แก้ไขผลการแข่งขันเรียบร้อย", "success");
        setIsEditResultOpen(false);
        if(onRefresh) onRefresh();

      } catch (e) {
          console.error(e);
          if(showNotification) showNotification("ผิดพลาด", "บันทึกไม่สำเร็จ", "error");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteMatch = async () => { 
      if(!matchToDelete) return; 
      setIsDeleting(true); 
      try { 
          await deleteMatch(matchToDelete); 
          if(showNotification) showNotification("สำเร็จ", "ลบตารางแข่งเรียบร้อย", "success"); 
          setMatchToDelete(null); 
          if(onRefresh) onRefresh(); 
      } catch(e) { 
          if(showNotification) showNotification("ผิดพลาด", "ลบไม่สำเร็จ", "error"); 
      } finally { 
          setIsDeleting(false); 
      } 
  };
  
  const handleResetMatch = async () => {
      if(!matchToReset) return;
      setIsDeleting(true); 
      try {
          const match = matches.find(m => m.id === matchToReset);
          if (!match) throw new Error("Match not found");

          const payload: any = {
              matchId: match.id,
              teamA: resolveTeam(match.teamA),
              teamB: resolveTeam(match.teamB),
              scoreA: 0,
              scoreB: 0,
              winner: null, 
              roundLabel: match.roundLabel,
              status: 'Scheduled', 
              kicks: [],
              isFinished: false
          };

          await saveMatchToSheet({
               ...payload,
               scoreA: 0, scoreB: 0, winner: null
          }, ""); 
          
          await scheduleMatch(
              match.id, 
              typeof match.teamA === 'string' ? match.teamA : match.teamA.name,
              typeof match.teamB === 'string' ? match.teamB : match.teamB.name,
              match.roundLabel || '',
              match.venue,
              match.scheduledTime
          );

          if(showNotification) showNotification("สำเร็จ", "รีเซ็ตผลการแข่งขันเรียบร้อย", "success");
          setMatchToReset(null);
          if(onRefresh) onRefresh();

      } catch (e) {
          console.error(e);
          if(showNotification) showNotification("ผิดพลาด", "รีเซ็ตไม่สำเร็จ", "error");
      } finally {
          setIsDeleting(false);
      }
  };

  const generateUniqueLabel = (groupLabel: string, tA: string, tB: string) => {
      const groupName = groupLabel.replace('Group ', '').trim();
      const teamAObj = teams.find(t => t.name === tA);
      const teamBObj = teams.find(t => t.name === tB);
      return `Group ${groupName}: ${teamAObj?.shortName || tA} vs ${teamBObj?.shortName || tB}`;
  };

  const handleSaveMatch = async () => { 
      setIsSaving(true); 
      try { 
          if (matchForm.id) {
              if (!matchForm.teamA || !matchForm.teamB || !matchForm.date || !matchForm.time) throw new Error("Missing Fields");
               
               let finalLabel = matchForm.roundLabel;
               if (activeMatchType === 'group') {
                   finalLabel = generateUniqueLabel(matchForm.roundLabel, matchForm.teamA, matchForm.teamB);
               }

               await scheduleMatch(
                  matchForm.id, 
                  matchForm.teamA, 
                  matchForm.teamB, 
                  finalLabel, 
                  matchForm.venue, 
                  new Date(`${matchForm.date}T${matchForm.time}`).toISOString()
              );
          } else {
              if (activeMatchType === 'group') {
                  for (const m of bulkMatches) {
                       if (!m.teamA || !m.teamB || !m.time) continue;
                       
                       const newId = `M_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                       const uniqueLabel = generateUniqueLabel(matchForm.roundLabel, m.teamA, m.teamB);

                       await scheduleMatch(
                          newId, 
                          m.teamA, 
                          m.teamB, 
                          uniqueLabel, 
                          m.venue, 
                          new Date(`${matchForm.date}T${m.time}`).toISOString()
                      );
                      await new Promise(r => setTimeout(r, 100));
                  }
              } else {
                  const newId = `M_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                  await scheduleMatch(
                      newId, 
                      matchForm.teamA, 
                      matchForm.teamB, 
                      matchForm.roundLabel, 
                      matchForm.venue, 
                      new Date(`${matchForm.date}T${matchForm.time}`).toISOString()
                  );
              }
          }

          if (showNotification) showNotification("สำเร็จ", "บันทึกข้อมูลเรียบร้อย", "success"); 
          setIsAddModalOpen(false); 
          if(onRefresh) onRefresh(); 
      } catch(e) { if (showNotification) showNotification("ผิดพลาด", "กรุณากรอกข้อมูลให้ครบถ้วน", "error"); } finally { setIsSaving(false); } 
  };

  const handleQuickSaveResult = async () => {
    if (!selectedMatch) return;
    if (quickScoreA === '' || quickScoreB === '') {
        if (showNotification) showNotification("แจ้งเตือน", "กรุณากรอกคะแนนทั้งสองฝั่ง", "warning");
        return;
    }

    setIsQuickSaving(true);
    try {
        const sA = parseInt(quickScoreA);
        const sB = parseInt(quickScoreB);
        const tA = resolveTeam(selectedMatch.teamA);
        const tB = resolveTeam(selectedMatch.teamB);

        let winnerName = null;
        if (sA > sB) winnerName = tA.name;
        else if (sB > sA) winnerName = tB.name;

        const payload: any = {
            matchId: selectedMatch.id,
            teamA: tA,
            teamB: tB,
            scoreA: sA,
            scoreB: sB,
            winner: sA > sB ? 'A' : sB > sA ? 'B' : null,
            kicks: [], 
            isFinished: true
        };

        await saveMatchToSheet(payload, "Quick Result (Admin)");
        if (showNotification) showNotification("สำเร็จ", "บันทึกผลการแข่งขันเรียบร้อย", "success");
        if (onRefresh) onRefresh();
        setSelectedMatch(null);
    } catch (e) {
        if (showNotification) showNotification("ผิดพลาด", "บันทึกผลไม่สำเร็จ", "error");
        console.error(e);
    } finally {
        setIsQuickSaving(false);
    }
  };
  
  const handleShare = (e: React.MouseEvent, match: Match) => { e.stopPropagation(); const tA = resolveTeam(match.teamA); const tB = resolveTeam(match.teamB); shareMatch(match, tA.name, tB.name, tA.logoUrl, tB.logoUrl); };

  const handleStart = (e: React.MouseEvent, match: Match) => {
    e.stopPropagation();
    const tA = resolveTeam(match.teamA);
    const tB = resolveTeam(match.teamB);
    onStartMatch(tA, tB, match.id);
  };

  const setGroupRound = (group: string) => {
      const newLabel = `Group ${group}`;
      setMatchForm(prev => ({ ...prev, roundLabel: newLabel }));
      setBulkMatches(prev => prev.map(m => ({ ...m, teamA: '', teamB: '' })));
  };

  // Helper for Age Calculation
  const calculateAge = (birthDateString?: string) => { 
      if (!birthDateString) return '-'; 
      const parts = birthDateString.split('/'); 
      let birthDate: Date; 
      if (parts.length === 3) { 
          birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])); 
      } else { 
          birthDate = new Date(birthDateString); 
      } 
      if (isNaN(birthDate.getTime())) return '-'; 
      const today = new Date(); 
      let age = today.getFullYear() - birthDate.getFullYear(); 
      const m = today.getMonth() - birthDate.getMonth(); 
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { 
          age--; 
      } 
      return age; 
  };

  const renderRoster = (teamName: string) => {
      const team = teams.find(t => t.name === teamName);
      if (!team) return <div className="text-center text-slate-400 py-4">ไม่พบข้อมูลทีม</div>;
      const roster = players.filter(p => p.teamId === team.id);
      
      return (
          <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {team.logoUrl && <img src={team.logoUrl} className="w-8 h-8 object-contain" />}
                  <div>
                      <div className="font-bold text-slate-800 text-sm">{team.name}</div>
                      <div className="text-xs text-slate-500">{team.managerName ? `ผจก: ${team.managerName}` : ''}</div>
                  </div>
              </div>
              
              {roster.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                      {roster.map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition">
                              {/* Photo - Optimized size for check */}
                              <div className="w-16 h-20 bg-slate-200 rounded-md overflow-hidden shrink-0 border border-slate-200">
                                   {p.photoUrl ? (
                                      <img src={p.photoUrl} className="w-full h-full object-cover" />
                                   ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                                          <User className="w-6 h-6" />
                                      </div>
                                   )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xl font-black text-indigo-700 font-mono italic">#{p.number}</span>
                                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{p.position || 'Player'}</span>
                                  </div>
                                  <div className="font-bold text-slate-800 text-sm truncate leading-tight mb-1">{p.name}</div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                      <span>เกิด: {p.birthDate || '-'}</span>
                                      <span className="bg-indigo-50 text-indigo-600 px-1 rounded font-bold">อายุ {calculateAge(p.birthDate)}</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : <div className="text-center text-slate-400 text-xs py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">ไม่มีรายชื่อนักกีฬา</div>}
          </div>
      );
  };

  const currentGroup = activeMatchType === 'group' && matchForm.roundLabel.startsWith('Group ') 
    ? matchForm.roundLabel.replace('Group ', '').trim() 
    : null;

  const getFilteredTeams = (excludeName?: string) => {
    return teams.filter(t => {
        if (excludeName && t.name === excludeName) return false;
        if (currentGroup) {
            if (t.group?.toUpperCase() !== currentGroup.toUpperCase()) return false;
        }
        return true;
    });
  };

  const openTeamSelector = (mode: 'singleA' | 'singleB' | 'bulkA' | 'bulkB', rowIndex?: number, currentVal?: string) => {
      setSelectorConfig({ isOpen: true, mode, rowIndex, currentValue: currentVal });
  };

  const handleTeamSelect = (team: Team) => {
      const { mode, rowIndex } = selectorConfig;
      if (mode === 'singleA') setMatchForm(prev => ({ ...prev, teamA: team.name }));
      else if (mode === 'singleB') setMatchForm(prev => ({ ...prev, teamB: team.name }));
      else if (mode === 'bulkA' && typeof rowIndex === 'number') {
          updateBulkRow(rowIndex, 'teamA', team.name);
      }
      else if (mode === 'bulkB' && typeof rowIndex === 'number') {
          updateBulkRow(rowIndex, 'teamB', team.name);
      }
  };

  const addBulkRow = () => {
      const last = bulkMatches[bulkMatches.length - 1];
      setBulkMatches([...bulkMatches, {
          tempId: Date.now().toString(),
          teamA: '',
          teamB: '',
          time: last ? last.time : '09:00',
          venue: last ? last.venue : ''
      }]);
  };

  const removeBulkRow = (idx: number) => {
      if (bulkMatches.length > 1) {
          setBulkMatches(bulkMatches.filter((_, i) => i !== idx));
      }
  };

  const updateBulkRow = (idx: number, field: keyof typeof bulkMatches[0], value: string) => {
      const newRows = [...bulkMatches];
      newRows[idx] = { ...newRows[idx], [field]: value };
      setBulkMatches(newRows);
  };

  const TeamSelectionButton = ({ value, placeholder, onClick, disabled }: { value: string, placeholder: string, onClick: () => void, disabled?: boolean }) => {
      const team = teams.find(t => t.name === value);
      return (
        <button 
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full p-2.5 border rounded-lg flex items-center justify-between text-left transition ${disabled ? 'bg-slate-50 opacity-50 cursor-not-allowed' : 'bg-white hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100'}`}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                {team ? (
                    <>
                        {team.logoUrl ? <img src={team.logoUrl} className="w-6 h-6 rounded-md object-contain border border-slate-100 p-0.5" /> : <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-500">{team.name.substring(0,1)}</div>}
                        <span className="font-bold text-slate-700 truncate text-sm">{team.name}</span>
                    </>
                ) : (
                    <span className="text-slate-400 text-sm flex items-center gap-1"><Users className="w-4 h-4"/> {placeholder}</span>
                )}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-300" />
        </button>
      );
  };

  // Helper to get scorers
  const getScorers = (match: Match, teamName: string) => {
      if (!match.kicks) return [];
      // Note: In saveMatchToSheet, teamId is saved as the team NAME.
      // So we filter by k.teamId === teamName, or if using old data, check both ID and Name.
      return match.kicks.filter(k => 
          (k.teamId === teamName || k.teamId === 'A' || k.teamId === 'B') && 
          k.result === KickResult.GOAL
      );
  };

  const renderScorers = (match: Match, teamName: string, side: 'A' | 'B') => {
      const scorers = getScorers(match, teamName).filter(k => {
           // Double check filtering if both A and B are mixed in legacy data
           if (k.teamId === 'A' && side === 'A') return true;
           if (k.teamId === 'B' && side === 'B') return true;
           if (k.teamId === teamName) return true;
           return false;
      });

      if (scorers.length === 0) return <div className="text-xs text-slate-300 italic text-center py-2">-</div>;

      return (
          <div className="space-y-1">
              {scorers.map((k, i) => (
                  <div key={i} className="text-xs text-slate-600 flex items-center gap-1">
                      <span className="w-4 text-slate-400 text-[10px] text-right">{k.round}'</span>
                      <span className="font-medium truncate">{String(k.player || '').split('(')[0]}</span>
                  </div>
              ))}
          </div>
      );
  };


  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24">
      
      {/* Team Selector Modal */}
      <TeamSelectorModal 
        isOpen={selectorConfig.isOpen}
        onClose={() => setSelectorConfig(prev => ({ ...prev, isOpen: false }))}
        onSelect={handleTeamSelect}
        teams={getFilteredTeams(
            selectorConfig.mode === 'singleA' ? matchForm.teamB : 
            selectorConfig.mode === 'singleB' ? matchForm.teamA :
            selectorConfig.mode === 'bulkA' && typeof selectorConfig.rowIndex === 'number' ? bulkMatches[selectorConfig.rowIndex].teamB :
            selectorConfig.mode === 'bulkB' && typeof selectorConfig.rowIndex === 'number' ? bulkMatches[selectorConfig.rowIndex].teamA : undefined
        )}
        title={selectorConfig.mode.includes('A') ? "เลือกทีมเหย้า" : "เลือกทีมเยือน"}
      />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4"><button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition text-slate-600"><ArrowLeft className="w-5 h-5" /></button><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-6 h-6 text-blue-600" /> ตารางการแข่งขัน</h1></div>
            {isAdmin && <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition font-bold text-sm"><Plus className="w-4 h-4" /> เพิ่มคู่แข่ง</button>}
        </div>

        <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-700 mb-4 px-2 border-l-4 border-blue-500">โปรแกรมการแข่งขัน</h2>
            <div className="space-y-3">
                {isLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-xl shadow-sm p-4 h-24 animate-pulse"></div>) : scheduledMatches.length === 0 ? <div className="bg-white p-6 rounded-xl shadow-sm text-center text-slate-400 border border-slate-200">ไม่มีโปรแกรมการแข่งขันที่กำลังจะมาถึง</div> : scheduledMatches.map(match => {
                        const tA = resolveTeam(match.teamA); const tB = resolveTeam(match.teamB);
                        return (
                            <div key={match.id} onClick={() => setSelectedMatch(match)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col items-center gap-4 hover:shadow-md transition relative cursor-pointer">
                                <div className="flex flex-col md:flex-row items-center w-full gap-4"><div className="flex flex-col items-center md:items-start min-w-[120px] text-slate-500 text-sm"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(match.scheduledTime || match.date)}</span>{match.scheduledTime && <span className="flex items-center gap-1 text-indigo-600 font-bold"><Clock className="w-3 h-3" /> {formatTime(match.scheduledTime)}</span>}</div><div className="flex-1 flex items-center justify-center gap-4 w-full"><div className="flex items-center justify-end gap-3 flex-1"><span className="font-bold text-slate-800 text-lg truncate">{tA.name}</span>{tA.logoUrl ? <img src={tA.logoUrl} className="w-8 h-8 object-contain rounded bg-slate-50"/> : <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">A</div>}</div><div className="px-3 py-1 bg-slate-100 rounded text-xs text-slate-500 font-bold whitespace-nowrap">VS</div><div className="flex items-center justify-start gap-3 flex-1">{tB.logoUrl ? <img src={tB.logoUrl} className="w-8 h-8 object-contain rounded bg-slate-50"/> : <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs font-bold">B</div>}<span className="font-bold text-slate-800 text-lg truncate">{tB.name}</span></div></div><div className="min-w-[150px] flex flex-col items-center md:items-end text-sm gap-1"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">{match.roundLabel?.split(':')[0] || 'รอบทั่วไป'}</span>{match.venue && <span className="flex items-center gap-1 text-slate-500 text-xs"><MapPin className="w-3 h-3" /> {match.venue}</span>}</div></div>
                                <div className="w-full pt-3 mt-1 border-t border-slate-100 flex justify-end gap-2">
                                    <button onClick={(e) => handleStart(e, match)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-100"><PlayCircle className="w-3 h-3" /> บันทึกผล</button>
                                    <button onClick={(e) => handleShare(e, match)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00B900] hover:bg-[#009900] text-white text-xs font-bold"><Share2 className="w-3 h-3" /> แชร์ LINE</button>
                                    {isAdmin && <><button onClick={(e) => handleEditMatch(e, match)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 text-xs font-bold"><Edit2 className="w-3 h-3" /> แก้ไข</button><button onClick={(e) => { e.stopPropagation(); setMatchToDelete(match.id); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 text-xs font-bold"><Trash2 className="w-3 h-3" /> ลบ</button></>}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>

        <div>
            <h2 className="text-lg font-bold text-slate-700 mb-4 px-2 border-l-4 border-green-500">ผลการแข่งขัน</h2>
            <div className="space-y-3">
                {isLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-4 h-16 animate-pulse"></div>) : finishedMatches.length === 0 ? <div className="bg-white p-6 rounded-xl shadow-sm text-center text-slate-400 border border-slate-200">ยังไม่มีผลการแข่งขัน</div> : finishedMatches.map(match => { const tA = resolveTeam(match.teamA); const tB = resolveTeam(match.teamB); 
                return (
                    <div key={match.id} onClick={() => setSelectedMatch(match)} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center gap-4 opacity-80 hover:opacity-100 transition cursor-pointer">
                        <div className="flex flex-col md:flex-row items-center w-full gap-4">
                            <div className="flex flex-col items-center md:items-start min-w-[120px] text-slate-400 text-xs"><span>{formatDate(match.date)}</span><span>{match.roundLabel?.split(':')[0]}</span></div>
                            <div className="flex-1 flex items-center justify-center gap-4 w-full">
                                <div className={`flex items-center justify-end gap-3 flex-1 ${match.winner === 'A' || match.winner === tA.name ? 'text-green-600' : 'text-slate-600'}`}><span className="font-bold text-lg truncate">{tA.name}</span>{tA.logoUrl && <img src={tA.logoUrl} className="w-6 h-6 object-contain rounded opacity-80"/>}</div>
                                <div className="bg-slate-800 text-white px-4 py-1 rounded-lg font-mono font-bold text-lg shadow-inner">{match.scoreA} - {match.scoreB}</div>
                                <div className={`flex items-center justify-start gap-3 flex-1 ${match.winner === 'B' || match.winner === tB.name ? 'text-green-600' : 'text-slate-600'}`}>{tB.logoUrl && <img src={tB.logoUrl} className="w-6 h-6 object-contain rounded opacity-80"/>}<span className="font-bold text-lg truncate">{tB.name}</span></div>
                            </div>
                            <div className="min-w-[100px] flex justify-end"><Trophy className="w-5 h-5 text-yellow-500" /></div>
                        </div>
                        <div className="w-full pt-3 mt-1 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={(e) => handleShare(e, match)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00B900] hover:bg-[#009900] text-white text-xs font-bold"><Share2 className="w-3 h-3" /> แชร์ผล</button>
                            {isAdmin && (
                                <>
                                    <button onClick={(e) => handleOpenEditResult(e, match)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 text-xs font-bold">
                                        <Edit2 className="w-3 h-3" /> แก้ไขผล
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setMatchToReset(match.id); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 text-xs font-bold">
                                        <RotateCcw className="w-3 h-3" /> รีเซ็ต
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ); 
                })}
            </div>
        </div>

        {/* Match Detail Modal */}
        {selectedMatch && (
            <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedMatch(null)}>
                <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 my-8 relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedMatch(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full z-20"><X className="w-5 h-5" /></button>
                    
                    <div className="bg-indigo-900 p-4 md:p-6 text-white text-center shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-x-10 -translate-y-10 blur-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-500 opacity-20 rounded-full translate-x-10 translate-y-10 blur-3xl"></div>
                        
                        <div className="relative z-10">
                             {config.competitionLogo && (
                                <img src={config.competitionLogo} className="w-10 h-10 md:w-16 md:h-16 mx-auto mb-2 object-contain bg-white rounded-full p-1 shadow-lg" />
                             )}
                             <h3 className="text-xs md:text-lg font-bold opacity-90 tracking-wide mb-3">{selectedMatch.roundLabel?.split(':')[0] || 'การแข่งขัน'}</h3>
                             
                             <div className="flex flex-row items-center justify-between w-full px-2">
                                <div className="flex flex-col items-center flex-1">
                                    {resolveTeam(selectedMatch.teamA).logoUrl ? <img src={resolveTeam(selectedMatch.teamA).logoUrl} className="w-12 h-12 md:w-20 md:h-20 bg-white rounded-xl p-1 object-contain shadow-md" /> : <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl font-bold">A</div>}
                                    <span className="mt-1 font-bold text-xs md:text-xl leading-tight line-clamp-1 max-w-[80px] md:max-w-none">{resolveTeam(selectedMatch.teamA).name}</span>
                                </div>

                                <div className="text-center shrink-0 flex flex-col items-center px-2">
                                    {selectedMatch.winner ? (
                                        <div className="text-2xl md:text-5xl font-mono font-black bg-white/10 border border-white/20 px-3 py-1 md:px-6 md:py-2 rounded-lg backdrop-blur-sm shadow-inner whitespace-nowrap">{selectedMatch.scoreA} - {selectedMatch.scoreB}</div>
                                    ) : (
                                        <div className="text-xl md:text-2xl font-bold text-indigo-200/50 my-1">VS</div>
                                    )}
                                    <div className="mt-1 flex flex-col items-center gap-0.5 text-indigo-200 text-[10px] md:text-xs">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(selectedMatch.scheduledTime || selectedMatch.date)}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatTime(selectedMatch.scheduledTime || selectedMatch.date)} น.</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center flex-1">
                                    {resolveTeam(selectedMatch.teamB).logoUrl ? <img src={resolveTeam(selectedMatch.teamB).logoUrl} className="w-12 h-12 md:w-20 md:h-20 bg-white rounded-xl p-1 object-contain shadow-md" /> : <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl font-bold">B</div>}
                                    <span className="mt-1 font-bold text-xs md:text-xl leading-tight line-clamp-1 max-w-[80px] md:max-w-none">{resolveTeam(selectedMatch.teamB).name}</span>
                                </div>
                             </div>

                             {/* Scorers Section - Displayed only if winner is set and kicks exist */}
                             {selectedMatch.winner && selectedMatch.kicks && selectedMatch.kicks.length > 0 && (
                                 <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                     <div className="text-right border-r border-white/10 pr-4">
                                         {renderScorers(selectedMatch, typeof selectedMatch.teamA === 'string' ? selectedMatch.teamA : selectedMatch.teamA.name, 'A')}
                                     </div>
                                     <div className="text-left pl-4">
                                         {renderScorers(selectedMatch, typeof selectedMatch.teamB === 'string' ? selectedMatch.teamB : selectedMatch.teamB.name, 'B')}
                                     </div>
                                 </div>
                             )}
                        </div>

                        {!selectedMatch.winner && (
                            <button onClick={(e) => handleStart(e, selectedMatch)} className="mt-4 w-full max-w-sm mx-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 md:py-4 rounded-xl font-bold shadow-lg shadow-green-900/20 transition transform hover:scale-105 active:scale-95 text-xs md:text-base">
                                <PlayCircle className="w-4 h-4 md:w-5 md:h-5" /> เริ่มบันทึกผลการแข่งขัน (รายคน)
                            </button>
                        )}
                        
                        {/* Admin Quick Result Section */}
                        {isAdmin && (
                            <div className="mt-6 border-t border-white/20 pt-4 px-2">
                                <div className="text-indigo-200 text-xs font-bold mb-2 flex items-center justify-center gap-2">
                                    <ClipboardCheck className="w-3 h-3" /> ผู้ดูแล: บันทึกผลด่วน (ไม่ต้องระบุคนยิง)
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <input 
                                        type="number" 
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={quickScoreA}
                                        onChange={(e) => setQuickScoreA(e.target.value)}
                                        className="w-16 p-2 text-center rounded-lg text-slate-900 font-bold"
                                    />
                                    <span className="text-white font-bold">:</span>
                                    <input 
                                        type="number" 
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={quickScoreB}
                                        onChange={(e) => setQuickScoreB(e.target.value)}
                                        className="w-16 p-2 text-center rounded-lg text-slate-900 font-bold"
                                    />
                                    <button 
                                        onClick={handleQuickSaveResult}
                                        disabled={isQuickSaving}
                                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                                    >
                                        {isQuickSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "บันทึกผล"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 md:p-6 bg-slate-50 overflow-y-auto flex-1">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm md:text-base"><User className="w-5 h-5 text-indigo-600" /> รายชื่อนักกีฬา</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                            <div className="bg-white p-3 md:p-4 rounded-xl border shadow-sm h-fit">
                                <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Team A</div>
                                {renderRoster(typeof selectedMatch.teamA === 'string' ? selectedMatch.teamA : selectedMatch.teamA.name)}
                            </div>
                            <div className="bg-white p-3 md:p-4 rounded-xl border shadow-sm h-fit">
                                <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Team B</div>
                                {renderRoster(typeof selectedMatch.teamB === 'string' ? selectedMatch.teamB : selectedMatch.teamB.name)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Add/Edit Match Modal */}
        {isAddModalOpen && (
            <div className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto" onClick={() => setIsAddModalOpen(false)}>
                <div className={`bg-white rounded-2xl shadow-2xl p-6 w-full ${activeMatchType === 'group' && !matchForm.id ? 'max-w-4xl' : 'max-w-md'} animate-in zoom-in duration-200 my-8 transition-all relative`} onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-slate-800">{matchForm.id ? 'แก้ไขตาราง' : 'เพิ่มตารางการแข่งขัน'}</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
                    </div>
                    <div className="space-y-4">
                        
                        {/* Match Type Selection UI (Only for Adding) */}
                        {!matchForm.id && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">ประเภทการแข่งขัน</label>
                            <div className="flex bg-white rounded-lg p-1 border border-slate-200 mb-3 shadow-sm">
                                <button onClick={() => setActiveMatchType('group')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${activeMatchType === 'group' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>รอบแบ่งกลุ่ม</button>
                                <button onClick={() => setActiveMatchType('knockout')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${activeMatchType === 'knockout' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>น็อคเอาท์</button>
                                <button onClick={() => setActiveMatchType('custom')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${activeMatchType === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>ทั่วไป</button>
                            </div>

                            {activeMatchType === 'group' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block flex items-center justify-between">
                                        <span>เลือกกลุ่ม</span>
                                        <span className="text-[10px] font-normal text-slate-400">ระบุกลุ่ม A-H</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {['A','B','C','D','E','F','G','H'].map(g => (
                                            <button 
                                                key={g} 
                                                onClick={() => setGroupRound(g)} 
                                                className={`w-9 h-9 rounded-lg border text-sm font-bold transition hover:scale-105 active:scale-95 ${matchForm.roundLabel === `Group ${g}` ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-indigo-600 mt-2 flex items-center gap-1 bg-indigo-50 p-1 rounded"><ListPlus className="w-3 h-3"/> แสดงเฉพาะทีมในกลุ่ม {matchForm.roundLabel.replace('Group ', '')}</p>
                                </div>
                            )}

                            {activeMatchType === 'knockout' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">เลือกรอบการแข่งขัน</label>
                                    <div className="relative">
                                        <select value={matchForm.roundLabel} onChange={e => setMatchForm({...matchForm, roundLabel: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="Round of 32">Round of 32 (32 ทีม)</option>
                                            <option value="Round of 16">Round of 16 (16 ทีม)</option>
                                            <option value="Quarter Final">Quarter Final (8 ทีม)</option>
                                            <option value="Semi Final">Semi Final (รองชนะเลิศ)</option>
                                            <option value="Final">Final (ชิงชนะเลิศ)</option>
                                            <option value="3rd Place">3rd Place (ชิงที่ 3)</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {activeMatchType === 'custom' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อรายการ / รอบ</label>
                                    <input type="text" value={matchForm.roundLabel} onChange={e => setMatchForm({...matchForm, roundLabel: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="เช่น กระชับมิตร, รอบพิเศษ..." />
                                </div>
                            )}
                        </div>
                        )}

                        {/* Date for All / Single */}
                        <div>
                             <label className="text-xs font-bold text-slate-500 mb-1 block">{activeMatchType === 'group' && !matchForm.id ? 'วันที่แข่ง (ใช้ร่วมกัน)' : 'วันที่'}</label>
                             <input type="date" value={matchForm.date} onChange={e => setMatchForm({...matchForm, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                        </div>

                        {/* ======================= */}
                        {/* BULK ADD UI FOR GROUP */}
                        {/* ======================= */}
                        {activeMatchType === 'group' && !matchForm.id ? (
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-slate-100 p-2 grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 text-center">
                                    <div className="col-span-2">เวลา</div>
                                    <div className="col-span-3">ทีมเหย้า</div>
                                    <div className="col-span-3">ทีมเยือน</div>
                                    <div className="col-span-3">สนาม</div>
                                    <div className="col-span-1">ลบ</div>
                                </div>
                                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
                                    <datalist id="venue-list">
                                        {VENUE_OPTIONS.map(v => <option key={v} value={v} />)}
                                    </datalist>
                                    {bulkMatches.map((row, idx) => (
                                        <div key={row.tempId} className="grid grid-cols-12 gap-2 p-2 items-center text-sm">
                                            <div className="col-span-2">
                                                <input type="time" value={row.time} onChange={(e) => updateBulkRow(idx, 'time', e.target.value)} className="w-full p-1 border rounded text-center text-xs" />
                                            </div>
                                            <div className="col-span-3">
                                                <TeamSelectionButton value={row.teamA} placeholder="เหย้า" onClick={() => openTeamSelector('bulkA', idx, row.teamA)} />
                                            </div>
                                            <div className="col-span-3">
                                                 <TeamSelectionButton value={row.teamB} placeholder="เยือน" onClick={() => openTeamSelector('bulkB', idx, row.teamB)} />
                                            </div>
                                            <div className="col-span-3">
                                                <input type="text" list="venue-list" value={row.venue} onChange={(e) => updateBulkRow(idx, 'venue', e.target.value)} className="w-full p-1.5 border rounded text-xs" placeholder="สนาม..." />
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button onClick={() => removeBulkRow(idx)} className="text-slate-300 hover:text-red-500 disabled:opacity-30" disabled={bulkMatches.length <= 1}><X className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-50 p-2 text-center">
                                    <button onClick={addBulkRow} className="text-indigo-600 text-xs font-bold hover:underline flex items-center justify-center gap-1 w-full"><PlusCircle className="w-4 h-4"/> เพิ่มคู่แข่งขันอีก</button>
                                </div>
                            </div>
                        ) : (
                        // =======================
                        // SINGLE MATCH UI (EDIT OR KNOCKOUT/CUSTOM)
                        // =======================
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ทีมเหย้า (Home)</label>
                                    <TeamSelectionButton value={matchForm.teamA} placeholder="เลือกทีม..." onClick={() => openTeamSelector('singleA')} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">ทีมเยือน (Away)</label>
                                    <TeamSelectionButton value={matchForm.teamB} placeholder="เลือกทีม..." onClick={() => openTeamSelector('singleB')} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">เวลา</label>
                                    <input type="time" value={matchForm.time} onChange={e => setMatchForm({...matchForm, time: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">สนามแข่ง</label>
                                    <div className="relative">
                                        <input type="text" list="single-venue-list" value={matchForm.venue} onChange={e => setMatchForm({...matchForm, venue: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" placeholder="สนาม..." />
                                        <datalist id="single-venue-list">
                                            {VENUE_OPTIONS.map(v => <option key={v} value={v} />)}
                                        </datalist>
                                    </div>
                                </div>
                            </div>
                        </>
                        )}

                        <button onClick={handleSaveMatch} disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 mt-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} บันทึกตารางแข่ง
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Result Modal */}
        {isEditResultOpen && (
            <div className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsEditResultOpen(false)}>
                 <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-4 border-b pb-2">
                         <h3 className="font-bold text-lg text-slate-800">แก้ไขผลการแข่งขัน</h3>
                         <button onClick={() => setIsEditResultOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                     </div>
                     <div className="mb-6 flex items-center justify-between gap-4">
                         <div className="text-center flex-1">
                             <div className="font-bold text-slate-700 mb-2 truncate text-sm">{editResultForm.teamA}</div>
                             <input type="number" value={editResultForm.scoreA} onChange={e => setEditResultForm({...editResultForm, scoreA: e.target.value})} className="w-full p-3 border rounded-lg text-center font-bold text-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                         </div>
                         <span className="font-bold text-slate-300 text-xl mt-6">:</span>
                         <div className="text-center flex-1">
                             <div className="font-bold text-slate-700 mb-2 truncate text-sm">{editResultForm.teamB}</div>
                             <input type="number" value={editResultForm.scoreB} onChange={e => setEditResultForm({...editResultForm, scoreB: e.target.value})} className="w-full p-3 border rounded-lg text-center font-bold text-xl bg-slate-50 focus:ring-2 focus:ring-red-500 outline-none" />
                         </div>
                     </div>
                     <button onClick={handleSaveEditedResult} disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                         {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : "บันทึกผลใหม่"}
                     </button>
                 </div>
            </div>
        )}

        {/* Delete / Reset Confirmation Modal */}
        {(matchToDelete || matchToReset) && (
            <div className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setMatchToDelete(null); setMatchToReset(null); }}>
                <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertTriangle className="w-8 h-8" />
                        <h3 className="font-bold text-lg">ยืนยันการ{matchToReset ? 'รีเซ็ต' : 'ลบ'}?</h3>
                    </div>
                    <p className="text-slate-600 mb-6">
                        {matchToReset 
                            ? "การรีเซ็ตจะล้างผลการแข่งขัน คะแนน และผู้ชนะ กลับไปเป็นสถานะ 'รอแข่ง' (Scheduled) แต่จะไม่ลบรายการออกจากตาราง"
                            : "คุณต้องการลบตารางการแข่งขันนี้ใช่หรือไม่?"
                        }
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => { setMatchToDelete(null); setMatchToReset(null); }} disabled={isDeleting} className="flex-1 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50">ยกเลิก</button>
                        <button 
                            onClick={matchToReset ? handleResetMatch : handleDeleteMatch} 
                            disabled={isDeleting} 
                            className={`flex-1 py-2 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${matchToReset ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (matchToReset ? "รีเซ็ตผล" : "ลบรายการ")}
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