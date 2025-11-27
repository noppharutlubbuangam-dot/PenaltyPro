

import { Team, Player, MatchState, RegistrationData, AppSettings, School, NewsItem, Kick } from '../types';

const API_URL = "https://script.google.com/macros/s/AKfycbztQtSLYW3wE5j-g2g7OMDxKL6WFuyUymbGikt990wn4gCpwQN_MztGCcBQJgteZQmvyg/exec";

export const getStoredScriptUrl = (): string | null => {
  return API_URL;
};

export const setStoredScriptUrl = (url: string) => {
  console.warn("URL is hardcoded in this version. Setting ignored.");
};

export const fetchDatabase = async (): Promise<{ teams: Team[], players: Player[], matches: any[], config: AppSettings, schools: School[], news: NewsItem[] } | null> => {
  
  try {
    // Added cache busting timestamp to prevent browser caching
    const response = await fetch(`${API_URL}?action=getData&t=${Date.now()}`, {
        method: 'GET',
        redirect: 'follow'
    });

    if (!response.ok) {
        throw new Error(`Network response was not ok (Status: ${response.status})`);
    }

    const text = await response.text();

    if (text.trim().startsWith('<')) {
        console.error("Received HTML instead of JSON. Script might be crashed or permission denied.", text);
        throw new Error('Deployment Error: Please check "Who has access" is set to "Anyone"');
    }
    
    const data = JSON.parse(text);
    
    if (data && data.status === 'error') {
        throw new Error(data.message);
    }
    
    // Safely handle data.config being undefined/null
    const configData = (data && data.config) ? data.config : {};

    return {
        teams: (data && data.teams) || [],
        players: (data && data.players) || [],
        matches: (data && data.matches) || [],
        config: {
            ...configData,
            adminPin: configData.adminPin || '1234' // Ensure fallback
        },
        schools: (data && data.schools) || [],
        news: (data && data.news) || []
    };
  } catch (error) {
    console.error("Failed to fetch from Google Sheet:", error);
    throw error;
  }
};

// ... (Rest of the functions remain unchanged) ...
export const manageNews = async (actionType: 'add' | 'delete' | 'edit', newsItem: Partial<NewsItem>) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'manageNews', subAction: actionType, newsItem })
      });
      return true;
    } catch (error) { return false; }
};

export const updateTeamStatus = async (teamId: string, status: string, group?: string, reason?: string) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', teamId, status, group, reason })
    });
    return true;
  } catch (error) { return false; }
};

export const updateTeamData = async (team: Partial<Team>, players: Partial<Player>[]) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateTeamData', team, players })
    });
    return true;
  } catch (error) { return false; }
};

export const saveSettings = async (settings: AppSettings) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveSettings', settings })
    });
    return true;
  } catch (error) { return false; }
};

export const scheduleMatch = async (matchId: string, teamA: string, teamB: string, roundLabel: string, venue?: string, scheduledTime?: string) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'scheduleMatch', matchId, teamA, teamB, roundLabel, venue: venue || '', scheduledTime: scheduledTime || '' })
    });
    return true;
  } catch (error) { return false; }
};

export const deleteMatch = async (matchId: string) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deleteMatch', matchId })
    });
    return true;
  } catch (error) { return false; }
};

export const saveMatchToSheet = async (matchState: MatchState, summary: string) => {
  const payload = {
    action: 'saveMatch',
    matchId: matchState.matchId || `M${Date.now()}`,
    teamA: matchState.teamA.name,
    teamB: matchState.teamB.name,
    scoreA: matchState.scoreA,
    scoreB: matchState.scoreB,
    winner: matchState.winner === 'A' ? matchState.teamA.name : matchState.teamB.name,
    summary: summary,
    kicks: matchState.kicks.map(k => ({ ...k, teamId: k.teamId === 'A' ? matchState.teamA.name : matchState.teamB.name }))
  };
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) { return false; }
};

export const saveKicksToSheet = async (kicks: Kick[], matchId: string, teamAName: string, teamBName: string) => {
    // Format Kicks for separate sheet: matchId, round, team, player, result, timestamp
    const formattedKicks = kicks.map(k => ({
        matchId: matchId || `M${Date.now()}`,
        round: k.round,
        team: k.teamId === 'A' ? teamAName : teamBName,
        player: k.player,
        result: k.result,
        timestamp: k.timestamp || Date.now()
    }));

    const payload = {
        action: 'saveKicks',
        data: formattedKicks
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) { return false; }
}

export const registerTeam = async (data: RegistrationData): Promise<string | null> => {
  const payload = {
    action: 'register',
    schoolName: data.schoolName, 
    shortName: data.shortName, 
    color: data.color,
    logoFile: data.logoFile,
    documentFile: data.documentFile,
    slipFile: data.slipFile,
    district: data.district,
    province: data.province,
    phone: data.phone,
    directorName: data.directorName,
    managerName: data.managerName,
    managerPhone: data.managerPhone,
    coachName: data.coachName,
    coachPhone: data.coachPhone,
    registrationTime: data.registrationTime, 
    players: data.players.map(p => ({
        name: p.name,
        number: p.sequence,
        position: 'Player',
        birthDate: p.birthDate,
        photoFile: p.photoFile
    }))
  };
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow', // Changed from no-cors to follow to get response
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
        const result = await response.json();
        return result.teamId || null;
    }
    return null;
  } catch (error) { 
      console.error("Register Error", error);
      return null; 
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};