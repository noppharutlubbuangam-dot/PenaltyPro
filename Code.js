
// ==========================================
// COPY THIS CODE TO YOUR GOOGLE APPS SCRIPT (Code.gs)
// ==========================================

// --- CONFIGURATION ---
const FOLDER_NAME = "PenaltyPro_Uploads"; 

// --- MAIN WEB APP HANDLERS ---

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getUsers') {
      return getUsers();
    } else if (action === 'getData') {
      return getData();
    }
    
    return successResponse({ status: 'running', message: 'Penalty Pro API is active' });

  } catch (error) {
    return errorResponse(error.toString());
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'register') return registerTeam(data);
    else if (action === 'updateStatus') return updateTeamStatus(data.teamId, data.status, data.group, data.reason);
    else if (action === 'updateTeamData') return updateTeamData(data.team, data.players);
    else if (action === 'saveMatch') return saveMatch(data);
    else if (action === 'saveKicks') return saveKicks(data.data);
    else if (action === 'saveMatchEvents') return saveMatchEvents(data.events);
    else if (action === 'saveSettings') return saveSettings(data.settings);
    else if (action === 'manageNews') return manageNews(data);
    else if (action === 'scheduleMatch') return scheduleMatch(data);
    else if (action === 'deleteMatch') return deleteMatch(data.matchId);
    else if (action === 'auth') return handleAuth(data);
    else if (action === 'createTournament') return createTournament(data.name, data.type);
    else if (action === 'updateTournament') return updateTournament(data.tournament);
    else if (action === 'submitDonation') return submitDonation(data);
    else if (action === 'verifyDonation') return verifyDonation(data.donationId, data.status);
    else if (action === 'updateUserRole') return updateUserRole(data.userId, data.role);
    
    return errorResponse("Unknown action: " + action);
    
  } catch (error) {
    return errorResponse(error.toString());
  }
}

// --- CORE FUNCTIONS ---

function getUsers() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  if (!sheet) return successResponse({ users: [] });
  
  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[0]) {
      users.push({
        userId: String(r[0]),
        username: r[1],
        displayName: r[3],
        role: r[4] || 'user',
        phoneNumber: r[5],
        pictureUrl: r[6],
        lineUserId: r[7] || ''
      });
    }
  }
  return successResponse({ users: users });
}

function getData() {
  const ss = getSpreadsheet();
  
  // Create sheets if missing
  if(!ss.getSheetByName("Tournaments")) {
     const s = ss.insertSheet("Tournaments");
     s.appendRow(["ID", "Name", "Type", "Status", "ConfigJSON"]);
     s.appendRow(["default", "Default Tournament", "Penalty", "Active", "{}"]);
  }
  if(!ss.getSheetByName("Teams")) {
     const s = ss.insertSheet("Teams");
     s.appendRow(["ID", "Name", "ShortName", "Color", "LogoUrl", "Status", "Group", "District", "Province", "Director", "Manager", "ManagerPhone", "Coach", "CoachPhone", "DocUrl", "SlipUrl", "RejectReason", "RegistrationTime", "TournamentID"]);
  }
  if(!ss.getSheetByName("Players")) {
     const s = ss.insertSheet("Players");
     s.appendRow(["ID", "TeamID", "Name", "Number", "Position", "PhotoUrl", "BirthDate", "TournamentID"]);
  }
  if(!ss.getSheetByName("Matches")) {
     const s = ss.insertSheet("Matches");
     s.appendRow(["MatchID","TeamA","TeamB","ScoreA","ScoreB","Winner","Date","Summary","Round","Status","Venue","ScheduledTime","LiveURL","LiveCover","TournamentID"]);
  }
  if(!ss.getSheetByName("Kicks")) {
     const s = ss.insertSheet("Kicks");
     s.appendRow(["MatchID", "Round", "Team", "Player", "Result", "Timestamp", "TournamentID"]);
  }
  if(!ss.getSheetByName("Donations")) {
     const s = ss.insertSheet("Donations");
     s.appendRow(["ID", "Timestamp", "DonorName", "Amount", "Phone", "IsEDonation", "TaxID", "Address", "SlipURL", "TournamentID", "LineUserID", "Status"]);
  }
  if(!ss.getSheetByName("News")) {
     const s = ss.insertSheet("News");
     s.appendRow(["ID", "Title", "Content", "ImageURL", "Timestamp", "DocURL", "TournamentID"]);
  }
  if(!ss.getSheetByName("Schools")) {
     const s = ss.insertSheet("Schools");
     s.appendRow(["ID", "Name", "District", "Province"]);
  }
  
  // Config Sheet
  let configSheet = ss.getSheetByName("Config");
  let config = {};
  if (configSheet) {
    const data = configSheet.getDataRange().getValues();
    if (data.length > 1) {
       const r = data[1];
       config = {
         competitionName: r[0], competitionLogo: toLh3Link(r[1]), bankName: r[2], bankAccount: r[3], accountName: r[4],
         locationName: r[5], locationLink: r[6], announcement: r[7], adminPin: String(r[8] || '1234'),
         locationLat: r[9] || 0, locationLng: r[10] || 0, registrationFee: r[11] || 0, fundraisingGoal: r[12] || 0,
         objectiveTitle: r[13] || '', objectiveDescription: r[14] || '', objectiveImageUrl: toLh3Link(r[15] || '')
       };
    }
  }

  // Helper to read sheet
  const read = (name) => {
      const s = ss.getSheetByName(name);
      return s ? s.getDataRange().getValues() : [];
  };

  const tourneyData = read("Tournaments");
  const tournaments = [];
  for(let i=1; i<tourneyData.length; i++) {
      if(tourneyData[i][0]) tournaments.push({ id: String(tourneyData[i][0]), name: tourneyData[i][1], type: tourneyData[i][2], status: tourneyData[i][3], config: tourneyData[i][4] });
  }

  const teamsData = read("Teams");
  const teams = [];
  for(let i=1; i<teamsData.length; i++) {
      if(teamsData[i][0]) teams.push({ id: String(teamsData[i][0]), name: teamsData[i][1], shortName: teamsData[i][2], color: teamsData[i][3], logoUrl: toLh3Link(teamsData[i][4]), status: teamsData[i][5] || 'Pending', group: teamsData[i][6] || '', district: teamsData[i][7], province: teamsData[i][8], directorName: teamsData[i][9], managerName: teamsData[i][10], managerPhone: String(teamsData[i][11]).replace(/^'/, ''), coachName: teamsData[i][12], coachPhone: String(teamsData[i][13]).replace(/^'/, ''), docUrl: teamsData[i][14], slipUrl: toLh3Link(teamsData[i][15]), rejectReason: teamsData[i][16], registrationTime: teamsData[i][17], tournamentId: teamsData[i][18] || 'default' });
  }

  const playersData = read("Players");
  const players = [];
  for(let i=1; i<playersData.length; i++) {
      if(playersData[i][0]) players.push({ id: String(playersData[i][0]), teamId: String(playersData[i][1]), name: playersData[i][2], number: String(playersData[i][3]).replace(/^'/, ''), position: playersData[i][4], photoUrl: toLh3Link(playersData[i][5]), birthDate: playersData[i][6] ? formatDate(playersData[i][6]) : '', tournamentId: playersData[i][7] || 'default' });
  }

  const matchesData = read("Matches");
  const kicksData = read("Kicks");
  const allKicks = [];
  for(let i=1; i<kicksData.length; i++) {
      if(kicksData[i][0]) allKicks.push({ matchId: String(kicksData[i][0]), round: kicksData[i][1], teamId: kicksData[i][2], player: kicksData[i][3], result: kicksData[i][4], timestamp: kicksData[i][5], tournamentId: kicksData[i][6] || 'default' });
  }
  const matches = [];
  for(let i=1; i<matchesData.length; i++) {
      if(matchesData[i][0]) {
          const mid = String(matchesData[i][0]);
          matches.push({ id: mid, teamA: matchesData[i][1], teamB: matchesData[i][2], scoreA: matchesData[i][3], scoreB: matchesData[i][4], winner: matchesData[i][5], date: matchesData[i][6], summary: matchesData[i][7], roundLabel: matchesData[i][8] || '', status: matchesData[i][9] || 'Finished', venue: matchesData[i][10] || '', scheduledTime: matchesData[i][11] || '', livestreamUrl: matchesData[i][12] || '', livestreamCover: toLh3Link(matchesData[i][13]), tournamentId: matchesData[i][14] || 'default', kicks: allKicks.filter(k => k.matchId === mid) });
      }
  }

  const donationData = read("Donations");
  const donations = [];
  for(let i=1; i<donationData.length; i++) {
      if(donationData[i][0]) donations.push({ id: String(donationData[i][0]), timestamp: donationData[i][1], donorName: donationData[i][2], amount: Number(donationData[i][3]), phone: String(donationData[i][4]), isEdonation: donationData[i][5], taxId: String(donationData[i][6]), address: String(donationData[i][7]), slipUrl: toLh3Link(donationData[i][8]), tournamentId: donationData[i][9], lineUserId: donationData[i][10], status: donationData[i][11] || 'Pending' });
  }

  const newsData = read("News");
  const news = [];
  for(let i=1; i<newsData.length; i++) {
      if(newsData[i][0]) news.push({ id: String(newsData[i][0]), title: newsData[i][1], content: newsData[i][2], imageUrl: toLh3Link(newsData[i][3]), timestamp: Number(newsData[i][4]), documentUrl: newsData[i][5] || '', tournamentId: newsData[i][6] || 'global' });
  }

  const schoolData = read("Schools");
  const schools = [];
  for(let i=1; i<schoolData.length; i++) {
      if(schoolData[i][0]) schools.push({ id: String(schoolData[i][0]), name: schoolData[i][1], district: schoolData[i][2], province: schoolData[i][3] });
  }

  return successResponse({ teams, players, matches, config, schools, news, tournaments, donations });
}

function saveMatch(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Matches");
  if (!sheet) {
      sheet = ss.insertSheet("Matches");
      sheet.appendRow(["MatchID","TeamA","TeamB","ScoreA","ScoreB","Winner","Date","Summary","Round","Status","Venue","ScheduledTime","LiveURL","LiveCover","TournamentID"]);
  }
  const rows = sheet.getDataRange().getValues();
  let matchRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.matchId)) { matchRowIndex = i + 1; break; }
  }

  if (matchRowIndex === -1) {
    sheet.appendRow([ data.matchId, typeof data.teamA === 'string' ? data.teamA : data.teamA.name, typeof data.teamB === 'string' ? data.teamB : data.teamB.name, data.scoreA, data.scoreB, data.winner, new Date().toISOString(), data.summary || '', data.roundLabel || '', data.status || 'Finished', data.venue || '', data.scheduledTime || '', data.livestreamUrl || '', data.livestreamCover || '', data.tournamentId || 'default' ]);
  } else {
    sheet.getRange(matchRowIndex, 4).setValue(data.scoreA);
    sheet.getRange(matchRowIndex, 5).setValue(data.scoreB);
    sheet.getRange(matchRowIndex, 6).setValue(data.winner);
    sheet.getRange(matchRowIndex, 8).setValue(data.summary || '');
    if (data.status) sheet.getRange(matchRowIndex, 10).setValue(data.status);
  }

  if (data.kicks && data.kicks.length > 0) saveKicks(data.kicks);
  return successResponse({ status: 'success' });
}

function saveKicks(kicks) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Kicks");
    if (!sheet) {
        sheet = ss.insertSheet("Kicks");
        sheet.appendRow(["MatchID", "Round", "Team", "Player", "Result", "Timestamp", "TournamentID"]);
    }
    const matchId = kicks[0].matchId;
    if(!matchId) return successResponse({ status: 'success' }); // Safety check

    // Simple append approach for now to avoid complexity of bulk delete in Apps Script
    // Ideally, filter out existing by ID then append, but append is safer for low conflict
    kicks.forEach(k => {
        sheet.appendRow([ k.matchId, k.round, k.teamId, k.player, k.result, k.timestamp, k.tournamentId || 'default' ]);
    });
    return successResponse({ status: 'success' });
}

function handleAuth(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["ID", "Username", "Password", "DisplayName", "Role", "Phone", "PictureUrl", "LineUserId", "LastLogin"]);
  }
  
  if (data.authType === 'line') {
    const rows = sheet.getDataRange().getValues();
    // Search by LineUserId (Column H -> Index 7)
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][7]) === String(data.lineUserId)) {
         // Found user, update last login
         sheet.getRange(i+1, 9).setValue(new Date());
         return successResponse({
             userId: String(rows[i][0]),
             username: rows[i][1],
             displayName: rows[i][3],
             role: rows[i][4],
             phoneNumber: rows[i][5],
             pictureUrl: rows[i][6]
         });
      }
    }
    // New Line User
    const newId = 'U_' + Date.now();
    sheet.appendRow([newId, data.lineUserId, '', data.displayName, 'user', '', data.pictureUrl, data.lineUserId, new Date()]);
    return successResponse({ userId: newId, username: data.lineUserId, displayName: data.displayName, role: 'user', phoneNumber: '', pictureUrl: data.pictureUrl });
  } 
  else if (data.authType === 'login') {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).trim() === String(data.username).trim() && String(rows[i][2]).trim() === String(data.password).trim()) {
        sheet.getRange(i+1, 9).setValue(new Date());
        return successResponse({ userId: String(rows[i][0]), username: rows[i][1], displayName: rows[i][3], role: rows[i][4], phoneNumber: rows[i][5], pictureUrl: rows[i][6] });
      }
    }
    return errorResponse("Invalid username or password");
  } 
  else if (data.authType === 'register') {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).trim() === String(data.username).trim()) return errorResponse("Username already exists");
    }
    const newId = 'U_' + Date.now();
    sheet.appendRow([newId, data.username, data.password, data.displayName, 'user', data.phone, '', '', new Date()]);
    return successResponse({ userId: newId, username: data.username, displayName: data.displayName, role: 'user', phoneNumber: data.phone, pictureUrl: '' });
  }
}

// ... include other standard functions (updateTeamStatus, registerTeam, manageNews, etc) with check for sheet existence ...
// Keeping brevity for the response, assumed other functions follow the pattern:
// let sheet = ss.getSheetByName("Name"); if(!sheet) { sheet = ss.insertSheet("Name"); ...header }

function getSpreadsheet() { return SpreadsheetApp.getActiveSpreadsheet(); }
function successResponse(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function errorResponse(message) { return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: message })).setMimeType(ContentService.MimeType.JSON); }
function toLh3Link(url) { if (!url || !url.includes("drive.google.com")) return url || ""; try { return "https://lh3.googleusercontent.com/d/" + url.match(/\/d\/(.+?)\//)[1]; } catch (e) { return url; } }
function formatDate(dateObj) { try { const d = new Date(dateObj); if (isNaN(d.getTime())) return String(dateObj); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; } catch (e) { return String(dateObj); } }
function saveFileToDrive(base64Data, filename) { try { if (!base64Data || base64Data === "") return ""; const split = base64Data.split(','); const type = split[0].split(';')[0].replace('data:', ''); const data = Utilities.base64Decode(split[1]); const blob = Utilities.newBlob(data, type, filename); const folders = DriveApp.getFoldersByName(FOLDER_NAME); let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_NAME); folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); const file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW); return file.getUrl(); } catch (e) { return ""; } }

// Add missing functions for full compliance
function updateUserRole(userId, role) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      sheet.getRange(i + 1, 5).setValue(role); 
      return successResponse({ status: 'success' });
    }
  }
  return errorResponse("User not found");
}

function verifyDonation(donationId, status) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Donations");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(donationId)) {
            sheet.getRange(i + 1, 12).setValue(status);
            return successResponse({ status: 'success' });
        }
    }
    return errorResponse("Donation not found");
}

function submitDonation(data) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Donations");
    if (!sheet) { sheet = ss.insertSheet("Donations"); sheet.appendRow(["ID", "Timestamp", "DonorName", "Amount", "Phone", "IsEDonation", "TaxID", "Address", "SlipURL", "TournamentID", "LineUserID", "Status"]); }
    let slipUrl = "";
    if (data.slipFile && data.slipFile.startsWith('data:')) slipUrl = saveFileToDrive(data.slipFile, `donation_slip_${Date.now()}`);
    const id = "DON_" + Date.now();
    sheet.appendRow([ id, new Date(), data.donorName, data.amount, data.donorPhone, data.isEdonation, data.taxId, data.address, slipUrl, data.tournamentId, data.lineUserId || '', 'Pending' ]);
    return successResponse({ status: 'success' });
}

function manageNews(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("News");
  if (!sheet) { sheet = ss.insertSheet("News"); sheet.appendRow(["ID", "Title", "Content", "ImageURL", "Timestamp", "DocURL", "TournamentID"]); }
  const subAction = data.subAction; const item = data.newsItem;
  if (subAction === 'add') {
     let imgUrl = item.imageUrl && item.imageUrl.startsWith('data:') ? saveFileToDrive(item.imageUrl, `news_img_${Date.now()}`) : (item.imageUrl || '');
     let docUrl = item.documentUrl && item.documentUrl.startsWith('data:') ? saveFileToDrive(item.documentUrl, `news_doc_${Date.now()}`) : (item.documentUrl || '');
     sheet.appendRow([ item.id || Date.now().toString(), item.title, item.content, imgUrl, item.timestamp || Date.now(), docUrl, item.tournamentId || 'global' ]);
  } else if (subAction === 'edit') {
     const rows = sheet.getDataRange().getValues();
     for (let i = 1; i < rows.length; i++) {
         if (String(rows[i][0]) === String(item.id)) {
             sheet.getRange(i+1, 2).setValue(item.title);
             sheet.getRange(i+1, 3).setValue(item.content);
             sheet.getRange(i+1, 7).setValue(item.tournamentId);
             if (item.imageUrl && item.imageUrl.startsWith('data:')) {
                 const url = saveFileToDrive(item.imageUrl, `news_img_${Date.now()}`);
                 sheet.getRange(i+1, 4).setValue(url);
             }
             if (item.documentUrl && item.documentUrl.startsWith('data:')) {
                 const url = saveFileToDrive(item.documentUrl, `news_doc_${Date.now()}`);
                 sheet.getRange(i+1, 6).setValue(url);
             }
             break;
         }
     }
  } else if (subAction === 'delete') {
     const rows = sheet.getDataRange().getValues();
     for (let i = 1; i < rows.length; i++) { if (String(rows[i][0]) === String(item.id)) { sheet.deleteRow(i+1); break; } }
  }
  return successResponse({ status: 'success' });
}

function createTournament(name, type) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Tournaments");
    if (!sheet) { sheet = ss.insertSheet("Tournaments"); sheet.appendRow(["ID", "Name", "Type", "Status", "ConfigJSON"]); }
    const id = "TRN_" + Date.now();
    sheet.appendRow([id, name, type, "Active", "{}"]);
    return successResponse({ tournamentId: id });
}

function updateTournament(tournament) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Tournaments");
    const data = sheet.getDataRange().getValues();
    // Parse config for images
    let config = {};
    try { config = JSON.parse(tournament.config); if (config.objective && config.objective.images) { config.objective.images = config.objective.images.map(img => { if (img.url && img.url.startsWith('data:')) return { ...img, url: saveFileToDrive(img.url, `proj_img_${tournament.id}_${Date.now()}`) }; return img; }); } tournament.config = JSON.stringify(config); } catch(e) {}
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

function scheduleMatch(data) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Matches");
    if (!sheet) { sheet = ss.insertSheet("Matches"); sheet.appendRow(["MatchID","TeamA","TeamB","ScoreA","ScoreB","Winner","Date","Summary","Round","Status","Venue","ScheduledTime","LiveURL","LiveCover","TournamentID"]); }
    const rows = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) { if (String(rows[i][0]) === String(data.matchId)) { rowIndex = i + 1; break; } }
    let coverUrl = "";
    if (data.livestreamCover && data.livestreamCover.startsWith("data:")) coverUrl = saveFileToDrive(data.livestreamCover, `cover_${data.matchId}`); else if (data.livestreamCover) coverUrl = data.livestreamCover;
    if (rowIndex === -1) {
        sheet.appendRow([ data.matchId, data.teamA, data.teamB, 0, 0, '', new Date().toISOString(), '', data.roundLabel, 'Scheduled', data.venue, data.scheduledTime, data.livestreamUrl, coverUrl, data.tournamentId || 'default' ]);
    } else {
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
    let sheet = ss.getSheetByName("Matches");
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) { if (String(rows[i][0]) === String(matchId)) { sheet.deleteRow(i + 1); return successResponse({ status: 'success' }); } }
    return errorResponse("Match not found");
}

function saveMatchEvents(events) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("MatchEvents");
    if (!sheet) { sheet = ss.insertSheet("MatchEvents"); sheet.appendRow(["ID", "MatchID", "TournamentID", "Minute", "Type", "Player", "TeamID", "Timestamp"]); }
    if (events && events.length > 0) { events.forEach(e => { sheet.appendRow([e.id, e.matchId, e.tournamentId, e.minute, e.type, e.player, e.teamId, e.timestamp]); }); }
    return successResponse({ status: 'success' });
}

function saveSettings(settings) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName("Config");
    if (!sheet) { sheet = ss.insertSheet("Config"); sheet.appendRow(["CompName","Logo","BankName","BankAccount","AccountName","Location","Link","Announcement","PIN","Lat","Lng","Fee","Goal","ObjTitle","ObjDesc","ObjImg"]); }
    let logoUrl = settings.competitionLogo; if (logoUrl && logoUrl.startsWith('data:')) logoUrl = saveFileToDrive(logoUrl, 'comp_logo_' + Date.now());
    let objImgUrl = settings.objectiveImageUrl; if (objImgUrl && objImgUrl.startsWith('data:')) objImgUrl = saveFileToDrive(objImgUrl, 'obj_img_' + Date.now());
    const rowData = [ settings.competitionName, logoUrl, settings.bankName, settings.bankAccount, settings.accountName, settings.locationName, settings.locationLink, settings.announcement, settings.adminPin, settings.locationLat, settings.locationLng, settings.registrationFee, settings.fundraisingGoal, settings.objectiveTitle, settings.objectiveDescription, objImgUrl ];
    if (sheet.getLastRow() < 2) sheet.appendRow(rowData); else sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
    return successResponse({ status: 'success' });
}

function registerTeam(data) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Teams");
  if (!sheet) { sheet = ss.insertSheet("Teams"); sheet.appendRow(["ID", "Name", "ShortName", "Color", "LogoUrl", "Status", "Group", "District", "Province", "Director", "Manager", "ManagerPhone", "Coach", "CoachPhone", "DocUrl", "SlipUrl", "RejectReason", "RegistrationTime", "TournamentID"]); }
  let playersSheet = ss.getSheetByName("Players");
  if (!playersSheet) { playersSheet = ss.insertSheet("Players"); playersSheet.appendRow(["ID", "TeamID", "Name", "Number", "Position", "PhotoUrl", "BirthDate", "TournamentID"]); }
  
  const logoUrl = saveFileToDrive(data.logoFile, `logo_${data.schoolName}_${Date.now()}`);
  const docUrl = saveFileToDrive(data.documentFile, `doc_${data.schoolName}_${Date.now()}`);
  const slipUrl = saveFileToDrive(data.slipFile, `slip_${data.schoolName}_${Date.now()}`);
  const teamId = "T_" + Date.now();
  
  sheet.appendRow([ teamId, data.schoolName, data.shortName, data.color, logoUrl, 'Pending', '', data.district, data.province, data.directorName, data.managerName, "'" + data.managerPhone, data.coachName, "'" + data.coachPhone, docUrl, slipUrl, '', data.registrationTime, data.tournamentId ]);
  
  if (data.players && data.players.length > 0) {
    data.players.forEach(p => {
       let photoUrl = ''; if (p.photoFile && p.photoFile.startsWith('data:')) photoUrl = saveFileToDrive(p.photoFile, `p_${teamId}_${p.sequence}`);
       playersSheet.appendRow([ "P_" + Date.now() + "_" + Math.floor(Math.random()*1000), teamId, p.name, "'" + p.number, p.position || 'Player', photoUrl, p.birthDate, data.tournamentId ]);
    });
  }
  return successResponse({ status: 'success', teamId: teamId });
}

function updateTeamStatus(teamId, status, group, reason) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName("Teams");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(teamId)) {
      sheet.getRange(i + 1, 6).setValue(status);
      if (group) sheet.getRange(i + 1, 7).setValue(group); 
      if (reason !== undefined) sheet.getRange(i + 1, 17).setValue(reason);
      return successResponse({ status: 'success' });
    }
  }
  return errorResponse("Team not found");
}

function updateTeamData(team, players) {
  const ss = getSpreadsheet();
  let teamSheet = ss.getSheetByName("Teams");
  let playerSheet = ss.getSheetByName("Players");
  
  if (!teamSheet || !playerSheet) return errorResponse("Sheets missing");

  // 1. Update Team Info
  const tData = teamSheet.getDataRange().getValues();
  for (let i = 1; i < tData.length; i++) {
      if (String(tData[i][0]) === String(team.id)) {
          if (team.name) teamSheet.getRange(i+1, 2).setValue(team.name);
          if (team.color) teamSheet.getRange(i+1, 4).setValue(team.color);
          if (team.district) teamSheet.getRange(i+1, 8).setValue(team.district);
          if (team.province) teamSheet.getRange(i+1, 9).setValue(team.province);
          if (team.directorName) teamSheet.getRange(i+1, 10).setValue(team.directorName);
          if (team.managerName) teamSheet.getRange(i+1, 11).setValue(team.managerName);
          if (team.managerPhone) teamSheet.getRange(i+1, 12).setValue("'" + team.managerPhone);
          if (team.coachName) teamSheet.getRange(i+1, 13).setValue(team.coachName);
          if (team.coachPhone) teamSheet.getRange(i+1, 14).setValue("'" + team.coachPhone);
          if (team.group) teamSheet.getRange(i+1, 7).setValue(team.group);

          // Handle File Uploads (Base64 check)
          if (team.logoUrl && team.logoUrl.startsWith('data:')) {
              const url = saveFileToDrive(team.logoUrl, `logo_${team.id}_${Date.now()}`);
              teamSheet.getRange(i+1, 5).setValue(url);
          }
          if (team.docUrl && team.docUrl.startsWith('data:')) {
              const url = saveFileToDrive(team.docUrl, `doc_${team.id}_${Date.now()}`);
              teamSheet.getRange(i+1, 15).setValue(url);
          }
          if (team.slipUrl && team.slipUrl.startsWith('data:')) {
              const url = saveFileToDrive(team.slipUrl, `slip_${team.id}_${Date.now()}`);
              teamSheet.getRange(i+1, 16).setValue(url);
          }
          break;
      }
  }

  // 2. Update/Add Players
  if (players && players.length > 0) {
      const pData = playerSheet.getDataRange().getValues();
      
      players.forEach(p => {
          let found = false;
          let photoLink = p.photoUrl;
          if (photoLink && photoLink.startsWith('data:')) {
              photoLink = saveFileToDrive(photoLink, `player_${p.id}_${Date.now()}`);
          }

          // Try to find existing player by ID
          for (let j = 1; j < pData.length; j++) {
              if (String(pData[j][0]) === String(p.id)) {
                  // If name is empty, it might be a delete request in some designs, 
                  // but here we just update fields if present.
                  // For true deletion, we'd need a separate action or flag.
                  // Updating fields:
                  playerSheet.getRange(j+1, 3).setValue(p.name);
                  playerSheet.getRange(j+1, 4).setValue("'" + p.number);
                  playerSheet.getRange(j+1, 5).setValue(p.position || 'Player');
                  if (photoLink !== undefined) playerSheet.getRange(j+1, 6).setValue(photoLink); // Only update if provided/changed
                  if (p.birthDate) playerSheet.getRange(j+1, 7).setValue(p.birthDate);
                  
                  // Check if this was a "remove photo" operation (empty string passed explicitly)
                  if (p.photoUrl === '') playerSheet.getRange(j+1, 6).setValue('');

                  found = true;
                  break;
              }
          }

          // If new player (temp ID or not found)
          if (!found && p.id.startsWith('TEMP')) {
              const newId = "P_" + Date.now() + "_" + Math.floor(Math.random()*1000);
              playerSheet.appendRow([ newId, team.id, p.name, "'" + p.number, p.position || 'Player', photoLink || '', p.birthDate, team.tournamentId || 'default' ]);
          } else if (!found && !p.id.startsWith('TEMP')) {
             // Case: existing ID but not found in sheet (deleted externally?), treat as error or ignore
          }
      });
      
      // Optional: Handle Player Deletion
      // If the frontend sends the *full* list of current players, we could compare 
      // with the sheet rows for this team and delete missing ones.
      // However, the current prompt asks to "manage" (add/edit), and simple removal from UI list.
      // For safety, the `updateTeamData` above only updates/adds.
      // If we want to support deletion, we need to know which IDs were removed.
      // The frontend `handleRemovePlayer` removes from the `editForm` state.
      // So `players` passed here is the *surviving* list.
      // To implement delete, we'd iterate sheet rows for this teamId, and if row's ID is NOT in `players`, delete it.
      
      // Let's implement robust deletion logic:
      const survivingIds = players.map(p => p.id).filter(id => !id.startsWith('TEMP'));
      // Iterate backwards to safely delete rows
      for (let j = pData.length - 1; j >= 1; j--) {
          if (String(pData[j][1]) === String(team.id)) { // Matches Team ID
              const rowId = String(pData[j][0]);
              if (!survivingIds.includes(rowId)) {
                  playerSheet.deleteRow(j + 1);
              }
          }
      }
  }

  return successResponse({ status: 'success' });
}
