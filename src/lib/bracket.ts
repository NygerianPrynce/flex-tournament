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
 * Generate single elimination bracket
 */
export function generateSingleEliminationBracket(
  teams: Team[],
  settings: TournamentSettings,
  seedingMode: 'off' | 'random' | 'manual' | 'upload' = 'off',
  _seedingType: SeedingType = 'standard' // Not used - we use same logic as autoAssignTeamsToBracket
): Game[][] {
  const bracketSize = nextPowerOfTwo(teams.length);
  
  const rounds: Game[][] = [];
  let currentRoundSlots: GameSlot[] = [];
  let roundNumber = 1;
  
  // For first round, use the EXACT same logic as autoAssignTeamsToBracket
  // This ensures auto-generate and auto-assign produce identical results
  if (roundNumber === 1) {
    // Prepare teams based on seeding mode (same as autoAssignTeamsToBracket)
    let teamsToAssign: Team[] = [];
    if (seedingMode === 'manual' || seedingMode === 'upload') {
      teamsToAssign = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
    } else if (seedingMode === 'random') {
      teamsToAssign = [...teams].sort(() => Math.random() - 0.5);
    } else {
      // 'off' mode - random shuffle
      teamsToAssign = [...teams].sort(() => Math.random() - 0.5);
    }
    
    // Calculate how many BYEs we need
    const totalSlots = bracketSize;
    const numByesNeeded = totalSlots - teamsToAssign.length;
    
    // Use the EXACT same redistribution logic as autoAssignTeamsToBracket
    // General strategy for ALL team counts: Prioritize Team vs BYE games to use up BYEs, then Team vs Team games
    // This prevents BYE vs BYE games whenever possible (works for any number of teams)
    const redistributedSlots: GameSlot[] = [];
    
    let teamIdx = 0;
    let byeIdx = 0;
    
    // General algorithm (works for any team count):
    // 1. Pair teams with BYEs first (Team vs BYE) - uses up BYEs efficiently
    // 2. Pair remaining teams (Team vs Team)
    // 3. If one team left, pair it with a BYE if available
    // 4. Only create BYE vs BYE if we have leftover BYEs (should be rare)
    // Priority: Team vs BYE > Team vs Team > BYE vs BYE (only if absolutely necessary)
    
    // Step 1: Create as many Team vs BYE games as possible
    // This uses up BYEs by pairing them with teams, preventing BYE vs BYE games
    const numTeamByeGames = Math.min(teamsToAssign.length, numByesNeeded);
    for (let i = 0; i < numTeamByeGames; i++) {
      redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
      redistributedSlots.push({ type: 'BYE' });
      byeIdx++;
    }
    
    // Step 2: Pair remaining teams into Team vs Team games
    const remainingTeams = teamsToAssign.length - teamIdx;
    const numTeamTeamGames = Math.floor(remainingTeams / 2);
    for (let i = 0; i < numTeamTeamGames; i++) {
      redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
      redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
    }
    
    // Step 3: If there's one team left, pair it with a BYE if available
    if (teamIdx < teamsToAssign.length && byeIdx < numByesNeeded) {
      redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
      redistributedSlots.push({ type: 'BYE' });
      byeIdx++;
    }
    
    // Step 4: Create BYE vs BYE games only if we have leftover BYEs
    // This should be rare - only happens when we have an even number of leftover BYEs
    // after all teams have been paired
    const remainingByes = numByesNeeded - byeIdx;
    const numByeByeGames = Math.floor(remainingByes / 2);
    for (let i = 0; i < numByeByeGames; i++) {
      redistributedSlots.push({ type: 'BYE' });
      redistributedSlots.push({ type: 'BYE' });
      byeIdx += 2;
    }
    
    // Safety check: fill any remaining slots (shouldn't happen in normal cases)
    while (teamIdx < teamsToAssign.length) {
      redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
    }
    while (byeIdx < numByesNeeded) {
      redistributedSlots.push({ type: 'BYE' });
      byeIdx++;
    }
    
    currentRoundSlots = redistributedSlots;
  } else {
    // For subsequent rounds, use the old logic (shouldn't happen in this function)
    // This is just a fallback
    const slots: GameSlot[] = [];
    for (let i = 0; i < bracketSize; i++) {
      slots.push({ type: 'OPEN' });
    }
    currentRoundSlots = slots;
  }
  
  while (currentRoundSlots.length > 1) {
    
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
 * Generate losers bracket structure based on winners bracket
 * This function is used by both auto-generate and manual creation to ensure consistency
 */
/**
 * Generate losers bracket structure based on winners bracket
 * Canonical power-of-2 structure ensures predictable placement and advancement
 */
export function generateLosersBracketStructure(
  winnersBracket: Game[][],
  settings: TournamentSettings,
  _numTeams?: number
): Game[][] {
  if (!winnersBracket.length) return [];

  const winnersRounds = winnersBracket.length;
  if (winnersRounds <= 1) return []; // 2-team bracket special cases handled elsewhere

  const bracketSize = winnersBracket[0].length * 2; // power-of-2 size
  const totalLosersRounds = 2 * winnersRounds - 2;

  const losersBracket: Game[][] = [];

  // L1 & L2 start with bracketSize/4 games, then halves every two rounds
  let gamesInPair = Math.max(1, bracketSize / 4);

  for (let r = 1; r <= totalLosersRounds; r++) {
    // Every odd losers round after L1 halves the games (L3, L5, L7, ...)
    if (r > 2 && r % 2 === 1) {
      gamesInPair = Math.max(1, Math.floor(gamesInPair / 2));
    }

    const numGames = Math.max(1, gamesInPair);
    const roundGames: Game[] = [];

    for (let g = 0; g < numGames; g++) {
      roundGames.push({
        id: `loser-${r}-${g}`,
        bracketType: 'L',
        round: r,
        matchNumber: g,
        teamA: { type: 'OPEN' },
        teamB: { type: 'OPEN' },
        scheduledOrder: g,
        status: 'Queued',
        timers: {
          warmupRemaining: settings.warmupMinutes * 60,
          gameRemaining: settings.gameLengthMinutes * 60,
          flexRemaining: settings.flexMinutes * 60,
          currentPhase: 'idle',
          totalPausedTime: 0,
        },
      });
    }

    losersBracket.push(roundGames);
  }

  return losersBracket;
}

/**
 * Generate double elimination bracket (winners + losers)
 * FIXED: Properly handles BYEs - only creates losers games for actual teams that lose
 */
export function generateDoubleEliminationBracket(
  teams: Team[],
  settings: TournamentSettings,
  seedingMode: 'off' | 'random' | 'manual' | 'upload' = 'off',
  seedingType: SeedingType = 'standard'
): { winners: Game[][]; losers: Game[][]; grandFinal?: Game; grandFinalReset?: Game } {
  const winnersBracket = generateSingleEliminationBracket(teams, settings, seedingMode, seedingType);
  
  // Generate losers bracket using the shared function with numTeams for consistent structure
  // This ensures auto-generate creates the same structure as manual creation
  const losersBracket = generateLosersBracketStructure(winnersBracket, settings, teams.length);
  
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
  
  // Grand Final Reset: Only played if losers bracket champion wins Grand Final
  // This ensures both teams have lost once (true double elimination)
  const grandFinalReset: Game = {
    id: 'grand-final-reset',
    bracketType: 'Final',
    round: winnersBracket.length + 1,
    matchNumber: 0,
    teamA: { type: 'OPEN' }, // Winner of winners bracket (from Grand Final)
    teamB: { type: 'OPEN' }, // Winner of losers bracket (from Grand Final)
    scheduledOrder: 0,
    status: 'Queued', // Will only be played if LB champ wins Grand Final
    timers: {
      warmupRemaining: settings.warmupMinutes * 60,
      gameRemaining: settings.gameLengthMinutes * 60,
      flexRemaining: settings.flexMinutes * 60,
      currentPhase: 'idle',
      totalPausedTime: 0,
    },
  };
  
  return { winners: winnersBracket, losers: losersBracket, grandFinal, grandFinalReset };
}

/**
 * Finalize losers bracket round safely.
 *
 * Key idea:
 * - ONLY Losers Round 1 (index 0) is allowed to turn OPEN/OPEN into BYE/BYE
 *   because those are guaranteed "ghost" slots caused by W1 BYEs.
 * - Later losers rounds must NEVER do OPEN/OPEN -> BYE/BYE (creates premature chains).
 * - Later losers rounds must NEVER fill teamA OPEN -> BYE (teamA is survivor feed slot).
 */
export function finalizeLosersRound(
  bracket: Bracket,
  losersRoundIndex: number,
  opts: { fillOpenOpen?: boolean } = {}
): void {
  if (losersRoundIndex < 0) return;
  if (losersRoundIndex >= bracket.losers.length) return;

  const losersRound = bracket.losers[losersRoundIndex];

  const allowGhostGames = losersRoundIndex === 0 && opts.fillOpenOpen === true;

  for (const g of losersRound) {
    const hasTeamA = g.teamA.type === 'Team';
    const hasTeamB = g.teamB.type === 'Team';
    const hasOpenA = g.teamA.type === 'OPEN';
    const hasOpenB = g.teamB.type === 'OPEN';

    // ONLY L1: convert ghost OPEN/OPEN into BYE/BYE
    if (allowGhostGames && hasOpenA && hasOpenB) {
      g.teamA = { type: 'BYE' };
      g.teamB = { type: 'BYE' };
      continue;
    }

    // Team vs OPEN => Team vs BYE (always safe: fill teamB only)
    if (hasTeamA && hasOpenB) {
      g.teamB = { type: 'BYE' };
      continue;
    }

    // ONLY L1: allow filling teamA if teamB is a Team (since both sides are fed from W1 losers)
    if (losersRoundIndex === 0 && hasTeamB && hasOpenA) {
      g.teamA = { type: 'BYE' };
      continue;
    }

    // IMPORTANT: For later rounds, DO NOT do (hasTeamB && hasOpenA) -> BYE.
  }
}

export function getLosersTargetRoundIdxForWinnersRound(winnersRound: number, totalWinnersRounds: number): number {
  // winnersRound is 1-indexed
  if (totalWinnersRounds <= 1) return -1;

  // W1 losers -> L1 (index 0)
  if (winnersRound === 1) return 0;

  // Winners final loser -> last losers round
  if (winnersRound === totalWinnersRounds) return (2 * totalWinnersRounds - 2) - 1;

  // W2 -> L2 (idx 1), W3 -> L4 (idx 3), W4 -> L6 (idx 5) ...
  return 2 * winnersRound - 3;
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
    const roundIdx = round - 1;

    // Winner of last losers round goes to grand final
    if (roundIdx >= bracket.losers.length - 1) {
      if (bracket.grandFinal) bracket.grandFinal.teamB = { type: 'BYE' };
      return;
    }

    const nextRound = bracket.losers[roundIdx + 1];
    if (!nextRound) return;

    // Must match the SAME mapping as advanceTeamInBracket (L side):
    if (roundIdx % 2 === 0) {
      // consolidation -> drop-in: same matchNumber goes into teamA
      const nextGame = nextRound[matchNumber];
      if (nextGame) nextGame.teamA = { type: 'BYE' };
    } else {
      // drop-in -> consolidation: pair winners into nextGame A/B
      const nextGame = nextRound[Math.floor(matchNumber / 2)];
      if (!nextGame) return;

      if (matchNumber % 2 === 0) nextGame.teamA = { type: 'BYE' };
      else nextGame.teamB = { type: 'BYE' };
    }
  }
}

export function advanceTeamInBracket(game: Game, winnerId: string, bracket: Bracket): void {
  const { bracketType, round, matchNumber } = game;
  if (!winnerId) return;

  const placeLoserInRoundSequential = (losersRound: Game[], loserId: string): boolean => {
    // fill A slots first then B slots (pairs naturally)
    for (const g of losersRound) {
      if (g.teamA.type === 'OPEN') {
        g.teamA = { type: 'Team', teamId: loserId };
        return true;
      }
    }
    for (const g of losersRound) {
      if (g.teamB.type === 'OPEN') {
        g.teamB = { type: 'Team', teamId: loserId };
        return true;
      }
    }
    return false;
  };

  const placeLoserInTargetRound = (targetRound: Game[], loserId: string, preferMatch: number): void => {
    // 1) try canonical slot: same matchNumber, teamB
    const g = targetRound[preferMatch];
    if (g && g.teamB.type === 'OPEN') {
      g.teamB = { type: 'Team', teamId: loserId };
      return;
    }

    // 2) fallback: first OPEN teamB anywhere in that round
    for (const gg of targetRound) {
      if (gg.teamB.type === 'OPEN') {
        gg.teamB = { type: 'Team', teamId: loserId };
        return;
      }
    }

    // 3) last resort: any OPEN slot (should not happen, but prevents dropping the loser)
    for (const gg of targetRound) {
      if (gg.teamA.type === 'OPEN') {
        gg.teamA = { type: 'Team', teamId: loserId };
        return;
      }
    }
  };

  if (bracketType === 'W') {
    // Advance winner in winners bracket
    if (round < bracket.winners.length) {
      const nextRoundIndex = round;
      const nextRound = bracket.winners[nextRoundIndex];
      const nextGameIndex = Math.floor(matchNumber / 2);

      if (nextRound && nextRound[nextGameIndex]) {
        const nextGame = nextRound[nextGameIndex];
        const slotIndex = matchNumber % 2 === 0 ? 0 : 1;
        if (slotIndex === 0) nextGame.teamA = { type: 'Team', teamId: winnerId };
        else nextGame.teamB = { type: 'Team', teamId: winnerId };
      }
    } else if (bracket.grandFinal) {
      bracket.grandFinal.teamA = { type: 'Team', teamId: winnerId };
    }

    // Drop the loser into losers bracket (only if loser is a real Team)
    if (bracket.losers.length > 0) {
      let loserId: string | undefined;

      if (game.teamA.type === 'Team' && game.teamA.teamId === winnerId) {
        loserId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
      } else if (game.teamB.type === 'Team' && game.teamB.teamId === winnerId) {
        loserId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
      }

      if (!loserId) return;

      // W1 losers: place sequentially into L1 (BYE-heavy W1 breaks matchNumber mapping)
      if (round === 1) {
        const l1 = bracket.losers[0];
        if (l1) placeLoserInRoundSequential(l1, loserId);
        return;
      }

      // Winners final loser -> last losers round, prefer teamB
      if (round === bracket.winners.length) {
        const last = bracket.losers[bracket.losers.length - 1];
        if (last) {
          // prefer teamB, then fallback to any OPEN
          for (const g of last) {
            if (g.teamB.type === 'OPEN') {
              g.teamB = { type: 'Team', teamId: loserId };
              return;
            }
          }
          for (const g of last) {
            if (g.teamA.type === 'OPEN') {
              g.teamA = { type: 'Team', teamId: loserId };
              return;
            }
          }
        }
        return;
      }

      // W2+ losers: deterministic target losers round + safe placement
      const targetRoundIdx = getLosersTargetRoundIdxForWinnersRound(round, bracket.winners.length);
      if (targetRoundIdx < 0 || targetRoundIdx >= bracket.losers.length) return;

      const targetRound = bracket.losers[targetRoundIdx];
      if (!targetRound) return;

      placeLoserInTargetRound(targetRound, loserId, matchNumber);
    }

    return;
  }

  // LOSERS bracket advancement
  if (bracketType === 'L') {
    const roundIdx = round - 1;

    // Last losers round winner goes to grand final
    if (roundIdx >= bracket.losers.length - 1) {
      if (bracket.grandFinal) bracket.grandFinal.teamB = { type: 'Team', teamId: winnerId };
      return;
    }

    const nextRound = bracket.losers[roundIdx + 1];
    if (!nextRound) return;

    // Canonical progression: even idx (consolidation) -> drop-in: winner to teamA same matchNumber
    if (roundIdx % 2 === 0) {
      const nextGame = nextRound[matchNumber];
      if (nextGame && nextGame.teamA.type === 'OPEN') {
        nextGame.teamA = { type: 'Team', teamId: winnerId };
        return;
      }

      // fallback: any OPEN teamA
      for (const g of nextRound) {
        if (g.teamA.type === 'OPEN') {
          g.teamA = { type: 'Team', teamId: winnerId };
          return;
        }
      }

      // last resort: any OPEN teamB
      for (const g of nextRound) {
        if (g.teamB.type === 'OPEN') {
          g.teamB = { type: 'Team', teamId: winnerId };
          return;
        }
      }

      return;
    }

    // odd idx (drop-in) -> consolidation: pair winners into next game A/B
    const nextGame = nextRound[Math.floor(matchNumber / 2)];
    if (!nextGame) {
      // fallback: any OPEN slot
      for (const g of nextRound) {
        if (g.teamA.type === 'OPEN') {
          g.teamA = { type: 'Team', teamId: winnerId };
          return;
        }
      }
      for (const g of nextRound) {
        if (g.teamB.type === 'OPEN') {
          g.teamB = { type: 'Team', teamId: winnerId };
          return;
        }
      }
      return;
    }

    if (matchNumber % 2 === 0) {
      if (nextGame.teamA.type === 'OPEN') nextGame.teamA = { type: 'Team', teamId: winnerId };
      else nextGame.teamB = { type: 'Team', teamId: winnerId };
    } else {
      if (nextGame.teamB.type === 'OPEN') nextGame.teamB = { type: 'Team', teamId: winnerId };
      else nextGame.teamA = { type: 'Team', teamId: winnerId };
    }
  }
}