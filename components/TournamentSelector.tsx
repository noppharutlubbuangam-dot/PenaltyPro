import React, { useState } from 'react';
import { Tournament } from '../types';
import { Trophy, Plus, ArrowRight, Loader2, Calendar, Target, CheckCircle2, Users } from 'lucide-react';
import { createTournament } from '../services/sheetService';

interface TournamentSelectorProps {
  tournaments: Tournament[];
  onSelect: (id: string) => void;
  isAdmin: boolean;
  onRefresh: () => void;
}

const TournamentSelector: React.FC<TournamentSelectorProps> = ({ tournaments, onSelect, isAdmin, onRefresh }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTourneyName, setNewTourneyName] = useState('');
  const [newTourneyType, setNewTourneyType] = useState('Penalty');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
                    <button 
                        key={t.id} 
                        onClick={() => onSelect(t.id)}
                        className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all group text-left relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
                            <Trophy className="w-16 h-16 text-indigo-900" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {t.status}
                                </span>
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                                    {t.type}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 mb-1 line-clamp-2">{t.name}</h3>
                            <div className="text-xs text-slate-400">ID: {t.id}</div>
                            
                            <div className="mt-4 flex items-center gap-1 text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                เข้าสู่ระบบ <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </button>
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
    </div>
  );
};

export default TournamentSelector;