import type { Game, Bracket } from '../types';

/**
 * Convert our bracket structure to brackets-viewer.js format
 * brackets-viewer.js uses brackets-model format with:
 * - stages: array of stage objects
 * - matches: array of match objects
 * - matchGames: array of match game objects (optional)
 * - participants: array of participant objects
 */
export interface BracketViewerData {
  stages: Array<{
    id: number;
    tournamentId: number;
    name: string;
    type: 'single_elimination' | 'double_elimination';
    number: number;
    settings?: any;
  }>;
  matches: Array<{
    id: number;
    stageId: number;
    groupId: number;
    roundId: number;
    number: number;
    childCount: number;
    status: number;
    opponent1: {
      id: number | null;
      position?: number;
      score?: number;
      result?: 'win' | 'loss';
    } | null;
    opponent2: {
      id: number | null;
      position?: number;
      score?: number;
      result?: 'win' | 'loss';
    } | null;
  }>;
  matchGames: Array<{
    id: number;
    stageId: number;
    groupId: number;
    roundId: number;
    matchId: number;
    number: number;
    status: number;
    opponent1: {
      id: number | null;
      score?: number;
      result?: 'win' | 'loss';
    } | null;
    opponent2: {
      id: number | null;
      score?: number;
      result?: 'win' | 'loss';
    } | null;
  }>;
  participants: Array<{
    id: number;
    tournamentId: number;
    name: string;
  }>;
}

/**
 * Convert our bracket to brackets-viewer.js format
 */
export function convertBracketToViewerData(
  bracket: Bracket,
  getTeamName: (slot: Game['teamA'], game: Game, slotType: 'A' | 'B') => string
): BracketViewerData | null {
  if (!bracket.winners || bracket.winners.length === 0) {
    return null;
  }

  const participants: BracketViewerData['participants'] = [];
  const participantMap = new Map<string, number>(); // Map team IDs to participant IDs
  let participantIdCounter = 1;

  // First, collect all unique teams/participants
  const collectParticipants = (game: Game) => {
    if (game.teamA.type === 'Team' && game.teamA.teamId) {
      if (!participantMap.has(game.teamA.teamId)) {
        const name = getTeamName(game.teamA, game, 'A');
        if (name !== 'BYE' && name !== 'OPEN' && name !== 'TBD') {
          participants.push({
            id: participantIdCounter,
            tournamentId: 1,
            name,
          });
          participantMap.set(game.teamA.teamId, participantIdCounter++);
        }
      }
    }
    if (game.teamB.type === 'Team' && game.teamB.teamId) {
      if (!participantMap.has(game.teamB.teamId)) {
        const name = getTeamName(game.teamB, game, 'B');
        if (name !== 'BYE' && name !== 'OPEN' && name !== 'TBD') {
          participants.push({
            id: participantIdCounter,
            tournamentId: 1,
            name,
          });
          participantMap.set(game.teamB.teamId, participantIdCounter++);
        }
      }
    }
  };

  // Collect participants from all games
  bracket.winners.forEach(round => {
    round.forEach(collectParticipants);
  });
  if (bracket.grandFinal) {
    collectParticipants(bracket.grandFinal);
  }

  // Create stage
  const stages: BracketViewerData['stages'] = [{
    id: 1,
    tournamentId: 1,
    name: 'Main Bracket',
    type: bracket.grandFinal ? 'double_elimination' : 'single_elimination',
    number: 1,
  }];

  // Create matches
  const matches: BracketViewerData['matches'] = [];
  const matchMap = new Map<string, number>(); // Map game IDs to match IDs
  let matchIdCounter = 1;
  let roundIdCounter = 1;

  // Process winners bracket
  bracket.winners.forEach((round, roundIndex) => {
    round.forEach((game, gameIndex) => {
      const matchId = matchIdCounter++;
      matchMap.set(game.id, matchId);

      // Get participant IDs
      const participant1Id = game.teamA.type === 'Team' && game.teamA.teamId 
        ? participantMap.get(game.teamA.teamId) || null 
        : null;
      const participant2Id = game.teamB.type === 'Team' && game.teamB.teamId 
        ? participantMap.get(game.teamB.teamId) || null 
        : null;

      // Determine status (0 = locked, 1 = waiting, 2 = ready, 3 = running, 4 = completed)
      let status = 1; // waiting
      if (game.status === 'Finished') {
        status = 4; // completed
      } else if (game.status === 'Live' || game.status === 'Warmup' || game.status === 'Flex') {
        status = 3; // running
      } else if (participant1Id && participant2Id) {
        status = 2; // ready
      }

      // Determine child count (how many matches feed into this one)
      const childCount = roundIndex > 0 ? 2 : 0;

      // Determine results
      let opponent1Result: 'win' | 'loss' | undefined;
      let opponent2Result: 'win' | 'loss' | undefined;
      if (game.result) {
        if (game.result.winnerId === game.teamA.teamId) {
          opponent1Result = 'win';
          opponent2Result = 'loss';
        } else if (game.result.winnerId === game.teamB.teamId) {
          opponent1Result = 'loss';
          opponent2Result = 'win';
        }
      }

      matches.push({
        id: matchId,
        stageId: 1,
        groupId: 1,
        roundId: roundIdCounter,
        number: gameIndex + 1,
        childCount,
        status,
        opponent1: participant1Id ? {
          id: participant1Id,
          score: game.result?.scoreA,
          result: opponent1Result,
        } : null,
        opponent2: participant2Id ? {
          id: participant2Id,
          score: game.result?.scoreB,
          result: opponent2Result,
        } : null,
      });
    });
    roundIdCounter++;
  });

  // Add grand final if exists
  if (bracket.grandFinal) {
    const game = bracket.grandFinal;
    const matchId = matchIdCounter++;
    matchMap.set(game.id, matchId);

    const participant1Id = game.teamA.type === 'Team' && game.teamA.teamId 
      ? participantMap.get(game.teamA.teamId) || null 
      : null;
    const participant2Id = game.teamB.type === 'Team' && game.teamB.teamId 
      ? participantMap.get(game.teamB.teamId) || null 
      : null;

    let status = 1;
    if (game.status === 'Finished') {
      status = 4;
    } else if (game.status === 'Live' || game.status === 'Warmup' || game.status === 'Flex') {
      status = 3;
    } else if (participant1Id && participant2Id) {
      status = 2;
    }

    let opponent1Result: 'win' | 'loss' | undefined;
    let opponent2Result: 'win' | 'loss' | undefined;
    if (game.result) {
      if (game.result.winnerId === game.teamA.teamId) {
        opponent1Result = 'win';
        opponent2Result = 'loss';
      } else if (game.result.winnerId === game.teamB.teamId) {
        opponent1Result = 'loss';
        opponent2Result = 'win';
      }
    }

    matches.push({
      id: matchId,
      stageId: 1,
      groupId: 1,
      roundId: roundIdCounter,
      number: 1,
      childCount: 2, // Grand final is fed by winners and losers bracket
      status,
      opponent1: participant1Id ? {
        id: participant1Id,
        score: game.result?.scoreA,
        result: opponent1Result,
      } : null,
      opponent2: participant2Id ? {
        id: participant2Id,
        score: game.result?.scoreB,
        result: opponent2Result,
      } : null,
    });
  }

  return {
    stages,
    matches,
    matchGames: [], // We don't use match games for now
    participants,
  };
}
