
import { Team, Player, MatchState, RegistrationData, AppSettings, School, NewsItem, Kick, UserProfile } from '../types';

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
        throw new Error('Deployment Error: Please check "Who has access" is set to "Anyone" in Google Apps Script');
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

export const generateGeminiContent = async (prompt: string, initialModel: string = 'gemini-1.5-flash'): Promise<string> => {
    
    if (!prompt || prompt.trim() === "") return "Error: Empty prompt";

    const callApi = async (m: string) => {
         const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
                action: 'aiGenerate', 
                prompt: prompt,
                model: m
            })
        });

        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        
        // Check for HTML response (Script error or Auth error)
        if (text.trim().startsWith('<')) {
             if (text.includes("Google Drive") || text.includes("script.google.com")) {
                 throw new Error("AUTH_REQUIRED");
             }
             // Log the HTML content for debugging (check console)
             console.warn("GAS Returned HTML Error:", text);
             throw new Error("HTML response (Script Error - Check Code.gs logs)");
        }
        
        return JSON.parse(text);
    };

    // Robust Fallback List with new models
    const fallbackList = [
        'gemini-1.5-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.0-flash'
    ];
    
    // Create unique list starting with initialModel
    const modelsToTry = Array.from(new Set([initialModel, ...fallbackList]));

    let lastError: any = null;

    for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
            // Exponential backoff
            if (i > 0) {
                 const delay = 1000 * Math.pow(2, i); 
                 console.log(`Waiting ${delay}ms before retry with ${model}...`);
                 await new Promise(resolve => setTimeout(resolve, delay));
            }

            console.log(`AI Attempt ${i+1}/${modelsToTry.length}: Using model ${model}...`);
            const result = await callApi(model);

            if (result.status === 'success') {
                return result.text;
            } else {
                const msg = (result.message || "Unknown Error").toLowerCase();
                // Check undefined message
                if (!result.message && result.error) {
                     console.warn(`Model ${model} detailed error:`, result.error);
                }
                
                if (msg.includes("auth") || msg.includes("permission") || msg.includes("script")) {
                    throw new Error("AUTH_REQUIRED");
                }
                console.warn(`Model ${model} failed: ${result.message}`);
                lastError = new Error(result.message || `Model ${model} failed (No error message)`);
            }

        } catch (e: any) {
            console.warn(`Model ${model} exception: ${e.message}`);
            if (e.message === "AUTH_REQUIRED") {
                return "⚠️ AI Error: Script ต้องการสิทธิ์ (Authorize) - กรุณาเปิด Code.gs แล้วกด Run ฟังก์ชัน testAuth()";
            }
            lastError = e;
        }
    }

    const errMsg = (lastError?.message || "").toLowerCase();
    if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("limit") || errMsg.includes("resource exhausted")) {
         return `⚠️ AI Error: โควต้าเต็มทุกโมเดล (Rate Limit Exceeded) กรุณารอ 1-2 นาที แล้วลองใหม่`;
    }
    
    return `⚠️ ระบบ AI ขัดข้อง: ${lastError?.message || "Generation Failed"}`;
};

export const authenticateUser = async (data: any): Promise<UserProfile | null> => {
    // data structure: { authType: 'login'|'register'|'line', username?, password?, displayName?, phone?, lineUserId?, pictureUrl? }
    const payload = {
        action: 'auth',
        ...data
    };
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message);
            }
            return {
                userId: result.userId,
                username: result.username,
                displayName: result.displayName,
                pictureUrl: result.pictureUrl,
                type: data.authType === 'line' ? 'line' : 'credentials',
                phoneNumber: result.phoneNumber,
                role: result.role
            };
        }
        throw new Error("Network response was not ok");
    } catch (error: any) {
        console.error("Auth Error", error);
        throw error; // Re-throw to handle in UI
    }
};

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

export const scheduleMatch = async (matchId: string, teamA: string, teamB: string, roundLabel: string, venue?: string, scheduledTime?: string, livestreamUrl?: string, livestreamCover?: string) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
          action: 'scheduleMatch', 
          matchId, 
          teamA, 
          teamB, 
          roundLabel, 
          venue: venue || '', 
          scheduledTime: scheduledTime || '',
          livestreamUrl,
          livestreamCover
      })
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

export const saveMatchToSheet = async (matchState: MatchState | any, summary: string, skipKicks: boolean = false) => {
  // Support both MatchState and generic object for Admin Edits
  const teamAName = typeof matchState.teamA === 'object' ? matchState.teamA.name : matchState.teamA;
  const teamBName = typeof matchState.teamB === 'object' ? matchState.teamB.name : matchState.teamB;
  
  // Resolve Winner Name Correctly
  let resolvedWinner = matchState.winner;
  if (matchState.winner === 'A') resolvedWinner = teamAName;
  else if (matchState.winner === 'B') resolvedWinner = teamBName;

  const payload = {
    action: 'saveMatch',
    matchId: matchState.matchId || matchState.id || `M${Date.now()}`,
    teamA: teamAName,
    teamB: teamBName,
    scoreA: matchState.scoreA,
    scoreB: matchState.scoreB,
    winner: resolvedWinner, 
    summary: summary || matchState.summary, // Ensure summary is passed
    // If skipKicks is true, send empty array to avoid duplicating kicks rows
    kicks: (skipKicks || !matchState.kicks) ? [] : matchState.kicks.map((k: any) => ({ ...k, teamId: k.teamId === 'A' ? teamAName : (k.teamId === 'B' ? teamBName : k.teamId) })),
    livestreamUrl: matchState.livestreamUrl,
    livestreamCover: matchState.livestreamCover
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
      redirect: 'follow', 
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
