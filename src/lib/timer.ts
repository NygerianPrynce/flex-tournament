import type { Game, TimerState } from '../types';

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function calculateRemainingTime(timers: TimerState, initialWarmup: number, initialGame: number, initialFlex: number): number {
  const now = Date.now();
  
  if (timers.currentPhase === 'idle' || !timers.startedAt) {
    return 0;
  }
  
  if (timers.pausedAt) {
    // Game is paused, return the time when it was paused
    const elapsed = timers.pausedAt - timers.startedAt;
    const adjustedElapsed = Math.floor((elapsed - timers.totalPausedTime) / 1000);
    
    switch (timers.currentPhase) {
      case 'warmup':
        return Math.max(0, initialWarmup - adjustedElapsed);
      case 'game':
        return Math.max(0, initialGame - adjustedElapsed);
      case 'flex':
        return Math.max(0, initialFlex - adjustedElapsed);
      case 'overtime':
        // For overtime, return the overtime seconds (counts up)
        const totalTimePaused = initialWarmup + initialGame + initialFlex;
        const overtimeSecondsPaused = adjustedElapsed - totalTimePaused;
        return Math.max(0, overtimeSecondsPaused);
      default:
        return 0;
    }
  }
  
  // Game is running
  const elapsed = now - timers.startedAt;
  const adjustedElapsed = Math.floor((elapsed - timers.totalPausedTime) / 1000);
  
  switch (timers.currentPhase) {
    case 'warmup':
      return Math.max(0, initialWarmup - adjustedElapsed);
    case 'game':
      return Math.max(0, initialGame - adjustedElapsed);
    case 'flex':
      return Math.max(0, initialFlex - adjustedElapsed);
    case 'overtime':
      // For overtime, return the overtime seconds (counts up)
      const totalTimeRunning = initialWarmup + initialGame + initialFlex;
      const overtimeSecondsRunning = adjustedElapsed - totalTimeRunning;
      return Math.max(0, overtimeSecondsRunning);
    default:
      return 0;
  }
}

export function updateGameTimers(game: Game, settings: { warmupMinutes: number; gameLengthMinutes: number; flexMinutes: number }): Partial<Game['timers']> {
  const timers = game.timers;
  const initialWarmup = settings.warmupMinutes * 60;
  const initialGame = settings.gameLengthMinutes * 60;
  const initialFlex = settings.flexMinutes * 60;
  
  if (timers.currentPhase === 'idle') {
    return timers;
  }
  
  const updates: Partial<TimerState> = {};
  
  // Calculate elapsed time for phase transitions
  const now = Date.now();
  if (timers.startedAt) {
    const elapsed = now - timers.startedAt;
    const adjustedElapsed = Math.floor((elapsed - timers.totalPausedTime) / 1000);
    
    if (timers.currentPhase === 'warmup') {
      if (adjustedElapsed >= initialWarmup) {
        // Transition to game
        updates.currentPhase = 'game';
        updates.warmupRemaining = 0;
        updates.gameRemaining = initialGame;
        // Reset startedAt for game phase
        updates.startedAt = now - (adjustedElapsed - initialWarmup) * 1000;
        updates.totalPausedTime = 0;
      } else {
        updates.warmupRemaining = Math.max(0, initialWarmup - adjustedElapsed);
      }
    } else if (timers.currentPhase === 'game') {
      const gameElapsed = adjustedElapsed - initialWarmup;
      if (gameElapsed >= initialGame) {
        // Transition to flex
        updates.currentPhase = 'flex';
        updates.gameRemaining = 0;
        updates.flexRemaining = initialFlex;
        // Reset startedAt for flex phase
        updates.startedAt = now - (gameElapsed - initialGame) * 1000;
        updates.totalPausedTime = 0;
      } else {
        updates.gameRemaining = Math.max(0, initialGame - gameElapsed);
      }
    } else if (timers.currentPhase === 'flex') {
      const flexElapsed = adjustedElapsed - initialWarmup - initialGame;
      if (flexElapsed >= initialFlex) {
        // Flex time expired, transition to overtime
        updates.currentPhase = 'overtime';
        updates.flexRemaining = 0;
        // Calculate overtime seconds (counts up)
        const overtimeSeconds = flexElapsed - initialFlex;
        updates.overtimeMinutes = Math.floor(overtimeSeconds / 60);
        // Don't reset startedAt - we need to keep tracking from the original start
      } else {
        updates.flexRemaining = Math.max(0, initialFlex - flexElapsed);
      }
    } else if (timers.currentPhase === 'overtime') {
      // Overtime: count up from when flex time ended
      const totalTime = initialWarmup + initialGame + initialFlex;
      const overtimeSeconds = adjustedElapsed - totalTime;
      updates.overtimeMinutes = Math.floor(overtimeSeconds / 60);
    }
  }
  
  return { ...timers, ...updates };
}

