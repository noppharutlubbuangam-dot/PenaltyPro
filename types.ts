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
  adminPin?: string; // New Field for Secure Recording
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
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: string; 
  position: string;
  photoUrl: string;
  birthDate?: string; 
}

export interface Kick {
  id: string;
  round: number;
  teamId: 'A' | 'B';
  player: string;
  result: KickResult;
  timestamp: number;
  commentary?: string;
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
  roundLabel?: string; 
  status?: 'Scheduled' | 'Finished' | 'Walkover';
  venue?: string; 
  scheduledTime?: string; 
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
  isFinished: boolean;
  winner: 'A' | 'B' | null;
  roundLabel?: string;
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