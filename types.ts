export const LIFF_ID = '2006490627-Z0WmzYVd';

export enum KickResult {
  GOAL = 'GOAL',
  SAVED = 'SAVED',
  MISSED = 'MISSED',
  WAITING = 'WAITING'
}

export interface AppSettings {
  competitionName: string;
  competitionLogo: string; 
  bankName: string;
  bankAccount: string;
  accountName: string;
  locationName: string;
  locationLink: string;
  announcement: string;
  adminPin?: string; 
  
  // New: Location Coordinates
  locationLat?: number;
  locationLng?: number;

  // New: Fundraising & Objective
  registrationFee?: number; // ค่าสมัครต่อทีม
  fundraisingGoal?: number; // เป้าหมายยอดเงิน
  objectiveTitle?: string; // ชื่อโครงการ (เช่น สร้างห้องสมุด)
  objectiveDescription?: string; // รายละเอียด
  objectiveImageUrl?: string; // รูปภาพสิ่งที่อยากสร้าง/พัฒนา
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  documentUrl?: string; 
  timestamp: number;
}

export interface School {
  id: string;
  name: string;
  district: string;
  province: string;
}

export interface Tournament {
  id: string;
  name: string;
  type: 'Penalty' | '7v7' | '11v11';
  status: 'Active' | 'Archived' | 'Upcoming';
  config?: string; // JSON string for specific rules
}

export interface Team {
  id: string;
  name: string; 
  shortName: string;
  color: string;
  logoUrl: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
  group?: string; 
  rejectReason?: string; 
  
  docUrl?: string;
  slipUrl?: string;

  district?: string;
  province?: string;
  directorName?: string;
  managerName?: string;
  managerPhone?: string;
  coachName?: string;
  coachPhone?: string;

  tournamentId?: string; // Phase 1: Support multiple tournaments
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: string; 
  position: string;
  photoUrl: string;
  birthDate?: string; 
  tournamentId?: string; // Phase 1
}

export interface Kick {
  id: string;
  round: number;
  teamId: 'A' | 'B';
  player: string;
  result: KickResult;
  timestamp: number;
  commentary?: string;
  tournamentId?: string; // Phase 1
}

// Phase 3: Match Events for Regular Football
export interface MatchEvent {
  id: string;
  matchId: string;
  tournamentId: string;
  minute: number;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUB_IN' | 'SUB_OUT' | 'OWN_GOAL' | 'BLUE_CARD';
  player: string;
  teamId: 'A' | 'B';
  relatedPlayer?: string; // Assist or Sub Out
  timestamp: number;
}

export interface Match {
  id: string;
  teamA: Team | string; 
  teamB: Team | string;
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | string | null; 
  date: string;
  summary?: string;
  kicks?: Kick[];
  events?: MatchEvent[]; // Phase 3
  roundLabel?: string; 
  status?: 'Scheduled' | 'Finished' | 'Walkover' | 'Live';
  venue?: string; 
  scheduledTime?: string; 
  livestreamUrl?: string; 
  livestreamCover?: string;
  tournamentId?: string; // Phase 1
}

export interface MatchState {
  matchId?: string;
  teamA: Team;
  teamB: Team;
  currentRound: number;
  currentTurn: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  kicks: Kick[];
  events?: MatchEvent[]; // Phase 3
  timer?: number; // Phase 3 (seconds)
  isPaused?: boolean; // Phase 3
  isFinished: boolean;
  winner: 'A' | 'B' | null;
  roundLabel?: string;
  tournamentId?: string; // Phase 1
}

export interface RegistrationData {
  schoolName: string;
  shortName?: string;
  district: string;
  province: string;
  phone: string;
  directorName: string;
  managerName: string;
  managerPhone: string;
  coachName: string;
  coachPhone: string;
  color: string;
  logoFile: string | null; 
  documentFile: string | null; 
  slipFile: string | null; 
  registrationTime?: string;
  players: {
    sequence: number; 
    name: string;
    birthDate: string; 
    photoFile: string | null; 
  }[];
  tournamentId?: string; // Phase 1
}

export interface Standing {
  teamId: string;
  teamName: string;
  logoUrl: string;
  group: string; 
  played: number;
  won: number;
  lost: number;
  goalsFor: number; 
  goalsAgainst: number; 
  points: number; 
}

export interface UserProfile {
  userId: string;
  username?: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  type: 'line' | 'guest' | 'credentials';
  phoneNumber?: string; 
  role?: 'admin' | 'staff' | 'user';
}