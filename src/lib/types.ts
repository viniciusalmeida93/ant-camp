export type GenderType = 'masculino' | 'feminino' | 'misto';
export type CategoryFormat = 'individual' | 'dupla' | 'trio' | 'time';
export type WODType = 'tempo' | 'reps' | 'carga' | 'amrap';

export interface Championship {
  id: string;
  name: string;
  date: string;
  location: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  format: CategoryFormat;
  gender: GenderType;
  capacity: number;
  teamSize?: number;
  rules?: string;
  genderComposition?: string; // ex: "2M/2F" para misto
  createdAt: string;
}

export interface WOD {
  id: string;
  name: string;
  type: WODType;
  description: string;
  timeCap?: string;
  tiebreaker?: string;
  notes?: string;
  createdAt: string;
}

export interface Athlete {
  id: string;
  name: string;
  email: string;
  affiliation?: string;
  gender: 'masculino' | 'feminino';
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  categoryId: string;
  members: Athlete[];
  createdAt: string;
}

export interface Registration {
  id: string;
  categoryId: string;
  athleteId?: string;
  teamId?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export type ScoringPresetType = 'crossfit-games' | 'simple-order' | 'custom';

export interface ScoringConfig {
  id: string;
  categoryId: string;
  presetType: ScoringPresetType;
  pointsTable: { [position: number]: number }; // {1: 100, 2: 97, ...}
  rankingMethod?: 'simple' | 'standard'; // 'simple' = 1,1,2; 'standard' = 1,1,3
  dnfPoints: number;
  dnsPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface WODResult {
  id: string;
  wodId: string;
  categoryId: string;
  athleteId?: string;
  teamId?: string;
  result?: string; // tempo, reps, carga
  tiebreakValue?: string;
  status: 'completed' | 'dnf' | 'dns';
  position?: number;
  points?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  participantId: string;
  participantName: string;
  categoryId: string;
  totalPoints: number;
  position: number;
  previousPosition?: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  lastWodPosition?: number;
  wodResults: WODResult[];
}

export interface HeatConfig {
  id: string;
  categoryId: string;
  athletesPerHeat: number;
  autoRegenerate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Heat {
  id: string;
  categoryId: string;
  wodId: string;
  heatNumber: number;
  scheduledTime?: string;
  participants: {
    id: string;
    name: string;
    position?: number;
    totalPoints?: number;
  }[];
  createdAt: string;
  updatedAt: string;
}
