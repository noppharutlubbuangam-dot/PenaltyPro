
import React, { useState, useEffect } from 'react';
import { KickResult, MatchState, Kick, Team, Player, AppSettings, School, NewsItem, Match, UserProfile, Tournament, MatchEvent, TournamentConfig } from './types';
import MatchSetup from './components/MatchSetup';
import ScoreVisualizer from './components/ScoreVisualizer';
import PenaltyInterface from './components/PenaltyInterface';
import RegularMatchInterface from './components/RegularMatchInterface';
import SettingsDialog from './components/SettingsDialog';
import RegistrationForm from './components/RegistrationForm';
import TournamentView from './components/TournamentView';
import StandingsView from './components/StandingsView';
import AdminDashboard from './components/AdminDashboard';
import LoginDialog from './components/LoginDialog';
import UserLoginDialog from './components/UserLoginDialog';
import PinDialog from './components/PinDialog'; 
import ScheduleList from './components/ScheduleList'; 
import NewsFeed from './components/NewsFeed'; 
import TournamentSelector from './components/TournamentSelector';
import DonationDialog from './components/DonationDialog';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { fetchDatabase, saveMatchToSheet, authenticateUser, saveMatchEventsToSheet } from './services/sheetService';
import { initializeLiff } from './services/liffService';
import { checkSession, logout as authLogout } from './services/authService';
import { RefreshCw, Clipboard, Trophy, Settings, UserPlus, LayoutList, BarChart3, Lock, Home, CheckCircle2, XCircle, ShieldAlert, MapPin, Loader2, Undo2, Edit2, Trash2, AlertTriangle, Bell, CalendarDays, WifiOff, ListChecks, ChevronRight, Share2, Megaphone, Video, Play, LogOut, User, LogIn, Heart, Navigation, Target, ChevronLeft, ArrowLeftRight, Edit3, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

// ... (Constants and helpers remain the same) ...
const DEFAULT_SETTINGS: AppSettings = {
  competitionName: "การแข่งขันยิงจุดโทษระดับประถมศึกษา",
  competitionLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_the_Ministry_of_Education_of_Thailand.svg/1200px-Emblem_of_the_Ministry_of_Education_of_Thailand.svg.png",
  bankName: "ธนาคาร",
  bankAccount: "-",
  accountName: "-",
  locationName: "-",
  locationLink: "",
  announcement: "",
  adminPin: "1234",
  registrationFee: 0,
  fundraisingGoal: 0,
  objectiveTitle: "",
  objectiveDescription: "",
  objectiveImageUrl: ""
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

// Helper for Drive Images
const getDisplayUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com') && url.includes('/view')) {
        const idMatch = url.match(/\/d\/(.*?)\//);
        if (idMatch && idMatch[1]) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
    return url;
};

function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewKey, setViewKey] = useState<number>(0); 
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isUserLoginOpen, setIsUserLoginOpen] = useState(false);

  // ... (State vars) ...
  const [initialMatchId, setInitialMatchId] = useState<string | null>(null);
  const [initialNewsId, setInitialNewsId] = useState<string | null>(null);
  const [initialTeamId, setInitialTeamId] = useState<string | null>(null);
  
  // Registration Editing
  const [editingTeamData, setEditingTeamData] = useState<{team: Team, players: Player[]} | null>(null);

  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [matchesLog, setMatchesLog] = useState<any[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [appConfig, setAppConfig] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [pendingMatchSetup, setPendingMatchSetup] = useState<{teamA: Team, teamB: Team, matchId?: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingKick, setEditingKick] = useState<Kick | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false); 
  const [isPinOpen, setIsPinOpen] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDangerous?: boolean; } | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distanceToVenue, setDistanceToVenue] = useState<string | null>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  
  // Donation Modal
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  // Image Comparer State
  const [activeImageMode, setActiveImageMode] = useState<'before' | 'after'>('before');

  const announcements = appConfig.announcement ? appConfig.announcement.split('|').filter(s => s.trim() !== '') : [];

  const activeTeams = currentTournamentId ? availableTeams.filter(t => t.tournamentId === currentTournamentId || (!t.tournamentId && currentTournamentId === 'default')) : [];
  const activePlayers = currentTournamentId ? availablePlayers.filter(p => p.tournamentId === currentTournamentId || (!p.tournamentId && currentTournamentId === 'default')) : [];
  const activeMatches = currentTournamentId ? matchesLog.filter(m => m.tournamentId === currentTournamentId || (!m.tournamentId && currentTournamentId === 'default')) : [];
  const activeTournament = tournaments.find(t => t.id === currentTournamentId);

  // Tournament Configuration Parsing
  const getTournamentConfig = (): TournamentConfig => {
      try {
          return activeTournament?.config ? JSON.parse(activeTournament.config) : {};
      } catch(e) { return {}; }
  };
  const tConfig = getTournamentConfig();
  const registrationDeadline = tConfig.registrationDeadline;
  
  // Objective Data (Prioritize Tournament Config, Fallback to Global AppConfig for legacy)
  const objectiveData = tConfig.objective?.isEnabled ? {
      title: tConfig.objective.title,
      description: tConfig.objective.description,
      goal: tConfig.objective.goal,
      images: tConfig.objective.images || []
  } : {
      title: appConfig.objectiveTitle,
      description: appConfig.objectiveDescription,
      goal: appConfig.fundraisingGoal,
      images: appConfig.objectiveImageUrl ? [{ id: 'legacy', url: appConfig.objectiveImageUrl, type: 'general' }] : []
  };

  const hasComparisonImages = objectiveData.images.some(i => i.type === 'before') && objectiveData.images.some(i => i.type === 'after');

  // User's own teams in this tournament
  const myTeams = currentUser ? activeTeams.filter(t => t.creatorId === currentUser.userId) : [];

  // ... (useEffect Hooks and Handlers remain essentially the same, just keeping the structure) ...
  useEffect(() => {
    // ... Init logic ...
    const init = async () => {
        await initializeLiff();
        const liffUser = await checkSession(); 
        if (liffUser) {
            try {
                if (liffUser.type === 'line') {
                    const backendUser = await authenticateUser({ authType: 'line', lineUserId: liffUser.userId, displayName: liffUser.displayName, pictureUrl: liffUser.pictureUrl });
                    if (backendUser) { setCurrentUser(backendUser); if (backendUser.role === 'admin') setIsAdmin(true); } else { setCurrentUser(liffUser); }
                } else if (liffUser.role) { setCurrentUser(liffUser); if (liffUser.role === 'admin') setIsAdmin(true); } else { setCurrentUser(liffUser); }
            } catch (e) { console.warn("Backend Auth Sync Failed", e); setCurrentUser(liffUser); }
        }
    };
    loadData();
    init();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
            (error) => console.log("Geolocation error:", error)
        );
    }
    const savedTId = localStorage.getItem('current_tournament_id');
    if (savedTId) setCurrentTournamentId(savedTId);
  }, []);

  // ... (Other useEffects same) ...
  useEffect(() => {
      if (userLocation && appConfig.locationLat && appConfig.locationLng) {
          const dist = calculateDistance(userLocation.lat, userLocation.lng, appConfig.locationLat, appConfig.locationLng);
          setDistanceToVenue(dist);
      }
  }, [userLocation, appConfig.locationLat, appConfig.locationLng]);

  useEffect(() => {
      if (announcements.length > 1) {
          const interval = setInterval(() => setAnnouncementIndex(prev => (prev + 1) % announcements.length), 5000);
          return () => clearInterval(interval);
      }
  }, [announcements.length]);

  useEffect(() => {
      if (!isLoadingData && availableTeams.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const view = params.get('view');
          const id = params.get('id');
          const teamId = params.get('teamId');

          if (view === 'match_detail' && id) {
              setInitialMatchId(id);
              setCurrentView('schedule');
          } else if (view === 'news' && id) {
              setInitialNewsId(id);
              setCurrentView('home'); 
          } else if (view === 'schedule') {
              setCurrentView('schedule');
          } else if (view === 'standings') {
              setCurrentView('standings');
          } else if (view === 'tournament') {
              setCurrentView('tournament');
          } else if (view === 'admin' && teamId) {
              setInitialTeamId(teamId);
              if (!isAdmin) {
                  setIsLoginOpen(true);
                  setCurrentView('admin');
              } else {
                  setCurrentView('admin');
              }
          }
      }
  }, [isLoadingData, availableTeams.length, isAdmin]);

  // ... (Helper Functions) ...
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
        setTournaments(data.tournaments || []);
        
        if (!currentTournamentId) {
            const savedTId = localStorage.getItem('current_tournament_id');
            if (savedTId && data.tournaments.find(t => t.id === savedTId)) {
                setCurrentTournamentId(savedTId);
            } else if (data.tournaments.length === 1) {
                setCurrentTournamentId(data.tournaments[0].id);
            }
        }
      }
    } catch (e: any) {
      console.warn("Database Error", e);
      setConnectionError(e.message);
      showNotification("เชื่อมต่อไม่ได้", e.message, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleRegisterClick = () => { 
      setEditingTeamData(null); 
      if (currentUser) setCurrentView('register'); else setIsUserLoginOpen(true); 
  };
  
  const handleEditMyTeam = (team: Team) => {
      if (registrationDeadline) {
          const deadline = new Date(registrationDeadline);
          if (new Date() > deadline && !isAdmin) { 
              showNotification("ปิดรับสมัครแล้ว", "ไม่สามารถแก้ไขข้อมูลได้เนื่องจากเลยกำหนด", "warning");
              return;
          }
      }
      const teamPlayers = activePlayers.filter(p => p.teamId === team.id);
      setEditingTeamData({ team, players: teamPlayers });
      setCurrentView('register');
  };

  // ... (Match Handlers same) ...
  const handleUserLoginSuccess = (user: UserProfile) => { setCurrentUser(user); if (user.role === 'admin') setIsAdmin(true); if (user.type === 'credentials') localStorage.setItem('penalty_pro_user', JSON.stringify(user)); showNotification("ยินดีต้อนรับ", `สวัสดีคุณ ${user.displayName}`, "success"); };
  const handleLogout = () => { authLogout(); setCurrentUser(null); setIsAdmin(false); showNotification("ออกจากระบบแล้ว"); };
  const startMatchSession = (teamA: Team, teamB: Team, matchId?: string) => { setMatchState({ matchId, teamA, teamB, currentRound: 1, currentTurn: 'A', scoreA: 0, scoreB: 0, kicks: [], events: [], isFinished: false, winner: null, tournamentId: currentTournamentId || 'default' }); setCurrentView('match'); showNotification("เริ่มการแข่งขัน", "เข้าสู่โหมดบันทึกผล", "success"); };
  const handleStartMatchRequest = (teamA: Team, teamB: Team, matchId?: string) => { if (isAdmin || (currentUser && currentUser.role === 'staff')) { startMatchSession(teamA, teamB, matchId); } else { setPendingMatchSetup({ teamA, teamB, matchId }); setIsPinOpen(true); } };
  const handlePinSuccess = () => { if (pendingMatchSetup) { const { teamA, teamB, matchId } = pendingMatchSetup; startMatchSession(teamA, teamB, matchId); setPendingMatchSetup(null); setIsPinOpen(false); } };
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
      if (roundsPlayedA === roundsPlayedB && roundsPlayedA >= 5) { if (scoreA !== scoreB) { newState.winner = scoreA > scoreB ? 'A' : 'B'; newState.isFinished = true; } }
    }
    return newState;
  };
  const handleRecordKick = async (player: string, result: KickResult) => {
    if (!matchState || matchState.isFinished) return;
    setIsProcessing(true);
    const newKick: Kick = { id: Date.now().toString(), round: matchState.currentRound, teamId: matchState.currentTurn, player, result, timestamp: Date.now(), tournamentId: currentTournamentId || 'default' };
    setMatchState(prev => {
      if (!prev) return null;
      const updatedKicks = [...prev.kicks, newKick];
      const nextTurn = prev.currentTurn === 'A' ? 'B' : 'A';
      const nextRound = prev.currentTurn === 'B' ? prev.currentRound + 1 : prev.currentRound;
      let nextState: MatchState = { ...prev, kicks: updatedKicks, currentTurn: nextTurn, currentRound: nextRound };
      nextState = checkWinCondition(nextState);
      if (nextState.isFinished) {
         confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: nextState.winner === 'A' ? ['#2563EB', '#60A5FA'] : ['#E11D48', '#FB7185'] });
         setIsSaving(true);
         Promise.all([ saveMatchToSheet(nextState, "", false, currentTournamentId || 'default') ]).then(() => { setIsSaving(false); loadData(); showNotification("บันทึกผลการแข่งขันเรียบร้อย", "", "success"); });
      }
      return nextState;
    });
    setIsProcessing(false);
  };
  const handleUpdateOldKick = (kickId: string, newResult: KickResult, newPlayerName: string) => { setMatchState(prev => { if (!prev) return null; const updatedKicks = prev.kicks.map(k => k.id === kickId ? { ...k, result: newResult, player: newPlayerName } : k); let nextState = { ...prev, kicks: updatedKicks }; nextState = checkWinCondition(nextState); return nextState; }); setEditingKick(null); showNotification("แก้ไขผลการยิงเรียบร้อย", "", "success"); };
  const confirmDeleteKick = (kickId: string) => { setConfirmModal({ isOpen: true, title: "ลบรายการนี้?", message: "ยืนยันการลบผลการยิงนี้?", isDangerous: true, onConfirm: () => { handleDeleteKick(kickId); setConfirmModal(null); } }); };
  const handleDeleteKick = (kickId: string) => { setMatchState(prev => { if (!prev) return null; const newKicks = prev.kicks.filter(k => k.id !== kickId); const kicksA = newKicks.filter(k => k.teamId === 'A'); const kicksB = newKicks.filter(k => k.teamId === 'B'); const currentTurn: 'A' | 'B' = kicksA.length > kicksB.length ? 'B' : 'A'; const currentRound = Math.floor(newKicks.length / 2) + 1; let tempState = { ...prev, kicks: newKicks, currentTurn, currentRound }; return checkWinCondition(tempState); }); setEditingKick(null); showNotification("ลบรายการเรียบร้อย", "", "warning"); };
  const requestUndoLastKick = () => { if (!matchState || matchState.kicks.length === 0) return; setConfirmModal({ isOpen: true, title: "ยกเลิกการยิงล่าสุด", message: "ต้องการลบผลการยิงลูกล่าสุดใช่หรือไม่?", onConfirm: () => { handleUndoLastKick(); setConfirmModal(null); } }); };
  const handleUndoLastKick = () => { setMatchState(prev => { if (!prev) return null; const newKicks = [...prev.kicks]; newKicks.pop(); const kicksA = newKicks.filter(k => k.teamId === 'A'); const kicksB = newKicks.filter(k => k.teamId === 'B'); const currentTurn: 'A' | 'B' = kicksA.length > kicksB.length ? 'B' : 'A'; const currentRound = Math.floor(newKicks.length / 2) + 1; const tempState = { ...prev, kicks: newKicks, currentTurn, currentRound }; return checkWinCondition(tempState); }); showNotification("ย้อนกลับรายการล่าสุดแล้ว", "", "info"); };
  const resetMatch = () => { setConfirmModal({ isOpen: true, title: "เริ่มแมตช์ใหม่?", message: "ข้อมูลการแข่งขันปัจจุบันจะหายไป ต้องการเริ่มใหม่หรือไม่?", isDangerous: true, onConfirm: () => { setCurrentView('home'); setMatchState(null); setConfirmModal(null); } }); };
  const handleNavClick = (view: string) => { if (view === 'schedule') setInitialMatchId(null); if (currentView === view) setViewKey(prev => prev + 1); else setCurrentView(view); };
  const BottomNav = () => ( <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] safe-area-bottom"> <NavButton view="home" icon={Home} label="หน้าหลัก" /> <NavButton view="schedule" icon={CalendarDays} label="ตาราง" /> <NavButton view="standings" icon={ListChecks} label="คะแนน" /> <NavButton view="tournament" icon={Trophy} label="ผังแข่ง" /> <NavButton view="admin" icon={isAdmin ? Settings : Lock} label="ระบบ" onClick={isAdmin ? undefined : () => setIsLoginOpen(true)} /> </div> );
  const NavButton = ({ view, icon: Icon, label, onClick }: { view: string, icon: any, label: string, onClick?: () => void }) => { const isActive = currentView === view; const handleClick = onClick || (() => handleNavClick(view)); return ( <button onClick={handleClick} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-16 ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}><Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-indigo-200' : ''}`} /><span className="text-[10px] font-bold">{label}</span></button> ) };
  const showBottomNav = currentView !== 'match';
  const resolveTeam = (t: string | Team | null | undefined): Team => { if (!t) return { id: 'unknown', name: 'Unknown Team', shortName: 'N/A', color: '#94a3b8', logoUrl: '' } as Team; if (typeof t === 'object' && 'name' in t) return t as Team; const teamName = typeof t === 'string' ? t : 'Unknown'; return availableTeams.find(team => team.name === teamName) || { id: 'temp', name: teamName, color: '#94a3b8', logoUrl: '', shortName: teamName.substring(0, 3).toUpperCase() } as Team; };
  const approvedTeamsCount = activeTeams.filter(t => t.status === 'Approved').length;
  const estimatedIncome = approvedTeamsCount * (appConfig.registrationFee || 0);
  const fundraisingProgress = objectiveData.goal ? Math.min(100, (estimatedIncome / objectiveData.goal) * 100) : 0;
  const liveMatches = activeMatches.filter(m => m.livestreamUrl && !m.winner);
  const recentFinishedMatches = activeMatches.filter(m => m.winner).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  const handleFinishRegularMatch = async (finalState: MatchState) => { setIsSaving(true); try { await saveMatchToSheet(finalState, '', false, currentTournamentId || 'default'); if (finalState.events && finalState.events.length > 0) { await saveMatchEventsToSheet(finalState.events); } showNotification("บันทึกผลเรียบร้อย", "จบการแข่งขันแล้ว", "success"); loadData(); setCurrentView('home'); } catch (e) { console.error(e); showNotification("ผิดพลาด", "บันทึกไม่สำเร็จ", "error"); } finally { setIsSaving(false); } };
  const handleUpdateRegularMatchState = (state: MatchState) => { };

  if (!currentTournamentId) {
      return (
          <div className="bg-slate-50 min-h-screen font-sans" style={{ fontFamily: "'Kanit', sans-serif" }}>
              <TournamentSelector 
                  tournaments={tournaments} 
                  onSelect={(id) => { setCurrentTournamentId(id); localStorage.setItem('current_tournament_id', id); }} 
                  isAdmin={isAdmin} 
                  onRefresh={loadData}
                  showNotification={showNotification}
                  isLoading={isLoadingData}
              />
              {!isAdmin && tournaments.length === 0 && (<div className="fixed bottom-4 right-4"><button onClick={() => setIsLoginOpen(true)} className="bg-white/50 p-2 rounded-full hover:bg-white transition text-slate-400"><Lock className="w-4 h-4"/></button></div>)}
              <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLogin={() => { setIsAdmin(true); showNotification('เข้าสู่ระบบผู้ดูแลแล้ว'); }} />
          </div>
      );
  }

  if (currentView === 'register') {
      return (
          <RegistrationForm 
            key={viewKey} 
            onBack={() => { loadData(); setCurrentView('home'); setEditingTeamData(null); }} 
            schools={schools} 
            config={appConfig} 
            showNotification={showNotification} 
            user={currentUser} 
            initialData={editingTeamData}
            registrationDeadline={registrationDeadline}
          />
      );
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 font-sans pb-24" style={{ fontFamily: "'Kanit', sans-serif" }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={loadData} currentSettings={appConfig} />
      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLogin={() => { setIsAdmin(true); if(currentView !== 'tournament') setCurrentView('admin'); showNotification('เข้าสู่ระบบผู้ดูแลแล้ว'); }} />
      <PinDialog isOpen={isPinOpen} onClose={() => { setIsPinOpen(false); setPendingMatchSetup(null); }} onSuccess={handlePinSuccess} correctPin={appConfig.adminPin || "1234"} title="กรุณากรอกรหัสเริ่มแข่ง" />
      <UserLoginDialog isOpen={isUserLoginOpen} onClose={() => setIsUserLoginOpen(false)} onLoginSuccess={handleUserLoginSuccess} />
      <DonationDialog isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} config={appConfig} tournamentName={activeTournament?.name || ''} />
      
      {/* ... (Modals remain same) ... */}
      {confirmModal && confirmModal.isOpen && (<div className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setConfirmModal(null)}><div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}><div className={`flex items-center gap-3 mb-4 ${confirmModal.isDangerous ? 'text-red-600' : 'text-slate-700'}`}><AlertTriangle className="w-6 h-6" /><h3 className="font-bold text-lg">{confirmModal.title}</h3></div><p className="text-slate-600 mb-6">{confirmModal.message}</p><div className="flex gap-3"><button onClick={() => setConfirmModal(null)} className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-slate-600">ยกเลิก</button><button onClick={confirmModal.onConfirm} className={`flex-1 py-2 rounded-lg font-bold text-white ${confirmModal.isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>ยืนยัน</button></div></div></div>)}
      {editingKick && activeTournament?.type === 'Penalty' && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1100] p-4 backdrop-blur-sm" onClick={() => setEditingKick(null)}><div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}><div className="flex justify-between items-start mb-4"><h3 className="font-bold text-lg text-slate-800">แก้ไขผลการยิง</h3><button onClick={() => confirmDeleteKick(editingKick.id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition" title="ลบรายการนี้"><Trash2 className="w-5 h-5" /></button></div><div className="space-y-4"><div><label className="block text-sm text-slate-500 mb-1">ชื่อผู้เล่น</label><input type="text" className="w-full p-2 border rounded-lg" defaultValue={editingKick.player} id="edit-player-name" /></div><div><label className="block text-sm text-slate-500 mb-1">ผลการยิง</label><select className="w-full p-2 border rounded-lg" defaultValue={editingKick.result} id="edit-kick-result"><option value={KickResult.GOAL}>เข้าประตู (GOAL)</option><option value={KickResult.SAVED}>เซฟได้ (SAVED)</option><option value={KickResult.MISSED}>ยิงพลาด (MISSED)</option></select></div><div className="flex gap-2 pt-4"><button onClick={() => setEditingKick(null)} className="flex-1 py-2 border rounded-lg text-slate-600 hover:bg-slate-50">ยกเลิก</button><button onClick={() => { const name = (document.getElementById('edit-player-name') as HTMLInputElement).value; const res = (document.getElementById('edit-kick-result') as HTMLSelectElement).value as KickResult; handleUpdateOldKick(editingKick.id, res, name); }} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">บันทึก</button></div></div></div></div>)}

      {/* Views */}
      {currentView === 'tournament' && <TournamentView key={viewKey} teams={activeTeams} matches={activeMatches} onSelectMatch={handleStartMatchRequest} onBack={() => setCurrentView('home')} isAdmin={isAdmin} onRefresh={loadData} onLoginClick={() => setIsLoginOpen(true)} isLoading={isLoadingData} showNotification={showNotification} />}
      {currentView === 'schedule' && ( <ScheduleList key={viewKey} matches={activeMatches} teams={activeTeams} players={activePlayers} onBack={() => setCurrentView('home')} isAdmin={isAdmin} isLoading={isLoadingData} onRefresh={loadData} showNotification={showNotification} onStartMatch={handleStartMatchRequest} config={appConfig} initialMatchId={initialMatchId} /> )}
      {currentView === 'standings' && <StandingsView key={viewKey} matches={activeMatches} teams={activeTeams} onBack={() => setCurrentView('home')} isLoading={isLoadingData} />}
      {currentView === 'admin' && ( <AdminDashboard key={viewKey} teams={activeTeams} players={activePlayers} settings={appConfig} onLogout={() => { setIsAdmin(false); setCurrentView('home'); }} onRefresh={loadData} news={newsItems} showNotification={showNotification} initialTeamId={initialTeamId} currentTournament={activeTournament} /> )}

      {currentView === 'home' && (
        <div className="min-h-screen bg-slate-100">
          {connectionError && <div className="bg-red-50 border-b border-red-200 p-3 flex items-center justify-between gap-4"><div className="flex items-center gap-2 text-red-700 text-sm font-bold"><WifiOff className="w-4 h-4" /><span>{connectionError}</span></div><button onClick={loadData} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50">ลองใหม่</button></div>}
          
          {/* Top Bar */}
          <div className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <img src={appConfig.competitionLogo || "https://via.placeholder.com/40"} className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <h1 className="font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[200px] text-sm sm:text-base">
                      {activeTournament ? activeTournament.name : appConfig.competitionName}
                  </h1>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentTournamentId(null)} className="hidden md:flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 bg-slate-100 px-2 py-1 rounded-full transition">
                      <ArrowLeftRight className="w-3 h-3"/> เปลี่ยนรายการ
                  </button>
                  <button onClick={handleRegisterClick} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-green-700 transition">
                      <UserPlus className="w-3 h-3" /> สมัครแข่ง
                  </button>
                  {currentUser ? (
                      <div className="flex items-center gap-2 pl-2 ml-2 border-l border-slate-200">
                          {currentUser.pictureUrl ? (
                              <img src={currentUser.pictureUrl} className="w-8 h-8 rounded-full border border-slate-200" />
                          ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                  {currentUser.displayName.charAt(0)}
                              </div>
                          )}
                          <button onClick={handleLogout} className="ml-1 text-slate-400 hover:text-red-500"><LogOut className="w-4 h-4" /></button>
                      </div>
                  ) : (
                      <button onClick={() => setIsUserLoginOpen(true)} className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 ml-1">
                          <LogIn className="w-3 h-3" /> เข้าสู่ระบบ
                      </button>
                  )}
              </div>
          </div>

          {/* Banner & Hero */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 pb-12 relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
              <div className="relative z-10 max-w-4xl mx-auto">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="bg-white/10 p-4 rounded-full mb-4 backdrop-blur-sm border border-white/20">
                          <img src={appConfig.competitionLogo} className="w-20 h-20 object-contain" onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/100?text=LOGO'}/>
                      </div>
                      <h2 className="text-2xl font-bold mb-2">{activeTournament ? activeTournament.name : appConfig.competitionName}</h2>
                      <div className="flex items-center gap-2">
                          <span className="text-indigo-200 text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {appConfig.locationName}</span>
                          <button onClick={() => setCurrentTournamentId(null)} className="md:hidden text-xs bg-white/20 px-2 py-1 rounded text-white hover:bg-white/30">เปลี่ยนรายการ</button>
                      </div>
                  </div>
                  
                  {announcements.length > 0 && !isLoadingData && (
                    <div className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur-md flex items-center gap-3 mb-6 relative group">
                        <div className="shrink-0"><Bell className="w-5 h-5 text-yellow-400 animate-pulse" /></div>
                        <div className="flex-1 overflow-hidden relative h-12 flex items-center">
                            {announcements.map((text, idx) => (
                                <p key={idx} className={`text-xs text-slate-200 leading-relaxed absolute w-full transition-opacity duration-500 ${idx === announcementIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                    {text}
                                </p>
                            ))}
                        </div>
                        {announcements.length > 1 && (
                             <div className="flex items-center gap-1">
                                <button onClick={() => setAnnouncementIndex(prev => (prev - 1 + announcements.length) % announcements.length)} className="p-1 hover:bg-white/20 rounded-full text-slate-300 hover:text-white transition"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setAnnouncementIndex(prev => (prev + 1) % announcements.length)} className="p-1 hover:bg-white/20 rounded-full text-slate-300 hover:text-white transition"><ChevronRight className="w-4 h-4" /></button>
                             </div>
                        )}
                    </div>
                  )}
              </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20 space-y-6">
              
              {/* My Teams Section */}
              {currentUser && myTeams.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 animate-in slide-in-from-bottom-2">
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><User className="w-5 h-5 text-indigo-600" /> ทีมของคุณ</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {myTeams.map(t => (
                              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition bg-slate-50">
                                  <div className="flex items-center gap-3">
                                      {t.logoUrl ? <img src={t.logoUrl} className="w-10 h-10 rounded-lg bg-white object-contain" /> : <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center font-bold text-slate-400">{t.shortName}</div>}
                                      <div>
                                          <div className="font-bold text-slate-800">{t.name}</div>
                                          <div className={`text-xs font-bold ${t.status === 'Approved' ? 'text-green-600' : t.status === 'Rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{t.status || 'Pending'}</div>
                                      </div>
                                  </div>
                                  <button onClick={() => handleEditMyTeam(t)} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 font-bold flex items-center gap-1 transition">
                                      <Edit3 className="w-3 h-3" /> แก้ไข
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* Fundraising & Objective Card (New Structure) */}
              {objectiveData.title && (
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                      <div className="flex flex-col">
                          {objectiveData.images.length > 0 && (
                              <div className="w-full bg-slate-100 relative h-64 overflow-hidden">
                                  {hasComparisonImages ? (
                                      <div className="relative w-full h-full">
                                          {/* Simple Toggle View for Comparison */}
                                          <img 
                                            src={getDisplayUrl(objectiveData.images.find(i => i.type === activeImageMode)?.url || '')} 
                                            className="w-full h-full object-cover animate-in fade-in duration-500"
                                          />
                                          <div className="absolute top-2 left-2 flex gap-2">
                                              <button 
                                                onClick={() => setActiveImageMode('before')} 
                                                className={`px-3 py-1 rounded-full text-xs font-bold shadow-md transition ${activeImageMode === 'before' ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-600'}`}
                                              >Before</button>
                                              <button 
                                                onClick={() => setActiveImageMode('after')} 
                                                className={`px-3 py-1 rounded-full text-xs font-bold shadow-md transition ${activeImageMode === 'after' ? 'bg-green-500 text-white' : 'bg-white/80 text-slate-600'}`}
                                              >After</button>
                                          </div>
                                      </div>
                                  ) : (
                                      // General Image Slider or Single
                                      <img src={getDisplayUrl(objectiveData.images[0].url)} className="w-full h-full object-cover" />
                                  )}
                                  
                                  <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
                                      <Heart className="w-3 h-3 fill-white" /> วัตถุประสงค์
                                  </div>
                              </div>
                          )}
                          <div className="p-6">
                              <h3 className="text-xl font-bold text-slate-800 mb-2">{objectiveData.title}</h3>
                              <p className="text-sm text-slate-500 mb-4 whitespace-pre-line">{objectiveData.description}</p>
                              
                              <div className="flex flex-col md:flex-row gap-4 items-end">
                                  <div className="flex-1 w-full">
                                      {objectiveData.goal && objectiveData.goal > 0 && (
                                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                              <div className="flex justify-between items-end mb-2">
                                                  <div>
                                                      <p className="text-xs text-slate-400 mb-1">ยอดสนับสนุนจากค่าสมัคร</p>
                                                      <p className="text-xl font-bold text-indigo-600">฿{estimatedIncome.toLocaleString()}</p>
                                                  </div>
                                                  <div className="text-right">
                                                      <p className="text-xs text-slate-400 mb-1">เป้าหมาย</p>
                                                      <p className="text-sm font-bold text-slate-600">฿{objectiveData.goal.toLocaleString()}</p>
                                                  </div>
                                              </div>
                                              <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1 overflow-hidden">
                                                  <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${fundraisingProgress}%` }}></div>
                                              </div>
                                              <p className="text-[10px] text-slate-400 text-right">{fundraisingProgress.toFixed(1)}%</p>
                                          </div>
                                      )}
                                  </div>
                                  <div className="w-full md:w-auto">
                                      <button 
                                        onClick={() => setIsDonationOpen(true)}
                                        className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 px-6 rounded-xl font-bold shadow-md shadow-pink-200 transition flex items-center justify-center gap-2"
                                      >
                                          <Heart className="w-5 h-5 fill-white" /> ร่วมบริจาค
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Advanced Location Card */}
              {appConfig.locationLink && (
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                              <MapPin className="w-6 h-6" />
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800 text-sm">สถานที่: {appConfig.locationName}</h3>
                              {distanceToVenue ? (
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                      <Target className="w-3 h-3 text-blue-500" /> ห่างจากคุณ {distanceToVenue} กม.
                                  </p>
                              ) : (
                                  <p className="text-xs text-slate-400 mt-0.5">คลิกนำทางเพื่อดูเส้นทาง</p>
                              )}
                          </div>
                      </div>
                      <a 
                          href={appConfig.locationLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition"
                      >
                          <Navigation className="w-4 h-4" /> <span className="hidden sm:inline">นำทาง</span>
                      </a>
                  </div>
              )}

              {/* LIVE SECTION */}
              {liveMatches.length > 0 && (
                <div className="space-y-3">
                   <div className="flex items-center gap-2 text-white font-bold bg-red-600 px-3 py-1 rounded w-fit shadow-md"><span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> LIVE NOW ({liveMatches.length})</div>
                   <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                       {liveMatches.map(m => {
                          const tA = resolveTeam(m.teamA); const tB = resolveTeam(m.teamB);
                          return (
                            <div key={m.id} onClick={() => { setInitialMatchId(m.id); setCurrentView('schedule'); }} className={`bg-white rounded-xl shadow-lg border border-red-100 overflow-hidden cursor-pointer group hover:ring-2 hover:ring-red-400 transition snap-center ${liveMatches.length > 1 ? 'min-w-[85vw] md:min-w-[400px]' : 'w-full'}`}>
                                <div className="aspect-video bg-black relative flex items-center justify-center">
                                    {m.livestreamCover ? <img src={m.livestreamCover} className="w-full h-full object-cover opacity-80" /> : <div className="text-white/20"><Video className="w-12 h-12" /></div>}
                                    <div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition"><Play className="w-6 h-6 fill-white" /></div></div>
                                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE</div>
                                </div>
                                <div className="p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 flex-1 overflow-hidden"><span className="font-bold text-slate-800 text-sm truncate text-right flex-1">{tA.name}</span><div className="text-xs font-bold text-slate-400">VS</div><span className="font-bold text-slate-800 text-sm truncate flex-1">{tB.name}</span></div></div><div className="text-xs text-slate-400 mt-1 text-center">{m.roundLabel}</div></div>
                            </div>
                          )
                       })}
                   </div>
                </div>
              )}

              {/* Match Setup */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  {isLoadingData ? <div className="p-6 space-y-4 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div><div className="h-12 bg-slate-200 rounded w-full"></div></div> : <MatchSetup onStart={handleStartMatchRequest} availableTeams={activeTeams.filter(t => t.status === 'Approved')} onOpenSettings={() => setIsSettingsOpen(true)} isLoadingData={isLoadingData} />}
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-3 gap-3">
                  {[{ view: 'schedule', label: 'โปรแกรมแข่ง', icon: CalendarDays, color: 'blue' }, { view: 'standings', label: 'ตารางคะแนน', icon: ListChecks, color: 'orange' }, { view: 'tournament', label: 'สายการแข่ง', icon: Trophy, color: 'purple' }].map((item, idx) => (
                      <button key={idx} onClick={() => handleNavClick(item.view)} className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 hover:bg-indigo-50 transition group`}>
                          <div className={`w-10 h-10 bg-${item.color}-100 rounded-full flex items-center justify-center text-${item.color}-600 group-hover:scale-110 transition`}><item.icon className="w-5 h-5"/></div><span className="text-xs font-bold text-slate-600">{item.label}</span>
                      </button>
                  ))}
              </div>

              {/* Recent Results */}
              {!isLoadingData && recentFinishedMatches.length > 0 && (
                  <div className="animate-in slide-in-from-bottom-5">
                      <div className="flex items-center justify-between mb-3 px-1"><h3 className="font-bold text-slate-700 text-lg flex items-center gap-2"><div className="w-1 h-6 bg-green-600 rounded-full"></div> ผลการแข่งขันล่าสุด</h3><button onClick={() => setCurrentView('schedule')} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline">ดูทั้งหมด <ChevronRight className="w-3 h-3"/></button></div>
                      <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
                          {recentFinishedMatches.map(m => {
                              const tA = resolveTeam(m.teamA); const tB = resolveTeam(m.teamB);
                              return (
                                  <div key={m.id} onClick={() => { setInitialMatchId(m.id); setCurrentView('schedule'); }} className="min-w-[240px] bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-300 transition">
                                      <div className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{m.roundLabel?.split(':')[0]}</div>
                                      <div className="flex items-center justify-between w-full gap-2"><div className="flex flex-col items-center w-1/3">{tA.logoUrl ? <img src={tA.logoUrl} className="w-8 h-8 object-contain" /> : <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold">A</div>}<span className="text-xs font-bold truncate w-full text-center mt-1">{tA.name}</span></div><div className="text-lg font-black text-indigo-900 bg-slate-100 px-2 py-0.5 rounded">{m.scoreA}-{m.scoreB}</div><div className="flex flex-col items-center w-1/3">{tB.logoUrl ? <img src={tB.logoUrl} className="w-8 h-8 object-contain" /> : <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold">B</div>}<span className="text-xs font-bold truncate w-full text-center mt-1">{tB.name}</span></div></div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {/* News Feed */}
              <div>
                  <div className="flex items-center justify-between mb-3 px-1"><h3 className="font-bold text-slate-700 text-lg flex items-center gap-2"><div className="w-1 h-6 bg-indigo-600 rounded-full"></div> ข่าวสารล่าสุด</h3></div>
                  <NewsFeed news={newsItems} isLoading={isLoadingData} initialNewsId={initialNewsId} />
              </div>
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
            
            {/* Conditional Rendering based on Tournament Type */}
            {activeTournament?.type === 'Penalty' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><ScoreVisualizer kicks={matchState.kicks} teamId="A" team={matchState.teamA} /><ScoreVisualizer kicks={matchState.kicks} teamId="B" team={matchState.teamB} /></div>
                    <div className="text-center py-4 bg-white rounded-xl border border-slate-100 shadow-sm relative"><div className="text-5xl font-black text-slate-800 tracking-tighter">{matchState.scoreA} - {matchState.scoreB}</div><div className="text-sm text-slate-500 font-medium mt-1">รอบที่ {matchState.currentRound}</div>{matchState.kicks.length > 0 && !matchState.isFinished && (<button onClick={requestUndoLastKick} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition flex items-center gap-1 text-xs font-bold" title="ยกเลิกการยิงล่าสุด"><Undo2 className="w-5 h-5" /> <span className="hidden sm:inline">Undo</span></button>)}</div>
                    {!matchState.isFinished ? (<div className="flex flex-col gap-6"><PenaltyInterface currentTurn={matchState.currentTurn} team={matchState.currentTurn === 'A' ? matchState.teamA : matchState.teamB} roster={activePlayers.filter(p => p.teamId === (matchState.currentTurn === 'A' ? matchState.teamA.id : matchState.teamB.id))} onRecordResult={handleRecordKick} isProcessing={isProcessing} /><div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="bg-slate-100 px-4 py-2 font-bold text-slate-600 text-sm flex justify-between items-center"><span>ประวัติการยิง</span><span className="text-xs font-normal text-slate-400">แสดงล่าสุด</span></div><div className="max-h-64 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 sticky top-0"><tr><th className="px-4 py-2">รอบ</th><th className="px-4 py-2">ทีม</th><th className="px-4 py-2">ผู้เล่น</th><th className="px-4 py-2">ผล</th><th className="px-4 py-2 text-right">แก้ไข</th></tr></thead><tbody className="divide-y divide-slate-100">{[...matchState.kicks].reverse().map((kick) => (<tr key={kick.id} className="hover:bg-slate-50"><td className="px-4 py-2 text-slate-400">{kick.round}</td><td className="px-4 py-2 font-bold">{kick.teamId === 'A' ? matchState.teamA.shortName : matchState.teamB.shortName}</td><td className="px-4 py-2">{kick.player}</td><td className="px-4 py-2 flex items-center gap-2">{kick.result === KickResult.GOAL ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> เข้า</span> : kick.result === KickResult.SAVED ? <span className="text-orange-600 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> เซฟ</span> : <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3"/> พลาด</span>}</td><td className="px-4 py-2 text-right"><button onClick={() => setEditingKick(kick)} className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition" title="แก้ไข / ลบ"><Edit2 className="w-4 h-4" /></button></td></tr>))} {matchState.kicks.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-300">ยังไม่มีข้อมูลการยิง</td></tr>}</tbody></table></div></div></div>) : (<div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6 animate-in zoom-in duration-500"><div className="inline-flex p-4 bg-yellow-100 rounded-full mb-2"><Trophy className="w-12 h-12 text-yellow-600" /></div><h2 className="text-4xl font-black text-slate-800">{matchState.winner === 'A' ? matchState.teamA.name : matchState.teamB.name} ชนะ!</h2><div className="flex flex-col gap-3">{isSaving ? <div className="text-center text-sm text-green-600 animate-pulse">กำลังบันทึกลง Google Sheets...</div> : <div className="text-center text-sm text-gray-400">บันทึกผลการแข่งขันเรียบร้อยแล้ว</div>}<button onClick={() => { const header = "Round,Team,Player,Result"; const rows = matchState.kicks.map(k => `${k.round},${k.teamId},${k.player},${k.result}`).join('\n'); navigator.clipboard.writeText(`${header}\n${rows}`); showNotification("คัดลอกข้อมูล CSV แล้ว"); }} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-indigo-200"><Clipboard className="w-5 h-5" /> คัดลอก CSV (Backup)</button><button onClick={() => setCurrentView('home')} className="text-indigo-600 font-medium hover:underline">กลับสู่หน้าหลัก</button><button onClick={requestUndoLastKick} className="text-slate-400 text-sm hover:text-red-500 flex items-center justify-center gap-1 mt-2"><Undo2 className="w-3 h-3" /> แก้ไขผลการยิงลูกสุดท้าย</button></div></div>)}
                </>
            ) : (
                // Regular Match Mode (7v7 / 11v11)
                <RegularMatchInterface 
                    teamA={matchState.teamA} 
                    teamB={matchState.teamB} 
                    matchId={matchState.matchId || `M_${Date.now()}`}
                    tournamentId={currentTournamentId || 'default'}
                    roster={activePlayers}
                    onFinishMatch={handleFinishRegularMatch}
                    onUpdateState={handleUpdateRegularMatchState}
                />
            )}
          </div>
        </div>
      )}
      
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default App;
