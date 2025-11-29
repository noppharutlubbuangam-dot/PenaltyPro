import React, { useState, useEffect } from 'react';
import { Tournament, TournamentConfig } from '../types';
import { Trophy, Plus, ArrowRight, Loader2, Calendar, Target, CheckCircle2, Users, Settings, Edit2, X, Save, ArrowLeft, FileCheck, Clock, Shield } from 'lucide-react';
import { createTournament, updateTournament } from '../services/sheetService';

interface TournamentSelectorProps {
  tournaments: Tournament[];
  onSelect: (id: string) => void;
  isAdmin: boolean;
  onRefresh: () => void;
  // เพิ่ม showNotification prop
  showNotification?: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const TournamentSelector: React.FC<TournamentSelectorProps> = ({ tournaments, onSelect, isAdmin, onRefresh, showNotification }) => {
  // ... (States remain same) ...
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneyType, setNewTourneyType] = useState('Penalty');
  const [editConfig, setEditConfig] = useState<TournamentConfig>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editStep, setEditStep] = useState<'form' | 'summary'>('form');

  const notify = (title: string, msg: string, type: 'success' | 'error' | 'info' | 'warning') => {
      if (showNotification) showNotification(title, msg, type);
      else alert(`${title}: ${msg}`);
  };

  const handleCreate = async () => {
      if (!newTourneyName) return;
      setIsSubmitting(true);
      try {
          const newId = await createTournament(newTourneyName, newTourneyType);
          if (newId) {
              await onRefresh();
              onSelect(newId);
              notify("สำเร็จ", "สร้างรายการแข่งขันใหม่เรียบร้อย", "success");
          } else {
              notify("ผิดพลาด", "สร้างรายการไม่สำเร็จ", "error");
          }
      } catch (e) {
          console.error(e);
          notify("ผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
      } finally {
          setIsSubmitting(false);
          setIsCreating(false);
      }
  };

  const handleReview = () => {
      if (!editingTournament?.name) {
          notify("ข้อมูลไม่ครบ", "กรุณาระบุชื่อรายการ", "warning");
          return;
      }
      setEditStep('summary');
  };

  const handleUpdate = async () => {
      if (!editingTournament) return;
      setIsSubmitting(true);
      try {
          const finalConfig = { ...editConfig };
          if (editingTournament.type !== 'Penalty') {
              if (finalConfig.halfTimeDuration === undefined) finalConfig.halfTimeDuration = 20;
              if (finalConfig.playersPerTeam === undefined) finalConfig.playersPerTeam = 7;
              if (finalConfig.maxSubs === undefined) finalConfig.maxSubs = 0;
              if (finalConfig.extraTime === undefined) finalConfig.extraTime = false;
          }

          const updatedTournament = {
              ...editingTournament,
              config: JSON.stringify(finalConfig)
          };
          
          const success = await updateTournament(updatedTournament);
          
          if (success) {
              await onRefresh(); 
              setIsEditing(false);
              setEditingTournament(null);
              notify("บันทึกสำเร็จ", "อัปเดตข้อมูลทัวร์นาเมนต์เรียบร้อยแล้ว", "success");
          } else {
              notify("บันทึกไม่สำเร็จ", "ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่", "error");
          }
      } catch (e) {
          console.error(e);
          notify("ผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const openEdit = (e: React.MouseEvent, t: Tournament) => {
      e.stopPropagation();
      setEditingTournament({...t}); 
      try {
          const parsed = JSON.parse(t.config || '{}');
          setEditConfig(parsed);
      } catch(e) {
          setEditConfig({});
      }
      setEditStep('form');
      setIsEditing(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center justify-center font-sans">
        <div className="max-w-4xl w-full">
            {/* Header Section with Animation */}
            <div className="text-center mb-12 animate-in slide-in-from-top-10 duration-700">
                <div className="inline-flex p-5 bg-white rounded-full shadow-xl mb-6 ring-4 ring-indigo-50">
                    <Trophy className="w-16 h-16 text-yellow-500 drop-shadow-md" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tight">
                    Penalty Pro <span className="text-indigo-600">Arena</span>
                </h1>
                <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed">
                    แพลตฟอร์มบริหารจัดการการแข่งขันฟุตบอลครบวงจร<br/>
                    <span className="text-sm text-slate-400">เลือกรายการแข่งขันเพื่อเริ่มต้นใช้งาน</span>
                </p>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-1000 delay-200">
                {tournaments.map(t => (
                    <div key={t.id} className="relative group perspective-1000">
                        <button 
                            onClick={() => onSelect(t.id)}
                            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 hover:border-indigo-200 transition-all duration-300 text-left relative overflow-hidden h-full flex flex-col justify-between group-hover:bg-gradient-to-b from-white to-indigo-50/30"
                        >
                            <div className="absolute -top-6 -right-6 w-32 h-32 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                            
                            <div className="relative z-10 w-full">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 ${t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        <span className={`w-2 h-2 rounded-full ${t.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                        {t.status}
                                    </span>
                                    <span className="px-3 py-1 bg-white border border-slate-100 text-indigo-600 rounded-full text-[10px] font-bold shadow-sm">
                                        {t.type}
                                    </span>
                                </div>
                                <h3 className="font-bold text-xl text-slate-800 mb-2 line-clamp-2 pr-2 leading-tight group-hover:text-indigo-700 transition-colors">{t.name}</h3>
                                <div className="text-xs text-slate-400 font-mono mb-6 bg-slate-50 inline-block px-2 py-1 rounded">ID: {t.id.slice(-6)}</div>
                                
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 duration-300">
                                        เข้าสู่ระบบ <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </button>
                        
                        {/* Admin Config Button */}
                        {isAdmin && (
                            <button 
                                onClick={(e) => openEdit(e, t)}
                                className="absolute top-4 right-4 bg-white/80 backdrop-blur border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 p-2 rounded-full shadow-sm transition z-20 hover:rotate-90 duration-300"
                                title="ตั้งค่ารายการ"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}

                {isAdmin && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-slate-100 p-6 rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 min-h-[220px] group cursor-pointer"
                    >
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Plus className="w-8 h-8 text-indigo-400 group-hover:text-indigo-600" />
                        </div>
                        <span className="font-bold text-sm tracking-wide">สร้างรายการใหม่</span>
                    </button>
                )}
            </div>
        </div>

        {/* Create Modal */}
        {isCreating && (
            <div className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm animate-in zoom-in duration-300 border border-white/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                    <h3 className="font-black text-2xl text-slate-800 mb-6">สร้างทัวร์นาเมนต์ใหม่</h3>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">ชื่อรายการแข่งขัน</label>
                            <input 
                                type="text" 
                                value={newTourneyName} 
                                onChange={e => setNewTourneyName(e.target.value)} 
                                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition font-bold text-slate-700 bg-slate-50 focus:bg-white"
                                placeholder="เช่น ฟุตบอลประเพณี 2024"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">รูปแบบการแข่ง</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setNewTourneyType('Penalty')} className={`p-4 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${newTourneyType === 'Penalty' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                                    <Target className="w-6 h-6" /> จุดโทษ
                                </button>
                                <button onClick={() => setNewTourneyType('7v7')} className={`p-4 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${newTourneyType === '7v7' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                                    <Users className="w-6 h-6" /> ฟุตบอล 7 คน
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setIsCreating(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold transition">ยกเลิก</button>
                        <button onClick={handleCreate} disabled={isSubmitting} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition transform active:scale-95">
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'สร้างเลย'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Modal with Steps */}
        {isEditing && editingTournament && (
            <div className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-0 w-full max-w-md animate-in zoom-in duration-300 relative overflow-hidden flex flex-col max-h-[85vh]">
                    <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg">
                                {editStep === 'summary' ? <FileCheck className="w-6 h-6 text-green-400" /> : <Settings className="w-6 h-6 text-indigo-300" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{editStep === 'summary' ? 'ตรวจสอบและยืนยัน' : 'ตั้งค่าทัวร์นาเมนต์'}</h3>
                                <p className="text-xs text-slate-400">แก้ไขข้อมูลและกติกาการแข่งขัน</p>
                            </div>
                        </div>
                        <button onClick={() => setIsEditing(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X className="w-5 h-5"/></button>
                    </div>
                    
                    {editStep === 'form' ? (
                        /* STEP 1: FORM */
                        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                                <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">ข้อมูลทั่วไป</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อรายการ</label>
                                    <input 
                                        type="text" 
                                        value={editingTournament.name} 
                                        onChange={e => setEditingTournament({...editingTournament, name: e.target.value})} 
                                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">สถานะ</label>
                                        <select 
                                            value={editingTournament.status}
                                            onChange={e => setEditingTournament({...editingTournament, status: e.target.value as any})}
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                        >
                                            <option value="Active">Active (เปิดใช้งาน)</option>
                                            <option value="Upcoming">Upcoming (เร็วๆนี้)</option>
                                            <option value="Archived">Archived (เก็บถาวร)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">ประเภท</label>
                                        <select 
                                            value={editingTournament.type}
                                            onChange={e => setEditingTournament({...editingTournament, type: e.target.value as any})}
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white"
                                        >
                                            <option value="Penalty">Penalty (จุดโทษ)</option>
                                            <option value="7v7">7v7 (ฟุตบอล 7 คน)</option>
                                            <option value="11v11">11v11 (ฟุตบอล 11 คน)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Config JSON Fields */}
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                                <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-2 border-b pb-2 flex items-center gap-2"><Shield className="w-4 h-4"/> กติกาการแข่งขัน</h4>
                                
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> วันปิดรับสมัคร</label>
                                    <input 
                                        type="date" 
                                        value={editConfig.registrationDeadline || ''} 
                                        onChange={e => setEditConfig({...editConfig, registrationDeadline: e.target.value})} 
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                                    />
                                    <p className="text-[10px] text-orange-500 mt-1">* หากเลยกำหนด ทีมจะไม่สามารถแก้ไขข้อมูลได้</p>
                                </div>

                                {editingTournament.type !== 'Penalty' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">เวลาแข่งขัน (นาที/ครึ่ง)</label>
                                                <input 
                                                    type="number" 
                                                    value={editConfig.halfTimeDuration || 20} 
                                                    onChange={e => setEditConfig({...editConfig, halfTimeDuration: parseInt(e.target.value)})} 
                                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm text-center font-bold text-indigo-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">ผู้เล่นตัวจริง (คน)</label>
                                                <input 
                                                    type="number" 
                                                    value={editConfig.playersPerTeam || 7} 
                                                    onChange={e => setEditConfig({...editConfig, playersPerTeam: parseInt(e.target.value)})} 
                                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm text-center font-bold text-indigo-600"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนเปลี่ยนตัวสูงสุด (0 = ไม่จำกัด)</label>
                                            <input 
                                                type="number" 
                                                value={editConfig.maxSubs || 0} 
                                                onChange={e => setEditConfig({...editConfig, maxSubs: parseInt(e.target.value)})} 
                                                className="w-full p-3 border border-slate-200 rounded-xl text-sm"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <Target className="w-8 h-8 text-slate-300 mx-auto mb-2"/>
                                        <p className="text-xs text-slate-400">โหมดจุดโทษใช้กติกามาตรฐาน FIFA<br/>ไม่มีการตั้งค่าเวลาเพิ่มเติม</p>
                                    </div>
                                )}
                                
                                {editingTournament.type !== 'Penalty' && (
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                                        <div className="relative flex items-center">
                                            <input 
                                                type="checkbox" 
                                                checked={editConfig.extraTime || false}
                                                onChange={e => setEditConfig({...editConfig, extraTime: e.target.checked})}
                                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">มีการต่อเวลาพิเศษ (Extra Time)</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* STEP 2: SUMMARY VIEW */
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
                                <h4 className="font-bold text-indigo-800 text-sm mb-3 uppercase tracking-wider">ข้อมูลทั่วไป</h4>
                                <div className="space-y-3 text-sm text-slate-700">
                                    <div className="flex justify-between border-b border-indigo-100/50 pb-2">
                                        <span className="text-slate-500">ชื่อรายการ:</span>
                                        <span className="font-bold text-indigo-900">{editingTournament.name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-indigo-100/50 pb-2">
                                        <span className="text-slate-500">สถานะ:</span>
                                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${editingTournament.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{editingTournament.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">ประเภท:</span>
                                        <span className="font-bold bg-white px-2 py-0.5 rounded shadow-sm text-xs">{editingTournament.type}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-500"/> กติกาการแข่งขัน</h4>
                                <div className="space-y-3 text-sm">
                                    {editConfig.registrationDeadline && (
                                        <div className="flex justify-between border-b border-slate-100 pb-2 bg-red-50 p-2 rounded-lg">
                                            <span className="text-red-500 font-bold text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> ปิดรับสมัคร:</span>
                                            <span className="font-black text-red-600">{new Date(editConfig.registrationDeadline).toLocaleDateString('th-TH', { dateStyle: 'long'})}</span>
                                        </div>
                                    )}
                                    {editingTournament.type === 'Penalty' ? (
                                        <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg">ใช้กติกามาตรฐาน FIFA Penalty Shootout</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-slate-50 p-3 rounded-xl text-center">
                                                <div className="text-[10px] text-slate-400 uppercase">เวลาแข่งขัน</div>
                                                <div className="font-black text-indigo-600 text-xl">{editConfig.halfTimeDuration || 20}<span className="text-xs font-normal text-slate-400 ml-1">นาที</span></div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl text-center">
                                                <div className="text-[10px] text-slate-400 uppercase">ผู้เล่น</div>
                                                <div className="font-black text-indigo-600 text-xl">{editConfig.playersPerTeam || 7}<span className="text-xs font-normal text-slate-400 ml-1">คน</span></div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl text-center">
                                                <div className="text-[10px] text-slate-400 uppercase">เปลี่ยนตัว</div>
                                                <div className="font-bold text-slate-700">{editConfig.maxSubs === 0 ? "ไม่จำกัด" : `${editConfig.maxSubs} คน`}</div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl text-center">
                                                <div className="text-[10px] text-slate-400 uppercase">ต่อเวลา</div>
                                                <div className={`font-bold ${editConfig.extraTime ? 'text-green-600' : 'text-slate-400'}`}>{editConfig.extraTime ? "มี" : "ไม่มี"}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-center text-xs text-slate-400 bg-yellow-50 text-yellow-700 p-2 rounded-lg border border-yellow-100 flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3 h-3"/> กรุณาตรวจสอบความถูกต้องก่อนบันทึก
                            </p>
                        </div>
                    )}

                    <div className="p-4 border-t bg-white flex gap-3 shrink-0">
                        {editStep === 'form' ? (
                            <>
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold transition">ยกเลิก</button>
                                <button onClick={handleReview} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition transform active:scale-95">
                                    ตรวจสอบ <ArrowRight className="w-4 h-4"/>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setEditStep('form')} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 font-bold flex items-center justify-center gap-2 transition">
                                    <ArrowLeft className="w-4 h-4"/> กลับไปแก้ไข
                                </button>
                                <button onClick={handleUpdate} disabled={isSubmitting} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition transform active:scale-95">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Save className="w-4 h-4"/> ยืนยันบันทึก</>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default TournamentSelector;