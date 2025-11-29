import React, { useState, useEffect } from 'react';
import { Tournament, TournamentConfig } from '../types';
import { Trophy, Plus, ArrowRight, Loader2, Calendar, Target, CheckCircle2, Users, Settings, Edit2, X, Save, ArrowLeft, FileCheck, Clock, Shield } from 'lucide-react';
import { createTournament, updateTournament } from '../services/sheetService';

interface TournamentSelectorProps {
  tournaments: Tournament[];
  onSelect: (id: string) => void;
  isAdmin: boolean;
  onRefresh: () => void;
}

const TournamentSelector: React.FC<TournamentSelectorProps> = ({ tournaments, onSelect, isAdmin, onRefresh }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  
  // Create State
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneyType, setNewTourneyType] = useState('Penalty');
  
  // Edit Config State
  const [editConfig, setEditConfig] = useState<TournamentConfig>({});
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editStep, setEditStep] = useState<'form' | 'summary'>('form');

  // REMOVED useEffect that resets config on tournament change to prevent data loss
  // Logic moved to openEdit

  const handleCreate = async () => {
      if (!newTourneyName) return;
      setIsSubmitting(true);
      try {
          const newId = await createTournament(newTourneyName, newTourneyType);
          if (newId) {
              onRefresh();
              onSelect(newId);
          } else {
              alert("สร้างรายการไม่สำเร็จ");
          }
      } catch (e) {
          console.error(e);
          alert("เกิดข้อผิดพลาด");
      } finally {
          setIsSubmitting(false);
          setIsCreating(false);
      }
  };

  const handleReview = () => {
      if (!editingTournament?.name) {
          alert("กรุณาระบุชื่อรายการ");
          return;
      }
      setEditStep('summary');
  };

  const handleUpdate = async () => {
      if (!editingTournament) return;
      setIsSubmitting(true);
      try {
          // Ensure defaults are saved if values are missing but type requires them
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
              await onRefresh(); // Refresh data
              setIsEditing(false);
              setEditingTournament(null);
          } else {
              alert("บันทึกไม่สำเร็จ");
          }
      } catch (e) {
          console.error(e);
          alert("เกิดข้อผิดพลาด");
      } finally {
          setIsSubmitting(false);
      }
  };

  const openEdit = (e: React.MouseEvent, t: Tournament) => {
      e.stopPropagation();
      setEditingTournament({...t}); // Clone object to detach reference
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full">
            <div className="text-center mb-10">
                <div className="inline-flex p-4 bg-white rounded-full shadow-lg mb-4">
                    <Trophy className="w-12 h-12 text-yellow-500" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-2">เลือกรายการแข่งขัน</h1>
                <p className="text-slate-500">กรุณาเลือกทัวร์นาเมนต์ที่คุณต้องการเข้าชมหรือจัดการ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournaments.map(t => (
                    <div key={t.id} className="relative group">
                        <button 
                            onClick={() => onSelect(t.id)}
                            className="w-full bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all text-left relative overflow-hidden h-full flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition pointer-events-none">
                                <Trophy className="w-16 h-16 text-indigo-900" />
                            </div>
                            <div className="relative z-10 w-full">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {t.status}
                                    </span>
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                                        {t.type}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1 line-clamp-2 pr-8">{t.name}</h3>
                                <div className="text-xs text-slate-400 mb-4">ID: {t.id}</div>
                                
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-1 text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                        เข้าสู่ระบบ <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </button>
                        
                        {/* Admin Config Button - More Prominent */}
                        {isAdmin && (
                            <button 
                                onClick={(e) => openEdit(e, t)}
                                className="absolute top-3 right-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 px-2 py-1 rounded-lg shadow-sm transition z-20 flex items-center gap-1 text-xs font-bold"
                            >
                                <Settings className="w-3 h-3" /> ตั้งค่า
                            </button>
                        )}
                    </div>
                ))}

                {isAdmin && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-slate-100 p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 min-h-[180px]"
                    >
                        <Plus className="w-10 h-10 mb-2" />
                        <span className="font-bold">สร้างรายการใหม่</span>
                    </button>
                )}
            </div>
        </div>

        {/* Create Modal */}
        {isCreating && (
            <div className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in duration-200">
                    <h3 className="font-bold text-xl text-slate-800 mb-4">สร้างทัวร์นาเมนต์ใหม่</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">ชื่อรายการแข่งขัน</label>
                            <input 
                                type="text" 
                                value={newTourneyName} 
                                onChange={e => setNewTourneyName(e.target.value)} 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="เช่น ฟุตบอลประเพณี 2024"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">รูปแบบการแข่ง</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setNewTourneyType('Penalty')} className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 ${newTourneyType === 'Penalty' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                    <Target className="w-5 h-5" /> จุดโทษ
                                </button>
                                <button onClick={() => setNewTourneyType('7v7')} className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-1 ${newTourneyType === '7v7' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                    <Users className="w-5 h-5" /> ฟุตบอล 7 คน
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => setIsCreating(false)} className="flex-1 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-bold">ยกเลิก</button>
                        <button onClick={handleCreate} disabled={isSubmitting} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'สร้างเลย'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Edit Modal with Steps */}
        {isEditing && editingTournament && (
            <div className="fixed inset-0 z-[1500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in duration-200 relative">
                    <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                    
                    <div className="flex items-center gap-2 mb-6 border-b pb-2">
                        {editStep === 'summary' ? <FileCheck className="w-6 h-6 text-green-600" /> : <Settings className="w-6 h-6 text-slate-700" />}
                        <h3 className="font-bold text-xl text-slate-800">{editStep === 'summary' ? 'ตรวจสอบและยืนยัน' : 'ตั้งค่าทัวร์นาเมนต์'}</h3>
                    </div>
                    
                    {editStep === 'form' ? (
                        /* STEP 1: FORM */
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">ชื่อรายการ</label>
                                <input 
                                    type="text" 
                                    value={editingTournament.name} 
                                    onChange={e => setEditingTournament({...editingTournament, name: e.target.value})} 
                                    className="w-full p-2 border rounded-lg text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">สถานะ</label>
                                    <select 
                                        value={editingTournament.status}
                                        onChange={e => setEditingTournament({...editingTournament, status: e.target.value as any})}
                                        className="w-full p-2 border rounded-lg text-sm"
                                    >
                                        <option value="Active">Active (เปิดใช้งาน)</option>
                                        <option value="Upcoming">Upcoming (เร็วๆนี้)</option>
                                        <option value="Archived">Archived (เก็บถาวร)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">ประเภท</label>
                                    <select 
                                        value={editingTournament.type}
                                        onChange={e => setEditingTournament({...editingTournament, type: e.target.value as any})}
                                        className="w-full p-2 border rounded-lg text-sm"
                                    >
                                        <option value="Penalty">Penalty (จุดโทษ)</option>
                                        <option value="7v7">7v7 (ฟุตบอล 7 คน)</option>
                                        <option value="11v11">11v11 (ฟุตบอล 11 คน)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Config JSON Fields */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                <h4 className="font-bold text-sm text-indigo-700 mb-2 border-b border-slate-200 pb-1">กติกาการแข่งขัน (Config)</h4>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">วันปิดรับสมัคร</label>
                                    <input 
                                        type="date" 
                                        value={editConfig.registrationDeadline || ''} 
                                        onChange={e => setEditConfig({...editConfig, registrationDeadline: e.target.value})} 
                                        className="w-full p-2 border rounded text-sm bg-white"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">หากเลยวันที่กำหนด จะปิดรับสมัครอัตโนมัติ</p>
                                </div>

                                {editingTournament.type !== 'Penalty' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">เวลาแข่งขัน (นาที/ครึ่ง)</label>
                                                <input 
                                                    type="number" 
                                                    value={editConfig.halfTimeDuration || 20} 
                                                    onChange={e => setEditConfig({...editConfig, halfTimeDuration: parseInt(e.target.value)})} 
                                                    className="w-full p-2 border rounded text-sm bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">ผู้เล่นตัวจริง (คน)</label>
                                                <input 
                                                    type="number" 
                                                    value={editConfig.playersPerTeam || 7} 
                                                    onChange={e => setEditConfig({...editConfig, playersPerTeam: parseInt(e.target.value)})} 
                                                    className="w-full p-2 border rounded text-sm bg-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">จำนวนเปลี่ยนตัวสูงสุด (0 = ไม่จำกัด)</label>
                                            <input 
                                                type="number" 
                                                value={editConfig.maxSubs || 0} 
                                                onChange={e => setEditConfig({...editConfig, maxSubs: parseInt(e.target.value)})} 
                                                className="w-full p-2 border rounded text-sm bg-white"
                                            />
                                        </div>
                                    </>
                                ) : null}
                                
                                {editingTournament.type !== 'Penalty' && (
                                    <div className="flex items-center gap-2 mt-2 bg-white p-2 rounded border border-slate-200">
                                        <input 
                                            type="checkbox" 
                                            id="extraTime"
                                            checked={editConfig.extraTime || false}
                                            onChange={e => setEditConfig({...editConfig, extraTime: e.target.checked})}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="extraTime" className="text-sm text-slate-600 cursor-pointer select-none">มีการต่อเวลาพิเศษ (Extra Time)</label>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* STEP 2: SUMMARY VIEW */
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                <h4 className="font-bold text-indigo-800 text-sm mb-2">ข้อมูลทั่วไป</h4>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <div className="flex justify-between border-b border-indigo-100 pb-1">
                                        <span className="text-slate-500">ชื่อรายการ:</span>
                                        <span className="font-bold">{editingTournament.name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-indigo-100 pb-1">
                                        <span className="text-slate-500">สถานะ:</span>
                                        <span className={`font-bold ${editingTournament.status === 'Active' ? 'text-green-600' : 'text-slate-600'}`}>{editingTournament.status}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">ประเภท:</span>
                                        <span className="font-bold">{editingTournament.type}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-1"><Shield className="w-4 h-4"/> กติกาการแข่งขัน</h4>
                                <div className="space-y-2 text-sm">
                                    {editConfig.registrationDeadline && (
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-slate-500">ปิดรับสมัคร:</span>
                                            <span className="font-bold text-red-600">{new Date(editConfig.registrationDeadline).toLocaleDateString('th-TH')}</span>
                                        </div>
                                    )}
                                    {editingTournament.type === 'Penalty' ? (
                                        <p className="text-xs text-slate-400 italic">ใช้กติกามาตรฐาน FIFA Penalty Shootout</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-2 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400">เวลา (นาที/ครึ่ง)</div>
                                                <div className="font-bold text-indigo-600 text-lg">{editConfig.halfTimeDuration || 20}</div>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400">ผู้เล่นตัวจริง</div>
                                                <div className="font-bold text-indigo-600 text-lg">{editConfig.playersPerTeam || 7}</div>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400">เปลี่ยนตัว</div>
                                                <div className="font-bold text-indigo-600">{editConfig.maxSubs === 0 ? "ไม่จำกัด" : `${editConfig.maxSubs || 0} คน`}</div>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-slate-100">
                                                <div className="text-[10px] text-slate-400">ต่อเวลา</div>
                                                <div className="font-bold text-indigo-600">{editConfig.extraTime ? "มี" : "ไม่มี"}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-center text-xs text-slate-400 mt-4">กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก</p>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6 pt-4 border-t">
                        {editStep === 'form' ? (
                            <>
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-bold">ยกเลิก</button>
                                <button onClick={handleReview} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2">
                                    ตรวจสอบ <ArrowRight className="w-4 h-4"/>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setEditStep('form')} className="flex-1 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-bold flex items-center justify-center gap-2">
                                    <ArrowLeft className="w-4 h-4"/> กลับไปแก้ไข
                                </button>
                                <button onClick={handleUpdate} disabled={isSubmitting} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200">
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