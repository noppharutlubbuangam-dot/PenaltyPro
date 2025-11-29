
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
  locationLat?: number;
  locationLng?: number;
  registrationFee?: number; 
  fundraisingGoal?: number; 
  objectiveTitle?: string; 
  objectiveDescription?: string; 
  objectiveImageUrl?: string; 
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

export interface ProjectImage {
  id: string;
  url: string;
  type: 'before' | 'after' | 'general';
  caption?: string;
}

export interface TournamentPrize {
  id: string;
  rankLabel: string; // "1st", "2nd", "Top Scorer"
  amount: string; // Allow text like "Trophy + 5000"
  description?: string;
}

export interface TournamentConfig {
  halfTimeDuration?: number; // Minutes
  playersPerTeam?: number; // 7 or 11
  maxSubs?: number; // 0 = Unlimited
  extraTime?: boolean;
  registrationDeadline?: string; // ISO Date String
  maxTeams?: number; // 0 or undefined = Unlimited
  
  // Overrides
  bankName?: string;
  bankAccount?: string;
  accountName?: string;
  locationName?: string;
  locationLink?: string;
  locationLat?: number;
  locationLng?: number;

  // Objective Specifics
  objective?: {
    isEnabled: boolean;
    title: string;
    description: string;
    goal: number;
    images: ProjectImage[];
  };

  // Prizes
  prizes?: TournamentPrize[];
}

export interface DonationRequest {
  tournamentId: string;
  amount: number;
  slipFile: string; // Base64
  isEdonation: boolean;
  donorName: string;
  donorPhone: string;
  taxId?: string;
  address?: string;
}

export interface Tournament {
  id: string;
  name: string;
  type: 'Penalty' | '7v7' | '11v11';
  status: 'Active' | 'Archived' | 'Upcoming';
  config?: string; // JSON string of TournamentConfig
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

  tournamentId?: string;
  creatorId?: string; // Links to UserProfile.userId
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: string; 
  position: string;
  photoUrl: string;
  birthDate?: string; 
  tournamentId?: string;
}

export interface Kick {
  id: string;
  round: number;
  teamId: 'A' | 'B';
  player: string;
  result: KickResult;
  timestamp: number;
  commentary?: string;
  tournamentId?: string; 
}

export interface MatchEvent {
  id: string;
  matchId: string;
  tournamentId: string;
  minute: number;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUB_IN' | 'SUB_OUT' | 'OWN_GOAL' | 'BLUE_CARD';
  player: string;
  teamId: 'A' | 'B';
  relatedPlayer?: string;
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
  events?: MatchEvent[];
  roundLabel?: string; 
  status?: 'Scheduled' | 'Finished' | 'Walkover' | 'Live';
  venue?: string; 
  scheduledTime?: string; 
  livestreamUrl?: string; 
  livestreamCover?: string;
  tournamentId?: string;
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
  events?: MatchEvent[];
  timer?: number;
  isPaused?: boolean;
  isFinished: boolean;
  winner: 'A' | 'B' | null;
  roundLabel?: string;
  tournamentId?: string;
}

export interface RegistrationData {
  id?: string; // For updates
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
    id?: string;
    sequence: number; 
    name: string;
    number?: string;
    birthDate: string; 
    photoFile: string | null; 
    photoUrl?: string; // Existing URL for editing
  }[];
  tournamentId?: string;
  creatorId?: string;
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
