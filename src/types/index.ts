export type BracketType = 'W' | 'L' | 'Final';

export type GameStatus = 'Queued' | 'Warmup' | 'Live' | 'Flex' | 'Paused' | 'Finished';

export type SlotType = 'Team' | 'BYE' | 'OPEN';

export type SeedingMode = 'off' | 'random' | 'manual' | 'upload';
export type SeedingType = 'standard' | 'snake' | 'bye';

export type AssignmentMode = 'auto' | 'manual';

export type Sport = 'basketball' | 'football' | 'soccer' | 'volleyball' | 'tennis' | 'baseball' | 'hockey' | 'custom';

export interface Team {
  id: string;
  name: string;
  seed?: number;
}

export interface Ref {
  id: string;
  name: string;
  available?: boolean; // true if available, false if paused/unavailable
}

export interface Court {
  id: string;
  name: string;
}

export interface GameSlot {
  type: SlotType;
  teamId?: string;
}

export interface TimerState {
  warmupRemaining: number; // seconds
  gameRemaining: number; // seconds
  flexRemaining: number; // seconds
  currentPhase: 'warmup' | 'game' | 'flex' | 'overtime' | 'idle';
  startedAt?: number;
  pausedAt?: number;
  totalPausedTime: number;
  overtimeMinutes?: number; // minutes of overtime (counts up)
}

export interface GameResult {
  winnerId: string;
  scoreA: number;
  scoreB: number;
  finishedAt: number;
  teamAName?: string; // Store team name for historical reference
  teamBName?: string; // Store team name for historical reference
}

export interface Game {
  id: string;
  bracketType: BracketType;
  round: number;
  matchNumber: number;
  teamA: GameSlot;
  teamB: GameSlot;
  courtId?: string;
  scheduledOrder: number;
  status: GameStatus;
  timers: TimerState;
  refId?: string;
  result?: GameResult;
}

export interface Bracket {
  winners: Game[][];
  losers: Game[][];
  grandFinal?: Game;
}

export interface TournamentSettings {
  sport?: Sport; // Sport type for terminology and aesthetics
  gameLengthMinutes: number;
  warmupMinutes: number;
  flexMinutes: number;
  numberOfCourts: number;
  courtNames: string[];
  includeLosersBracket: boolean;
  openSlotPolicy: 'BYE' | 'OPEN';
  useRefs?: boolean; // true if refs are enabled, false/undefined to disable
}

export interface Tournament {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  teams: Team[];
  refs: Ref[];
  courts: Court[];
  bracket: Bracket | null; // null means bracket not generated yet
  settings: TournamentSettings;
  seedingMode: SeedingMode;
  seedingType?: SeedingType; // Only used when seedingMode is not 'off'
  shareCode?: string; // Share code for viewer mode (only present for database tournaments)
}

