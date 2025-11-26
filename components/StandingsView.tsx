
import React from 'react';
import { Team, Standing } from '../types';
import { Trophy, ArrowLeft, Calendar, LayoutGrid } from 'lucide-react';

interface StandingsViewProps {
  matches: any[]; 
  teams: Team[];
  onBack: () => void;
}

const StandingsView: React.FC<StandingsViewProps> = ({ matches, teams, onBack }) => {
  
  const standings: Record<string, Standing> = {};
  
  teams.forEach(t => {
    standings[t.name] = {
      teamId: t.id,
      teamName: t.name,
      logoUrl: t.logoUrl,
      group: t.group || 'General', // Default group if none assigned
      played: 0,
      won: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    };
  });

  // Process matches
  matches.forEach(m => {
    if (!m.winner || m.winner === '') return; 

    const teamA = standings[m.teamA];
    const teamB = standings[m.teamB];
    
    if (teamA && teamB) {
        // Only count stats if it's a group match or if we treat all matches as stats
        // For now, we count all matches towards the table of their assigned group
        
        teamA.played++;
        teamB.played++;
        
        const scoreA = parseInt(m.scoreA || '0');
        const scoreB = parseInt(m.scoreB || '0');

        teamA.goalsFor += scoreA;
        teamA.goalsAgainst += scoreB;
        teamB.goalsFor += scoreB;
        teamB.goalsAgainst += scoreA;

        if (m.winner === m.teamA) {
            teamA.won++;
            teamA.points += 3;
            teamB.lost++;
        } else if (m.winner === m.teamB) {
            teamB.won++;
            teamB.points += 3;
            teamA.lost++;
        }
    }
  });

  // Group standings by Group Label (A, B, C...)
  const groupedStandings: Record<string, Standing[]> = {};
  Object.values(standings).forEach(s => {
      const g = s.group || 'Unassigned';
      if (!groupedStandings[g]) groupedStandings[g] = [];
      groupedStandings[g].push(s);
  });

  // Sort each group
  Object.keys(groupedStandings).forEach(key => {
      groupedStandings[key].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.won !== a.won) return b.won - a.won;
          return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
      });
  });

  const sortedGroupKeys = Object.keys(groupedStandings).sort();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24">
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition text-slate-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-8 h-8 text-yellow-500" /> ตารางคะแนน (Round Robin)
                </h1>
            </div>

            {/* Render Tables per Group */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {sortedGroupKeys.map(groupName => (
                    <div key={groupName} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="p-4 bg-indigo-900 text-white font-bold flex items-center justify-between">
                            <div className="flex items-center gap-2"><LayoutGrid className="w-5 h-5" /> Group {groupName}</div>
                            <div className="text-xs bg-indigo-800 px-2 py-1 rounded text-indigo-200">สาย {groupName}</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                    <tr>
                                        <th className="p-3 text-left w-10">#</th>
                                        <th className="p-3 text-left">ทีม</th>
                                        <th className="p-3 text-center">P</th>
                                        <th className="p-3 text-center">W</th>
                                        <th className="p-3 text-center">L</th>
                                        <th className="p-3 text-center text-green-600">GF</th>
                                        <th className="p-3 text-center text-red-500">GA</th>
                                        <th className="p-3 text-center font-bold bg-slate-100">Pts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {groupedStandings[groupName].map((team, index) => (
                                        <tr key={team.teamId} className="hover:bg-slate-50 transition">
                                            <td className="p-3 text-center font-bold text-slate-400">
                                                {index + 1}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {team.logoUrl ? (
                                                        <img src={team.logoUrl} className="w-6 h-6 rounded bg-slate-200 object-cover" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">{team.teamName.substring(0,2)}</div>
                                                    )}
                                                    <span className="font-bold text-slate-700 truncate max-w-[120px]">{team.teamName}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center text-slate-500">{team.played}</td>
                                            <td className="p-3 text-center text-indigo-600 font-bold">{team.won}</td>
                                            <td className="p-3 text-center text-slate-400">{team.lost}</td>
                                            <td className="p-3 text-center text-green-600 text-xs">{team.goalsFor}</td>
                                            <td className="p-3 text-center text-red-500 text-xs">{team.goalsAgainst}</td>
                                            <td className="p-3 text-center font-black text-slate-800 bg-slate-50">{team.points}</td>
                                        </tr>
                                    ))}
                                    {groupedStandings[groupName].length === 0 && (
                                        <tr><td colSpan={8} className="p-4 text-center text-slate-400 text-xs">ยังไม่มีทีมในสายนี้</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* Match History */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-8">
                <div className="p-4 bg-slate-800 text-white font-bold flex items-center gap-2 sticky top-0 z-10">
                    <Calendar className="w-5 h-5" /> ผลการแข่งขันล่าสุด
                </div>
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {matches.length === 0 ? (
                         <div className="p-8 text-center text-slate-400">ยังไม่มีบันทึกการแข่งขัน</div>
                    ) : (
                        matches.slice().reverse().map((m, idx) => (
                            <div key={idx} className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50 gap-4">
                                <div className="flex items-center justify-center gap-6 flex-1">
                                    <div className="text-right flex-1 font-bold text-slate-700">{m.teamA}</div>
                                    <div className="bg-slate-100 px-4 py-2 rounded-lg font-mono font-bold text-xl text-indigo-600 shadow-inner border border-slate-200">
                                        {m.scoreA} - {m.scoreB}
                                    </div>
                                    <div className="text-left flex-1 font-bold text-slate-700">{m.teamB}</div>
                                </div>
                                <div className="text-xs text-slate-400 md:w-32 text-center">
                                    {new Date(m.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'})}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};

export default StandingsView;
