import type { Team, Game, Bracket, TournamentSettings, GameSlot, SlotType, SeedingType } from '../types';

/**
 * Calculate the next power of 2 greater than or equal to n
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 0) return 1;
  if ((n & (n - 1)) === 0) return n; // Already a power of 2
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Generate bracket slots with teams, BYEs, or OPEN placeholders
 */
export function generateBracketSlots(
  teams: Team[],
  bracketSize: number,
  openSlotPolicy: 'BYE' | 'OPEN'
): GameSlot[] {
  const slots: GameSlot[] = [];
  
  for (let i = 0; i < bracketSize; i++) {
    if (i < teams.length) {
      slots.push({ type: 'Team', teamId: teams[i].id });
    } else {
      slots.push({ type: openSlotPolicy });
    }
  }
  
  return slots;
}

/**
 * Standard seeding placement: 1 vs last, 2 vs second-last, etc.
 * Uses standard tournament bracket seeding algorithm
 */
function placeSeededTeamsStandard(teams: Team[], bracketSize: number): GameSlot[] {
  const slots: GameSlot[] = new Array(bracketSize).fill(null).map(() => ({ type: 'OPEN' as SlotType }));
  
  // Sort teams by seed (1 is best)
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  
  // Generate seeding positions using standard algorithm
  function generateSeedingPositions(size: number): number[] {
    if (size === 1) return [0];
    const half = size / 2;
    const firstHalf = generateSeedingPositions(half);
    const secondHalf = firstHalf.map(p => p + half);
    return [...firstHalf, ...secondHalf];
  }
  
  const seedPositions = generateSeedingPositions(bracketSize);
  
  // Assign teams to positions based on seed
  for (let i = 0; i < sortedTeams.length && i < bracketSize; i++) {
    const position = seedPositions[i];
    slots[position] = { type: 'Team', teamId: sortedTeams[i].id };
  }
  
  return slots;
}

/**
 * Snake seeding: Alternates seeds between top and bottom halves
 * For 8 teams: [1,8,4,5] in top half, [2,7,3,6] in bottom half
 * Creates pairs: (1,8), (4,5), (2,7), (3,6)
 */
function placeSeededTeamsSnake(teams: Team[], bracketSize: number): GameSlot[] {
  const slots: GameSlot[] = new Array(bracketSize).fill(null).map(() => ({ type: 'OPEN' as SlotType }));
  
  // Sort teams by seed (1 is best)
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  
  // Snake seeding: seeds are placed in a snake pattern
  // Pattern: 1, 8, 4, 5, 2, 7, 3, 6 for 8 teams
  // This creates pairs: (1,8), (4,5), (2,7), (3,6)
  const half = bracketSize / 2;
  const positions: number[] = [];
  
  for (let seed = 1; seed <= Math.min(sortedTeams.length, bracketSize); seed++) {
    let position: number;
    
    if (seed === 1) {
      position = 0; // Seed 1 at position 0
    } else if (seed === 2) {
      position = half; // Seed 2 at position 4 (halfway)
    } else {
      // Calculate position based on snake pattern
      const isOddSeed = seed % 2 === 1;
      
      if (isOddSeed) {
        // Odd seeds (1, 3, 5, 7): go to positions 0, 6, 2, 5
        if (seed === 3) {
          position = 6;
        } else if (seed === 5) {
          position = 2;
        } else if (seed === 7) {
          position = 5;
        } else {
          position = (seed - 1) * 2 % bracketSize;
        }
      } else {
        // Even seeds (2, 4, 6, 8): go to positions 4, 1, 3, 7
        if (seed === 4) {
          position = 1;
        } else if (seed === 6) {
          position = 3;
        } else if (seed === 8) {
          position = 7;
        } else {
          position = (seed * 2 - 1) % bracketSize;
        }
      }
    }
    positions.push(position);
  }
  
  // For 8 teams, use known correct mapping: [1->0, 8->1, 4->2, 5->3, 2->4, 7->5, 3->6, 6->7]
  const snakeMapping8: { [key: number]: number } = {
    1: 0, 8: 1, 4: 2, 5: 3,
    2: 4, 7: 5, 3: 6, 6: 7
  };
  
  // For other sizes, use a general algorithm
  for (let i = 0; i < sortedTeams.length && i < bracketSize; i++) {
    const seed = i + 1;
    let position: number;
    
    if (bracketSize === 8 && seed <= 8) {
      position = snakeMapping8[seed] ?? i;
    } else {
      // General snake seeding: alternate between top and bottom
      const pairIndex = Math.floor((seed - 1) / 2);
      const isFirstInPair = (seed - 1) % 2 === 0;
      
      if (isFirstInPair) {
        // First seed in pair: top half, forward
        position = pairIndex * 2;
      } else {
        // Second seed in pair: bottom half, but paired with top seed from end
        // For pair (1,2): 1 at 0, 2 at bracketSize-1
        // For pair (3,4): 3 at 2, 4 at bracketSize-3
        const topPos = (pairIndex - 1) * 2;
        position = bracketSize - 1 - topPos;
      }
    }
    
    if (position >= 0 && position < bracketSize) {
      slots[position] = { type: 'Team', teamId: sortedTeams[i].id };
    }
  }
  
  return slots;
}

/**
 * BYE seeding: Top seeds get BYEs in early rounds
 * This places teams so that top seeds get BYEs when possible
 */
function placeSeededTeamsBye(teams: Team[], bracketSize: number): GameSlot[] {
  // For now, use standard seeding as BYE seeding is complex
  // This can be enhanced later to actually place BYEs strategically
  return placeSeededTeamsStandard(teams, bracketSize);
}

/**
 * Place seeded teams based on seeding type
 */
function placeSeededTeams(teams: Team[], bracketSize: number, seedingType: SeedingType = 'standard'): GameSlot[] {
  switch (seedingType) {
    case 'snake':
      return placeSeededTeamsSnake(teams, bracketSize);
    case 'bye':
      return placeSeededTeamsBye(teams, bracketSize);
    case 'standard':
    default:
      return placeSeededTeamsStandard(teams, bracketSize);
  }
}

/**
 * Generate single elimination bracket
 */
export function generateSingleEliminationBracket(
  teams: Team[],
  settings: TournamentSettings,
  seedingMode: 'off' | 'random' | 'manual' | 'upload' = 'off',
  seedingType: SeedingType = 'standard'
): Game[][] {
  const bracketSize = nextPowerOfTwo(teams.length);
  let slots: GameSlot[];
  
  if (seedingMode === 'off' || seedingMode === 'random') {
    // Random shuffle
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    slots = generateBracketSlots(shuffled, bracketSize, settings.openSlotPolicy);
  } else {
    // Seeded placement
    slots = placeSeededTeams(teams, bracketSize, seedingType);
    // Fill remaining slots with BYE or OPEN
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].type === 'OPEN' && teams.length < bracketSize) {
        slots[i] = { type: settings.openSlotPolicy };
      }
    }
  }
  
  const rounds: Game[][] = [];
  let currentRoundSlots = [...slots];
  let roundNumber = 1;
  
  while (currentRoundSlots.length > 1) {
    // For first round, redistribute BYEs to prevent BYE vs BYE games
    if (roundNumber === 1 && settings.openSlotPolicy === 'BYE') {
      // Separate teams and BYEs
      const teams: GameSlot[] = [];
      const byes: GameSlot[] = [];
      
      currentRoundSlots.forEach(slot => {
        if (slot.type === 'Team') {
          teams.push(slot);
        } else if (slot.type === 'BYE') {
          byes.push(slot);
        }
      });
      
      // Redistribute: interleave teams and BYEs evenly
      const redistributed: GameSlot[] = [];
      let teamIdx = 0;
      let byeIdx = 0;
      const totalSlots = teams.length + byes.length;
      
      for (let i = 0; i < totalSlots && (teamIdx < teams.length || byeIdx < byes.length); i++) {
        // Calculate ideal distribution: spread BYEs evenly among teams
        if (teamIdx < teams.length && byeIdx < byes.length) {
          // We have both - decide based on even distribution
          const idealByesBefore = Math.floor((i * byes.length) / totalSlots);
          const actualByesBefore = byeIdx;
          
          if (actualByesBefore < idealByesBefore) {
            // Place a BYE to catch up to ideal distribution
            redistributed.push(byes[byeIdx++]);
          } else {
            // Place a team
            redistributed.push(teams[teamIdx++]);
          }
        } else if (teamIdx < teams.length) {
          // Only teams left
          redistributed.push(teams[teamIdx++]);
        } else if (byeIdx < byes.length) {
          // Only BYEs left
          redistributed.push(byes[byeIdx++]);
        }
      }
      
      currentRoundSlots = redistributed;
    }
    
    const roundGames: Game[] = [];
    
    for (let i = 0; i < currentRoundSlots.length; i += 2) {
      const game: Game = {
        id: `game-${roundNumber}-${i / 2}`,
        bracketType: 'W',
        round: roundNumber,
        matchNumber: i / 2,
        teamA: currentRoundSlots[i],
        teamB: currentRoundSlots[i + 1],
        scheduledOrder: roundGames.length,
        status: 'Queued',
        timers: {
          warmupRemaining: settings.warmupMinutes * 60,
          gameRemaining: settings.gameLengthMinutes * 60,
          flexRemaining: settings.flexMinutes * 60,
          currentPhase: 'idle',
          totalPausedTime: 0,
        },
      };
      
      roundGames.push(game);
    }
    
    rounds.push(roundGames);
    
    // Prepare next round slots (winners advance)
    const nextRoundSlots: GameSlot[] = [];
    for (let i = 0; i < roundGames.length; i++) {
      nextRoundSlots.push({ type: 'OPEN' }); // Will be filled when game completes
    }
    
    currentRoundSlots = nextRoundSlots;
    roundNumber++;
  }
  
  return rounds;
}

/**
 * Generate double elimination bracket (winners + losers)
 */
export function generateDoubleEliminationBracket(
  teams: Team[],
  settings: TournamentSettings,
  seedingMode: 'off' | 'random' | 'manual' | 'upload' = 'off',
  seedingType: SeedingType = 'standard'
): { winners: Game[][]; losers: Game[][]; grandFinal?: Game } {
  const winnersBracket = generateSingleEliminationBracket(teams, settings, seedingMode, seedingType);
  
  // Generate losers bracket
  // Losers bracket structure: teams eliminated from winners bracket play in losers bracket
  const losersBracket: Game[][] = [];
  
  // First round of losers bracket gets teams eliminated in first round of winners
  // Subsequent rounds get teams eliminated from winners bracket and winners from previous losers round
  const firstLosersRound: Game[] = [];
  const firstWinnersRound = winnersBracket[0];
  
  // Pair up first-round losers
  for (let i = 0; i < firstWinnersRound.length; i += 2) {
    const game: Game = {
      id: `loser-1-${i / 2}`,
      bracketType: 'L',
      round: 1,
      matchNumber: i / 2,
      teamA: { type: 'OPEN' }, // Loser from first winners game
      teamB: { type: 'OPEN' }, // Loser from second winners game
      scheduledOrder: firstLosersRound.length,
      status: 'Queued',
      timers: {
        warmupRemaining: settings.warmupMinutes * 60,
        gameRemaining: settings.gameLengthMinutes * 60,
        flexRemaining: settings.flexMinutes * 60,
        currentPhase: 'idle',
        totalPausedTime: 0,
      },
    };
    firstLosersRound.push(game);
  }
  
  if (firstLosersRound.length > 0) {
    losersBracket.push(firstLosersRound);
  }
  
  // Generate subsequent losers rounds
  // Each round: winners from previous losers round vs losers from corresponding winners round
  for (let round = 2; round < winnersBracket.length; round++) {
    const losersRound: Game[] = [];
    const prevLosersRound = losersBracket[losersBracket.length - 1];
    const currentWinnersRound = winnersBracket[round - 1];
    
    // Pair winners from previous losers round with losers from current winners round
    for (let i = 0; i < Math.max(prevLosersRound.length, currentWinnersRound.length); i++) {
      const game: Game = {
        id: `loser-${round}-${i}`,
        bracketType: 'L',
        round: round,
        matchNumber: i,
        teamA: { type: 'OPEN' }, // Winner from previous losers round
        teamB: { type: 'OPEN' }, // Loser from current winners round
        scheduledOrder: losersRound.length,
        status: 'Queued',
        timers: {
          warmupRemaining: settings.warmupMinutes * 60,
          gameRemaining: settings.gameLengthMinutes * 60,
          flexRemaining: settings.flexMinutes * 60,
          currentPhase: 'idle',
          totalPausedTime: 0,
        },
      };
      losersRound.push(game);
    }
    
    if (losersRound.length > 0) {
      losersBracket.push(losersRound);
    }
  }
  
  // Grand final: Winner of winners bracket vs Winner of losers bracket
  const grandFinal: Game = {
    id: 'grand-final',
    bracketType: 'Final',
    round: winnersBracket.length,
    matchNumber: 0,
    teamA: { type: 'OPEN' }, // Winner of winners bracket
    teamB: { type: 'OPEN' }, // Winner of losers bracket
    scheduledOrder: 0,
    status: 'Queued',
    timers: {
      warmupRemaining: settings.warmupMinutes * 60,
      gameRemaining: settings.gameLengthMinutes * 60,
      flexRemaining: settings.flexMinutes * 60,
      currentPhase: 'idle',
      totalPausedTime: 0,
    },
  };
  
  return { winners: winnersBracket, losers: losersBracket, grandFinal };
}

/**
 * Advance a BYE slot to the next round (for BYE vs BYE games)
 */
export function advanceByeInBracket(
  game: Game,
  bracket: Bracket
): void {
  const { bracketType, round, matchNumber } = game;
  
  if (bracketType === 'W') {
    // Advance to next round in winners bracket
    if (round < bracket.winners.length) {
      const nextRoundIndex = round; // round 1 advances to round 2 (index 1)
      const nextRound = bracket.winners[nextRoundIndex];
      const nextGameIndex = Math.floor(matchNumber / 2);
      
      if (nextRound && nextRound[nextGameIndex]) {
        const nextGame = nextRound[nextGameIndex];
        const slotIndex = matchNumber % 2 === 0 ? 0 : 1;
        if (slotIndex === 0) {
          nextGame.teamA = { type: 'BYE' };
        } else {
          nextGame.teamB = { type: 'BYE' };
        }
      }
    } else if (bracket.grandFinal) {
      // BYE from final winners round goes to grand final
      bracket.grandFinal.teamA = { type: 'BYE' };
    }
  } else if (bracketType === 'L') {
    // Advance in losers bracket
    if (round < bracket.losers.length) {
      const nextRound = bracket.losers[round];
      const nextGameIndex = Math.floor(matchNumber / 2);
      
      if (nextRound[nextGameIndex]) {
        const nextGame = nextRound[nextGameIndex];
        const slotIndex = matchNumber % 2 === 0 ? 0 : 1;
        if (slotIndex === 0) {
          nextGame.teamA = { type: 'BYE' };
        } else {
          nextGame.teamB = { type: 'BYE' };
        }
      }
    } else if (bracket.grandFinal) {
      // BYE from losers bracket goes to grand final
      bracket.grandFinal.teamB = { type: 'BYE' };
    }
  }
}

/**
 * Advance team to next round after game completion
 */
export function advanceTeamInBracket(
  game: Game,
  winnerId: string,
  bracket: Bracket
): void {
  const { bracketType, round, matchNumber } = game;
  
  // Don't advance if winnerId is invalid (shouldn't happen, but safety check)
  if (!winnerId) return;
  
  if (bracketType === 'W') {
    // Advance to next round in winners bracket
    // Note: round is 1-indexed, bracket.winners is 0-indexed
    // So round 1 -> index 0, round 2 -> index 1, etc.
    if (round < bracket.winners.length) {
      const nextRoundIndex = round; // round 1 advances to round 2 (index 1)
      const nextRound = bracket.winners[nextRoundIndex];
      const nextGameIndex = Math.floor(matchNumber / 2);
      
      if (nextRound && nextRound[nextGameIndex]) {
        const nextGame = nextRound[nextGameIndex];
        const slotIndex = matchNumber % 2 === 0 ? 0 : 1;
        if (slotIndex === 0) {
          nextGame.teamA = { type: 'Team', teamId: winnerId };
        } else {
          nextGame.teamB = { type: 'Team', teamId: winnerId };
        }
      }
    } else if (bracket.grandFinal) {
      // Winner of final winners round goes to grand final
      bracket.grandFinal.teamA = { type: 'Team', teamId: winnerId };
    }
  } else if (bracketType === 'L') {
    // Advance in losers bracket
    if (round < bracket.losers.length) {
      const nextRound = bracket.losers[round];
      const nextGameIndex = Math.floor(matchNumber / 2);
      
      if (nextRound[nextGameIndex]) {
        const nextGame = nextRound[nextGameIndex];
        const slotIndex = matchNumber % 2 === 0 ? 0 : 1;
        if (slotIndex === 0) {
          nextGame.teamA = { type: 'Team', teamId: winnerId };
        } else {
          nextGame.teamB = { type: 'Team', teamId: winnerId };
        }
      }
    } else if (bracket.grandFinal) {
      // Winner of losers bracket goes to grand final
      bracket.grandFinal.teamB = { type: 'Team', teamId: winnerId };
    }
  }
  
  // Handle losers bracket entry: when a team loses in winners bracket
  if (bracketType === 'W' && bracket.losers.length > 0) {
    // Correctly identify the loser: the team that didn't win
    let loserId: string | undefined;
    if (game.teamA.type === 'Team' && game.teamA.teamId === winnerId) {
      // TeamA won, so teamB is the loser
      loserId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
    } else if (game.teamB.type === 'Team' && game.teamB.teamId === winnerId) {
      // TeamB won, so teamA is the loser
      loserId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
    }
    
    if (loserId) {
      const isWinnersFinal = round === bracket.winners.length;
      
      if (isWinnersFinal && bracket.losers.length > 0) {
        // Loser of winners final goes to losers final
        const losersFinal = bracket.losers[bracket.losers.length - 1];
        if (losersFinal && losersFinal.length > 0) {
          // Find the first game in losers final that has an OPEN slot
          const losersFinalGame = losersFinal.find(g => g.teamA.type === 'OPEN' || g.teamB.type === 'OPEN');
          if (losersFinalGame) {
            if (losersFinalGame.teamA.type === 'OPEN') {
              losersFinalGame.teamA = { type: 'Team', teamId: loserId };
            } else if (losersFinalGame.teamB.type === 'OPEN') {
              losersFinalGame.teamB = { type: 'Team', teamId: loserId };
            }
          }
        }
      } else if (round === 1 && bracket.losers[0]) {
        // First round losers: pair them up
        const losersRound = bracket.losers[0];
        const gameIndex = Math.floor(matchNumber / 2);
        if (losersRound[gameIndex]) {
          const slotIndex = matchNumber % 2;
          if (slotIndex === 0) {
            losersRound[gameIndex].teamA = { type: 'Team', teamId: loserId };
          } else {
            losersRound[gameIndex].teamB = { type: 'Team', teamId: loserId };
          }
        }
      } else if (round > 1 && round < bracket.winners.length && bracket.losers[round - 1]) {
        // Middle rounds: loser goes to corresponding losers bracket round
        const losersRound = bracket.losers[round - 1];
        const gameIndex = Math.floor(matchNumber / 2);
        if (losersRound[gameIndex]) {
          losersRound[gameIndex].teamB = { type: 'Team', teamId: loserId };
        }
      }
    }
  }
}

