import type { Tournament, TournamentSettings } from '../types';

/**
 * Calculate estimated tournament duration based on:
 * - Number of teams
 * - Number of courts
 * - Game settings (warmup, game length, flex time)
 * - Tournament format (single/double elimination)
 */
export function calculateTournamentDuration(
  numTeams: number,
  settings: TournamentSettings,
  includeLosersBracket: boolean = false
): {
  totalMinutes: number;
  totalHours: number;
  formatted: string;
  gamesCount: number;
  roundsCount: number;
} {
  if (numTeams < 2) {
    return {
      totalMinutes: 0,
      totalHours: 0,
      formatted: '0 minutes',
      gamesCount: 0,
      roundsCount: 0,
    };
  }

  // Calculate number of rounds and games
  const calculateGames = (teams: number): { games: number; rounds: number } => {
    let games = 0;
    let remainingTeams = teams;
    let rounds = 0;

    while (remainingTeams > 1) {
      const gamesInRound = Math.floor(remainingTeams / 2);
      const byes = remainingTeams % 2; // Teams that get a BYE and advance
      games += gamesInRound;
      remainingTeams = gamesInRound + byes; // Winners + BYEs advance
      rounds++;
    }

    return { games, rounds };
  };

  const winnersBracket = calculateGames(numTeams);
  let totalGames = winnersBracket.games;
  let totalRounds = winnersBracket.rounds;

  // Add losers bracket if double elimination
  if (includeLosersBracket) {
    // Losers bracket has roughly the same number of games as winners bracket
    // but teams are eliminated more slowly, so it's approximately 2x games
    const losersBracket = calculateGames(numTeams);
    totalGames += losersBracket.games;
    totalRounds += losersBracket.rounds;
    
    // Add grand final
    totalGames += 1;
  }

  // Calculate time per game (warmup + game + flex)
  const timePerGameMinutes = settings.warmupMinutes + settings.gameLengthMinutes + settings.flexMinutes;

  // Calculate total time needed
  // Games run in parallel on multiple courts, but rounds are sequential
  // Each round: games can run in parallel up to the number of courts
  let estimatedMinutes = 0;
  
  // Calculate time for each round in winners bracket
  let remainingTeams = numTeams;
  for (let round = 0; round < winnersBracket.rounds; round++) {
    // Calculate games in this round (half of remaining teams)
    const gamesInRound = Math.floor(remainingTeams / 2);
    const byes = remainingTeams % 2; // Teams that get a BYE and advance
    
    if (gamesInRound === 0) break;
    
    // Calculate how many "batches" are needed (games that can run simultaneously)
    // Each batch can have up to numberOfCourts games running at once
    const batchesNeeded = Math.ceil(gamesInRound / settings.numberOfCourts);
    
    // Time for this round = number of batches × time per game
    // All games in a batch run simultaneously, so each batch takes one game's time
    const roundTime = batchesNeeded * timePerGameMinutes;
    estimatedMinutes += roundTime;
    
    // Add small buffer between rounds (2 minutes per round for transitions)
    if (round < winnersBracket.rounds - 1) {
      estimatedMinutes += 2;
    }
    
    // Update remaining teams for next round (winners + BYEs advance)
    remainingTeams = gamesInRound + byes;
  }
  
  // Add losers bracket time if applicable
  if (includeLosersBracket) {
    // Losers bracket runs in parallel with winners bracket, but we'll estimate it separately
    // For simplicity, assume it takes similar time to winners bracket
    const losersBracket = calculateGames(numTeams);
    remainingTeams = numTeams;
    
    for (let round = 0; round < losersBracket.rounds; round++) {
      const gamesInRound = Math.floor(remainingTeams / 2);
      const byes = remainingTeams % 2;
      if (gamesInRound === 0) break;
      
      const batchesNeeded = Math.ceil(gamesInRound / settings.numberOfCourts);
      const roundTime = batchesNeeded * timePerGameMinutes;
      estimatedMinutes += roundTime;
      
      if (round < losersBracket.rounds - 1) {
        estimatedMinutes += 2;
      }
      
      remainingTeams = gamesInRound + byes;
    }
    
    // Add grand final (1 game)
    estimatedMinutes += timePerGameMinutes;
  }

  // Add buffer for setup, breaks, and delays (5% of total time, minimum 15 minutes)
  const buffer = Math.max(15, Math.ceil(estimatedMinutes * 0.05));
  estimatedMinutes += buffer;

  const totalHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = Math.round(estimatedMinutes % 60);

  let formatted = '';
  if (totalHours > 0) {
    formatted = `${totalHours} hour${totalHours !== 1 ? 's' : ''}`;
    if (remainingMinutes > 0) {
      formatted += ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
  } else {
    formatted = `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }

  return {
    totalMinutes: Math.round(estimatedMinutes),
    totalHours: totalHours,
    formatted,
    gamesCount: totalGames,
    roundsCount: totalRounds,
  };
}

/**
 * Calculate estimated completion time from tournament start
 * Uses tournament creation time as the start time
 */
export function calculateEstimatedCompletionTime(
  tournament: Tournament
): {
  estimatedCompletion: Date | null;
  formatted: string;
} {
  if (!tournament.bracket) {
    return {
      estimatedCompletion: null,
      formatted: 'Bracket not generated yet',
    };
  }

  const duration = calculateTournamentDuration(
    tournament.teams.length,
    tournament.settings,
    tournament.settings.includeLosersBracket
  );

  // Use tournament creation time as start time
  const startTime = new Date(tournament.createdAt);
  const completionTime = new Date(startTime.getTime() + duration.totalMinutes * 60 * 1000);

  return {
    estimatedCompletion: completionTime,
    formatted: completionTime.toLocaleString(),
  };
}

