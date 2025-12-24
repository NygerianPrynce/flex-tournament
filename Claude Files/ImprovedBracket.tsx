import React from 'react';

// Types (matching your existing structure)
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

// Helper functions (preserve your existing logic)
const getTeamName = (
  slot: GameSlot,
  game: Game,
  slotType: 'A' | 'B',
  teams: Team[]
): string => {
  if (slot.type === 'BYE') return 'BYE';
  if (slot.type === 'OPEN') return 'OPEN';
  
  // Try to get from result first
  if (game.result) {
    const name = slotType === 'A' ? game.result.teamAName : game.result.teamBName;
    if (name) return name;
  }
  
  // Fallback to team lookup
  if (slot.teamId) {
    const team = teams.find(t => t.id === slot.teamId);
    if (team) return team.name;
  }
  
  return 'TBD';
};

const getRoundName = (
  roundIndex: number,
  totalRounds: number,
  gamesInRound: number
): string => {
  const roundsFromEnd = totalRounds - roundIndex - 1;
  
  if (roundsFromEnd === 0) return 'Final';
  if (roundsFromEnd === 1) return 'Semi Finals';
  if (roundsFromEnd === 2) return 'Quarter Finals';
  
  return `Round ${roundIndex + 1}`;
};

const getGameStatus = (game: Game): {
  isValid: boolean;
  reason?: string;
  severity: 'error' | 'warning' | 'info';
} => {
  // Check if both slots are filled
  const teamAFilled = game.teamA.type === 'Team' || game.teamA.type === 'BYE';
  const teamBFilled = game.teamB.type === 'Team' || game.teamB.type === 'BYE';
  
  if (!teamAFilled || !teamBFilled) {
    return {
      isValid: false,
      reason: 'Waiting for teams',
      severity: 'info'
    };
  }
  
  // Check for double BYE
  if (game.teamA.type === 'BYE' && game.teamB.type === 'BYE') {
    return {
      isValid: false,
      reason: 'Both teams are BYE',
      severity: 'error'
    };
  }
  
  return { isValid: true, severity: 'info' };
};

// Main Bracket Component
export const ImprovedTournamentBracket: React.FC<{ tournament: Tournament }> = ({
  tournament,
}) => {
  const rounds = tournament.bracket.winners;
  const grandFinal = tournament.bracket.grandFinal;
  const totalRounds = rounds.length;

  return (
    <div className="w-full overflow-x-auto bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl">
      <div className="inline-flex gap-12 min-w-max">
        {rounds.map((round, roundIndex) => (
          <RoundColumn
            key={roundIndex}
            round={round}
            roundIndex={roundIndex}
            totalRounds={totalRounds}
            teams={tournament.teams}
            isLastRound={roundIndex === totalRounds - 1 && !grandFinal}
          />
        ))}
        
        {grandFinal && (
          <GrandFinalColumn
            game={grandFinal}
            teams={tournament.teams}
          />
        )}
      </div>
    </div>
  );
};

// Round Column Component
const RoundColumn: React.FC<{
  round: Game[];
  roundIndex: number;
  totalRounds: number;
  teams: Team[];
  isLastRound: boolean;
}> = ({ round, roundIndex, totalRounds, teams, isLastRound }) => {
  const roundName = getRoundName(roundIndex, totalRounds, round.length);
  const gapMultiplier = Math.pow(2, roundIndex);
  const baseGap = 20;
  const gap = baseGap * gapMultiplier;

  return (
    <div className="relative flex flex-col">
      {/* Round Header */}
      <div className="mb-6 text-center">
        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
          {roundName}
        </h3>
        <div className="h-1 w-16 mx-auto mt-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" />
      </div>

      {/* Games Container */}
      <div className="flex flex-col justify-center flex-1" style={{ gap: `${gap}px` }}>
        {round.map((game, gameIndex) => (
          <div key={game.id} className="relative">
            <GameCard
              game={game}
              teams={teams}
              roundIndex={roundIndex}
              totalRounds={totalRounds}
            />
            
            {/* Connection Lines */}
            {!isLastRound && (
              <ConnectionLines
                gameIndex={gameIndex}
                isEven={gameIndex % 2 === 0}
                gap={gap}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Game Card Component
const GameCard: React.FC<{
  game: Game;
  teams: Team[];
  roundIndex: number;
  totalRounds: number;
}> = ({ game, teams, roundIndex, totalRounds }) => {
  const teamAName = getTeamName(game.teamA, game, 'A', teams);
  const teamBName = getTeamName(game.teamB, game, 'B', teams);
  const status = getGameStatus(game);
  const isFinished = game.status === 'Finished';
  const winnerId = game.result?.winnerId;
  
  const teamAWon = winnerId && game.teamA.teamId === winnerId;
  const teamBWon = winnerId && game.teamB.teamId === winnerId;
  
  // Scale card based on round importance
  const roundsFromEnd = totalRounds - roundIndex - 1;
  const cardScale = roundsFromEnd === 0 ? 'scale-105' : '';
  
  // Status styling
  const getBorderColor = () => {
    if (isFinished) return 'border-gray-300';
    if (!status.isValid) {
      if (status.severity === 'error') return 'border-red-400';
      if (status.severity === 'warning') return 'border-yellow-400';
      return 'border-blue-300';
    }
    if (game.status === 'Live') return 'border-green-500 shadow-lg shadow-green-500/50';
    return 'border-green-400';
  };

  return (
    <div
      className={`
        relative w-64 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300
        border-2 ${getBorderColor()} ${cardScale}
      `}
    >
      {/* Live Indicator */}
      {game.status === 'Live' && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
            <div className="relative bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              LIVE
            </div>
          </div>
        </div>
      )}

      {/* Team A */}
      <div
        className={`
          p-4 rounded-t-xl transition-all duration-200
          ${teamAWon ? 'bg-gradient-to-r from-green-50 to-green-100 border-b-2 border-green-400' : 'border-b border-gray-200'}
        `}
      >
        <div className="flex items-center justify-between">
          <span
            className={`
              text-sm font-medium truncate flex-1
              ${teamAWon ? 'font-bold text-green-900' : 'text-gray-700'}
              ${teamAName === 'BYE' ? 'text-gray-400 italic' : ''}
              ${teamAName === 'OPEN' || teamAName === 'TBD' ? 'text-gray-400 italic' : ''}
            `}
          >
            {teamAName}
          </span>
          {isFinished && game.result && (
            <span
              className={`
                ml-3 text-lg font-bold tabular-nums
                ${teamAWon ? 'text-green-700' : 'text-gray-500'}
              `}
            >
              {game.result.scoreA}
            </span>
          )}
        </div>
      </div>

      {/* VS Divider */}
      <div className="relative h-8 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white px-3 py-1 rounded-full border border-gray-300 shadow-sm">
            <span className="text-xs font-semibold text-gray-600">VS</span>
          </div>
        </div>
      </div>

      {/* Team B */}
      <div
        className={`
          p-4 rounded-b-xl transition-all duration-200
          ${teamBWon ? 'bg-gradient-to-r from-green-50 to-green-100 border-t-2 border-green-400' : 'border-t border-gray-200'}
        `}
      >
        <div className="flex items-center justify-between">
          <span
            className={`
              text-sm font-medium truncate flex-1
              ${teamBWon ? 'font-bold text-green-900' : 'text-gray-700'}
              ${teamBName === 'BYE' ? 'text-gray-400 italic' : ''}
              ${teamBName === 'OPEN' || teamBName === 'TBD' ? 'text-gray-400 italic' : ''}
            `}
          >
            {teamBName}
          </span>
          {isFinished && game.result && (
            <span
              className={`
                ml-3 text-lg font-bold tabular-nums
                ${teamBWon ? 'text-green-700' : 'text-gray-500'}
              `}
            >
              {game.result.scoreB}
            </span>
          )}
        </div>
      </div>

      {/* Status Badge */}
      {!status.isValid && status.reason && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div
            className={`
              text-xs px-3 py-1 rounded-full font-medium shadow-sm
              ${status.severity === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : ''}
              ${status.severity === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : ''}
              ${status.severity === 'info' ? 'bg-blue-100 text-blue-700 border border-blue-300' : ''}
            `}
          >
            {status.reason}
          </div>
        </div>
      )}
    </div>
  );
};

// Connection Lines Component
const ConnectionLines: React.FC<{
  gameIndex: number;
  isEven: boolean;
  gap: number;
}> = ({ gameIndex, isEven, gap }) => {
  const lineLength = 48;
  const cardHeight = 180; // Approximate height of game card
  const verticalOffset = isEven ? (cardHeight / 2 + gap / 2) : -(cardHeight / 2 + gap / 2);

  return (
    <>
      {/* Horizontal line from game to connector */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400"
        style={{
          left: '100%',
          width: `${lineLength}px`,
        }}
      />

      {/* Vertical connector (only for even-indexed games) */}
      {isEven && (
        <div
          className="absolute bg-gradient-to-b from-gray-300 to-gray-400 w-0.5"
          style={{
            left: `calc(100% + ${lineLength}px)`,
            top: '50%',
            height: `${Math.abs(verticalOffset)}px`,
          }}
        />
      )}

      {/* Horizontal line from connector to next round (only for odd-indexed games) */}
      {!isEven && (
        <div
          className="absolute h-0.5 bg-gradient-to-r from-gray-400 to-gray-300"
          style={{
            left: `calc(100% + ${lineLength}px)`,
            top: '50%',
            width: `${lineLength}px`,
            transform: 'translateY(-50%)',
          }}
        />
      )}
    </>
  );
};

// Grand Final Column Component
const GrandFinalColumn: React.FC<{
  game: Game;
  teams: Team[];
}> = ({ game, teams }) => {
  const teamAName = getTeamName(game.teamA, game, 'A', teams);
  const teamBName = getTeamName(game.teamB, game, 'B', teams);
  const winnerId = game.result?.winnerId;
  const teamAWon = winnerId && game.teamA.teamId === winnerId;
  const teamBWon = winnerId && game.teamB.teamId === winnerId;

  return (
    <div className="relative flex flex-col">
      {/* Round Header */}
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 uppercase tracking-wide">
          Grand Final
        </h3>
        <div className="h-1.5 w-24 mx-auto mt-2 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 rounded-full" />
      </div>

      {/* Grand Final Card */}
      <div className="flex flex-col justify-center flex-1">
        <div
          className="
            relative w-72 bg-gradient-to-br from-white to-orange-50
            rounded-2xl shadow-2xl border-2 border-orange-400
            transform scale-110 hover:scale-115 transition-all duration-300
          "
        >
          {/* Trophy Icon */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-full shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 3a1 1 0 011 1v1h3a1 1 0 110 2h-.5l-.5 4h.5a1 1 0 110 2h-1a1 1 0 01-1-1v-1H9v1a1 1 0 01-1 1H7a1 1 0 110-2h.5l-.5-4H6a1 1 0 110-2h3V4a1 1 0 011-1z" />
              </svg>
            </div>
          </div>

          {/* Live Indicator */}
          {game.status === 'Live' && (
            <div className="absolute -top-2 -right-2 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                <div className="relative bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  LIVE
                </div>
              </div>
            </div>
          )}

          {/* Team A */}
          <div
            className={`
              p-5 rounded-t-2xl transition-all duration-200
              ${teamAWon ? 'bg-gradient-to-r from-green-100 to-green-200 border-b-4 border-green-500' : 'border-b-2 border-gray-200'}
            `}
          >
            <div className="flex items-center justify-between">
              <span
                className={`
                  text-base font-semibold truncate flex-1
                  ${teamAWon ? 'font-bold text-green-900' : 'text-gray-800'}
                  ${teamAName === 'BYE' || teamAName === 'OPEN' || teamAName === 'TBD' ? 'text-gray-400 italic' : ''}
                `}
              >
                {teamAName}
              </span>
              {game.status === 'Finished' && game.result && (
                <span
                  className={`
                    ml-4 text-2xl font-bold tabular-nums
                    ${teamAWon ? 'text-green-700' : 'text-gray-500'}
                  `}
                >
                  {game.result.scoreA}
                </span>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="relative h-10 bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white px-4 py-1.5 rounded-full border-2 border-orange-400 shadow-md">
                <span className="text-sm font-bold text-orange-600">VS</span>
              </div>
            </div>
          </div>

          {/* Team B */}
          <div
            className={`
              p-5 rounded-b-2xl transition-all duration-200
              ${teamBWon ? 'bg-gradient-to-r from-green-100 to-green-200 border-t-4 border-green-500' : 'border-t-2 border-gray-200'}
            `}
          >
            <div className="flex items-center justify-between">
              <span
                className={`
                  text-base font-semibold truncate flex-1
                  ${teamBWon ? 'font-bold text-green-900' : 'text-gray-800'}
                  ${teamBName === 'BYE' || teamBName === 'OPEN' || teamBName === 'TBD' ? 'text-gray-400 italic' : ''}
                `}
              >
                {teamBName}
              </span>
              {game.status === 'Finished' && game.result && (
                <span
                  className={`
                    ml-4 text-2xl font-bold tabular-nums
                    ${teamBWon ? 'text-green-700' : 'text-gray-500'}
                  `}
                >
                  {game.result.scoreB}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedTournamentBracket;
