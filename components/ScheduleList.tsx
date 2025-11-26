
import React from 'react';
import { Match, Team } from '../types';
import { ArrowLeft, Calendar, MapPin, Clock, Trophy } from 'lucide-react';

interface ScheduleListProps {
  matches: Match[];
  teams: Team[];
  onBack: () => void;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ matches, teams, onBack }) => {
  // Sort matches: Finished matches last (or first?), Scheduled matches by date
  // Usually schedule: Scheduled (Ascending Date) -> Finished (Descending Date)
  
  const scheduledMatches = matches
    .filter(m => !m.winner)
    .sort((a, b) => new Date(a.scheduledTime || a.date).getTime() - new Date(b.scheduledTime || b.date).getTime());

  const finishedMatches = matches
    .filter(m => m.winner)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const resolveTeamName = (teamIdOrName: string | Team) => {
      if (typeof teamIdOrName === 'object') return teamIdOrName.name;
      const t = teams.find(t => t.id === teamIdOrName || t.name === teamIdOrName);
      return t ? t.name : teamIdOrName;
  };

  const formatDate = (dateStr: string) => {
      try {
          return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch(e) { return dateStr; }
  };

  const formatTime = (dateStr: string) => {
      try {
          return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      } catch(e) { return ''; }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" /> ตารางการแข่งขัน
          </h1>
        </div>

        {/* Scheduled Matches */}
        <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-700 mb-4 px-2 border-l-4 border-blue-500">โปรแกรมการแข่งขัน</h2>
            <div className="space-y-3">
                {scheduledMatches.length === 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center text-slate-400 border border-slate-200">
                        ไม่มีโปรแกรมการแข่งขันที่กำลังจะมาถึง
                    </div>
                )}
                {scheduledMatches.map(match => (
                    <div key={match.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center gap-4 hover:shadow-md transition">
                        <div className="flex flex-col items-center md:items-start min-w-[120px] text-slate-500 text-sm">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(match.scheduledTime || match.date)}</span>
                            {match.scheduledTime && <span className="flex items-center gap-1 text-indigo-600 font-bold"><Clock className="w-3 h-3" /> {formatTime(match.scheduledTime)}</span>}
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-4 w-full">
                            <div className="text-right flex-1 font-bold text-slate-800 text-lg">{resolveTeamName(match.teamA)}</div>
                            <div className="px-3 py-1 bg-slate-100 rounded text-xs text-slate-500 font-bold whitespace-nowrap">VS</div>
                            <div className="text-left flex-1 font-bold text-slate-800 text-lg">{resolveTeamName(match.teamB)}</div>
                        </div>
                        <div className="min-w-[150px] flex flex-col items-center md:items-end text-sm gap-1">
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold">{match.roundLabel || 'รอบทั่วไป'}</span>
                            {match.venue && <span className="flex items-center gap-1 text-slate-500 text-xs"><MapPin className="w-3 h-3" /> {match.venue}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Finished Matches */}
        <div>
            <h2 className="text-lg font-bold text-slate-700 mb-4 px-2 border-l-4 border-green-500">ผลการแข่งขัน</h2>
             <div className="space-y-3">
                {finishedMatches.length === 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center text-slate-400 border border-slate-200">
                        ยังไม่มีผลการแข่งขัน
                    </div>
                )}
                {finishedMatches.map(match => (
                    <div key={match.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center gap-4 opacity-80 hover:opacity-100 transition">
                         <div className="flex flex-col items-center md:items-start min-w-[120px] text-slate-400 text-xs">
                            <span>{formatDate(match.date)}</span>
                            <span>{match.roundLabel}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-4 w-full">
                            <div className={`text-right flex-1 font-bold text-lg ${match.winner === 'A' || match.winner === resolveTeamName(match.teamA) ? 'text-green-600' : 'text-slate-600'}`}>
                                {resolveTeamName(match.teamA)}
                            </div>
                            <div className="bg-slate-800 text-white px-4 py-1 rounded-lg font-mono font-bold text-lg shadow-inner">
                                {match.scoreA} - {match.scoreB}
                            </div>
                            <div className={`text-left flex-1 font-bold text-lg ${match.winner === 'B' || match.winner === resolveTeamName(match.teamB) ? 'text-green-600' : 'text-slate-600'}`}>
                                {resolveTeamName(match.teamB)}
                            </div>
                        </div>
                        <div className="min-w-[100px] flex justify-end">
                             <Trophy className="w-5 h-5 text-yellow-500" />
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default ScheduleList;
    