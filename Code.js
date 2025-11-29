
// ==========================================
// COPY THIS CODE TO YOUR GOOGLE APPS SCRIPT (Code.gs)
// ==========================================

// --- CONFIGURATION ---
const FOLDER_NAME = "PenaltyPro_Uploads"; 

// --- MAIN WEB APP HANDLERS ---

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getData') {
    return getData();
  }
  return ContentService.createTextOutput("Penalty Pro Recorder API is running.");
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
    } else if (action === 'saveMatchEvents') { // Phase 3
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
    } else if (action === 'updateTournament') { // Phase 4
      return updateTournament(data.tournament);
    }
    
    return errorResponse("Unknown action: " + action);
    
  } catch (error) {
    return errorResponse(error.toString());
  }
}

function testAuth() {
  UrlFetchApp.fetch("https://www.google.com");
  Logger.log("Authorized!");
}

// --- AI FUNCTION (GEMINI via Script Properties) ---
function handleAiGenerate(promptText, modelName) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) return errorResponse("Server Error: GEMINI_API_KEY missing");

  var model = modelName || "gemini-1.5-flash"; 
  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
  
  var payload = { "contents": [{ "parts": [{ "text": promptText }] }] };
  var options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    if (json.candidates && json.candidates.length > 0) {
      return successResponse({ text: json.candidates[0].content.parts[0].text });
    } else {
      var errMsg = json.error ? json.error.message : "Unknown AI Error";
      return errorResponse("AI Error (" + model + "): " + errMsg);
    }
  } catch (e) {
    return errorResponse("Fetch Error: " + e.toString());
  }
}

// --- CORE FUNCTIONS ---

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
           id: String(nData[i][0]), title: nData[i][1], content: nData[i][2], imageUrl: toLh3Link(nData[i][3]), timestamp: Number(nData[i][4]), documentUrl: nData[i][5] || ''
         });
       }
    }
  }
  
  return successResponse({ teams, players, matches, config, schools, news, tournaments });
}

function createTournament(name, type) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Tournaments");
  if (!sheet) {
     sheet = ss.insertSheet("Tournaments");
     sheet.appendRow(["ID", "Name", "Type", "Status", "ConfigJSON"]);
  }
  const id = "T" + Date.now();
  sheet.appendRow([id, name, type, "Active", "{}"]);
  return successResponse({ tournamentId: id });
}

function updateTournament(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Tournaments");
  const rows = sheet.getDataRange().getValues();
  const lock = LockService.getScriptLock();
  
  if (lock.tryLock(30000)) {
    try {
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          
          // Parse config to handle image uploads
          let configObj = {};
          try {
             configObj = JSON.parse(data.config);
          } catch(e) { configObj = {}; }

          // Handle Objective Images
          if (configObj.objective && configObj.objective.images && Array.isArray(configObj.objective.images)) {
             configObj.objective.images = configObj.objective.images.map(img => {
                if (img.url && img.url.startsWith('data:')) {
                   // Save to Drive and replace URL
                   const newUrl = saveFileToDrive(img.url, 'proj_img_' + data.id + '_' + img.id);
                   return { ...img, url: newUrl };
                }
                return img;
             });
          }

          // Serialize back
          const finalConfigStr = JSON.stringify(configObj);

          sheet.getRange(i + 1, 2).setValue(data.name);
          sheet.getRange(i + 1, 3).setValue(data.type);
          sheet.getRange(i + 1, 4).setValue(data.status);
          sheet.getRange(i + 1, 5).setValue(finalConfigStr);
          
          return successResponse({ status: 'success' });
        }
      }
      return errorResponse("Tournament not found");
    } finally {
      lock.releaseLock();
    }
  }
  return errorResponse("Server busy");
}

function registerTeam(data) {
  const ss = getSpreadsheet();
  const lock = LockService.getScriptLock();
  if (lock.tryLock(30000)) { 
    try {
      let teamSheet = ss.getSheetByName("Teams");
      if (!teamSheet) { teamSheet = ss.insertSheet("Teams"); teamSheet.appendRow(["ID", "Name", "ShortName", "Color", "LogoUrl", "Status", "Group", "District", "Province", "Director", "Manager", "ManagerPhone", "Coach", "CoachPhone", "DocUrl", "SlipUrl", "RejectReason", "RegistrationTime", "TournamentID"]); }
      
      const teamId = "T" + Date.now();
      const shortName = data.shortName || data.schoolName.substring(0, 3).toUpperCase();
      const regTime = data.registrationTime ? new Date(data.registrationTime).toLocaleString() : new Date().toLocaleString();
      const tId = data.tournamentId || 'default';

      const teamRow = [teamId, data.schoolName, shortName, data.color, "", "Pending", "", data.district, data.province, data.directorName, data.managerName, "'" + data.phone, data.coachName, "'" + data.coachPhone, "", "", "", regTime, tId];
      teamSheet.appendRow(teamRow);
      const teamRowIndex = teamSheet.getLastRow();

      let playerSheet = ss.getSheetByName("Players");
      if (!playerSheet) { playerSheet = ss.insertSheet("Players"); playerSheet.appendRow(["ID", "TeamID", "Name", "Number", "Position", "PhotoUrl", "BirthDate", "TournamentID"]); }
      
      const playersMeta = []; 
      data.players.forEach(p => {
         const pid = "P" + Math.floor(Math.random() * 1000000);
         playerSheet.appendRow([pid, teamId, p.name, "'" + p.number, 'Player', "", p.birthDate, tId]);
         playersMeta.push({ file: p.photoFile, rowIndex: playerSheet.getLastRow(), name: p.name });
      });

      try {
         const logoUrl = data.logoFile ? saveFileToDrive(data.logoFile, `logo_${teamId}`) : '';
         const docUrl = data.documentFile ? saveFileToDrive(data.documentFile, `doc_${teamId}`) : '';
         const slipUrl = data.slipFile ? saveFileToDrive(data.slipFile, `slip_${teamId}`) : '';
         
         if (logoUrl) teamSheet.getRange(teamRowIndex, 5).setValue(logoUrl);
         if (docUrl) teamSheet.getRange(teamRowIndex, 15).setValue(docUrl);
         if (slipUrl) teamSheet.getRange(teamRowIndex, 16).setValue(slipUrl);
         
         playersMeta.forEach(pm => {
            if (pm.file) playerSheet.getRange(pm.rowIndex, 6).setValue(saveFileToDrive(pm.file, `player_${pm.name}_${teamId}`));
         });
      } catch (uploadError) { Logger.log("Upload Warning: " + uploadError); }
      
      return successResponse({ teamId: teamId });
    } catch (e) { return errorResponse(e.toString()); } finally { lock.releaseLock(); }
  }
  return errorResponse("Busy");
}

function updateTeamData(teamData, playersData) {
  const ss = getSpreadsheet();
  const lock = LockService.getScriptLock();
  if (lock.tryLock(30000)) { 
    try {
      const teamSheet = ss.getSheetByName("Teams");
      const tData = teamSheet.getDataRange().getValues();
      let teamRowIndex = -1;
      let currentTId = 'default';
      
      for (let i = 1; i < tData.length; i++) {
        if (String(tData[i][0]) === String(teamData.id)) {
          teamRowIndex = i + 1;
          currentTId = tData[i][18] || 'default'; // Preserve TournamentID
          break;
        }
      }
      
      if (teamRowIndex !== -1) {
         let finalLogo = teamData.logoUrl; let finalSlip = teamData.slipUrl; let finalDoc = teamData.docUrl;
         if (finalLogo && finalLogo.startsWith('data:')) finalLogo = saveFileToDrive(finalLogo, `logo_${teamData.name}`);
         if (finalSlip && finalSlip.startsWith('data:')) finalSlip = saveFileToDrive(finalSlip, `slip_${teamData.name}`);
         if (finalDoc && finalDoc.startsWith('data:')) finalDoc = saveFileToDrive(finalDoc, `doc_${teamData.name}`);

         teamSheet.getRange(teamRowIndex, 2).setValue(teamData.name);
         teamSheet.getRange(teamRowIndex, 3).setValue(teamData.shortName || teamData.name.substring(0,3));
         if (finalLogo) teamSheet.getRange(teamRowIndex, 5).setValue(finalLogo);
         teamSheet.getRange(teamRowIndex, 4).setValue(teamData.color);
         teamSheet.getRange(teamRowIndex, 7).setValue(teamData.group || '');
         teamSheet.getRange(teamRowIndex, 8).setValue(teamData.district);
         teamSheet.getRange(teamRowIndex, 9).setValue(teamData.province);
         teamSheet.getRange(teamRowIndex, 10).setValue(teamData.directorName || '');
         teamSheet.getRange(teamRowIndex, 11).setValue(teamData.managerName);
         teamSheet.getRange(teamRowIndex, 12).setValue("'" + teamData.managerPhone);
         teamSheet.getRange(teamRowIndex, 13).setValue(teamData.coachName);
         teamSheet.getRange(teamRowIndex, 14).setValue("'" + teamData.coachPhone);
         if (finalDoc) teamSheet.getRange(teamRowIndex, 15).setValue(finalDoc); 
         if (finalSlip) teamSheet.getRange(teamRowIndex, 16).setValue(finalSlip);
      }
      
      const playerSheet = ss.getSheetByName("Players");
      const allPlayers = playerSheet.getDataRange().getValues();
      for (let i = allPlayers.length - 1; i >= 1; i--) {
        if (String(allPlayers[i][1]) === String(teamData.id)) playerSheet.deleteRow(i + 1);
      }
      
      playersData.forEach(p => {
         let finalPhoto = p.photoUrl;
         if (finalPhoto && finalPhoto.startsWith('data:')) finalPhoto = saveFileToDrive(finalPhoto, `player_${p.name}`);
         playerSheet.appendRow([p.id || "P" + Math.floor(Math.random() * 1000000), teamData.id, p.name, "'" + p.number, 'Player', finalPhoto || '', p.birthDate, currentTId]);
      });
      return successResponse({ status: 'success' });
    } catch (e) { return errorResponse(e.toString()); } finally { lock.releaseLock(); }
  }
  return errorResponse("Server busy");
}

function updateTeamStatus(teamId, status, group, reason) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Teams");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(teamId)) {
      sheet.getRange(i + 1, 6).setValue(status);
      if (group !== undefined) sheet.getRange(i + 1, 7).setValue(group);
      if (reason !== undefined) sheet.getRange(i + 1, 17).setValue(reason);
      return successResponse({ status: 'success' });
    }
  }
  return errorResponse("Team not found");
}

function scheduleMatch(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Matches");
  if (!sheet) { sheet = ss.insertSheet("Matches"); sheet.appendRow(["MatchID","TeamA","TeamB","ScoreA","ScoreB","Winner","Date","Summary","Round","Status","Venue","ScheduledTime","LiveURL","LiveCover","TournamentID"]); }
  
  const rows = sheet.getDataRange().getValues();
  const lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) {
    try {
      let found = false;
      for (let i = 1; i < rows.length; i++) {
         if ((data.matchId && String(rows[i][0]) === String(data.matchId)) || (data.roundLabel && rows[i][8] === data.roundLabel)) {
             sheet.getRange(i+1, 2).setValue(data.teamA);
             sheet.getRange(i+1, 3).setValue(data.teamB);
             if (data.venue) sheet.getRange(i+1, 11).setValue(data.venue);
             if (data.scheduledTime) {
                sheet.getRange(i+1, 12).setValue(data.scheduledTime);
                sheet.getRange(i+1, 7).setValue(data.scheduledTime);
             }
             if (!rows[i][0] && data.matchId) sheet.getRange(i+1, 1).setValue(data.matchId);
             
             if (data.livestreamUrl !== undefined) sheet.getRange(i+1, 13).setValue(data.livestreamUrl);
             if (data.livestreamCover !== undefined) {
                 let cover = data.livestreamCover;
                 if (cover && cover.startsWith('data:')) cover = saveFileToDrive(cover, `cover_${data.matchId || Date.now()}`);
                 sheet.getRange(i+1, 14).setValue(cover);
             }
             found = true; break;
         }
      }
      
      if (!found) {
          let cover = data.livestreamCover || '';
          if (cover && cover.startsWith('data:')) cover = saveFileToDrive(cover, `cover_${data.matchId || Date.now()}`);
          sheet.appendRow([data.matchId, data.teamA, data.teamB, 0, 0, '', data.scheduledTime || new Date().toISOString(), '', data.roundLabel, 'Scheduled', data.venue || '', data.scheduledTime || '', data.livestreamUrl || '', cover, data.tournamentId || 'default']);
      }
      return successResponse({ status: 'success' });
    } finally { lock.releaseLock(); }
  }
  return errorResponse("Busy");
}

function saveMatch(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Matches");
  if (!sheet) { sheet = ss.insertSheet("Matches"); sheet.appendRow(["MatchID","TeamA","TeamB","ScoreA","ScoreB","Winner","Date","Summary","Round","Status","Venue","ScheduledTime","LiveURL","LiveCover","TournamentID"]); }
  const lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) {
    try {
      const rows = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.matchId)) {
          rowIndex = i + 1; break;
        }
      }
      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, 4).setValue(data.scoreA);
        sheet.getRange(rowIndex, 5).setValue(data.scoreB);
        sheet.getRange(rowIndex, 6).setValue(data.winner);
        sheet.getRange(rowIndex, 10).setValue(data.status || 'Finished'); 
        if (data.teamA) sheet.getRange(rowIndex, 2).setValue(data.teamA);
        if (data.teamB) sheet.getRange(rowIndex, 3).setValue(data.teamB);
        if (data.summary) sheet.getRange(rowIndex, 8).setValue(data.summary);
        if (data.livestreamUrl !== undefined) sheet.getRange(rowIndex, 13).setValue(data.livestreamUrl);
        if (data.livestreamCover !== undefined) {
             let cover = data.livestreamCover;
             if (cover && cover.startsWith('data:')) cover = saveFileToDrive(cover, `cover_${data.matchId}`);
             sheet.getRange(rowIndex, 14).setValue(cover);
        }
      } else {
        sheet.appendRow([data.matchId, data.teamA, data.teamB, data.scoreA, data.scoreB, data.winner, new Date().toISOString(), data.summary, data.roundLabel || '', 'Finished', '', '', '', '', data.tournamentId || 'default']);
      }
      
      if (data.kicks && data.kicks.length > 0) {
         saveKicks(data.kicks.map(k => ({
             matchId: data.matchId, round: k.round, team: k.teamId, player: k.player, result: k.result, timestamp: k.timestamp || Date.now(), tournamentId: data.tournamentId || 'default'
         })));
      }
      return successResponse({ status: 'success' });
    } finally { lock.releaseLock(); }
  }
  return errorResponse("Busy");
}

function saveKicks(kicksArray) {
   const ss = getSpreadsheet();
   let sheet = ss.getSheetByName("Kicks");
   if (!sheet) { sheet = ss.insertSheet("Kicks"); sheet.appendRow(["MatchID", "Round", "Team", "Player", "Result", "Timestamp", "TournamentID"]); }
   const newRows = kicksArray.map(k => [k.matchId, k.round, k.team, k.player, k.result, k.timestamp, k.tournamentId || 'default']);
   if (newRows.length > 0) {
       const lastRow = sheet.getLastRow();
       sheet.getRange(lastRow + 1, 1, newRows.length, 7).setValues(newRows);
   }
   return successResponse({ status: 'success' });
}

// Phase 3: Save Match Events
function saveMatchEvents(eventsArray) {
   if (!eventsArray || eventsArray.length === 0) return successResponse("No events");
   const ss = getSpreadsheet();
   let sheet = ss.getSheetByName("MatchEvents");
   if (!sheet) { sheet = ss.insertSheet("MatchEvents"); sheet.appendRow(["ID", "MatchID", "TournamentID", "Minute", "Type", "Player", "TeamID", "RelatedPlayer", "Timestamp"]); }
   
   const newRows = eventsArray.map(e => [e.id, e.matchId, e.tournamentId, e.minute, e.type, e.player, e.teamId, e.relatedPlayer || '', e.timestamp]);
   if (newRows.length > 0) {
       const lastRow = sheet.getLastRow();
       sheet.getRange(lastRow + 1, 1, newRows.length, 9).setValues(newRows);
   }
   return successResponse({ status: 'success' });
}

// ... saveSettings, deleteMatch, utility functions (unchanged) ...
function saveSettings(settings) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Config");
  if (!sheet) sheet = ss.insertSheet("Config");
  let objImg = settings.objectiveImageUrl;
  if (objImg && objImg.startsWith('data:')) objImg = saveFileToDrive(objImg, 'objective_img_' + Date.now());
  const values = [[settings.competitionName, settings.competitionLogo, settings.bankName, settings.bankAccount, settings.accountName, settings.locationName, settings.locationLink, settings.announcement, settings.adminPin, settings.locationLat, settings.locationLng, settings.registrationFee, settings.fundraisingGoal, settings.objectiveTitle, settings.objectiveDescription, objImg || settings.objectiveImageUrl]];
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, 1, 16).setValues(values); else sheet.appendRow(values[0]);
  return successResponse({ status: 'success' });
}

function deleteMatch(matchId) {
  const ss = getSpreadsheet();
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const kickSheet = ss.getSheetByName("Kicks");
      if (kickSheet) {
          const kData = kickSheet.getDataRange().getValues();
          for (let i = kData.length - 1; i >= 1; i--) {
              if (String(kData[i][0]) === String(matchId)) kickSheet.deleteRow(i + 1);
          }
      }
      const sheet = ss.getSheetByName("Matches");
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(matchId)) { sheet.deleteRow(i + 1); return successResponse({ status: 'success' }); }
      }
      return errorResponse("Match not found");
    } finally { lock.releaseLock(); }
  }
  return errorResponse("Busy");
}

function handleAuth(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  if (!sheet) { sheet = ss.insertSheet("Users"); sheet.appendRow(["ID", "Username", "Password", "DisplayName", "Role", "Phone", "PictureUrl", "LineUserId", "LastLogin"]); }
  const users = sheet.getDataRange().getValues();
  const type = data.authType; 

  if (type === 'register') {
    for (let i = 1; i < users.length; i++) { if (users[i][1] && String(users[i][1]).toLowerCase() === String(data.username).toLowerCase()) return errorResponse("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว"); }
    const newId = "U" + Date.now(); const role = users.length <= 1 ? 'admin' : 'user';
    sheet.appendRow([newId, data.username, data.password, data.displayName, role, data.phone || '', data.pictureUrl || '', '', new Date()]);
    return successResponse({ userId: newId, username: data.username, displayName: data.displayName, role: role, phoneNumber: data.phone, pictureUrl: data.pictureUrl });
  } else if (type === 'login') {
    for (let i = 1; i < users.length; i++) {
      if (String(users[i][1]).toLowerCase() === String(data.username).toLowerCase() && String(users[i][2]) === String(data.password)) {
        sheet.getRange(i + 1, 9).setValue(new Date());
        return successResponse({ userId: users[i][0], username: users[i][1], displayName: users[i][3], role: users[i][4], phoneNumber: users[i][5], pictureUrl: users[i][6] });
      }
    }
    return errorResponse("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  } else if (type === 'line') {
    const lineId = data.lineUserId; let foundIndex = -1;
    for (let i = 1; i < users.length; i++) { if (String(users[i][7]) === String(lineId)) { foundIndex = i; break; } }
    if (foundIndex !== -1) {
      sheet.getRange(foundIndex + 1, 9).setValue(new Date());
      if (data.pictureUrl) sheet.getRange(foundIndex + 1, 7).setValue(data.pictureUrl);
      if (data.displayName) sheet.getRange(foundIndex + 1, 4).setValue(data.displayName);
      const u = users[foundIndex];
      return successResponse({ userId: u[0], username: u[1], displayName: data.displayName, role: u[4], phoneNumber: u[5], pictureUrl: data.pictureUrl });
    } else {
      const newId = "U" + Date.now(); const role = users.length <= 1 ? 'admin' : 'user';
      sheet.appendRow([newId, '', '', data.displayName, role, '', data.pictureUrl, lineId, new Date()]);
      return successResponse({ userId: newId, displayName: data.displayName, role: role, pictureUrl: data.pictureUrl, type: 'line' });
    }
  }
  return errorResponse("Invalid Auth Type");
}

function manageNews(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("News");
  if (!sheet) sheet = ss.insertSheet("News");
  const subAction = data.subAction;
  const item = data.newsItem;
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      if (subAction === 'add') {
         let imgUrl = item.imageUrl && item.imageUrl.startsWith('data:') ? saveFileToDrive(item.imageUrl, `news_img_${Date.now()}`) : '';
         let docUrl = item.documentUrl && item.documentUrl.startsWith('data:') ? saveFileToDrive(item.documentUrl, `news_doc_${Date.now()}`) : '';
         sheet.appendRow([item.id || Date.now().toString(), item.title, item.content, imgUrl, item.timestamp || Date.now(), docUrl]);
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
