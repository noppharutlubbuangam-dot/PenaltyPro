export const LIFF_ID = '2006490627-Z0WmzYVd';

export enum KickResult {
  GOAL = 'GOAL',
  SAVED = 'SAVED',
  MISSED = 'MISSED',
  WAITING = 'WAITING'
}

export interface AppSettings {
  competitionName: string;
  competitionLogo: string; // New Field
  bankName: string;
  bankAccount: string;
  accountName: string;
  locationName: string;
  locationLink: string;
  announcement: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  documentUrl?: string; // New: For PDF/Docs
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
  name: string; // School Name
  shortName: string;
  color: string;
  logoUrl: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
  group?: string; // New Field for Round Robin (e.g. "A", "B")
  rejectReason?: string; // Reason for rejection
  
  // Documents
  docUrl?: string;
  slipUrl?: string;

  // New Fields from PDF
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
  number: string; // Used as Sequence Number (1-7)
  position: string;
  photoUrl: string;
  birthDate?: string; // DD/MM/YYYY
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
  teamA: Team | string; // Object or Name
  teamB: Team | string;
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | string | null; // 'A', 'B' or TeamName
  date: string;
  summary?: string;
  kicks?: Kick[];
  roundLabel?: string; // e.g. "QF1", "SF1", "Group A"
  status?: 'Scheduled' | 'Finished' | 'Walkover';
  venue?: string; // e.g. "สนาม A"
  scheduledTime?: string; // ISO string or Time string
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

// Updated Registration Data based on PDF
export interface RegistrationData {
  // School Info
  schoolName: string;
  district: string;
  province: string;
  phone: string;
  
  // Personnel
  directorName: string;
  managerName: string;
  managerPhone: string;
  coachName: string;
  coachPhone: string;
  
  // Team Assets
  color: string;
  logoFile: string | null; // Base64
  
  // Documents
  documentFile: string | null; // Base64
  slipFile: string | null; // Base64
  
  // Players (Exactly 7)
  players: {
    sequence: number; // 1-7
    name: string;
    birthDate: string; // Day/Month/Year
    photoFile: string | null; // Base64
  }[];
}

export interface Standing {
  teamId: string;
  teamName: string;
  logoUrl: string;
  group: string; // Added for grouping
  played: number;
  won: number;
  lost: number;
  goalsFor: number; // Successful Penalties
  goalsAgainst: number; // Penalties Conceded
  points: number; // Added for Round Robin ranking (Win = 3, Loss = 0)
}