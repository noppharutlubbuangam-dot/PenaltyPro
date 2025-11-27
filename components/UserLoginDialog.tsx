
import React, { useState } from 'react';
import { MessageCircle, User, ArrowRight, X } from 'lucide-react';
import { loginWithLine, loginAsGuest } from '../services/authService';
import { UserProfile } from '../types';

interface UserLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

const UserLoginDialog: React.FC<UserLoginDialogProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'selection' | 'guest'>('selection');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  if (!isOpen) return null;

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      const user = loginAsGuest(guestName, guestPhone);
      onLoginSuccess(user);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1300] p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
        </button>

        <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">เข้าสู่ระบบ</h2>
            <p className="text-slate-500 text-sm mb-6">กรุณาเข้าสู่ระบบเพื่อลงทะเบียนทีมแข่งขัน</p>

            {mode === 'selection' && (
                <div className="space-y-3">
                    <button 
                        onClick={loginWithLine}
                        className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl font-bold transition flex items-center justify-center gap-3 shadow-md"
                    >
                        <MessageCircle className="w-6 h-6 fill-white" />
                        เข้าสู่ระบบด้วย LINE
                    </button>
                    
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                        <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">หรือ</span></div>
                    </div>

                    <button 
                        onClick={() => setMode('guest')}
                        className="w-full py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition flex items-center justify-center gap-3"
                    >
                        <User className="w-5 h-5" />
                        เข้าใช้งานทั่วไป
                    </button>
                </div>
            )}

            {mode === 'guest' && (
                <form onSubmit={handleGuestLogin} className="space-y-4 text-left">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อ-นามสกุล</label>
                        <input 
                            type="text" 
                            required
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="ระบุชื่อของคุณ"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">เบอร์โทรศัพท์ (ถ้ามี)</label>
                        <input 
                            type="tel" 
                            value={guestPhone}
                            onChange={e => setGuestPhone(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0xx-xxxxxxx"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setMode('selection')} className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">ย้อนกลับ</button>
                        <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">ยืนยัน</button>
                    </div>
                </form>
            )}
        </div>
        
        {mode === 'selection' && (
             <div className="bg-slate-50 p-3 text-center border-t border-slate-100 text-[10px] text-slate-400">
                ระบบจะบันทึกข้อมูลการสมัครเชื่อมโยงกับบัญชีของคุณ
            </div>
        )}
      </div>
    </div>
  );
};

export default UserLoginDialog;
