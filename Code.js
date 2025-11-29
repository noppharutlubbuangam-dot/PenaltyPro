
// ==========================================
// COPY THIS CODE TO YOUR GOOGLE APPS SCRIPT (Code.gs)
// ==========================================

// --- CONFIGURATION ---
const FOLDER_NAME = "PenaltyPro_Uploads"; 

// --- MAIN WEB APP HANDLERS ---

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // Explicitly handle actions
    if (action === 'getUsers') {
      return getUsers();
    } else if (action === 'getData') {
      return getData();
    }
    
    // Default response must be JSON if client expects JSON, 
    // but for browser access we can show text.
    // Ideally, consistency prevents "Unexpected token" errors.
    return successResponse({ status: 'running', message: 'Penalty Pro API is active' });

  } catch (error) {
    return errorResponse(error.toString());
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'register') {
      return registerTeam(data);
    } else if (action === 'updateStatus') {
      return updateTeamStatus(data.teamId, data.status, data.group, data.reason);
    } else if (action === 'updateTeamData') {
      return updateTeamData(data.team, data.players);
    } else if (action === 'saveMatch') {
      return saveMatch(data);
    } else if (action === 'saveKicks') {
       return saveKicks(data.data);
    } else if (action === 'saveMatchEvents') {
       return saveMatchEvents(data.events);
    } else if (action === 'saveSettings') {
      return saveSettings(data.settings);
    } else if (action === 'manageNews') {
      return manageNews(data);
    } else if (action === 'scheduleMatch') {
      return scheduleMatch(data);
    } else if (action === 'deleteMatch') {
      return deleteMatch(data.matchId);
    } else if (action === 'auth') {
      return handleAuth(data);
    } else if (action === 'aiGenerate') {
      return handleAiGenerate(data.prompt, data.model); 
    } else if (action === 'createTournament') {
      return createTournament(data.name, data.type);
    } else if (action === 'updateTournament') {
      return updateTournament(data.tournament);
    } else if (action === 'submitDonation') {
      return submitDonation(data);
    } else if (action === 'updateUserRole') {
      return updateUserRole(data.userId, data.role);
    }
    
    return errorResponse("Unknown action: " + action);
    
  } catch (error) {
    return errorResponse(error.toString());
  }
}

// --- CORE FUNCTIONS ---

function getUsers() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return successResponse({ users: [] });
  
  const data = sheet.getDataRange().getValues();
  const users = [];
  // Skip header
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[0]) {
      users.push({
        userId: String(r[0]),
        username: r[1],
        displayName: r[3],
        role: r[4] || 'user',
        phoneNumber: r[5],
        pictureUrl: r[6]
      });
    }
  }
  return successResponse({ users: users });
}

function updateUserRole(userId, role) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      // Role is column 5 (index 4) -> A=0, B=1, C=2, D=3, E=4
      sheet.getRange(i + 1, 5).setValue(role); 
      return successResponse({ status: 'success' });
    }
  }
  return errorResponse("User not found");
}

function getData() {
  const ss = getSpreadsheet();
  
  // 0. Tournaments
  let tourneySheet = ss.getSheetByName("Tournaments");
  if (!tourneySheet) {
     tourneySheet = ss.insertSheet("Tournaments");
     tourneySheet.appendRow(["ID", "Name", "Type", "Status", "ConfigJSON"]);
     tourneySheet.appendRow(["default", "Default Tournament", "Penalty", "Active", "{}"]);
  }
  const tourneyData = tourneySheet.getDataRange().getValues();
  const tournaments = [];
  for(let i=1; i<tourneyData.length; i++) {
      if(tourneyData[i][0]) {
          tournaments.push({
              id: String(tourneyData[i][0]),
              name: tourneyData[i][1],
              type: tourneyData[i][2],
              status: tourneyData[i][3],
              config: tourneyData[i][4]
          });
      }
  }

  // 1. Teams
  let teamSheet = ss.getSheetByName("Teams");
  if (!teamSheet) {
     teamSheet = ss.insertSheet("Teams");
     teamSheet.appendRow(["ID", "Name", "ShortName", "Color", "LogoUrl", "Status", "Group", "District", "Province", "Director", "Manager", "ManagerPhone", "Coach", "CoachPhone", "DocUrl", "SlipUrl", "RejectReason", "RegistrationTime", "TournamentID"]);
  }
  const teamsData = teamSheet.getDataRange().getValues();
  const teams = [];
  for (let i = 1; i < teamsData.length; i++) {
    const r = teamsData[i];
    if (r[0]) { 
      teams.push({
        id: String(r[0]),
        name: r[1],
        shortName: r[2],
        color: r[3],
        logoUrl: toLh3Link(r[4]),
        status: r[5] || 'Pending',
        group: r[6] || '',
        district: r[7] || '',
        province: r[8] || '',
        directorName: r[9] || '',
        managerName: r[10] || '',
        managerPhone: r[11] ? String(r[11]).replace(/^'/, '') : '',
        coachName: r[12] || '',
        coachPhone: r[13] ? String(r[13]).replace(/^'/, '') : '',
        docUrl: r[14] || '',
        slipUrl: toLh3Link(r[15] || ''),
        rejectReason: r[16] || '',
        registrationTime: r[17] || '',
        tournamentId: r[18] || 'default'
      });
    }
  }
  
  // 2. Players
  let playerSheet = ss.getSheetByName("Players");
  if (!playerSheet) { playerSheet = ss.insertSheet("Players"); playerSheet.appendRow(["ID", "TeamID", "Name", "Number", "Position", "PhotoUrl", "BirthDate", "TournamentID"]); }
  const playersData = playerSheet.getDataRange().getValues();
  const players = [];
  for (let i = 1; i < playersData.length; i++) {
    const r = playersData[i];
    if (r[0]) {
      players.push({
        id: String(r[0]),
        teamId: String(r[1]),
        name: r[2],
        number: String(r[3]).replace(/^'/, ''),
        position: r[4],
        photoUrl: toLh3Link(r[5]),
        birthDate: r[6] ? formatDate(r[6]) : '',
        tournamentId: r[7] || 'default'
      });
    }
  }
  
  // 3. Matches & Kicks
  let matchSheet = ss.getSheetByName("Matches");
  if (!matchSheet) { matchSheet = ss.insertSheet("Matches"); matchSheet.appendRow(["MatchID","TeamA","TeamB","ScoreA","ScoreB","Winner","Date","Summary","Round","Status","Venue","ScheduledTime","LiveURL","LiveCover","TournamentID"]); }
  const matchesData = matchSheet.getDataRange().getValues();
  
  let kickSheet = ss.getSheetByName("Kicks");
  if (!kickSheet) { kickSheet = ss.insertSheet("Kicks"); kickSheet.appendRow(["MatchID", "Round", "Team", "Player", "Result", "Timestamp", "TournamentID"]); }
  const kicksData = kickSheet.getDataRange().getValues();
  
  const allKicks = [];
  for(let i=1; i<kicksData.length; i++) {
     if(kicksData[i][0]) {
        allKicks.push({
            matchId: String(kicksData[i][0]),
            round: kicksData[i][1],
            teamId: kicksData[i][2],
            player: kicksData[i][3],
            result: kicksData[i][4],
            timestamp: kicksData[i][5],
            tournamentId: kicksData[i][6] || 'default'
        });
     }
  }

  const matches = [];
  for (let i = 1; i < matchesData.length; i++) {
    const r = matchesData[i];
    if (r[0]) {
      const matchId = String(r[0]);
      const matchKicks = allKicks.filter(k => k.matchId === matchId);
      matches.push({
        id: matchId,
        teamA: r[1],
        teamB: r[2],
        scoreA: r[3],
        scoreB: r[4],
        winner: r[5],
        date: r[6],
        summary: r[7],
        roundLabel: r[8] || '',
        status: r[9] || 'Finished',
        venue: r[10] || '',
        scheduledTime: r[11] || '',
        livestreamUrl: r[12] || '',
        livestreamCover: toLh3Link(r[13]),
        tournamentId: r[14] || 'default', 
        kicks: matchKicks 
      });
    }
  }

  // 4. Config, Schools, News (Global)
  let configSheet = ss.getSheetByName("Config");
  if(!configSheet) { configSheet = ss.insertSheet("Config"); configSheet.appendRow(["CompName","Logo","BankName","BankAccount","AccountName","Location","Link","Announcement","PIN","Lat","Lng","Fee","Goal","ObjTitle","ObjDesc","ObjImg"]); }
  let config = {};
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    if (data.length > 1) {
       const r = data[1];
       config = {
         competitionName: r[0], competitionLogo: toLh3Link(r[1]), bankName: r[2], bankAccount: r[3], accountName: r[4],
         locationName: r[5], locationLink: r[6], announcement: r[7], adminPin: r[8] || '1234',
         locationLat: r[9] || 0, locationLng: r[10] || 0, registrationFee: r[11] || 0, fundraisingGoal: r[12] || 0,
         objectiveTitle: r[13] || '', objectiveDescription: r[14] || '', objectiveImageUrl: toLh3Link(r[15] || '')
       };
    }
  }

  const schoolSheet = ss.getSheetByName("Schools");
  const schools = [];
  if (schoolSheet) {
    const sData = schoolSheet.getDataRange().getValues();
    for(let i=1; i<sData.length; i++) {
      if(sData[i][0]) { schools.push({ id: String(sData[i][0]), name: sData[i][1], district: sData[i][2], province: sData[i][3] }); }
    }
  }

  const newsSheet = ss.getSheetByName("News");
  const news = [];
  if (newsSheet) {
    const nData = newsSheet.getDataRange().getValues();
    for(let i=1; i<nData.length; i++) {
       if(nData[i][0]) {
         news.push({
           id: String(nData[i][0]), 
           title: nData[i][1], 
           content: nData[i][2], 
           imageUrl: toLh3Link(nData[i][3]), 
           timestamp: Number(nData[i][4]), 
           documentUrl: nData[i][5] || '',
           tournamentId: nData[i][6] || 'global' // Column 7 for Tournament ID
         });
       }
    }
  }
  
  return successResponse({ teams, players, matches, config, schools, news, tournaments });
}

function manageNews(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("News");
  if (!sheet) {
      sheet = ss.insertSheet("News");
      sheet.appendRow(["ID", "Title", "Content", "ImageURL", "Timestamp", "DocURL", "TournamentID"]);
  }
  const subAction = data.subAction;
  const item = data.newsItem;
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      if (subAction === 'add') {
         let imgUrl = item.imageUrl && item.imageUrl.startsWith('data:') ? saveFileToDrive(item.imageUrl, `news_img_${Date.now()}`) : '';
         let docUrl = item.documentUrl && item.documentUrl.startsWith('data:') ? saveFileToDrive(item.documentUrl, `news_doc_${Date.now()}`) : '';
         sheet.appendRow([
             item.id || Date.now().toString(), 
             item.title, 
             item.content, 
             imgUrl, 
             item.timestamp || Date.now(), 
             docUrl,
             item.tournamentId || 'global'
         ]);
      } else if (subAction === 'edit') {
         const rows = sheet.getDataRange().getValues();
         for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][0]) === String(item.id)) {
               sheet.getRange(i+1, 2).setValue(item.title);
               sheet.getRange(i+1, 3).setValue(item.content);
               if (item.imageUrl && item.imageUrl.startsWith('data:')) {
                  sheet.getRange(i+1, 4).setValue(saveFileToDrive(item.imageUrl, `news_img_${item.id}`));
               }
               if (item.documentUrl && item.documentUrl.startsWith('data:')) {
                  sheet.getRange(i+1, 6).setValue(saveFileToDrive(item.documentUrl, `news_doc_${item.id}`));
               }
               if (item.tournamentId) {
                   sheet.getRange(i+1, 7).setValue(item.tournamentId);
               }
               break;
            }
         }
      } else if (subAction === 'delete') {
         const rows = sheet.getDataRange().getValues();
         for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][0]) === String(item.id)) {
               sheet.deleteRow(i+1); break;
            }
         }
      }
      return successResponse({ status: 'success' });
    } finally { lock.releaseLock(); }
  }
  return errorResponse("Server busy");
}

function handleAuth(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["ID", "Username", "Password", "DisplayName", "Role", "Phone", "PictureURL"]);
  }
  
  if (data.authType === 'line') {
    // Check if LINE user exists, else register
    const rows = sheet.getDataRange().getValues();
    let found = false;
    let user = null;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.lineUserId)) {
        user = {
          userId: String(rows[i][0]),
          username: rows[i][1],
          displayName: rows[i][3],
          role: rows[i][4],
          phoneNumber: rows[i][5],
          pictureUrl: rows[i][6]
        };
        // Update profile if changed
        if (rows[i][3] !== data.displayName || rows[i][6] !== data.pictureUrl) {
             sheet.getRange(i+1, 4).setValue(data.displayName);
             sheet.getRange(i+1, 7).setValue(data.pictureUrl);
             user.displayName = data.displayName;
             user.pictureUrl = data.pictureUrl;
        }
        found = true;
        break;
      }
    }
    if (!found) {
      const newUser = {
        userId: data.lineUserId,
        username: data.lineUserId, // Use ID as username for LINE
        password: '', // No password for LINE
        displayName: data.displayName,
        role: 'user', // Default role
        phone: '',
        pictureUrl: data.pictureUrl
      };
      sheet.appendRow([newUser.userId, newUser.username, newUser.password, newUser.displayName, newUser.role, newUser.phone, newUser.pictureUrl]);
      return successResponse(newUser);
    }
    return successResponse(user);
  } 
  else if (data.authType === 'login') {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      // FIX: Force String comparison and trim to handle data type mismatch (Number vs String)
      const sheetUsername = String(rows[i][1]).trim();
      const sheetPassword = String(rows[i][2]).trim();
      const inputUsername = String(data.username).trim();
      const inputPassword = String(data.password).trim();

      if (sheetUsername === inputUsername && sheetPassword === inputPassword) {
        return successResponse({
          userId: String(rows[i][0]),
          username: sheetUsername,
          displayName: rows[i][3],
          role: rows[i][4],
          phoneNumber: rows[i][5],
          pictureUrl: rows[i][6]
        });
      }
    }
    return errorResponse("Invalid username or password");
  } 
  else if (data.authType === 'register') {
    // Check duplicate
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).trim() === String(data.username).trim()) return errorResponse("Username already exists");
    }
    const newId = 'U_' + Date.now();
    sheet.appendRow([newId, data.username, data.password, data.displayName, 'user', data.phone, '']);
    return successResponse({
      userId: newId,
      username: data.username,
      displayName: data.displayName,
      role: 'user',
      phoneNumber: data.phone,
      pictureUrl: ''
    });
  }
}

// --- STANDARD FUNCTIONS (Keep existing implementations) ---

function getSpreadsheet() { return SpreadsheetApp.getActiveSpreadsheet(); }

function saveFileToDrive(base64Data, filename) {
  try {
    if (!base64Data || base64Data === "") return "";
    const split = base64Data.split(',');
    const type = split[0].split(';')[0].replace('data:', '');
    const data = Utilities.base64Decode(split[1]);
    const blob = Utilities.newBlob(data, type, filename);
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return ""; }
}

function toLh3Link(url) {
  if (!url || !url.includes("drive.google.com")) return url || "";
  try { return "https://lh3.googleusercontent.com/d/" + url.match(/\/d\/(.+?)\//)[1]; } catch (e) { return url; }
}

function formatDate(dateObj) {
  try {
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return String(dateObj);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch (e) { return String(dateObj); }
}

function successResponse(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function errorResponse(message) { return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: message })).setMimeType(ContentService.MimeType.JSON); }

// --- Existing logic placeholders (Ensure you keep these if you had them) ---
function registerTeam(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Teams");
  const playersSheet = ss.getSheetByName("Players");
  
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      // Handle Files
      const logoUrl = saveFileToDrive(data.logoFile, `logo_${data.schoolName}_${Date.now()}`);
      const docUrl = saveFileToDrive(data.documentFile, `doc_${data.schoolName}_${Date.now()}`);
      const slipUrl = saveFileToDrive(data.slipFile, `slip_${data.schoolName}_${Date.now()}`);
      
      const teamId = "T_" + Date.now();
      
      sheet.appendRow([
        teamId, data.schoolName, data.shortName, data.color, logoUrl, 
        'Pending', '', data.district, data.province, 
        data.directorName, data.managerName, "'" + data.managerPhone, 
        data.coachName, "'" + data.coachPhone, docUrl, slipUrl, '', data.registrationTime, data.tournamentId
      ]);
      
      // Players
      if (data.players && data.players.length > 0) {
        data.players.forEach(p => {
           let photoUrl = '';
           if (p.photoFile && p.photoFile.startsWith('data:')) {
               photoUrl = saveFileToDrive(p.photoFile, `p_${teamId}_${p.sequence}`);
           }
           playersSheet.appendRow([
             "P_" + Date.now() + "_" + Math.floor(Math.random()*1000),
             teamId,
             p.name,
             "'" + p.number, // Ensure string
             p.position || 'Player',
             photoUrl,
             p.birthDate,
             data.tournamentId
           ]);
        });
      }
      
      return successResponse({ status: 'success', teamId: teamId });
    } catch(e) {
      return errorResponse(e.toString());
    } finally {
      lock.releaseLock();
    }
  }
  return errorResponse("Server busy");
}

function updateTeamStatus(teamId, status, group, reason) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Teams");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(teamId)) {
      sheet.getRange(i + 1, 6).setValue(status); // Status
      if (group) sheet.getRange(i + 1, 7).setValue(group); // Group
      if (reason !== undefined) sheet.getRange(i + 1, 17).setValue(reason); // RejectReason
      return successResponse({ status: 'success' });
    }
  }
  return errorResponse("Team not found");
}

function updateTeamData(team, players) {
  const ss = getSpreadsheet();
  const teamSheet = ss.getSheetByName("Teams");
  const playerSheet = ss.getSheetByName("Players");
  
  // Update Team
  const tData = teamSheet.getDataRange().getValues();
  let foundTeam = false;
  for(let i=1; i<tData.length; i++) {
      if(String(tData[i][0]) === String(team.id)) {
          // Update columns based on your structure
          if(team.name) teamSheet.getRange(i+1, 2).setValue(team.name);
          if(team.shortName) teamSheet.getRange(i+1, 3).setValue(team.shortName);
          if(team.color) teamSheet.getRange(i+1, 4).setValue(team.color);
          if(team.logoUrl && team.logoUrl.startsWith('http')) teamSheet.getRange(i+1, 5).setValue(team.logoUrl);
          if(team.docUrl && team.docUrl.startsWith('http')) teamSheet.getRange(i+1, 15).setValue(team.docUrl);
          if(team.slipUrl && team.slipUrl.startsWith('http')) teamSheet.getRange(i+1, 16).setValue(team.slipUrl);
          // Personnel
          if(team.directorName) teamSheet.getRange(i+1, 10).setValue(team.directorName);
          if(team.managerName) teamSheet.getRange(i+1, 11).setValue(team.managerName);
          if(team.managerPhone) teamSheet.getRange(i+1, 12).setValue("'" + team.managerPhone);
          if(team.coachName) teamSheet.getRange(i+1, 13).setValue(team.coachName);
          if(team.coachPhone) teamSheet.getRange(i+1, 14).setValue("'" + team.coachPhone);
          
          foundTeam = true;
          break;
      }
  }
  
  if (!foundTeam) return errorResponse("Team not found");

  // Update Players (Simple approach: Delete old for team, Add new)
  // Or match by Name/ID if preserving IDs is crucial. Here assuming full replace for edit form
  // BETTER: Match by ID if available, else append
  
  // NOTE: Ideally, we should iterate players and update row if ID exists, or append if new
  // For brevity in this fix, I'll stick to a robust update loop
  
  const pData = playerSheet.getDataRange().getValues();
  players.forEach(p => {
      let matched = false;
      // Try to find existing player by ID (if it's not a temp ID)
      if (p.id && !p.id.startsWith('TEMP_')) {
          for(let r=1; r<pData.length; r++) {
              if (String(pData[r][0]) === String(p.id)) {
                  // Update
                  if(p.name) playerSheet.getRange(r+1, 3).setValue(p.name);
                  if(p.number) playerSheet.getRange(r+1, 4).setValue("'" + p.number);
                  if(p.birthDate) playerSheet.getRange(r+1, 7).setValue(p.birthDate);
                  if(p.photoUrl && p.photoUrl.startsWith('data:')) {
                      const url = saveFileToDrive(p.photoUrl, `p_${team.id}_${Date.now()}`);
                      playerSheet.getRange(r+1, 6).setValue(url);
                  }
                  matched = true;
                  break;
              }
          }
      }
      
      if (!matched) {
          // Append New
          let photoUrl = '';
          if(p.photoUrl && p.photoUrl.startsWith('data:')) {
              photoUrl = saveFileToDrive(p.photoUrl, `p_${team.id}_${Date.now()}`);
          }
          playerSheet.appendRow([
             "P_" + Date.now() + "_" + Math.floor(Math.random()*1000),
             team.id,
             p.name,
             "'" + p.number,
             'Player',
             photoUrl,
             p.birthDate,
             team.tournamentId || 'default'
          ]);
      }
  });

  return successResponse({ status: 'success' });
}

function saveMatch(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Matches");
  const rows = sheet.getDataRange().getValues();
  let matchRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.matchId)) {
      matchRowIndex = i + 1;
      break;
    }
  }

  // If match doesn't exist (new match), append it
  if (matchRowIndex === -1) {
    sheet.appendRow([
      data.matchId,
      typeof data.teamA === 'string' ? data.teamA : data.teamA.name,
      typeof data.teamB === 'string' ? data.teamB : data.teamB.name,
      data.scoreA,
      data.scoreB,
      data.winner,
      new Date().toISOString(),
      data.summary || '',
      data.roundLabel || '',
      data.status || 'Finished',
      data.venue || '',
      data.scheduledTime || '',
      data.livestreamUrl || '',
      data.livestreamCover || '',
      data.tournamentId || 'default'
    ]);
  } else {
    // Update existing
    sheet.getRange(matchRowIndex, 4).setValue(data.scoreA);
    sheet.getRange(matchRowIndex, 5).setValue(data.scoreB);
    sheet.getRange(matchRowIndex, 6).setValue(data.winner);
    sheet.getRange(matchRowIndex, 8).setValue(data.summary || ''); // Summary
    if (data.status) sheet.getRange(matchRowIndex, 10).setValue(data.status);
  }

  // Save Kicks if present
  if (data.kicks && data.kicks.length > 0) {
      saveKicks(data.kicks);
  }
  
  return successResponse({ status: 'success' });
}

function saveKicks(kicks) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Kicks");
    
    // For simplicity, we just append all kicks. 
    // In a production app, you might want to clear old kicks for this match first or check for duplicates.
    // Here we check if kick ID exists to avoid duplication if re-saving
    
    const existingIds = new Set();
    const data = sheet.getDataRange().getValues();
    // Assuming Kick ID isn't strictly stored in column 1 (MatchID is col 1). 
    // Wait, Kicks sheet structure: MatchID, Round, Team, Player, Result, Timestamp
    // We don't have a unique Kick ID column in the sheet schema defined in getData().
    // We will delete all kicks for this match and re-insert to be safe and clean.
    
    const matchId = kicks[0].matchId;
    // Find rows to delete (iterate backwards)
    for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][0]) === String(matchId)) {
            sheet.deleteRow(i + 1);
        }
    }
    
    // Insert new
    kicks.forEach(k => {
        sheet.appendRow([
            k.matchId,
            k.round,
            k.teamId,
            k.player,
            k.result,
            k.timestamp,
            k.tournamentId || 'default'
        ]);
    });
    
    return successResponse({ status: 'success' });
}

function scheduleMatch(data) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Matches");
    if (!sheet) {
        sheet = ss.insertSheet("Matches");
        sheet.appendRow(["MatchID","TeamA","TeamB","ScoreA","ScoreB","Winner","Date","Summary","Round","Status","Venue","ScheduledTime","LiveURL","LiveCover","TournamentID"]);
    }
    
    const rows = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.matchId)) {
            rowIndex = i + 1;
            break;
        }
    }
    
    let coverUrl = "";
    if (data.livestreamCover && data.livestreamCover.startsWith("data:")) {
        coverUrl = saveFileToDrive(data.livestreamCover, `cover_${data.matchId}`);
    } else if (data.livestreamCover) {
        coverUrl = data.livestreamCover; // Keep existing if url
    }

    if (rowIndex === -1) {
        sheet.appendRow([
            data.matchId, data.teamA, data.teamB, 0, 0, '', new Date().toISOString(), '', 
            data.roundLabel, 'Scheduled', data.venue, data.scheduledTime, data.livestreamUrl, coverUrl, data.tournamentId || 'default'
        ]);
    } else {
        // Update
        if(data.teamA) sheet.getRange(rowIndex, 2).setValue(data.teamA);
        if(data.teamB) sheet.getRange(rowIndex, 3).setValue(data.teamB);
        sheet.getRange(rowIndex, 9).setValue(data.roundLabel);
        sheet.getRange(rowIndex, 11).setValue(data.venue);
        sheet.getRange(rowIndex, 12).setValue(data.scheduledTime);
        sheet.getRange(rowIndex, 13).setValue(data.livestreamUrl);
        if (coverUrl) sheet.getRange(rowIndex, 14).setValue(coverUrl);
        if (data.tournamentId) sheet.getRange(rowIndex, 15).setValue(data.tournamentId);
    }
    
    return successResponse({ status: 'success' });
}

function deleteMatch(matchId) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Matches");
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(matchId)) {
            sheet.deleteRow(i + 1);
            return successResponse({ status: 'success' });
        }
    }
    return errorResponse("Match not found");
}

function saveSettings(settings) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Config");
    if (!sheet) {
        sheet = ss.insertSheet("Config");
    }
    
    // Ensure header
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(["CompName","Logo","BankName","BankAccount","AccountName","Location","Link","Announcement","PIN","Lat","Lng","Fee","Goal","ObjTitle","ObjDesc","ObjImg"]);
    }
    
    // Save/Overwrite Row 2
    let logoUrl = settings.competitionLogo;
    if (logoUrl && logoUrl.startsWith('data:')) {
        logoUrl = saveFileToDrive(logoUrl, 'comp_logo_' + Date.now());
    }
    let objImgUrl = settings.objectiveImageUrl;
    if (objImgUrl && objImgUrl.startsWith('data:')) {
        objImgUrl = saveFileToDrive(objImgUrl, 'obj_img_' + Date.now());
    }

    const rowData = [
        settings.competitionName,
        logoUrl,
        settings.bankName,
        settings.bankAccount,
        settings.accountName,
        settings.locationName,
        settings.locationLink,
        settings.announcement,
        settings.adminPin,
        settings.locationLat,
        settings.locationLng,
        settings.registrationFee,
        settings.fundraisingGoal,
        settings.objectiveTitle,
        settings.objectiveDescription,
        objImgUrl
    ];
    
    if (sheet.getLastRow() < 2) {
        sheet.appendRow(rowData);
    } else {
        sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
    }
    
    return successResponse({ status: 'success' });
}

function createTournament(name, type) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Tournaments");
    if (!sheet) {
       sheet = ss.insertSheet("Tournaments");
       sheet.appendRow(["ID", "Name", "Type", "Status", "ConfigJSON"]);
    }
    const id = "TRN_" + Date.now();
    sheet.appendRow([id, name, type, "Active", "{}"]);
    return successResponse({ tournamentId: id });
}

function updateTournament(tournament) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Tournaments");
    const data = sheet.getDataRange().getValues();
    
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(tournament.id)) {
            sheet.getRange(i+1, 2).setValue(tournament.name);
            sheet.getRange(i+1, 3).setValue(tournament.type);
            sheet.getRange(i+1, 4).setValue(tournament.status);
            sheet.getRange(i+1, 5).setValue(tournament.config);
            return successResponse({ status: 'success' });
        }
    }
    return errorResponse("Tournament not found");
}

function saveMatchEvents(events) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("MatchEvents");
    if (!sheet) {
        sheet = ss.insertSheet("MatchEvents");
        sheet.appendRow(["ID", "MatchID", "TournamentID", "Minute", "Type", "Player", "TeamID", "Timestamp"]);
    }
    
    if (events && events.length > 0) {
        // Append all
        events.forEach(e => {
            sheet.appendRow([e.id, e.matchId, e.tournamentId, e.minute, e.type, e.player, e.teamId, e.timestamp]);
        });
    }
    return successResponse({ status: 'success' });
}

function submitDonation(data) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Donations");
    if (!sheet) {
        sheet = ss.insertSheet("Donations");
        sheet.appendRow(["Timestamp", "DonorName", "Amount", "Phone", "IsEDonation", "TaxID", "Address", "SlipURL", "TournamentID"]);
    }
    
    let slipUrl = "";
    if (data.slipFile && data.slipFile.startsWith('data:')) {
        slipUrl = saveFileToDrive(data.slipFile, `donation_slip_${Date.now()}`);
    }
    
    sheet.appendRow([
        new Date(),
        data.donorName,
        data.amount,
        data.donorPhone,
        data.isEdonation,
        data.taxId,
        data.address,
        slipUrl,
        data.tournamentId
    ]);
    
    return successResponse({ status: 'success' });
}
