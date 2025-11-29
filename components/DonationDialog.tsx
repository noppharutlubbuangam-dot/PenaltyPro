import React, { useState } from 'react';
import { Heart, X, Copy, Check, CreditCard, Share2 } from 'lucide-react';
import { AppSettings } from '../types';

interface DonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppSettings;
  tournamentName: string;
}

const DonationDialog: React.FC<DonationDialogProps> = ({ isOpen, onClose, config, tournamentName }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(config.bankAccount);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLineNotify = () => {
      // Logic to open LINE OA or specific contact
      // For now, simple alert or link
      alert("กรุณาส่งสลิปโอนเงินไปที่ LINE Official ของผู้จัดงาน");
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200 transition text-slate-500">
            <X className="w-5 h-5" />
        </button>

        <div className="bg-pink-600 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <h3 className="font-bold text-xl mb-1">ร่วมสนับสนุนโครงการ</h3>
            <p className="text-pink-100 text-xs">{tournamentName}</p>
        </div>

        <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-3">
                <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">ช่องทางการโอนเงิน</p>
                <div className="flex flex-col items-center">
                    <div className="bg-white p-2 rounded shadow-sm mb-2">
                        <CreditCard className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="font-bold text-slate-800">{config.bankName}</p>
                    <div className="flex items-center gap-2 my-1" onClick={handleCopy} role="button">
                        <span className="text-2xl font-mono font-black text-indigo-600 tracking-wider">{config.bankAccount}</span>
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    </div>
                    <p className="text-sm text-slate-600">{config.accountName}</p>
                </div>
            </div>

            <div className="text-center">
                <p className="text-slate-500 text-sm mb-4">เมื่อโอนเงินแล้ว กรุณาแจ้งสลิปเพื่อบันทึกยอด</p>
                <button 
                    onClick={handleLineNotify}
                    className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition transform active:scale-95"
                >
                    <Share2 className="w-5 h-5" /> แจ้งสลิปทาง LINE
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DonationDialog;