
import React, { useState, useEffect } from 'react';
import { Team, Player, AppSettings, NewsItem } from '../types';
import { ShieldCheck, ShieldAlert, Users, LogOut, Eye, X, Settings, MapPin, CreditCard, Save, Image, Search, FileText, Bell, Plus, Trash2, Loader2, Grid, Edit3, Paperclip, Download, Upload, Copy, Phone, User, Camera, AlertTriangle, CheckCircle2, UserPlus, ArrowRight, Hash, Palette, Briefcase, ExternalLink, FileCheck, Info, Calendar, Trophy, Lock, Heart, Target } from 'lucide-react';
import { updateTeamStatus, saveSettings, manageNews, fileToBase64, updateTeamData } from '../services/sheetService';

interface AdminDashboardProps {
  teams: Team[];
  players: Player[];
  settings: AppSettings;
  onLogout: () => void;
  onRefresh: () => void;
  news?: NewsItem[];
  showNotification?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  initialTeamId?: string | null;
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DOC_SIZE = 3 * 1024 * 1024;   // 3MB

const AdminDashboard: React.FC<AdminDashboardProps> = ({ teams: initialTeams, players: initialPlayers, settings, onLogout, onRefresh, news = [], showNotification, initialTeamId }) => {
  const [activeTab, setActiveTab] = useState<'teams' | 'settings' | 'news'>('teams');
  const [localTeams, setLocalTeams] = useState<Team[]>(initialTeams);
  const [localPlayers, setLocalPlayers] = useState<Player[]>(initialPlayers);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editForm, setEditForm] = useState<{ 
      team: Team, 
      players: Player[], 
      newLogo?: File | null, 
      newSlip?: File | null, 
      newDoc?: File | null,
      logoPreview?: string | null, 
      slipPreview?: string | null 
  } | null>(null);
  
  // Dual Color State for Editing
  const [editPrimaryColor, setEditPrimaryColor] = useState('#2563EB');
  const [editSecondaryColor, setEditSecondaryColor] = useState('#FFFFFF');

  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [configForm, setConfigForm] = useState<AppSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [newsForm, setNewsForm] = useState<{ id: string | null, title: string, content: string, imageFile: File | null, imagePreview: string | null, docFile: File | null }>({ id: null, title: '', content: '', imageFile: null, imagePreview: null, docFile: null });
  const [isSavingNews, setIsSavingNews] = useState(false);
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [deleteNewsId, setDeleteNewsId] = useState<string | null>(null);
  
  // Settings Logo Preview
  const [settingsLogoPreview, setSettingsLogoPreview] = useState<string | null>(null);
  const [objectiveImagePreview, setObjectiveImagePreview] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean, teamId: string | null }>({ isOpen: false, teamId: null });
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  useEffect(() => {
    setLocalTeams(initialTeams);
    setLocalPlayers(initialPlayers);
  }, [initialTeams, initialPlayers]);
  
  // Auto-open team modal if initialTeamId is provided
  useEffect(() => {
      if (initialTeamId && localTeams.length > 0) {
          const found = localTeams.find(t => t.id === initialTeamId);
          if (found) {
              setSelectedTeam(found);
          }
      }
  }, [initialTeamId, localTeams]);

  useEffect(() => {
      setConfigForm(settings);
      setSettingsLogoPreview(settings.competitionLogo);
      setObjectiveImagePreview(settings.objectiveImageUrl || null);
  }, [settings]);

  useEffect(() => {
    if (selectedTeam) {
        const teamPlayers = localPlayers.filter(p => p.teamId === selectedTeam.id);
        
        // Parse Colors
        let pColor = '#2563EB';
        let sColor = '#FFFFFF';
        try {
            const parsed = JSON.parse(selectedTeam.color);
            if (Array.isArray(parsed)) {
                pColor = parsed[0] || '#2563EB';
                sColor = parsed[1] || '#FFFFFF';
            } else {
                pColor = selectedTeam.color; // Fallback for old format
            }
        } catch (e) {
            pColor = selectedTeam.color || '#2563EB';
        }
        setEditPrimaryColor(pColor);
        setEditSecondaryColor(sColor);

        // Deep copy to prevent mutating local state directly during edit
        setEditForm({
            team: { ...selectedTeam },
            players: JSON.parse(JSON.stringify(teamPlayers)),
            newLogo: null,
            newSlip: null,
            newDoc: null
        });
        setIsEditingTeam(false);
    }
  }, [selectedTeam]);

  // Improved Age Calculation (Supports BE)
  const calculateAge = (birthDateString?: string) => { 
      if (!birthDateString) return '-'; 
      const parts = birthDateString.split('/'); 
      if (parts.length !== 3) return '-';

      let day = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      let year = parseInt(parts[2]);

      // Detect Buddhist Era (BE) > 2400 and convert to AD
      if (year > 2400) year -= 543;

      const birthDate = new Date(year, month - 1, day);
      if (isNaN(birthDate.getTime())) return '-';

      const today = new Date(); 
      let age = today.getFullYear() - birthDate.getFullYear(); 
      const m = today.getMonth() - birthDate.getMonth(); 
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { 
          age--; 
      } 
      return age >= 0 ? age : '-'; 
  };

  const notify = (title: string, msg: string, type: 'success' | 'error' | 'info' | 'warning') => { if (showNotification) showNotification(title, msg, type); else alert(`${title}: ${msg}`); };
  
  const validateFile = (file: File, type: 'image' | 'doc') => {
    const limit = type === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    if (file.size > limit) {
        notify("ไฟล์ใหญ่เกินไป", `ขนาดไฟล์ต้องไม่เกิน ${limit / 1024 / 1024}MB`, "error");
        return false;
    }
    return true;
  };

  const handleStatusUpdate = async (teamId: string, status: 'Approved' | 'Rejected') => { 
      const currentTeam = editForm?.team || localTeams.find(t => t.id === teamId); 
      if (!currentTeam) return; 

      if (status === 'Rejected') { 
          setRejectReasonInput('');
          setRejectModal({ isOpen: true, teamId });
          return;
      } 
      
      await performStatusUpdate(teamId, status, currentTeam.group, '');
  };

  const confirmReject = async () => {
      if (!rejectModal.teamId) return;
      if (!rejectReasonInput.trim()) {
          notify("แจ้งเตือน", "กรุณาระบุเหตุผล", "warning");
          return;
      }
      const currentTeam = editForm?.team || localTeams.find(t => t.id === rejectModal.teamId);
      if (!currentTeam) return;

      setRejectModal({ isOpen: false, teamId: null });
      await performStatusUpdate(currentTeam.id, 'Rejected', currentTeam.group, rejectReasonInput);
  };

  const performStatusUpdate = async (teamId: string, status: 'Approved' | 'Rejected', group?: string, reason?: string) => {
      setIsSavingTeam(true); 
      const updatedTeam = { ...localTeams.find(t => t.id === teamId)!, status, rejectReason: reason || '' }; 
      setLocalTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t)); 
      if (editForm) setEditForm({ ...editForm, team: updatedTeam }); 
      try { 
          await updateTeamStatus(teamId, status, group, reason); 
          notify("สำเร็จ", status === 'Approved' ? "อนุมัติทีมเรียบร้อย" : "บันทึกการไม่อนุมัติเรียบร้อย", "success"); 
          onRefresh(); 
      } catch (e) { 
          console.error(e); 
          notify("ผิดพลาด", "บันทึกสถานะไม่สำเร็จ", "error"); 
          setLocalTeams(initialTeams); 
      } finally { 
          setIsSavingTeam(false); 
      }
  };

  const handleSettingsLogoChange = async (file: File) => {
      if (!file) return;
      if (!validateFile(file, 'image')) return;
      try {
          const preview = URL.createObjectURL(file);
          setSettingsLogoPreview(preview);
          const base64 = await fileToBase64(file);
          setConfigForm(prev => ({ ...prev, competitionLogo: base64 }));
      } catch (e) {
          console.error("Logo Error", e);
      }
  };

  const handleObjectiveImageChange = async (file: File) => {
      if (!file) return;
      if (!validateFile(file, 'image')) return;
      try {
          const preview = URL.createObjectURL(file);
          setObjectiveImagePreview(preview);
          const base64 = await fileToBase64(file);
          setConfigForm(prev => ({ ...prev, objectiveImageUrl: base64 }));
      } catch (e) { console.error("Obj Img Error", e); }
  };

  const handleSaveConfig = async () => { setIsSavingSettings(true); await saveSettings(configForm); await onRefresh(); setIsSavingSettings(false); notify("สำเร็จ", "บันทึกการตั้งค่าเรียบร้อย", "success"); };

  const handleEditFieldChange = (field: keyof Team, value: string) => { if (editForm) setEditForm({ ...editForm, team: { ...editForm.team, [field]: value } }); };
  
  const handleColorChange = (type: 'primary' | 'secondary', color: string) => {
      if (!editForm) return;
      
      const p = type === 'primary' ? color : editPrimaryColor;
      const s = type === 'secondary' ? color : editSecondaryColor;
      
      if (type === 'primary') setEditPrimaryColor(color);
      else setEditSecondaryColor(color);

      // Pack into JSON string
      handleEditFieldChange('color', JSON.stringify([p, s]));
  };

  const handlePlayerChange = (index: number, field: keyof Player, value: string) => {
      if (editForm) {
          const updatedPlayers = [...editForm.players];
          updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
          setEditForm({ ...editForm, players: updatedPlayers });
      }
  };
  
  // Format Date Input (DD/MM/YYYY)
  const handleDateInput = (index: number, value: string) => {
      let cleaned = value.replace(/[^0-9]/g, '');
      if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
      
      let formatted = cleaned;
      if (cleaned.length > 2) {
          formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
      }
      if (cleaned.length > 4) {
          formatted = formatted.substring(0, 5) + '/' + cleaned.substring(4);
      }
      
      handlePlayerChange(index, 'birthDate', formatted);
  };

  const handlePlayerPhotoChange = async (index: number, file: File) => {
      if (editForm && file) {
          if (!validateFile(file, 'image')) return;
          try {
              const base64 = await fileToBase64(file);
              const updatedPlayers = [...editForm.players];
              updatedPlayers[index] = { ...updatedPlayers[index], photoUrl: base64 };
              setEditForm({ ...editForm, players: updatedPlayers });
          } catch (e) { console.error("Error converting player photo", e); }
      }
  };

  const handleFileChange = (type: 'logo' | 'slip' | 'doc', file: File) => {
      if (editForm && file) {
          if (type === 'doc') {
             if (!validateFile(file, 'doc')) return;
          } else {
             if (!validateFile(file, 'image')) return;
          }

          const previewUrl = URL.createObjectURL(file);
          if (type === 'logo') setEditForm({ ...editForm, newLogo: file, logoPreview: previewUrl });
          else if (type === 'slip') setEditForm({ ...editForm, newSlip: file, slipPreview: previewUrl });
          else if (type === 'doc') setEditForm({ ...editForm, newDoc: file });
      }
  };

  const handleAddPlayer = () => {
      if (!editForm) return;
      const newPlayer: Player = {
          id: `TEMP_${Date.now()}_${Math.floor(Math.random()*1000)}`, // Ensure unique ID
          teamId: editForm.team.id,
          name: '',
          number: '',
          position: 'Player',
          photoUrl: '',
          birthDate: ''
      };
      setEditForm({ ...editForm, players: [...editForm.players, newPlayer] });
  };

  const handleRemovePlayer = (index: number) => {
      if (!editForm) return;
      const updatedPlayers = editForm.players.filter((_, i) => i !== index);
      setEditForm({ ...editForm, players: updatedPlayers });
  };

  const handleSaveTeamChanges = async () => {
      if (!editForm) return;
      setIsSavingTeam(true);
      try {
          let logoBase64 = editForm.team.logoUrl;
          let slipBase64 = editForm.team.slipUrl;
          let docBase64 = editForm.team.docUrl;

          if (editForm.newLogo) logoBase64 = await fileToBase64(editForm.newLogo);
          if (editForm.newSlip) slipBase64 = await fileToBase64(editForm.newSlip);
          if (editForm.newDoc) docBase64 = await fileToBase64(editForm.newDoc);

          const teamToSave = { ...editForm.team, logoUrl: logoBase64, slipUrl: slipBase64, docUrl: docBase64 };
          
          await updateTeamData(teamToSave, editForm.players);
          
          setLocalTeams(prev => prev.map(t => t.id === teamToSave.id ? teamToSave : t));
          // Update local players state
          setLocalPlayers(prev => {
              // Remove old players of this team and add the new/edited ones
              const others = prev.filter(p => p.teamId !== teamToSave.id);
              return [...others, ...editForm.players];
          });
          
          setSelectedTeam(teamToSave); 
          setIsEditingTeam(false); 
          notify("สำเร็จ", "บันทึกผลการแก้ไขแล้ว", "success"); 
          onRefresh();
      } catch (error) { 
          console.error(error); 
          notify("ผิดพลาด", "เกิดข้อผิดพลาดในการบันทึก", "error"); 
      } finally { 
          setIsSavingTeam(false); 
      }
  };

  const handleEditNews = (item: NewsItem) => { setNewsForm({ id: item.id, title: item.title, content: item.content, imageFile: null, imagePreview: item.imageUrl || null, docFile: null }); setIsEditingNews(true); const formElement = document.getElementById('news-form-anchor'); if (formElement) formElement.scrollIntoView({ behavior: 'smooth' }); };
  const handleSaveNews = async () => { 
      if(!newsForm.title || !newsForm.content) { notify("ข้อมูลไม่ครบ", "กรุณาระบุหัวข้อและเนื้อหาข่าว", "warning"); return; } 
      
      if (newsForm.imageFile && !validateFile(newsForm.imageFile, 'image')) return;
      if (newsForm.docFile && !validateFile(newsForm.docFile, 'doc')) return;

      setIsSavingNews(true); 
      try { 
          const imageBase64 = newsForm.imageFile ? await fileToBase64(newsForm.imageFile) : undefined; 
          const docBase64 = newsForm.docFile ? await fileToBase64(newsForm.docFile) : undefined; 
          const newsData: Partial<NewsItem> = { id: newsForm.id || Date.now().toString(), title: newsForm.title, content: newsForm.content, timestamp: Date.now() }; 
          if (imageBase64) newsData.imageUrl = imageBase64; 
          if (docBase64) newsData.documentUrl = docBase64; 
          const action = isEditingNews ? 'edit' : 'add'; 
          await manageNews(action, newsData); 
          setNewsForm({ id: null, title: '', content: '', imageFile: null, imagePreview: null, docFile: null }); 
          setIsEditingNews(false); 
          notify("สำเร็จ", isEditingNews ? "แก้ไขข่าวเรียบร้อย" : "เพิ่มข่าวเรียบร้อย", "success"); 
          await onRefresh(); 
      } catch (e) { notify("ผิดพลาด", "เกิดข้อผิดพลาด: " + e, "error"); } finally { setIsSavingNews(false); } 
  };
  const triggerDeleteNews = (id: string) => { setDeleteNewsId(id); };
  const confirmDeleteNews = async () => { if (!deleteNewsId) return; try { await manageNews('delete', { id: deleteNewsId }); await onRefresh(); setDeleteNewsId(null); notify("สำเร็จ", "ลบข่าวเรียบร้อย", "success"); } catch (e) { notify("ผิดพลาด", "ลบข่าวไม่สำเร็จ", "error"); } };

  const handleSort = (key: string) => { let direction: 'asc' | 'desc' = 'asc'; if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; } setSortConfig({ key, direction }); };
  const sortedTeams = [...localTeams].sort((a: any, b: any) => { if (!sortConfig) return 0; if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1; if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1; return 0; });
  const filteredTeams = sortedTeams.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.province?.toLowerCase().includes(searchTerm.toLowerCase()) || t.district?.toLowerCase().includes(searchTerm.toLowerCase()));
  const downloadCSV = () => { try { const headers = "ID,ชื่อทีม,ตัวย่อ,สถานะ,กลุ่ม,อำเภอ,จังหวัด,ผู้อำนวยการ,ผู้จัดการ,เบอร์โทร,ผู้ฝึกสอน,เบอร์โทรโค้ช"; const rows = filteredTeams.map(t => `"${t.id}","${t.name}","${t.shortName}","${t.status}","${t.group || ''}","${t.district}","${t.province}","${t.directorName || ''}","${t.managerName}","'${t.managerPhone || ''}","${t.coachName}","'${t.coachPhone || ''}"` ); const csvContent = [headers, ...rows].join("\n"); const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", "teams_data.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); } catch (e) { console.error("CSV Download Error:", e); notify("ผิดพลาด", "ดาวน์โหลด CSV ไม่สำเร็จ", "error"); } };
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); notify("คัดลอกแล้ว", text, "info"); };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 pb-24">
      {deleteNewsId && (<div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200"><div className="flex items-center gap-3 text-red-600 mb-4"><AlertTriangle className="w-8 h-8" /><h3 className="font-bold text-lg">ยืนยันการลบข่าว?</h3></div><p className="text-slate-600 mb-6">คุณต้องการลบข่าวนี้อย่างถาวรใช่หรือไม่?</p><div className="flex gap-3"><button onClick={() => setDeleteNewsId(null)} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">ยกเลิก</button><button onClick={confirmDeleteNews} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold">ลบข่าว</button></div></div></div>)}

      {rejectModal.isOpen && (
          <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in duration-200">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 text-red-600">
                          <ShieldAlert className="w-6 h-6" />
                          <h3 className="font-bold text-lg">ระบุเหตุผลที่ไม่อนุมัติ</h3>
                      </div>
                      <button onClick={() => setRejectModal({ isOpen: false, teamId: null })} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  </div>
                  <textarea className="w-full p-3 border border-slate-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-red-200 focus:border-red-400 mb-4" placeholder="เช่น เอกสารไม่ครบถ้วน, สลิปไม่ชัดเจน..." value={rejectReasonInput} onChange={(e) => setRejectReasonInput(e.target.value)} autoFocus></textarea>
                  <div className="flex gap-3"><button onClick={() => setRejectModal({ isOpen: false, teamId: null })} className="flex-1 py-2 border rounded-lg hover:bg-slate-50 text-sm font-bold text-slate-600">ยกเลิก</button><button onClick={confirmReject} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm shadow-sm flex items-center justify-center gap-2">{isSavingTeam ? <Loader2 className="w-4 h-4 animate-spin"/> : 'ยืนยันไม่อนุมัติ'}</button></div>
              </div>
          </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"><div><h1 className="text-3xl font-bold text-slate-800">ระบบจัดการการแข่งขัน</h1><p className="text-slate-500">Admin Control Panel</p></div><div className="flex gap-3 flex-wrap"><button onClick={() => setActiveTab('teams')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'teams' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>จัดการทีม</button><button onClick={() => setActiveTab('news')} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'news' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><Bell className="w-4 h-4" /> ข่าวสาร</button><button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><Settings className="w-4 h-4" /> ตั้งค่า</button><button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100"><LogOut className="w-4 h-4" /></button></div></div>

        {activeTab === 'teams' && (
            <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"><div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex items-center justify-between"><div><p className="text-slate-500 text-sm">ทีมทั้งหมด</p><p className="text-3xl font-bold text-indigo-600">{localTeams.length}</p></div><div className="p-3 bg-indigo-50 rounded-full"><Users className="w-6 h-6 text-indigo-600" /></div></div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex items-center justify-between"><div><p className="text-slate-500 text-sm">รอการอนุมัติ</p><p className="text-3xl font-bold text-orange-500">{localTeams.filter(t => t.status !== 'Approved' && t.status !== 'Rejected').length}</p></div><div className="p-3 bg-orange-50 rounded-full"><ShieldAlert className="w-6 h-6 text-orange-500" /></div></div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex items-center justify-between"><div><p className="text-slate-500 text-sm">อนุมัติแล้ว</p><p className="text-3xl font-bold text-green-600">{localTeams.filter(t => t.status === 'Approved').length}</p></div><div className="p-3 bg-green-50 rounded-full"><ShieldCheck className="w-6 h-6 text-green-600" /></div></div></div></div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="font-bold text-lg text-slate-800">รายชื่อทีมลงทะเบียน</h2><div className="flex gap-2 w-full md:w-auto"><div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" placeholder="ค้นหาทีม / จังหวัด..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div><button onClick={downloadCSV} className="flex items-center gap-2 text-sm px-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-700 font-medium"><Download className="w-4 h-4" /> Export CSV</button><button onClick={onRefresh} className="text-sm px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">รีเฟรช</button></div></div><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>ชื่อทีม/โรงเรียน</th><th className="p-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('group')}>กลุ่ม</th><th className="p-4 font-medium">ผู้ติดต่อ</th><th className="p-4 font-medium text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>สถานะ</th><th className="p-4 font-medium text-right">จัดการ</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredTeams.map(team => (<tr key={team.id} className="hover:bg-slate-50"><td className="p-4"><div className="flex items-center gap-3">{team.logoUrl ? <img src={team.logoUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200" /> : <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">{team.shortName}</div>}<div><p className="font-bold text-slate-800">{team.name}</p><p className="text-xs text-slate-500">{team.district}, {team.province}</p></div></div></td><td className="p-4">{team.group ? <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{team.group}</span> : <span className="text-slate-300 text-xs">-</span>}</td><td className="p-4 text-sm"><div className="flex items-center gap-2 group"><span>{team.managerPhone || team.coachPhone || team.directorName}</span><button onClick={() => copyToClipboard(team.managerPhone || team.coachPhone || '')} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition"><Copy className="w-3 h-3" /></button></div><p className="text-xs text-slate-400">ผจก: {team.managerName}</p></td><td className="p-4 text-center"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${team.status === 'Approved' ? 'bg-green-100 text-green-800' : team.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{team.status || 'Pending'}</span></td><td className="p-4 text-right"><button onClick={() => setSelectedTeam(team)} className="bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-2 ml-auto shadow-sm"><Eye className="w-4 h-4" /> รายละเอียด</button></td></tr>))} {filteredTeams.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>}</tbody></table></div></div>
            </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-300 max-w-4xl mx-auto space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                 <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                 <div>
                     <p className="text-sm text-blue-800 font-bold mb-1">การจัดการอีเวนต์</p>
                     <p className="text-xs text-blue-600">คุณสามารถเปลี่ยนชื่อการแข่งขัน, สถานที่ และวัตถุประสงค์ได้ที่นี่ เพื่อรองรับการจัดแข่งในครั้งถัดไป</p>
                 </div>
            </div>

            {/* Competition Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-indigo-600"/> ข้อมูลการแข่งขัน</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อรายการแข่งขัน</label>
                      <input type="text" value={configForm.competitionName} onChange={e => setConfigForm({...configForm, competitionName: e.target.value})} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">โลโก้รายการ</label>
                      <div className="flex items-center gap-4">
                          <img src={settingsLogoPreview || 'https://via.placeholder.com/80'} className="w-16 h-16 object-contain border rounded-lg p-1" />
                          <label className="cursor-pointer bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 transition">
                              เปลี่ยนรูป
                              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleSettingsLogoChange(e.target.files[0])} />
                          </label>
                      </div>
                  </div>
               </div>
            </div>
            
            {/* Fundraising & Objectives (NEW) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-pink-600"/> วัตถุประสงค์และการระดมทุน</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">หัวข้อวัตถุประสงค์ (เช่น ระดมทุนสร้างห้องสมุด)</label>
                        <input type="text" value={configForm.objectiveTitle || ''} onChange={e => setConfigForm({...configForm, objectiveTitle: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="ระบุชื่อโครงการ..." />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">รายละเอียดโครงการ</label>
                        <textarea value={configForm.objectiveDescription || ''} onChange={e => setConfigForm({...configForm, objectiveDescription: e.target.value})} className="w-full p-2 border rounded-lg h-24" placeholder="อธิบายรายละเอียดสิ่งที่ต้องการพัฒนา..."></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">ค่าสมัครต่อทีม (บาท)</label>
                            <input type="number" value={configForm.registrationFee || 0} onChange={e => setConfigForm({...configForm, registrationFee: parseFloat(e.target.value)})} className="w-full p-2 border rounded-lg" />
                            <p className="text-xs text-slate-400 mt-1">*ใช้คำนวณยอดระดมทุน</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">เป้าหมายยอดเงิน (บาท)</label>
                            <input type="number" value={configForm.fundraisingGoal || 0} onChange={e => setConfigForm({...configForm, fundraisingGoal: parseFloat(e.target.value)})} className="w-full p-2 border rounded-lg" />
                        </div>
                    </div>
                     <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">รูปภาพโครงการ (สิ่งที่อยากสร้าง/พัฒนา)</label>
                      <div className="flex items-center gap-4 border p-3 rounded-lg border-dashed">
                          {objectiveImagePreview ? (
                              <img src={objectiveImagePreview} className="h-24 object-contain rounded" />
                          ) : <div className="h-24 w-24 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">No Image</div>}
                          <label className="cursor-pointer bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 transition">
                              อัปโหลดรูป
                              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleObjectiveImageChange(e.target.files[0])} />
                          </label>
                      </div>
                  </div>
                </div>
            </div>

            {/* Location & Announcement */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-600"/> สถานที่และพิกัด</h3>
               <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อสถานที่แข่งขัน</label>
                          <input type="text" value={configForm.locationName} onChange={e => setConfigForm({...configForm, locationName: e.target.value})} className="w-full p-2 border rounded-lg" />
                       </div>
                       <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Google Maps Link</label>
                          <input type="text" value={configForm.locationLink} onChange={e => setConfigForm({...configForm, locationLink: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="https://maps.app.goo.gl/..." />
                       </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                       <div className="col-span-2 text-xs font-bold text-slate-500 flex items-center gap-1"><Target className="w-3 h-3"/> พิกัด GPS (เพื่อคำนวณระยะทาง)</div>
                       <div>
                           <input type="number" step="any" placeholder="Latitude (ละติจูด)" value={configForm.locationLat || ''} onChange={e => setConfigForm({...configForm, locationLat: parseFloat(e.target.value)})} className="w-full p-2 border rounded-lg text-sm" />
                       </div>
                       <div>
                           <input type="number" step="any" placeholder="Longitude (ลองจิจูด)" value={configForm.locationLng || ''} onChange={e => setConfigForm({...configForm, locationLng: parseFloat(e.target.value)})} className="w-full p-2 border rounded-lg text-sm" />
                       </div>
                       <p className="col-span-2 text-[10px] text-slate-400">หาพิกัดได้จาก Google Maps (คลิกขวาที่จุด &gt; เลือกตัวเลขพิกัด)</p>
                   </div>
               </div>
               <div className="mt-4 border-t pt-4">
                   <label className="block text-sm font-bold text-slate-700 mb-1">ประกาศตัววิ่ง (คั่นด้วย |)</label>
                   <textarea value={configForm.announcement} onChange={e => setConfigForm({...configForm, announcement: e.target.value})} className="w-full p-2 border rounded-lg h-20" placeholder="เช่น ยินดีต้อนรับสู่งาน | เริ่มแข่ง 09.00 น."></textarea>
               </div>
            </div>

            {/* Bank Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600"/> ข้อมูลการชำระเงิน (สำหรับใบสมัคร)</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">ธนาคาร</label>
                      <input type="text" value={configForm.bankName} onChange={e => setConfigForm({...configForm, bankName: e.target.value})} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">เลขบัญชี</label>
                      <input type="text" value={configForm.bankAccount} onChange={e => setConfigForm({...configForm, bankAccount: e.target.value})} className="w-full p-2 border rounded-lg font-mono" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">ชื่อบัญชี</label>
                      <input type="text" value={configForm.accountName} onChange={e => setConfigForm({...configForm, accountName: e.target.value})} className="w-full p-2 border rounded-lg" />
                  </div>
               </div>
            </div>

            {/* Security */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-indigo-600"/> ความปลอดภัย</h3>
               <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Admin PIN (สำหรับเริ่มแข่ง/Login แบบ PIN)</label>
                   <input type="text" value={configForm.adminPin || '1234'} onChange={e => setConfigForm({...configForm, adminPin: e.target.value})} className="w-full max-w-xs p-2 border rounded-lg font-mono tracking-widest" />
               </div>
            </div>

            <button onClick={handleSaveConfig} disabled={isSavingSettings} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} บันทึกการตั้งค่าทั้งหมด
            </button>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Side */}
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4">
                      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2" id="news-form-anchor">
                          {isEditingNews ? <Edit3 className="w-5 h-5 text-orange-500"/> : <Plus className="w-5 h-5 text-green-500"/>} 
                          {isEditingNews ? 'แก้ไขข่าว' : 'เพิ่มข่าวใหม่'}
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">หัวข้อข่าว</label>
                              <input type="text" value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="ระบุหัวข้อ..." />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">เนื้อหา</label>
                              <textarea value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} className="w-full p-2 border rounded-lg h-32" placeholder="รายละเอียด..."></textarea>
                          </div>
                          
                          {/* Image Upload */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">รูปภาพประกอบ</label>
                              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 transition relative">
                                  {newsForm.imagePreview ? (
                                      <div className="relative">
                                          <img src={newsForm.imagePreview} className="max-h-32 mx-auto rounded" />
                                          <button onClick={() => setNewsForm({...newsForm, imageFile: null, imagePreview: null})} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"><X className="w-3 h-3"/></button>
                                      </div>
                                  ) : (
                                      <label className="cursor-pointer block">
                                          <Image className="w-8 h-8 text-slate-300 mx-auto mb-2"/>
                                          <span className="text-xs text-slate-400">คลิกเพื่ออัปโหลด</span>
                                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                              if (e.target.files?.[0]) {
                                                  const file = e.target.files[0];
                                                  if(validateFile(file, 'image')) {
                                                      setNewsForm({...newsForm, imageFile: file, imagePreview: URL.createObjectURL(file)});
                                                  }
                                              }
                                          }} />
                                      </label>
                                  )}
                              </div>
                          </div>

                          {/* Doc Upload */}
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">เอกสารแนบ (PDF)</label>
                               <div className="flex items-center gap-2">
                                   <label className="cursor-pointer bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 transition flex items-center gap-2 flex-1 justify-center">
                                      <Paperclip className="w-4 h-4 text-slate-500"/> 
                                      <span className="truncate max-w-[150px]">{newsForm.docFile ? newsForm.docFile.name : 'เลือกไฟล์...'}</span>
                                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => {
                                          if (e.target.files?.[0]) {
                                              const file = e.target.files[0];
                                              if(validateFile(file, 'doc')) {
                                                  setNewsForm({...newsForm, docFile: file});
                                              }
                                          }
                                      }} />
                                  </label>
                                  {newsForm.docFile && <button onClick={() => setNewsForm({...newsForm, docFile: null})} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>}
                               </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                              {isEditingNews && <button onClick={() => { setIsEditingNews(false); setNewsForm({ id: null, title: '', content: '', imageFile: null, imagePreview: null, docFile: null }); }} className="flex-1 py-2 border border-slate-300 rounded-lg font-bold text-slate-500">ยกเลิก</button>}
                              <button onClick={handleSaveNews} disabled={isSavingNews} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow flex items-center justify-center gap-2">
                                  {isSavingNews ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} {isEditingNews ? 'บันทึกแก้ไข' : 'โพสต์ข่าว'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* List Side */}
              <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2"><Bell className="w-5 h-5"/> รายการข่าวสาร ({news.length})</h3>
                  {news.length === 0 ? (
                      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">ยังไม่มีข่าวสาร</div>
                  ) : (
                      news.slice().reverse().map(item => (
                          <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 group">
                              <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Image className="w-8 h-8"/></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                      <h4 className="font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                                      <span className="text-xs text-slate-400 shrink-0">{new Date(item.timestamp).toLocaleDateString('th-TH')}</span>
                                  </div>
                                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{item.content}</p>
                                  {item.documentUrl && <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1"><Paperclip className="w-3 h-3"/> มีเอกสารแนบ</div>}
                                  
                                  <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition">
                                      <button onClick={() => handleEditNews(item)} className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded hover:bg-orange-100 font-bold flex items-center gap-1"><Edit3 className="w-3 h-3"/> แก้ไข</button>
                                      <button onClick={() => triggerDeleteNews(item.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-bold flex items-center gap-1"><Trash2 className="w-3 h-3"/> ลบ</button>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
        )}

        {/* Edit Form Modal */}
        {editForm && selectedTeam && (
            <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => { setSelectedTeam(null); setEditForm(null); }}>
                <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8 animate-in zoom-in duration-200 relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    {isSavingTeam && (<div className="absolute inset-0 z-50 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" /><p className="font-bold text-indigo-800">กำลังบันทึกข้อมูล...</p></div>)}
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-10 shrink-0">
                        <h3 className="font-bold text-lg flex items-center gap-2">{isEditingTeam ? <Edit3 className="w-5 h-5 text-orange-400" /> : <Eye className="w-5 h-5 text-indigo-400" />} {isEditingTeam ? 'แก้ไขข้อมูลทีม' : 'รายละเอียดทีม'}</h3>
                        <button onClick={() => { setSelectedTeam(null); setEditForm(null); }} className="hover:bg-slate-700 p-1 rounded-full"><X className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {/* 1. Identity & Location Section */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <h4 className="font-bold text-slate-700 border-b pb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> ข้อมูลทั่วไปและอัตลักษณ์</h4>
                            {isEditingTeam ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อทีม/โรงเรียน</label>
                                            <input type="text" value={editForm.team.name} onChange={(e) => handleEditFieldChange('name', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อย่อ (ENG 3 ตัว)</label>
                                            <input 
                                                type="text" 
                                                value={editForm.team.shortName} 
                                                onChange={(e) => handleEditFieldChange('shortName', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} 
                                                className="w-full p-2 border rounded text-sm uppercase font-mono" 
                                                maxLength={3} 
                                                placeholder="ABC"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">สีประจำทีม (หลัก / รอง)</label>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    <input type="color" value={editPrimaryColor} onChange={(e) => handleColorChange('primary', e.target.value)} className="h-8 w-12 p-0 border rounded cursor-pointer" />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <input type="color" value={editSecondaryColor} onChange={(e) => handleColorChange('secondary', e.target.value)} className="h-8 w-12 p-0 border rounded cursor-pointer" />
                                                </div>
                                                <span className="text-[10px] text-slate-400 ml-1">(เลือก 2 สี)</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">กลุ่มแข่งขัน (Group)</label>
                                            <div className="flex items-center gap-2">
                                                <Grid className="w-4 h-4 text-indigo-500" />
                                                <input type="text" value={editForm.team.group || ''} onChange={(e) => handleEditFieldChange('group', e.target.value.toUpperCase())} className="w-20 p-2 border rounded text-center font-bold uppercase" placeholder="-"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">อำเภอ</label>
                                            <input type="text" value={editForm.team.district} onChange={(e) => handleEditFieldChange('district', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">จังหวัด</label>
                                            <input type="text" value={editForm.team.province} onChange={(e) => handleEditFieldChange('province', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                    <div className="col-span-2 md:col-span-1">
                                        <p className="text-xs text-slate-400 mb-1">ชื่อทีม</p>
                                        <p className="font-bold text-lg text-slate-800">{editForm.team.name}</p>
                                        <p className="text-xs text-slate-500 mt-1">{editForm.team.district}, {editForm.team.province}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">อัตลักษณ์</p>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{editForm.team.shortName || '-'}</span>
                                            <div className="flex items-center gap-1 text-xs">
                                                <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{backgroundColor: editPrimaryColor}}></div> 
                                                <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{backgroundColor: editSecondaryColor}}></div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit"><Grid className="w-3 h-3"/> Group {editForm.team.group || '-'}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Personnel Section */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                             <h4 className="font-bold text-slate-700 border-b pb-2 flex items-center gap-2"><Briefcase className="w-4 h-4" /> คณะผู้บริหารและผู้ควบคุมทีม</h4>
                             {isEditingTeam ? (
                                 <div className="space-y-4">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">ผู้อำนวยการโรงเรียน</label>
                                        <input type="text" value={editForm.team.directorName || ''} onChange={(e) => handleEditFieldChange('directorName', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="ชื่อ-สกุล" />
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">ผู้จัดการทีม</label>
                                            <input type="text" value={editForm.team.managerName} onChange={(e) => handleEditFieldChange('managerName', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                         </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">เบอร์โทรศัพท์</label>
                                            <input type="text" value={editForm.team.managerPhone} onChange={(e) => handleEditFieldChange('managerPhone', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                         </div>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">ผู้ฝึกสอน (Coach)</label>
                                            <input type="text" value={editForm.team.coachName} onChange={(e) => handleEditFieldChange('coachName', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                         </div>
                                         <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">เบอร์โทรศัพท์</label>
                                            <input type="text" value={editForm.team.coachPhone} onChange={(e) => handleEditFieldChange('coachPhone', e.target.value)} className="w-full p-2 border rounded text-sm" />
                                         </div>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="space-y-3 text-sm">
                                     <div><span className="text-slate-400 text-xs block">ผู้อำนวยการ</span><span className="font-bold">{editForm.team.directorName || '-'}</span></div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                             <span className="text-slate-400 text-xs block">ผู้จัดการทีม</span>
                                             <div className="font-bold">{editForm.team.managerName}</div>
                                             <div className="text-xs text-indigo-600 flex items-center gap-1 cursor-pointer" onClick={() => copyToClipboard(editForm.team.managerPhone || '')}><Phone className="w-3 h-3"/> {editForm.team.managerPhone}</div>
                                         </div>
                                         <div>
                                             <span className="text-slate-400 text-xs block">ผู้ฝึกสอน</span>
                                             <div className="font-bold">{editForm.team.coachName}</div>
                                             <div className="text-xs text-indigo-600 flex items-center gap-1 cursor-pointer" onClick={() => copyToClipboard(editForm.team.coachPhone || '')}><Phone className="w-3 h-3"/> {editForm.team.coachPhone}</div>
                                         </div>
                                     </div>
                                 </div>
                             )}
                        </div>

                        {/* 4. Players (Mobile Optimized) */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2"><Users className="w-4 h-4"/> รายชื่อนักกีฬา ({editForm.players.length})</h4>
                                {isEditingTeam && (
                                    <button onClick={handleAddPlayer} className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 shadow-sm font-bold transition">
                                        <UserPlus className="w-4 h-4" /> เพิ่มนักกีฬา
                                    </button>
                                )}
                            </div>

                            {isEditingTeam && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-700 flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold">คำแนะนำ:</p>
                                        <p>1. สามารถพิมพ์วันเกิดเป็น พ.ศ. ได้ (เช่น 15/04/2555)</p>
                                        <p>2. ระบบจะใส่เครื่องหมาย / ให้เองอัตโนมัติ</p>
                                        <p>3. กดปุ่ม "ลบคนนี้" เพื่อลบนักกีฬาออกจากทีม</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {editForm.players.map((p, idx) => (
                                    <div key={p.id || idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition relative group">
                                        {/* Player Photo (Large for Check) */}
                                        <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 relative">
                                             {p.photoUrl ? (
                                                <img src={p.photoUrl} className="w-full h-full object-cover" />
                                             ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                                    <User className="w-8 h-8 mb-1" />
                                                    <span className="text-[10px] font-bold">No Photo</span>
                                                </div>
                                             )}
                                             {isEditingTeam && (
                                                <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                                                    <Camera className="w-6 h-6 text-white" />
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handlePlayerPhotoChange(idx, e.target.files[0])} />
                                                </label>
                                             )}
                                        </div>

                                        {/* Player Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center h-full py-1">
                                            {isEditingTeam ? (
                                                <div className="space-y-2">
                                                    <div className="flex gap-2">
                                                        <div className="w-16">
                                                            <input type="text" value={p.number} onChange={(e) => handlePlayerChange(idx, 'number', e.target.value)} className="w-full p-1.5 text-xs border border-slate-300 rounded text-center font-bold bg-slate-50" placeholder="เบอร์" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <input type="text" value={p.name} onChange={(e) => handlePlayerChange(idx, 'name', e.target.value)} className="w-full p-1.5 text-xs border border-slate-300 rounded" placeholder="ชื่อ-นามสกุล" />
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <input 
                                                            type="text" 
                                                            value={p.birthDate || ''} 
                                                            onChange={(e) => handleDateInput(idx, e.target.value)} 
                                                            className="w-full p-1.5 pl-7 text-xs border border-slate-300 rounded" 
                                                            placeholder="วว/ดด/ปปปป" 
                                                            maxLength={10}
                                                        />
                                                        <Calendar className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                                                    </div>
                                                    <button onClick={() => handleRemovePlayer(idx)} className="text-red-500 text-xs flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition w-fit"><Trash2 className="w-3 h-3" /> ลบคนนี้</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-2xl font-black text-indigo-800 font-mono italic">#{p.number || '-'}</span>
                                                    </div>
                                                    <div className="font-bold text-slate-800 leading-tight mb-1 truncate">{p.name || 'ไม่ระบุชื่อ'}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{p.birthDate || '-'}</span>
                                                        <span className="text-[10px] text-white font-bold bg-indigo-500 px-1.5 py-0.5 rounded-full">อายุ {calculateAge(p.birthDate)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isEditingTeam && (
                                    <button onClick={handleAddPlayer} className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition h-28">
                                        <Plus className="w-8 h-8" />
                                        <span className="text-xs font-bold">เพิ่มนักกีฬา</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Files and Reason (Bottom) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {/* Reject Reason */}
                             {(editForm.team.status === 'Rejected' || isEditingTeam) && (
                                <div className={`p-4 rounded-xl border ${editForm.team.status === 'Rejected' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <h4 className={`font-bold mb-2 flex items-center gap-2 ${editForm.team.status === 'Rejected' ? 'text-red-700' : 'text-slate-700'}`}><AlertTriangle className="w-4 h-4"/> หมายเหตุ / สาเหตุไม่อนุมัติ</h4>
                                    {isEditingTeam ? (
                                        <textarea className="w-full p-2 border rounded text-sm h-20" value={editForm.team.rejectReason || ''} onChange={(e) => handleEditFieldChange('rejectReason', e.target.value)} placeholder="ระบุเหตุผลที่นี่..."></textarea>
                                    ) : (
                                        <p className="text-sm text-red-600">{editForm.team.rejectReason || '-'}</p>
                                    )}
                                </div>
                             )}

                             {/* Files */}
                             <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <h4 className="font-bold text-slate-700 mb-2 text-sm">โลโก้ทีม</h4>
                                    <div className="bg-slate-50 p-4 rounded-xl border flex flex-col items-center justify-center gap-3">
                                        <img src={editForm.logoPreview || editForm.team.logoUrl || 'https://via.placeholder.com/100'} className="h-24 w-24 object-contain bg-white rounded shadow-sm" />
                                        {isEditingTeam && (<label className="cursor-pointer px-3 py-1 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50">เปลี่ยนรูป<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileChange('logo', e.target.files[0])} /></label>)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700 mb-2 text-sm">หลักฐานโอนเงิน</h4>
                                    <div className="bg-slate-50 p-4 rounded-xl border flex flex-col items-center justify-center gap-3 relative min-h-[140px]">
                                        {editForm.slipPreview || editForm.team.slipUrl ? (
                                            <a href={editForm.slipPreview || editForm.team.slipUrl} target="_blank" className="block relative group">
                                                <img src={editForm.slipPreview || editForm.team.slipUrl} className="h-24 object-cover rounded shadow-sm" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center"><Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" /></div>
                                            </a>
                                        ) : <span className="text-slate-400 text-xs">ไม่มีไฟล์</span>}
                                        {isEditingTeam && (<label className="cursor-pointer px-3 py-1 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50">อัปโหลดใหม่<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileChange('slip', e.target.files[0])} /></label>)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700 mb-2 text-sm">เอกสารใบสมัคร</h4>
                                    <div className="bg-slate-50 p-4 rounded-xl border flex flex-col items-center justify-center gap-3 min-h-[140px]">
                                        {editForm.team.docUrl ? (
                                             <a href={editForm.team.docUrl} target="_blank" className="flex flex-col items-center gap-2 group">
                                                 <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm group-hover:border-indigo-400 group-hover:shadow-md transition">
                                                     <FileCheck className="w-8 h-8 text-indigo-600" />
                                                 </div>
                                                 <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:underline">เปิดเอกสาร <ExternalLink className="w-3 h-3"/></span>
                                             </a>
                                        ) : <span className="text-slate-400 text-xs">ไม่มีเอกสาร</span>}
                                        {isEditingTeam && (<label className="cursor-pointer px-3 py-1 bg-white border border-slate-300 rounded text-xs hover:bg-slate-50 text-center">อัปโหลด PDF/Doc<input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileChange('doc', e.target.files[0])} /></label>)}
                                        {editForm.newDoc && <span className="text-[10px] text-green-600 font-bold truncate max-w-full px-2">{editForm.newDoc.name}</span>}
                                    </div>
                                </div>
                             </div>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t bg-slate-50 flex justify-between items-center z-20 relative shrink-0">
                        <div className="flex gap-2">
                            {!isEditingTeam ? (
                                <button onClick={() => handleStatusUpdate(editForm.team.id, 'Rejected')} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm flex items-center gap-2"><X className="w-4 h-4" /> ไม่อนุมัติ (Reject)</button>
                            ) : <div></div>}
                        </div>
                        
                        <div className="flex gap-2">
                            {!isEditingTeam ? (
                                <>
                                    <button onClick={() => setIsEditingTeam(true)} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-sm flex items-center gap-2"><Edit3 className="w-4 h-4" /> แก้ไขข้อมูล</button>
                                    <button onClick={() => handleStatusUpdate(editForm.team.id, 'Approved')} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-bold text-sm shadow-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> อนุมัติ (Approve)</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { setIsEditingTeam(false); setSelectedTeam({...editForm.team}); }} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-sm">ยกเลิก</button>
                                    <button onClick={handleSaveTeamChanges} disabled={isSavingTeam} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2">
                                        <Save className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
