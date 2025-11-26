
import React, { useState } from 'react';
import { Trophy, ArrowRight, Users, Settings } from 'lucide-react';
import { Team } from '../types';

interface MatchSetupProps {
  onStart: (teamA: Team, teamB: Team) => void;
  availableTeams: Team[];
  onOpenSettings: () => void;
  isLoadingData: boolean;
}

const createManualTeam = (name: string, id: string, color: string): Team => ({
  id,
  name,
  shortName: name.substring(0, 3).toUpperCase(),
  color,
  logoUrl: ''
});

const MatchSetup: React.FC<MatchSetupProps> = ({ onStart, availableTeams, onOpenSettings, isLoadingData }) => {
  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');
  
  const [manualTeamA, setManualTeamA] = useState('');
  const [manualTeamB, setManualTeamB] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let teamAObj: Team;
    let teamBObj: Team;

    if (availableTeams.length > 0 && teamAId && teamBId) {
      teamAObj = availableTeams.find(t => t.id === teamAId)!;
      teamBObj = availableTeams.find(t => t.id === teamBId)!;
    } else {
      if (!manualTeamA || !manualTeamB) return;
      teamAObj = createManualTeam(manualTeamA, 'manual_a', '#2563EB');
      teamBObj = createManualTeam(manualTeamB, 'manual_b', '#E11D48');
    }

    onStart(teamAObj, teamBObj);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 relative">
      <button 
        onClick={onOpenSettings}
        className="absolute top-0 right-0 p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-indigo-600 transition"
        title="ตั้งค่าฐานข้อมูล"
      >
        <Settings className="w-5 h-5" />
      </button>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-4 rounded-full">
            <Trophy className="w-12 h-12 text-indigo-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">การดวลจุดโทษ</h1>
        <p className="text-center text-gray-500 mb-8 flex items-center justify-center gap-2">
          {isLoadingData ? (
             <span className="animate-pulse">กำลังเชื่อมต่อฐานข้อมูล...</span>
          ) : availableTeams.length > 0 ? (
             <><span className="w-2 h-2 bg-green-500 rounded-full"></span> เชื่อมต่อระบบสำเร็จ</>
          ) : (
             "กรอกชื่อทีมด้วยตนเอง หรือ เชื่อมต่อฐานข้อมูล"
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {availableTeams.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ทีมเหย้า (Home)</label>
                <div className="relative">
                  <select
                    value={teamAId}
                    onChange={(e) => setTeamAId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                    required
                  >
                    <option value="">เลือกทีม...</option>
                    {availableTeams.map(t => (
                      <option key={t.id} value={t.id} disabled={t.id === teamBId}>{t.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500">พบกับ</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ทีมเยือน (Away)</label>
                <div className="relative">
                  <select
                    value={teamBId}
                    onChange={(e) => setTeamBId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                    required
                  >
                    <option value="">เลือกทีม...</option>
                    {availableTeams.map(t => (
                      <option key={t.id} value={t.id} disabled={t.id === teamAId}>{t.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ทีมเหย้า</label>
                <input
                  type="text"
                  value={manualTeamA}
                  onChange={(e) => setManualTeamA(e.target.value)}
                  placeholder="เช่น ทีมสีแดง"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex items-center justify-center">
                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500">พบกับ</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ทีมเยือน</label>
                <input
                  type="text"
                  value={manualTeamB}
                  onChange={(e) => setManualTeamB(e.target.value)}
                  placeholder="เช่น ทีมสีน้ำเงิน"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-indigo-200"
          >
            เริ่มการแข่งขัน <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MatchSetup;
