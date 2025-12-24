import React from 'react';
import {
  SingleEliminationBracket,
  Match,
  SVGViewer,
  createTheme,
} from '@g-loot/react-tournament-brackets';

// Your existing types
interface Team {
  id: string;
  name: string;
}

interface GameSlot {
  type: 'Team' | 'BYE' | 'OPEN';
  teamId?: string;
}

interface GameResult {
  winnerId: string;
  scoreA: number;
  scoreB: number;
  teamAName?: string;
  teamBName?: string;
}

interface Game {
  id: string;
  teamA: GameSlot;
  teamB: GameSlot;
  result?: GameResult;
  status: 'Queued' | 'Warmup' | 'Live' | 'Flex' | 'Paused' | 'Finished';
}

interface Tournament {
  bracket: {
    winners: Game[][];
    grandFinal?: Game;
  };
  teams: Team[];
}

// Helper function to get team name
const getTeamName = (
  slot: GameSlot,
  game: Game,
  slotType: 'A' | 'B',
  teams: Team[]
): string => {
  if (slot.type === 'BYE') return 'BYE';
  if (slot.type === 'OPEN') return 'TBD';
  
  if (game.result) {
    const name = slotType === 'A' ? game.result.teamAName : game.result.teamBName;
    if (name) return name;
  }
  
  if (slot.teamId) {
    const team = teams.find(t => t.id === slot.teamId);
    if (team) return team.name;
  }
  
  return 'TBD';
};

// Transform your data structure to g-loot format
const transformToGlootFormat = (tournament: Tournament) => {
  const matches: any[] = [];
  const rounds = tournament.bracket.winners;
  
  // Build matches array with proper nextMatchId references
  let matchIdCounter = 0;
  const matchIdMap = new Map<string, number>();
  
  // First pass: assign IDs to all matches
  rounds.forEach((round, roundIndex) => {
    round.forEach((game) => {
      matchIdMap.set(game.id, matchIdCounter++);
    });
  });
  
  // Add grand final if exists
  if (tournament.bracket.grandFinal) {
    matchIdMap.set(tournament.bracket.grandFinal.id, matchIdCounter++);
  }
  
  // Second pass: create matches with proper references
  rounds.forEach((round, roundIndex) => {
    const nextRound = roundIndex < rounds.length - 1 ? rounds[roundIndex + 1] : null;
    
    round.forEach((game, gameIndex) => {
      const teamAName = getTeamName(game.teamA, game, 'A', tournament.teams);
      const teamBName = getTeamName(game.teamB, game, 'B', tournament.teams);
      
      // Determine next match ID
      let nextMatchId = null;
      if (nextRound) {
        // Games pair up: 0,1 -> 0; 2,3 -> 1; 4,5 -> 2, etc.
        const nextGameIndex = Math.floor(gameIndex / 2);
        if (nextRound[nextGameIndex]) {
          nextMatchId = matchIdMap.get(nextRound[nextGameIndex].id) || null;
        }
      } else if (tournament.bracket.grandFinal) {
        // Last round connects to grand final
        nextMatchId = matchIdMap.get(tournament.bracket.grandFinal.id) || null;
      }
      
      const winnerId = game.result?.winnerId;
      const teamAWon = winnerId && game.teamA.teamId === winnerId;
      const teamBWon = winnerId && game.teamB.teamId === winnerId;
      
      matches.push({
        id: matchIdMap.get(game.id),
        name: `Game ${matchIdMap.get(game.id)! + 1}`,
        nextMatchId: nextMatchId,
        tournamentRoundText: `Round ${roundIndex + 1}`,
        startTime: game.status === 'Live' ? 'LIVE NOW' : '',
        state: game.status === 'Finished' ? 'DONE' : game.status === 'Live' ? 'RUNNING' : 'SCHEDULED',
        participants: [
          {
            id: game.teamA.teamId || `placeholder-a-${game.id}`,
            resultText: game.result ? String(game.result.scoreA) : '',
            isWinner: teamAWon || false,
            status: game.status === 'Finished' ? 'PLAYED' : null,
            name: teamAName,
          },
          {
            id: game.teamB.teamId || `placeholder-b-${game.id}`,
            resultText: game.result ? String(game.result.scoreB) : '',
            isWinner: teamBWon || false,
            status: game.status === 'Finished' ? 'PLAYED' : null,
            name: teamBName,
          },
        ],
      });
    });
  });
  
  // Add grand final
  if (tournament.bracket.grandFinal) {
    const gf = tournament.bracket.grandFinal;
    const teamAName = getTeamName(gf.teamA, gf, 'A', tournament.teams);
    const teamBName = getTeamName(gf.teamB, gf, 'B', tournament.teams);
    
    const winnerId = gf.result?.winnerId;
    const teamAWon = winnerId && gf.teamA.teamId === winnerId;
    const teamBWon = winnerId && gf.teamB.teamId === winnerId;
    
    matches.push({
      id: matchIdMap.get(gf.id),
      name: 'Grand Final',
      nextMatchId: null,
      tournamentRoundText: 'Grand Final',
      startTime: gf.status === 'Live' ? 'LIVE NOW' : '',
      state: gf.status === 'Finished' ? 'DONE' : gf.status === 'Live' ? 'RUNNING' : 'SCHEDULED',
      participants: [
        {
          id: gf.teamA.teamId || `placeholder-a-${gf.id}`,
          resultText: gf.result ? String(gf.result.scoreA) : '',
          isWinner: teamAWon || false,
          status: gf.status === 'Finished' ? 'PLAYED' : null,
          name: teamAName,
        },
        {
          id: gf.teamB.teamId || `placeholder-b-${gf.id}`,
          resultText: gf.result ? String(gf.result.scoreB) : '',
          isWinner: teamBWon || false,
          status: gf.status === 'Finished' ? 'PLAYED' : null,
          name: teamBName,
        },
      ],
    });
  }
  
  return matches;
};

// Create custom theme with your colors
const CustomTheme = createTheme({
  textColor: {
    main: '#374151', // gray-700
    highlighted: '#059669', // green-600
    dark: '#1f2937', // gray-800
  },
  matchBackground: {
    wonColor: '#d1fae5', // green-100
    lostColor: '#f3f4f6', // gray-100
  },
  score: {
    background: {
      wonColor: '#10b981', // green-500
      lostColor: '#9ca3af', // gray-400
    },
    text: {
      highlightedWonColor: '#ffffff',
      highlightedLostColor: '#ffffff',
    },
  },
  border: {
    color: '#d1d5db', // gray-300
    highlightedColor: '#10b981', // green-500
  },
  roundHeader: {
    backgroundColor: '#f97316', // orange-500
    fontColor: '#ffffff',
  },
  connectorColor: '#9ca3af', // gray-400
  connectorColorHighlight: '#10b981', // green-500
});

// Main Component
export const GLootTournamentBracket: React.FC<{ tournament: Tournament }> = ({
  tournament,
}) => {
  const matches = transformToGlootFormat(tournament);
  
  return (
    <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl">
      <SingleEliminationBracket
        matches={matches}
        matchComponent={Match}
        theme={CustomTheme}
        options={{
          style: {
            roundHeader: {
              backgroundColor: CustomTheme.roundHeader.backgroundColor,
              fontColor: CustomTheme.roundHeader.fontColor,
              fontSize: 16,
              fontWeight: 'bold',
            },
            connectorColor: CustomTheme.connectorColor,
            connectorColorHighlight: CustomTheme.connectorColorHighlight,
          },
        }}
        svgWrapper={({ children, ...props }) => (
          <SVGViewer
            width={800}
            height={600}
            background="transparent"
            SVGBackground="transparent"
            {...props}
          >
            {children}
          </SVGViewer>
        )}
      />
    </div>
  );
};

export default GLootTournamentBracket;
