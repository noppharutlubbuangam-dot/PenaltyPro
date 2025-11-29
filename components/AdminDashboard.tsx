
import React, { useState, useEffect } from 'react';
import { Team, Player, AppSettings, NewsItem, Tournament, UserProfile, Donation } from '../types';
import { ShieldCheck, ShieldAlert, Users, LogOut, Eye, X, Settings, MapPin, CreditCard, Save, Image, Search, FileText, Bell, Plus, Trash2, Loader2, Grid, Edit3, Paperclip, Download, Upload, Copy, Phone, User, Camera, AlertTriangle, CheckCircle2, UserPlus, ArrowRight, Hash, Palette, Briefcase, ExternalLink, FileCheck, Info, Calendar, Trophy, Lock, Heart, Target, UserCog, Globe, DollarSign, Check } from 'lucide-react';
import { updateTeamStatus, saveSettings, manageNews, fileToBase64, updateTeamData, fetchUsers, updateUserRole, verifyDonation } from '../services/sheetService';

interface AdminDashboardProps {
  teams: Team[];
  players: Player[];
  settings: AppSettings;
  onLogout: () => void;
  onRefresh: () => void;
  news?: NewsItem[];
  showNotification?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  initialTeamId?: string | null;
  currentTournament?: Tournament;
  donations?: Donation[];
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DOC_SIZE = 3 * 1024 * 1024;   // 3MB

const AdminDashboard: React.FC<AdminDashboardProps> = ({ teams: initialTeams, players: initialPlayers, settings, onLogout, onRefresh, news = [], showNotification, initialTeamId, currentTournament, donations = [] }) => {
  const [activeTab, setActiveTab] = useState<'teams' | 'settings' | 'news' | 'users' | 'donations'>('teams');
  const [localTeams, setLocalTeams] = useState<Team[]>(initialTeams);
  const [localPlayers, setLocalPlayers] = useState<Player[]>(initialPlayers);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // User Management State
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Donation Management State
  const [donationList, setDonationList] = useState<Donation[]>(donations);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [isVerifyingDonation, setIsVerifyingDonation] = useState(false);

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
  const [editPrimaryColor, setEditPrimaryColor] = useState('#2563EB');
  const [editSecondaryColor, setEditSecondaryColor] = useState('#FFFFFF');
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [configForm, setConfigForm] = useState<AppSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // News Form with Tournament ID
  const [newsForm, setNewsForm] = useState<{ id: string | null, title: string, content: string, imageFile: File | null, imagePreview: string | null, docFile: File | null, tournamentId: string }>({ id: null, title: '', content: '', imageFile: null, imagePreview: null, docFile: null, tournamentId: 'global' });
  const [isSavingNews, setIsSavingNews] = useState(false);
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [deleteNewsId, setDeleteNewsId] = useState<string | null>(null);
  
  const [settingsLogoPreview, setSettingsLogoPreview] = useState<string | null>(null);
  const [objectiveImagePreview, setObjectiveImagePreview] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean, teamId: string | null }>({ isOpen: false, teamId: null });
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  useEffect(() => {
    setLocalTeams(initialTeams);
    setLocalPlayers(initialPlayers);
    setDonationList(donations);
  }, [initialTeams, initialPlayers, donations]);
  
  useEffect(() => {
      if (activeTab === 'users') {
          loadUsers();
      }
  }, [activeTab]);

  const loadUsers = async () => {
      setIsLoadingUsers(true);
      const users = await fetchUsers();
      setUserList(users);
      setIsLoadingUsers(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
      if (!confirm("ยืนยันการเปลี่ยนสิทธิ์ผู้ใช้?")) return;
      const success = await updateUserRole(userId, newRole);
      if (success) {
          notify("สำเร็จ", "อัปเดตสิทธิ์เรียบร้อย", "success");
          loadUsers();
      } else {
          notify("ผิดพลาด", "อัปเดตไม่สำเร็จ", "error");
      }
  };

  const handleVerifyDonation = async (donationId: string, status: 'Verified' | 'Rejected') => {
      setIsVerifyingDonation(true);
      const success = await verifyDonation(donationId, status);
      if (success) {
          notify("สำเร็จ", `สถานะบริจาค: ${status}`, "success");
          setDonationList(prev => prev.map(d => d.id === donationId ? { ...d, status } : d));
          setSelectedDonation(null);
          onRefresh();
      } else {
          notify("ผิดพลาด", "บันทึกไม่สำเร็จ", "error");
      }
      setIsVerifyingDonation(false);
  };

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
        let pColor = '#2563EB';
        let sColor = '#FFFFFF';
        try {
            const parsed = JSON.parse(selectedTeam.color);
            if (Array.isArray(parsed)) {
                pColor = parsed[0] || '#2563EB';
                sColor = parsed[1] || '#FFFFFF';
            } else {
                pColor = selectedTeam.color; 
            }
        } catch (e) { pColor = selectedTeam.color || '#2563EB'; }
        setEditPrimaryColor(pColor);
        setEditSecondaryColor(sColor);
        setEditForm({ team: { ...selectedTeam }, players: JSON.parse(JSON.stringify(teamPlayers)), newLogo: null, newSlip: null, newDoc: null });
        setIsEditingTeam(false); // Default to view mode, admin can click edit
    }
  }, [selectedTeam]);

  const notify = (title: string, msg: string, type: 'success' | 'error' | 'info' | 'warning') => { if (showNotification) showNotification(title, msg, type); else alert(`${title}: ${msg}`); };
  const validateFile = (file: File, type: 'image' | 'doc') => {
    const limit = type === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    if (file.size > limit) { notify("ไฟล์ใหญ่เกินไป", `ขนาดไฟล์ต้องไม่เกิน ${limit / 1024 / 1024}MB`, "error"); return false; }
    return true;
  };

  const handleStatusUpdate = async (teamId: string, status: 'Approved' | 'Rejected') => { 
      const currentTeam = editForm?.team || localTeams.find(t => t.id === teamId); 
      if (!currentTeam) return; 
      if (status === 'Rejected') { setRejectReasonInput(''); setRejectModal({ isOpen: true, teamId }); return; } 
      await performStatusUpdate(teamId, status, currentTeam.group, '');
  };

  const confirmReject = async () => {
      if (!rejectModal.teamId) return;
      if (!rejectReasonInput.trim()) { notify("แจ้งเตือน", "กรุณาระบุเหตุผล", "warning"); return; }
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
      try { await updateTeamStatus(teamId, status, group, reason); notify("สำเร็จ", status === 'Approved' ? "อนุมัติทีมเรียบร้อย" : "บันทึกการไม่อนุมัติเรียบร้อย", "success"); onRefresh(); } catch (e) { console.error(e); notify("ผิดพลาด", "บันทึกสถานะไม่สำเร็จ", "error"); setLocalTeams(initialTeams); } finally { setIsSavingTeam(false); }
  };

  const handleSettingsLogoChange = async (file: File) => {
      if (!file || !validateFile(file, 'image')) return;
      try { const preview = URL.createObjectURL(file); setSettingsLogoPreview(preview); const base64 = await fileToBase64(file); setConfigForm(prev => ({ ...prev, competitionLogo: base64 })); } catch (e) { console.error("Logo Error", e); }
  };

  const handleObjectiveImageChange = async (file: File) => {
      if (!file || !validateFile(file, 'image')) return;
      try { const preview = URL.createObjectURL(file); setObjectiveImagePreview(preview); const base64 = await fileToBase64(file); setConfigForm(prev => ({ ...prev, objectiveImageUrl: base64 })); } catch (e) { console.error("Obj Img Error", e); }
  };

  const handleSaveConfig = async () => { setIsSavingSettings(true); await saveSettings(configForm); await onRefresh(); setIsSavingSettings(false); notify("สำเร็จ", "บันทึกการตั้งค่าเรียบร้อย", "success"); };
  const handleEditFieldChange = (field: keyof Team, value: string) => { if (editForm) setEditForm({ ...editForm, team: { ...editForm.team, [field]: value } }); };
  const handleColorChange = (type: 'primary' | 'secondary', color: string) => {
      if (!editForm) return;
      const p = type === 'primary' ? color : editPrimaryColor;
      const s = type === 'secondary' ? color : editSecondaryColor;
      if (type === 'primary') setEditPrimaryColor(color); else setEditSecondaryColor(color);
      handleEditFieldChange('color', JSON.stringify([p, s]));
  };
  const handlePlayerChange = (index: number, field: keyof Player, value: string) => { if (editForm) { const updatedPlayers = [...editForm.players]; updatedPlayers[index] = { ...updatedPlayers[index], [field]: value }; setEditForm({ ...editForm, players: updatedPlayers }); } };
  const handleDateInput = (index: number, value: string) => {
      let cleaned = value.replace(/[^0-9]/g, ''); if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
      let formatted = cleaned; if (cleaned.length > 2) formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2); if (cleaned.length > 4) formatted = formatted.substring(0, 5) + '/' + cleaned.substring(4);
      handlePlayerChange(index, 'birthDate', formatted);
  };
  const handlePlayerPhotoChange = async (index: number, file: File) => {
      if (editForm && file) { if (!validateFile(file, 'image')) return; try { const base64 = await fileToBase64(file); const updatedPlayers = [...editForm.players]; updatedPlayers[index] = { ...updatedPlayers[index], photoUrl: base64 }; setEditForm({ ...editForm, players: updatedPlayers }); } catch (e) { console.error("Error converting player photo", e); } }
  };
  const handleFileChange = (type: 'logo' | 'slip' | 'doc', file: File) => {
      if (editForm && file) {
          if (type === 'doc') { if (!validateFile(file, 'doc')) return; } else { if (!validateFile(file, 'image')) return; }
          const previewUrl = URL.createObjectURL(file);
          if (type === 'logo') setEditForm({ ...editForm, newLogo: file, logoPreview: previewUrl }); else if (type === 'slip') setEditForm({ ...editForm, newSlip: file, slipPreview: previewUrl }); else if (type === 'doc') setEditForm({ ...editForm, newDoc: file });
      }
  };
  const handleAddPlayer = () => { if (!editForm) return; const newPlayer: Player = { id: `TEMP_${Date.now()}_${Math.floor(Math.random()*1000)}`, teamId: editForm.team.id, name: '', number: '', position: 'Player', photoUrl: '', birthDate: '' }; setEditForm({ ...editForm, players: [...editForm.players, newPlayer] }); };
  const handleRemovePlayer = (index: number) => { if (!editForm) return; const updatedPlayers = editForm.players.filter((_, i) => i !== index); setEditForm({ ...editForm, players: updatedPlayers }); };
  const handleRemovePlayerPhoto = (index: number) => {
      if (editForm) {
          const updatedPlayers = [...editForm.players];
          updatedPlayers[index] = { ...updatedPlayers[index], photoUrl: '' }; // Clear photo URL
          setEditForm({ ...editForm, players: updatedPlayers });
      }
  };

  const handleSaveTeamChanges = async () => {
      if (!editForm) return;
      setIsSavingTeam(true);
      try {
          let logoBase64 = editForm.team.logoUrl; let slipBase64 = editForm.team.slipUrl; let docBase64 = editForm.team.docUrl;
          if (editForm.newLogo) logoBase64 = await fileToBase64(editForm.newLogo);
          if (editForm.newSlip) slipBase64 = await fileToBase64(editForm.newSlip);
          if (editForm.newDoc) docBase64 = await fileToBase64(editForm.newDoc);
          const teamToSave = { ...editForm.team, logoUrl: logoBase64, slipUrl: slipBase64, docUrl: docBase64 };
          await updateTeamData(teamToSave, editForm.players);
          setLocalTeams(prev => prev.map(t => t.id === teamToSave.id ? teamToSave : t));
          setLocalPlayers(prev => { const others = prev.filter(p => p.teamId !== teamToSave.id); return [...others, ...editForm.players]; });
          setSelectedTeam(teamToSave); setIsEditingTeam(false); notify("สำเร็จ", "บันทึกผลการแก้ไขแล้ว", "success"); onRefresh();
      } catch (error) { console.error(error); notify("ผิดพลาด", "เกิดข้อผิดพลาดในการบันทึก", "error"); } finally { setIsSavingTeam(false); }
  };
  
  const handleEditNews = (item: NewsItem) => { 
      setNewsForm({ 
          id: item.id, 
          title: item.title, 
          content: item.content, 
          imageFile: null, 
          imagePreview: item.imageUrl || null, 
          docFile: null,
          tournamentId: item.tournamentId || 'global' 
      }); 
      setIsEditingNews(true); 
      const formElement = document.getElementById('news-form-anchor'); 
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth' }); 
  };

  const handleSaveNews = async () => { 
      if(!newsForm.title || !newsForm.content) { notify("ข้อมูลไม่ครบ", "กรุณาระบุหัวข้อและเนื้อหาข่าว", "warning"); return; } 
      if (newsForm.imageFile && !validateFile(newsForm.imageFile, 'image')) return;
      if (newsForm.docFile && !validateFile(newsForm.docFile, 'doc')) return;
      setIsSavingNews(true); 
      try { 
          const imageBase64 = newsForm.imageFile ? await fileToBase64(newsForm.imageFile) : undefined; const docBase64 = newsForm.docFile ? await fileToBase64(newsForm.docFile) : undefined; 
          const newsData: Partial<NewsItem> = { 
              id: newsForm.id || Date.now().toString(), 
              title: newsForm.title, 
              content: newsForm.content, 
              timestamp: Date.now(),
              tournamentId: newsForm.tournamentId 
          }; 
          if (imageBase64) newsData.imageUrl = imageBase64; if (docBase64) newsData.documentUrl = docBase64; 
          const action = isEditingNews ? 'edit' : 'add'; await manageNews(action, newsData); 
          setNewsForm({ id: null, title: '', content: '', imageFile: null, imagePreview: null, docFile: null, tournamentId: 'global' }); 
          setIsEditingNews(false); notify("สำเร็จ", isEditingNews ? "แก้ไขข่าวเรียบร้อย" : "เพิ่มข่าวเรียบร้อย", "success"); 
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

  const handleNewsImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setNewsForm({ ...newsForm, imageFile: file, imagePreview: URL.createObjectURL(file) });
      }
  };

  const handleNewsDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setNewsForm({ ...newsForm, docFile: e.target.files[0] });
      }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 pb-24">
      {deleteNewsId && (<div className="fixed inset-0 z-[1300] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200"><div className="flex items-center gap-3 text-red-600 mb-4"><AlertTriangle className="w-8 h-8" /><h3 className="font-bold text-lg">ยืนยันการลบข่าว?</h3></div><p className="text-slate-600 mb-6">คุณต้องการลบข่าวนี้อย่างถาวรใช่หรือไม่?</p><div className="flex gap-3"><button onClick={() => setDeleteNewsId(null)} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">ยกเลิก</button><button onClick={confirmDeleteNews} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold">ลบข่าว</button></div></div></div>)}

      {rejectModal.isOpen && (
          <div className="fixed inset-0 z-[1300] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
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

      {selectedDonation && (
          <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedDonation(null)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                      <h3 className="font-bold text-lg">ตรวจสอบยอดบริจาค</h3>
                      <button onClick={() => setSelectedDonation(null)}><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[70vh]">
                      <div className="mb-4 text-center">
                          <div className="text-sm text-slate-500 mb-1">ผู้บริจาค</div>
                          <div className="text-xl font-bold text-slate-800">{selectedDonation.donorName}</div>
                          <div className="text-2xl font-bold text-indigo-600 my-2">{selectedDonation.amount.toLocaleString()} บาท</div>
                          <div className="text-xs text-slate-400">{selectedDonation.timestamp}</div>
                      </div>
                      <div className="bg-slate-100 rounded-xl p-2 mb-4 border border-slate-200">
                          {selectedDonation.slipUrl ? (
                              <img src={selectedDonation.slipUrl} className="w-full h-auto rounded-lg" />
                          ) : (
                              <div className="h-32 flex items-center justify-center text-slate-400">No Image</div>
                          )}
                      </div>
                      <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                          <p><b>เบอร์โทร:</b> {selectedDonation.phone}</p>
                          <p><b>e-Donation:</b> {selectedDonation.isEdonation ? 'ใช่' : 'ไม่'}</p>
                          {selectedDonation.isEdonation && <p><b>Tax ID:</b> {selectedDonation.taxId}</p>}
                          {selectedDonation.isEdonation && <p><b>ที่อยู่:</b> {selectedDonation.address}</p>}
                      </div>
                  </div>
                  <div className="p-4 border-t bg-slate-50 flex gap-3">
                      <button 
                        onClick={() => handleVerifyDonation(selectedDonation.id, 'Rejected')} 
                        disabled={isVerifyingDonation}
                        className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50"
                      >
                          ปฏิเสธ
                      </button>
                      <button 
                        onClick={() => handleVerifyDonation(selectedDonation.id, 'Verified')} 
                        disabled={isVerifyingDonation}
                        className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md"
                      >
                          {isVerifyingDonation ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : 'ยืนยันยอด'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">ระบบจัดการการแข่งขัน</h1>
                <p className="text-slate-500 flex items-center gap-2">
                    Admin Control Panel
                    {currentTournament && (
                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Trophy className="w-3 h-3"/> กำลังจัดการ: {currentTournament.name}
                        </span>
                    )}
                </p>
            </div>
            <div className="flex gap-3 flex-wrap">
                <button onClick={() => setActiveTab('teams')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'teams' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>จัดการทีม</button>
                <button onClick={() => setActiveTab('news')} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'news' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><Bell className="w-4 h-4" /> ข่าวสาร</button>
                <button onClick={() => setActiveTab('donations')} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'donations' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><DollarSign className="w-4 h-4" /> เงินบริจาค</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><UserCog className="w-4 h-4" /> ผู้ใช้งาน</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><Settings className="w-4 h-4" /> ตั้งค่า</button>
                <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100"><LogOut className="w-4 h-4" /></button>
            </div>
        </div>

        {/* --- TEAMS TAB --- */}
        {activeTab === 'teams' && (
            <div className="animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"><div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex items-center justify-between"><div><p className="text-slate-500 text-sm">ทีมทั้งหมด</p><p className="text-3xl font-bold text-indigo-600">{localTeams.length}</p></div><div className="p-3 bg-indigo-50 rounded-full"><Users className="w-6 h-6 text-indigo-600" /></div></div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex items-center justify-between"><div><p className="text-slate-500 text-sm">รอการอนุมัติ</p><p className="text-3xl font-bold text-orange-500">{localTeams.filter(t => t.status !== 'Approved' && t.status !== 'Rejected').length}</p></div><div className="p-3 bg-orange-50 rounded-full"><ShieldAlert className="w-6 h-6 text-orange-500" /></div></div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="flex items-center justify-between"><div><p className="text-slate-500 text-sm">อนุมัติแล้ว</p><p className="text-3xl font-bold text-green-600">{localTeams.filter(t => t.status === 'Approved').length}</p></div><div className="p-3 bg-green-50 rounded-full"><ShieldCheck className="w-6 h-6 text-green-600" /></div></div></div></div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4"><h2 className="font-bold text-lg text-slate-800">รายชื่อทีมลงทะเบียน</h2><div className="flex gap-2 w-full md:w-auto"><div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" placeholder="ค้นหาทีม / จังหวัด..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div><button onClick={downloadCSV} className="flex items-center gap-2 text-sm px-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-700 font-medium"><Download className="w-4 h-4" /> Export CSV</button><button onClick={onRefresh} className="text-sm px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">รีเฟรช</button></div></div><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>ชื่อทีม/โรงเรียน</th><th className="p-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('group')}>กลุ่ม</th><th className="p-4 font-medium">ผู้ติดต่อ</th><th className="p-4 font-medium text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>สถานะ</th><th className="p-4 font-medium text-right">จัดการ</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredTeams.map(team => (<tr key={team.id} className="hover:bg-slate-50"><td className="p-4"><div className="flex items-center gap-3">{team.logoUrl ? <img src={team.logoUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200" /> : <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">{team.shortName}</div>}<div><p className="font-bold text-slate-800">{team.name}</p><p className="text-xs text-slate-500">{team.district}, {team.province}</p></div></div></td><td className="p-4">{team.group ? <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">{team.group}</span> : <span className="text-slate-300 text-xs">-</span>}</td><td className="p-4 text-sm"><div className="flex items-center gap-2 group"><span>{team.managerPhone || team.coachPhone || team.directorName}</span><button onClick={() => copyToClipboard(team.managerPhone || team.coachPhone || '')} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition"><Copy className="w-3 h-3" /></button></div><p className="text-xs text-slate-400">ผจก: {team.managerName}</p></td><td className="p-4 text-center"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${team.status === 'Approved' ? 'bg-green-100 text-green-800' : team.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{team.status || 'Pending'}</span></td><td className="p-4 text-right"><button onClick={() => setSelectedTeam(team)} className="bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-2 ml-auto shadow-sm"><Eye className="w-4 h-4" /> รายละเอียด</button></td></tr>))} {filteredTeams.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>}</tbody></table></div></div></div>
        )}

        {/* --- NEWS TAB --- */}
        {activeTab === 'news' && (
            <div className="animate-in fade-in duration-300">
                {/* News Form: Update to support Tournament Selection and File Upload */}
                <div id="news-form-anchor" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        {isEditingNews ? <Edit3 className="w-5 h-5 text-orange-500"/> : <Plus className="w-5 h-5 text-green-500"/>}
                        {isEditingNews ? 'แก้ไขข่าวสาร' : 'สร้างข่าวสารใหม่'}
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">หัวข้อข่าว</label>
                                <input type="text" value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="เช่น กำหนดการแข่งขัน..." />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ประกาศสำหรับ</label>
                                <select 
                                    value={newsForm.tournamentId} 
                                    onChange={e => setNewsForm({...newsForm, tournamentId: e.target.value})} 
                                    className="w-full p-2 border rounded-lg text-sm bg-white"
                                >
                                    <option value="global">ทุกรายการ (Global)</option>
                                    {currentTournament && <option value={currentTournament.id}>{currentTournament.name}</option>}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">เนื้อหาข่าว</label>
                            <textarea value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} className="w-full p-2 border rounded-lg text-sm h-32" placeholder="รายละเอียด..." />
                        </div>
                        
                        {/* News File Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">รูปภาพปก</label>
                                <div className="flex items-center gap-4">
                                    {newsForm.imagePreview ? <img src={newsForm.imagePreview} className="w-16 h-16 object-cover rounded-lg border"/> : <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><Image className="w-6 h-6"/></div>}
                                    <label className="cursor-pointer bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 transition">
                                        เลือกรูปภาพ
                                        <input type="file" accept="image/*" className="hidden" onChange={handleNewsImageChange} />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">เอกสารแนบ (PDF)</label>
                                <div className="flex items-center gap-4">
                                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${newsForm.docFile || newsForm.title ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <FileText className="w-6 h-6"/>
                                    </div>
                                    <div className="flex-1">
                                        <label className="cursor-pointer bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 transition inline-block mb-1">
                                            เลือกไฟล์เอกสาร
                                            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleNewsDocChange} />
                                        </label>
                                        <p className="text-xs text-slate-500 truncate">{newsForm.docFile ? newsForm.docFile.name : (isEditingNews && 'เอกสารเดิม (ถ้ามี)')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            {isEditingNews && <button onClick={() => { setIsEditingNews(false); setNewsForm({id: null, title: '', content: '', imageFile: null, imagePreview: null, docFile: null, tournamentId: 'global'}); }} className="px-4 py-2 border rounded-lg text-slate-500 hover:bg-slate-50">ยกเลิก</button>}
                            <button onClick={handleSaveNews} disabled={isSavingNews} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2">
                                {isSavingNews ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} บันทึก
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* News List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {news.map(item => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                                <button onClick={() => handleEditNews(item)} className="p-1.5 bg-white text-orange-500 rounded shadow hover:bg-orange-50"><Edit3 className="w-4 h-4"/></button>
                                <button onClick={() => triggerDeleteNews(item.id)} className="p-1.5 bg-white text-red-500 rounded shadow hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                            </div>
                            {item.imageUrl && <div className="h-40 bg-slate-100"><img src={item.imageUrl} className="w-full h-full object-cover"/></div>}
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                                    {(!item.tournamentId || item.tournamentId === 'global') && (
                                        <span title="Global News">
                                            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mb-2">{new Date(item.timestamp).toLocaleDateString()}</p>
                                <p className="text-sm text-slate-600 line-clamp-2">{item.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ... (Users, Donations, Settings Tabs - Unchanged) ... */}
        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
            <div className="animate-in fade-in duration-300 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><UserCog className="w-5 h-5 text-indigo-600"/> จัดการผู้ใช้งาน</h2>
                    <button onClick={loadUsers} className="text-sm px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">รีเฟรช</button>
                </div>
                {isLoadingUsers ? <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600"/></div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-sm">
                                <tr>
                                    <th className="p-4 font-medium">ชื่อผู้ใช้ / Display Name</th>
                                    <th className="p-4 font-medium">Username / Login ID</th>
                                    <th className="p-4 font-medium">เบอร์โทร</th>
                                    <th className="p-4 font-medium">สิทธิ์ (Role)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {userList.map(u => (
                                    <tr key={u.userId} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {u.pictureUrl ? <img src={u.pictureUrl} className="w-8 h-8 rounded-full"/> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-4 h-4 text-slate-500"/></div>}
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{u.displayName}</span>
                                                    {u.lineUserId && <span className="text-[10px] text-green-600">LINE Connected</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">{u.username || 'LINE User'}</td>
                                        <td className="p-4 text-sm text-slate-500">{u.phoneNumber || '-'}</td>
                                        <td className="p-4">
                                            <select 
                                                value={u.role || 'user'} 
                                                onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                                                className={`p-1 border rounded text-sm font-bold ${u.role === 'admin' ? 'text-red-600 border-red-200 bg-red-50' : 'text-slate-600 border-slate-200'}`}
                                            >
                                                <option value="user">User</option>
                                                <option value="staff">Staff</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {/* --- DONATIONS TAB --- */}
        {activeTab === 'donations' && (
            <div className="animate-in fade-in duration-300 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600"/> ตรวจสอบยอดบริจาค</h2>
                    <button onClick={onRefresh} className="text-sm px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">รีเฟรช</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm">
                            <tr>
                                <th className="p-4 font-medium">วันที่</th>
                                <th className="p-4 font-medium">ผู้บริจาค</th>
                                <th className="p-4 font-medium text-right">ยอดเงิน</th>
                                <th className="p-4 font-medium text-center">สถานะ</th>
                                <th className="p-4 font-medium text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {donationList.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">ยังไม่มีข้อมูลการบริจาค</td></tr> : 
                            donationList.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-sm text-slate-500">{new Date(d.timestamp).toLocaleDateString('th-TH')}</td>
                                    <td className="p-4 font-bold text-slate-700">{d.donorName} <span className="text-xs font-normal text-slate-400 block">{d.phone}</span></td>
                                    <td className="p-4 text-right font-mono font-bold text-indigo-600">{d.amount.toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${d.status === 'Verified' ? 'bg-green-100 text-green-700' : d.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {d.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setSelectedDonation(d)} className="text-sm bg-white border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-100 text-slate-600 font-bold">ตรวจสอบ</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-300 max-w-4xl mx-auto space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                 <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                 <div>
                     <p className="text-sm text-blue-800 font-bold mb-1">Global Settings</p>
                     <p className="text-xs text-blue-600">การตั้งค่าที่นี่จะมีผลกับค่าเริ่มต้นของระบบ หากต้องการตั้งค่าเฉพาะเจาะจง ให้ใช้เมนูตั้งค่าในแต่ละ Tournament</p>
                 </div>
            </div>

            {/* Competition Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-indigo-600"/> ข้อมูลพื้นฐาน (Default)</h3>
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
            
            <button onClick={handleSaveConfig} disabled={isSavingSettings} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                {isSavingSettings ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} บันทึกการตั้งค่าทั้งหมด
            </button>
          </div>
        )}

        {/* Team Editing Modal - Full Implementation */}
        {editForm && selectedTeam && (
            <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => { setSelectedTeam(null); setEditForm(null); setIsEditingTeam(false); }}>
                <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8 animate-in zoom-in duration-200 relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-10 shrink-0">
                        <h3 className="font-bold text-lg flex items-center gap-2">{isEditingTeam ? <Edit3 className="w-5 h-5 text-orange-400" /> : <Eye className="w-5 h-5 text-indigo-400" />} {isEditingTeam ? 'แก้ไขข้อมูลทีม' : 'รายละเอียดทีม'}</h3>
                        <div className="flex gap-2">
                            {!isEditingTeam && (
                                <button onClick={() => setIsEditingTeam(true)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition">แก้ไข</button>
                            )}
                            <button onClick={() => { setSelectedTeam(null); setEditForm(null); setIsEditingTeam(false); }} className="hover:bg-slate-700 p-1 rounded-full"><X className="w-5 h-5"/></button>
                        </div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                        {!isEditingTeam ? (
                            // --- VIEW MODE ---
                            <div className="space-y-6">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-6">
                                    {editForm.team.logoUrl ? <img src={editForm.team.logoUrl} className="w-24 h-24 object-contain bg-slate-50 rounded-lg p-1"/> : <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400"><Image className="w-10 h-10"/></div>}
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-slate-800">{editForm.team.name}</h2>
                                        <p className="text-slate-500">{editForm.team.district}, {editForm.team.province}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${editForm.team.status === 'Approved' ? 'bg-green-100 text-green-700' : editForm.team.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{editForm.team.status}</span>
                                            {editForm.team.group && <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">Group {editForm.team.group}</span>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                        <h4 className="font-bold text-slate-700 mb-3 border-b pb-1">ข้อมูลติดต่อ</h4>
                                        <div className="space-y-2 text-sm">
                                            <p><span className="text-slate-400 block text-xs">ผู้อำนวยการ</span> {editForm.team.directorName || '-'}</p>
                                            <p><span className="text-slate-400 block text-xs">ผู้จัดการทีม</span> {editForm.team.managerName} ({editForm.team.managerPhone})</p>
                                            <p><span className="text-slate-400 block text-xs">ผู้ฝึกสอน</span> {editForm.team.coachName} ({editForm.team.coachPhone})</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                        <h4 className="font-bold text-slate-700 mb-3 border-b pb-1">เอกสารแนบ</h4>
                                        <div className="space-y-3">
                                            {editForm.team.docUrl ? <a href={editForm.team.docUrl} target="_blank" className="flex items-center gap-2 text-indigo-600 text-sm hover:underline"><FileText className="w-4 h-4"/> ใบสมัคร</a> : <span className="text-slate-400 text-sm">ไม่มีใบสมัคร</span>}
                                            {editForm.team.slipUrl ? <a href={editForm.team.slipUrl} target="_blank" className="flex items-center gap-2 text-indigo-600 text-sm hover:underline"><FileCheck className="w-4 h-4"/> สลิปโอนเงิน</a> : <span className="text-slate-400 text-sm">ไม่มีสลิป</span>}
                                        </div>
                                        <div className="mt-4 pt-4 border-t flex gap-2">
                                            <button onClick={() => handleStatusUpdate(editForm.team.id, 'Approved')} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">อนุมัติ</button>
                                            <button onClick={() => handleStatusUpdate(editForm.team.id, 'Rejected')} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700">ไม่อนุมัติ</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <h4 className="font-bold text-slate-700 mb-3 border-b pb-1">รายชื่อนักกีฬา ({editForm.players.length})</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {editForm.players.map(p => (
                                            <div key={p.id} className="flex items-center gap-3 p-2 border rounded-lg">
                                                {p.photoUrl ? <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover"/> : <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400"><User className="w-5 h-5"/></div>}
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800">{p.name}</p>
                                                    <p className="text-xs text-slate-500">#{p.number} • {p.position}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // --- EDIT MODE ---
                            <div className="space-y-6">
                                {/* Basic Info Edit */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                                    <h4 className="font-bold text-slate-700 border-b pb-2">ข้อมูลพื้นฐาน</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-500">ชื่อโรงเรียน/ทีม</label>
                                            <input type="text" value={editForm.team.name} onChange={e => handleEditFieldChange('name', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">อำเภอ</label>
                                            <input type="text" value={editForm.team.district} onChange={e => handleEditFieldChange('district', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">จังหวัด</label>
                                            <input type="text" value={editForm.team.province} onChange={e => handleEditFieldChange('province', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">กลุ่ม (Group)</label>
                                            <input type="text" value={editForm.team.group || ''} onChange={e => handleEditFieldChange('group', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="A, B, C..."/>
                                        </div>
                                    </div>
                                    
                                    {/* Colors & Logo */}
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">สีประจำทีม</label>
                                            <div className="flex gap-2 mt-1">
                                                <input type="color" value={editPrimaryColor} onChange={e => handleColorChange('primary', e.target.value)} className="h-8 w-12 p-0 border-0 rounded"/>
                                                <input type="color" value={editSecondaryColor} onChange={e => handleColorChange('secondary', e.target.value)} className="h-8 w-12 p-0 border-0 rounded"/>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500">โลโก้ทีม</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                {editForm.logoPreview ? <img src={editForm.logoPreview} className="w-8 h-8 object-contain bg-white border rounded"/> : <div className="w-8 h-8 bg-slate-200 rounded"></div>}
                                                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFileChange('logo', e.target.files[0])} className="text-xs w-full"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Personnel Edit */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                                    <h4 className="font-bold text-slate-700 border-b pb-2">บุคลากร</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" placeholder="ผอ." value={editForm.team.directorName} onChange={e => handleEditFieldChange('directorName', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                                        <input type="text" placeholder="ผู้จัดการ" value={editForm.team.managerName} onChange={e => handleEditFieldChange('managerName', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                                        <input type="text" placeholder="เบอร์ผจก." value={editForm.team.managerPhone} onChange={e => handleEditFieldChange('managerPhone', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                                        <input type="text" placeholder="โค้ช" value={editForm.team.coachName} onChange={e => handleEditFieldChange('coachName', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                                        <input type="text" placeholder="เบอร์โค้ช" value={editForm.team.coachPhone} onChange={e => handleEditFieldChange('coachPhone', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                                    </div>
                                </div>

                                {/* Documents Edit */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                                    <h4 className="font-bold text-slate-700 border-b pb-2">อัปโหลดเอกสารใหม่</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">ใบสมัคร (Doc/PDF)</label>
                                            <input type="file" accept=".pdf,.doc,.docx" onChange={e => e.target.files?.[0] && handleFileChange('doc', e.target.files[0])} className="text-xs w-full"/>
                                            {editForm.newDoc && <p className="text-xs text-green-600 mt-1">เลือกไฟล์แล้ว: {editForm.newDoc.name}</p>}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">สลิปโอนเงิน (Image)</label>
                                            <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFileChange('slip', e.target.files[0])} className="text-xs w-full"/>
                                            {editForm.slipPreview && <img src={editForm.slipPreview} className="mt-2 h-20 rounded border"/>}
                                        </div>
                                    </div>
                                </div>

                                {/* Players Edit */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                                        <h4 className="font-bold text-slate-700">รายชื่อนักกีฬา</h4>
                                        <button onClick={handleAddPlayer} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100">+ เพิ่ม</button>
                                    </div>
                                    <div className="space-y-3">
                                        {editForm.players.map((p, idx) => (
                                            <div key={idx} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <div className="w-12 h-12 bg-white rounded overflow-hidden shrink-0 border relative group">
                                                    {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover"/> : <User className="w-full h-full p-2 text-slate-300"/>}
                                                    <button onClick={() => handleRemovePlayerPhoto(idx)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 z-20"><X className="w-3 h-3"/></button>
                                                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer text-white transition z-10">
                                                        <Camera className="w-4 h-4"/>
                                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePlayerPhotoChange(idx, e.target.files[0])} />
                                                    </label>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex gap-2">
                                                        <input type="number" placeholder="#" value={p.number} onChange={e => handlePlayerChange(idx, 'number', e.target.value)} className="w-12 p-1 text-xs border rounded text-center"/>
                                                        <input type="text" placeholder="ชื่อ-นามสกุล" value={p.name} onChange={e => handlePlayerChange(idx, 'name', e.target.value)} className="flex-1 p-1 text-xs border rounded"/>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input type="text" placeholder="วว/ดด/ปปปป" value={p.birthDate || ''} onChange={e => handleDateInput(idx, e.target.value)} className="w-24 p-1 text-xs border rounded"/>
                                                        <input type="text" placeholder="ตำแหน่ง" value={p.position} onChange={e => handlePlayerChange(idx, 'position', e.target.value)} className="flex-1 p-1 text-xs border rounded"/>
                                                        <button onClick={() => handleRemovePlayer(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0">
                        {isEditingTeam ? (
                            <>
                                <button onClick={() => setIsEditingTeam(false)} className="px-4 py-2 border rounded-lg text-slate-500 hover:bg-slate-50">ยกเลิกแก้ไข</button>
                                <button onClick={handleSaveTeamChanges} disabled={isSavingTeam} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2">
                                    {isSavingTeam ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} บันทึก
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setSelectedTeam(null)} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-bold">ปิด</button>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
