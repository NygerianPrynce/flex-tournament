// Helper function to get round name based on round index, total rounds, and games in round
export function getRoundName(roundIndex: number, totalRounds: number, gamesInRound: number): string {
  // Work backwards from the final
  const roundFromEnd = totalRounds - roundIndex;
  
  if (roundFromEnd === 1) {
    return 'Final';
  } else if (roundFromEnd === 2) {
    return 'Semi Finals';
  } else if (roundFromEnd === 3) {
    return 'Quarter Finals';
  } else {
    // For earlier rounds, use "Round of X" where X is the number of teams
    const teamsInRound = gamesInRound * 2;
    return `Round of ${teamsInRound}`;
  }
}

import type { Game } from '../types';

// Helper function to get round name from just the round number and bracket structure
export function getRoundNameFromGame(gameRound: number, bracketRounds: Game[][]): string {
  // gameRound is 1-indexed, bracketRounds is 0-indexed
  // So round 1 -> index 0, round 2 -> index 1, etc.
  const roundIndex = gameRound - 1;
  
  if (roundIndex < 0 || roundIndex >= bracketRounds.length) {
    return `Round ${gameRound}`;
  }
  
  const gamesInRound = bracketRounds[roundIndex]?.length || 0;
  return getRoundName(roundIndex, bracketRounds.length, gamesInRound);
}

// Helper function to get losers bracket round name
// Uses the same naming logic as winners bracket (Final, Semi Finals, Quarter Finals, Round of X)
export function getLosersRoundName(roundIndex: number, totalRounds: number, gamesInRound: number): string {
  // Use the same logic as getRoundName, but prefix with "Losers" for clarity
  const roundFromEnd = totalRounds - roundIndex;
  
  if (roundFromEnd === 1) {
    return 'Final';
  } else if (roundFromEnd === 2) {
    return 'Semi Finals';
  } else if (roundFromEnd === 3) {
    return 'Quarter Finals';
  } else {
    // For earlier rounds, use "Round of X" where X is the number of teams
    const teamsInRound = gamesInRound * 2;
    return `Round of ${teamsInRound}`;
  }
}

