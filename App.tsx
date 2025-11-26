import React, { useState, useEffect } from 'react';
import { KickResult, MatchState, Kick, Team, Player, AppSettings, School, NewsItem } from './types';
import MatchSetup from './components/MatchSetup';
import ScoreVisualizer from './components/ScoreVisualizer';
import PenaltyInterface from './components/PenaltyInterface';
import SettingsDialog from './components/SettingsDialog';
import RegistrationForm from './components/RegistrationForm';
import TournamentView from './components/TournamentView';
import StandingsView from './components/StandingsView';
import AdminDashboard from './components/AdminDashboard';
import LoginDialog from './components/LoginDialog';
import PinDialog from './components/PinDialog'; 
import ScheduleList from './components/ScheduleList'; 
import NewsFeed from './components/NewsFeed'; 
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { fetchDatabase, saveMatchToSheet } from './services/sheetService';
import { initializeLiff } from './services/liffService';
import { RefreshCw, Clipboard, Trophy, Settings, UserPlus, LayoutList, BarChart3, Lock, Home, CheckCircle2, XCircle, ShieldAlert, MapPin, Loader2, Undo2, Edit2, Trash2, AlertTriangle, Bell, CalendarDays, WifiOff, ListChecks, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_SETTINGS: AppSettings = {
  competitionName: "การแข่งขันยิงจุดโทษระดับประถมศึกษา",
  competitionLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_the_Ministry_of_Education_of_Thailand.svg/1200px-Emblem_of_the_Ministry_of_Education_of_Thailand.svg.png",
  bankName: "ธนาคาร",
  bankAccount: "-",
  accountName: "-",
  locationName: "-",
  locationLink: "",
  announcement: "",
  adminPin: "1234" 
};

function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  
  // Data State
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [matchesLog, setMatchesLog] = useState<any[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [appConfig, setAppConfig] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Match State
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [pendingMatchSetup, setPendingMatchSetup] = useState<{teamA: Team, teamB: Team, matchId?: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingKick, setEditingKick] = useState<Kick | null>(null);

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPinOpen, setIsPinOpen] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDangerous?: boolean; } | null>(null);

  useEffect(() => {
    loadData();
    initializeLiff(); 
  }, []);

  const showNotification = (title: string, message: string = '', type: ToastType = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const loadData = async () => {
    setIsLoadingData(true);
    setConnectionError(null);
    try {
      const data = await fetchDatabase();
      if (data) {
        setAvailableTeams(data.teams);
        setAvailablePlayers(data.players);
        setMatchesLog(data.matches || []);
        setAppConfig({ ...DEFAULT_SETTINGS, ...data.config }); 
        setSchools(data.schools || []);
        setNewsItems(data.news || []);
      }
    } catch (e: any) {
      console.warn("Database Error", e);
      setConnectionError(e.message);
      showNotification("เชื่อมต่อไม่ได้", e.message, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Triggered when user clicks "Start Match"
  const handleStartMatchRequest = (teamA: Team, teamB: Team, matchId?: string) => {
    setPendingMatchSetup({ teamA, teamB, matchId });
    setIsPinOpen(true); // Open PIN Dialog
  };

  // Triggered when PIN is correct
  const handlePinSuccess = () => {
    if (pendingMatchSetup) {
        const { teamA, teamB, matchId } = pendingMatchSetup;
        setMatchState({ 
            matchId, 
            teamA, 
            teamB, 
            currentRound: 1, 
            currentTurn: 'A', 
            scoreA: 0, 
            scoreB: 0, 
            kicks: [], 
            isFinished: false, 
            winner: null 
        });
        setCurrentView('match');
        setPendingMatchSetup(null);
        setIsPinOpen(false);
        showNotification("เริ่มการแข่งขัน", "เข้าสู่โหมดบันทึกผล", "success");
    }
  };
  
  const checkWinCondition = (state: MatchState): MatchState => {
    const kicksA = state.kicks.filter(k => k.teamId === 'A');
    const kicksB = state.kicks.filter(k => k.teamId === 'B');
    const scoreA = kicksA.filter(k => k.result === KickResult.GOAL).length;
    const scoreB = kicksB.filter(k => k.result === KickResult.GOAL).length;
    const roundsPlayedA = kicksA.length;
    const roundsPlayedB = kicksB.length;
    let newState = { ...state, scoreA, scoreB, winner: null, isFinished: false };

    if (roundsPlayedA <= 5 && roundsPlayedB <= 5) {
      const remainingKicksA = 5 - roundsPlayedA;
      const remainingKicksB = 5 - roundsPlayedB;
      if (scoreA > scoreB + remainingKicksB) { newState.winner = 'A'; newState.isFinished = true; }
      else if (scoreB > scoreA + remainingKicksA) { newState.winner = 'B'; newState.isFinished = true; }
    } else {
      if (roundsPlayedA === roundsPlayedB && roundsPlayedA >= 5) {
          if (scoreA !== scoreB) { newState.winner = scoreA > scoreB ? 'A' : 'B'; newState.isFinished = true; }
      }
    }
    return newState;
  };

  const handleRecordKick = async (player: string, result: KickResult) => {
    if (!matchState || matchState.isFinished) return;
    setIsProcessing(true);
    const newKick: Kick = { id: Date.now().toString(), round: matchState.currentRound, teamId: matchState.currentTurn, player, result, timestamp: Date.now() };
    setMatchState(prev => {
      if (!prev) return null;
      const updatedKicks = [...prev.kicks, newKick];
      let nextState: MatchState = { ...prev, kicks: updatedKicks, currentTurn: prev.currentTurn === 'A' ? 'B' : 'A', currentRound: prev.currentTurn === 'B' ? prev.currentRound + 1 : prev.currentRound };
      nextState = checkWinCondition(nextState);
      if (nextState.isFinished) {
         confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: nextState.winner === 'A' ? ['#2563EB', '#60A5FA'] : ['#E11D48', '#FB7185'] });
         // Check PIN again before Saving? Or assume session is secure. 
         // For UX, auto-save is better if entry was secured.
         setIsSaving(true);
         saveMatchToSheet(nextState, "").then(() => { setIsSaving(false); loadData(); showNotification("บันทึกผลการแข่งขันเรียบร้อย", "", "success"); });
      }
      return nextState;
    });
    setIsProcessing(false);
  };

  const handleUpdateOldKick = (kickId: string, newResult: KickResult, newPlayerName: string) => {
    setMatchState(prev => {
        if (!prev) return null;
        const updatedKicks = prev.kicks.map(k => k.id === kickId ? { ...k, result: newResult, player: newPlayerName } : k);
        let nextState = { ...prev, kicks: updatedKicks };
        nextState = checkWinCondition(nextState);
        return nextState;
    });
    setEditingKick(null);
    showNotification("แก้ไขผลการยิงเรียบร้อย", "", "success");
  };

  const confirmDeleteKick = (kickId: string) => { setConfirmModal({ isOpen: true, title: "ลบรายการนี้?", message: "ยืนยันการลบผลการยิงนี้?", isDangerous: true, onConfirm: () => { handleDeleteKick(kickId); setConfirmModal(null); } }); };
  const handleDeleteKick = (kickId: string) => {
      setMatchState(prev => {
          if (!prev) return null;
          const newKicks = prev.kicks.filter(k => k.id !== kickId);
          const kicksA = newKicks.filter(k => k.teamId === 'A');
          const kicksB = newKicks.filter(k => k.teamId === 'B');
          const currentTurn: 'A' | 'B' = kicksA.length > kicksB.length ? 'B' : 'A';
          const currentRound = Math.floor(newKicks.length / 2) + 1;
          let tempState = { ...prev, kicks: newKicks, currentTurn, currentRound };
          return checkWinCondition(tempState);
      });
      setEditingKick(null);
      showNotification("ลบรายการเรียบร้อย", "", "warning");
  };
  const requestUndoLastKick = () => { if (!matchState || matchState.kicks.length === 0) return; setConfirmModal({ isOpen: true, title: "ยกเลิกการยิงล่าสุด", message: "ต้องการลบผลการยิงลูกล่าสุดใช่หรือไม่?", onConfirm: () => { handleUndoLastKick(); setConfirmModal(null); } }); };
  const handleUndoLastKick = () => { setMatchState(prev => { if (!prev) return null; const newKicks = [...prev.kicks]; newKicks.pop(); const kicksA = newKicks.filter(k => k.teamId === 'A'); const kicksB = newKicks.filter(k => k.teamId === 'B'); const currentTurn: 'A' | 'B' = kicksA.length > kicksB.length ? 'B' : 'A'; const currentRound = Math.floor(newKicks.length / 2) + 1; const tempState = { ...prev, kicks: newKicks, currentTurn, currentRound }; return checkWinCondition(tempState); }); showNotification("ย้อนกลับรายการล่าสุดแล้ว", "", "info"); };
  const resetMatch = () => { setConfirmModal({ isOpen: true, title: "เริ่มแมตช์ใหม่?", message: "ข้อมูลการแข่งขันปัจจุบันจะหายไป ต้องการเริ่มใหม่หรือไม่?", isDangerous: true, onConfirm: () => { setCurrentView('home'); setMatchState(null); setConfirmModal(null); } }); };

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] safe-area-bottom">
        <NavButton view="home" icon={Home} label="หน้าหลัก" />
        <NavButton view="schedule" icon={CalendarDays} label="ตาราง" />
        <NavButton view="standings" icon={ListChecks} label="คะแนน" />
        <NavButton view="tournament" icon={Trophy} label="ผังแข่ง" />
        <NavButton view="admin" icon={isAdmin ? Settings : Lock} label="ระบบ" onClick={isAdmin ? undefined : () => setIsLoginOpen(true)} />
    </div>
  );
  const NavButton = ({ view, icon: Icon, label, onClick }: { view: string, icon: any, label: string, onClick?: () => void }) => {
      const isActive = currentView === view;
      return (
          <button onClick={onClick || (() => setCurrentView(view))} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-16 ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-indigo-200' : ''}`} /><span className="text-[10px] font-bold">{label}</span>
          </button>
      )
  };
  const showBottomNav = currentView !== 'match';

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans pb-24" style={{ fontFamily: "'Kanit', sans-serif" }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={loadData} currentSettings={appConfig} />
      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLogin={() => { setIsAdmin(true); if(currentView !== 'tournament') setCurrentView('admin'); showNotification('เข้าสู่ระบบผู้ดูแลแล้ว'); }} />
      <PinDialog isOpen={isPinOpen} onClose={() => { setIsPinOpen(false); setPendingMatchSetup(null); }} onSuccess={handlePinSuccess} correctPin={appConfig.adminPin || "1234"} title="กรุณากรอกรหัสเริ่มแข่ง" />

      {/* Modals */}
      {confirmModal && confirmModal.isOpen && (<div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in duration-200"><div className={`flex items-center gap-3 mb-4 ${confirmModal.isDangerous ? 'text-red-600' : 'text-slate-700'}`}><AlertTriangle className="w-6 h-6" /><h3 className="font-bold text-lg">{confirmModal.title}</h3></div><p className="text-slate-600 mb-6">{confirmModal.message}</p><div className="flex gap-3"><button onClick={() => setConfirmModal(null)} className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-slate-600">ยกเลิก</button><button onClick={confirmModal.onConfirm} className={`flex-1 py-2 rounded-lg font-bold text-white ${confirmModal.isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>ยืนยัน</button></div></div></div>)}
      {editingKick && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm"><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200"><div className="flex justify-between items-start mb-4"><h3 className="font-bold text-lg text-slate-800">แก้ไขผลการยิง</h3><button onClick={() => confirmDeleteKick(editingKick.id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition" title="ลบรายการนี้"><Trash2 className="w-5 h-5" /></button></div><div className="space-y-4"><div><label className="block text-sm text-slate-500 mb-1">ชื่อผู้เล่น</label><input type="text" className="w-full p-2 border rounded-lg" defaultValue={editingKick.player} id="edit-player-name" /></div><div><label className="block text-sm text-slate-500 mb-1">ผลการยิง</label><select className="w-full p-2 border rounded-lg" defaultValue={editingKick.result} id="edit-kick-result"><option value={KickResult.GOAL}>เข้าประตู (GOAL)</option><option value={KickResult.SAVED}>เซฟได้ (SAVED)</option><option value={KickResult.MISSED}>ยิงพลาด (MISSED)</option></select></div><div className="flex gap-2 pt-4"><button onClick={() => setEditingKick(null)} className="flex-1 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">ยกเลิก</button><button onClick={() => { const name = (document.getElementById('edit-player-name') as HTMLInputElement).value; const res = (document.getElementById('edit-kick-result') as HTMLSelectElement).value as KickResult; handleUpdateOldKick(editingKick.id, res, name); }} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">บันทึก</button></div></div></div></div>)}

      {currentView === 'register' && <RegistrationForm onBack={() => { loadData(); setCurrentView('home'); }} schools={schools} config={appConfig} showNotification={showNotification} />}
      {currentView === 'tournament' && <TournamentView teams={availableTeams} matches={matchesLog} onSelectMatch={handleStartMatchRequest} onBack={() => setCurrentView('home')} isAdmin={isAdmin} onRefresh={loadData} onLoginClick={() => setIsLoginOpen(true)} isLoading={isLoadingData} showNotification={showNotification} />}
      {currentView === 'schedule' && <ScheduleList matches={matchesLog} teams={availableTeams} players={availablePlayers} onBack={() => setCurrentView('home')} isAdmin={isAdmin} isLoading={isLoadingData} onRefresh={loadData} showNotification={showNotification} />}
      {currentView === 'standings' && <StandingsView matches={matchesLog} teams={availableTeams} onBack={() => setCurrentView('home')} isLoading={isLoadingData} />}
      {currentView === 'admin' && isAdmin && <AdminDashboard teams={availableTeams} players={availablePlayers} settings={appConfig} onLogout={() => { setIsAdmin(false); setCurrentView('home'); }} onRefresh={loadData} news={newsItems} showNotification={showNotification} />}

      {currentView === 'home' && (
        <div className="min-h-screen bg-slate-100">
          {connectionError && <div className="bg-red-50 border-b border-red-200 p-3 flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-red-700 text-sm font-bold"><WifiOff className="w-4 h-4" /><span>{connectionError}</span></div><button onClick={loadData} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50">ลองใหม่</button></div>}
          
          <div className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <img src={appConfig.competitionLogo || "https://via.placeholder.com/40"} className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <h1 className="font-bold text-slate-800 truncate max-w-[200px] text-sm sm:text-base">{appConfig.competitionName}</h1>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentView('register')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-indigo-700"><UserPlus className="w-3 h-3" /> สมัครแข่ง</button>
              </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 pb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="relative z-10 max-w-4xl mx-auto">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="bg-white/10 p-4 rounded-full mb-4 backdrop-blur-sm border border-white/20">
                          <img src={appConfig.competitionLogo} className="w-20 h-20 object-contain" onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/100?text=LOGO'}/>
                      </div>
                      <h2 className="text-2xl font-bold mb-2">{appConfig.competitionName}</h2>
                      <p className="text-indigo-200 text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {appConfig.locationName}</p>
                  </div>
                  {appConfig.announcement && (<div className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-md flex items-start gap-3 mb-6"><Bell className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5 animate-pulse" /><div><h3 className="font-bold text-yellow-400 text-sm mb-1">ประกาศสำคัญ</h3><p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{appConfig.announcement}</p></div></div>)}
              </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <MatchSetup 
                      onStart={handleStartMatchRequest} 
                      availableTeams={availableTeams.filter(t => t.status === 'Approved')} 
                      onOpenSettings={() => setIsSettingsOpen(true)}
                      isLoadingData={isLoadingData}
                  />
              </div>
              <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setCurrentView('schedule')} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 hover:bg-indigo-50 transition group"><div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition"><CalendarDays className="w-5 h-5"/></div><span className="text-xs font-bold text-slate-600">โปรแกรมแข่ง</span></button>
                  <button onClick={() => setCurrentView('standings')} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 hover:bg-indigo-50 transition group"><div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 group-hover:scale-110 transition"><ListChecks className="w-5 h-5"/></div><span className="text-xs font-bold text-slate-600">ตารางคะแนน</span></button>
                  <button onClick={() => setCurrentView('tournament')} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 hover:bg-indigo-50 transition group"><div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition"><Trophy className="w-5 h-5"/></div><span className="text-xs font-bold text-slate-600">สายการแข่ง</span></button>
              </div>
              <div><div className="flex items-center justify-between mb-3 px-1"><h3 className="font-bold text-slate-700 text-lg flex items-center gap-2"><div className="w-1 h-6 bg-indigo-600 rounded-full"></div> ข่าวสารล่าสุด</h3></div><NewsFeed news={newsItems} isLoading={isLoadingData} /></div>
          </div>
        </div>
      )}

      {currentView === 'match' && matchState && (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xl"><Trophy className="w-6 h-6 text-indigo-600" /><span>การแข่งขันสด</span></div>
              <div className="flex gap-2"><button onClick={() => setCurrentView('home')} className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"><Home className="w-4 h-4" /> หน้าหลัก</button><button onClick={resetMatch} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500" title="จบการแข่งขัน"><RefreshCw className="w-5 h-5" /></button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><ScoreVisualizer kicks={matchState.kicks} teamId="A" team={matchState.teamA} /><ScoreVisualizer kicks={matchState.kicks} teamId="B" team={matchState.teamB} /></div>
            <div className="text-center py-4 bg-white rounded-xl border border-slate-100 shadow-sm relative"><div className="text-5xl font-black text-slate-800 tracking-tighter">{matchState.scoreA} - {matchState.scoreB}</div><div className="text-sm text-slate-500 font-medium mt-1">รอบที่ {matchState.currentRound}</div>{matchState.kicks.length > 0 && !matchState.isFinished && (<button onClick={requestUndoLastKick} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition flex items-center gap-1 text-xs font-bold" title="ยกเลิกการยิงล่าสุด"><Undo2 className="w-5 h-5" /> <span className="hidden sm:inline">Undo</span></button>)}</div>
            {!matchState.isFinished ? (<div className="flex flex-col gap-6"><PenaltyInterface currentTurn={matchState.currentTurn} team={matchState.currentTurn === 'A' ? matchState.teamA : matchState.teamB} roster={availablePlayers.filter(p => p.teamId === (matchState.currentTurn === 'A' ? matchState.teamA.id : matchState.teamB.id))} onRecordResult={handleRecordKick} isProcessing={isProcessing} /><div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="bg-slate-100 px-4 py-2 font-bold text-slate-600 text-sm flex justify-between items-center"><span>ประวัติการยิง</span><span className="text-xs font-normal text-slate-400">แสดงล่าสุด</span></div><div className="max-h-64 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 sticky top-0"><tr><th className="px-4 py-2">รอบ</th><th className="px-4 py-2">ทีม</th><th className="px-4 py-2">ผู้เล่น</th><th className="px-4 py-2">ผล</th><th className="px-4 py-2 text-right">แก้ไข</th></tr></thead><tbody className="divide-y divide-slate-100">{[...matchState.kicks].reverse().map((kick) => (<tr key={kick.id} className="hover:bg-slate-50"><td className="px-4 py-2 text-slate-400">{kick.round}</td><td className="px-4 py-2 font-bold">{kick.teamId === 'A' ? matchState.teamA.shortName : matchState.teamB.shortName}</td><td className="px-4 py-2">{kick.player}</td><td className="px-4 py-2 flex items-center gap-2">{kick.result === KickResult.GOAL ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> เข้า</span> : kick.result === KickResult.SAVED ? <span className="text-orange-600 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> เซฟ</span> : <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3"/> พลาด</span>}</td><td className="px-4 py-2 text-right"><button onClick={() => setEditingKick(kick)} className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition" title="แก้ไข / ลบ"><Edit2 className="w-4 h-4" /></button></td></tr>))} {matchState.kicks.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-300">ยังไม่มีข้อมูลการยิง</td></tr>}</tbody></table></div></div></div>) : (<div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6 animate-in zoom-in duration-500"><div className="inline-flex p-4 bg-yellow-100 rounded-full mb-2"><Trophy className="w-12 h-12 text-yellow-600" /></div><h2 className="text-4xl font-black text-slate-800">{matchState.winner === 'A' ? matchState.teamA.name : matchState.teamB.name} ชนะ!</h2><div className="flex flex-col gap-3">{isSaving ? <div className="text-center text-sm text-green-600 animate-pulse">กำลังบันทึกลง Google Sheets...</div> : <div className="text-center text-sm text-gray-400">บันทึกผลการแข่งขันเรียบร้อยแล้ว</div>}<button onClick={() => { const header = "Round,Team,Player,Result"; const rows = matchState.kicks.map(k => `${k.round},${k.teamId},${k.player},${k.result}`).join('\n'); navigator.clipboard.writeText(`${header}\n${rows}`); showNotification("คัดลอกข้อมูล CSV แล้ว"); }} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-indigo-200"><Clipboard className="w-5 h-5" /> คัดลอก CSV (Backup)</button><button onClick={() => setCurrentView('home')} className="text-indigo-600 font-medium hover:underline">กลับสู่หน้าหลัก</button><button onClick={requestUndoLastKick} className="text-slate-400 text-sm hover:text-red-500 flex items-center justify-center gap-1 mt-2"><Undo2 className="w-3 h-3" /> แก้ไขผลการยิงลูกสุดท้าย</button></div></div>)}
          </div>
        </div>
      )}
      
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default App;