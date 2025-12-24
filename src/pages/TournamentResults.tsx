import { useTournamentStore } from '../store/tournamentStore';
import type { Game, Tournament } from '../types';
import { formatTime } from '../lib/timer';
import { getRoundNameFromGame, getRoundName } from '../lib/roundNames';

interface TournamentResultsProps {
  tournament?: Tournament;
  viewerMode?: boolean;
}

export function TournamentResults({ tournament: propTournament, viewerMode: _viewerMode = false }: TournamentResultsProps = {} as TournamentResultsProps) {
  const store = useTournamentStore();
  const tournament = propTournament || store.tournament;
  const { getAllGames } = store;
  
  if (!tournament) {
    return <div className="p-8">No tournament loaded</div>;
  }
  
  const finishedGames = getAllGames().filter(g => {
    // Filter out BYE vs BYE games
    if (g.teamA.type === 'BYE' && g.teamB.type === 'BYE') {
      return false;
    }
    return g.status === 'Finished' && g.result;
  });
  
  const getTeamName = (slot: Game['teamA'], game: Game) => {
    // If game has a result with stored team names, use those (preserves names even if team is deleted)
    if (game?.result) {
      // Determine which slot we're looking at
      const isTeamA = (slot.type === 'Team' && game.teamA.type === 'Team' && slot.teamId === game.teamA.teamId) ||
                      (slot.type === 'BYE' && game.teamA.type === 'BYE') ||
                      (slot.type === 'OPEN' && game.teamA.type === 'OPEN');
      const isTeamB = (slot.type === 'Team' && game.teamB.type === 'Team' && slot.teamId === game.teamB.teamId) ||
                      (slot.type === 'BYE' && game.teamB.type === 'BYE') ||
                      (slot.type === 'OPEN' && game.teamB.type === 'OPEN');
      
      if (isTeamA && game.result.teamAName) {
        return game.result.teamAName;
      }
      if (isTeamB && game.result.teamBName) {
        return game.result.teamBName;
      }
    }
    
    if (slot.type === 'Team' && slot.teamId) {
      const team = tournament.teams.find(t => t.id === slot.teamId);
      return team?.name || 'Unknown';
    }
    if (slot.type === 'BYE') return 'BYE';
    return 'TBD';
  };
  
  // Calculate game duration breakdown
  const calculateGameDuration = (game: Game): { total: number; warmup: number; game: number; flex: number; overrun: number } => {
    if (!game.result || !game.timers.startedAt) {
      return { total: 0, warmup: 0, game: 0, flex: 0, overrun: 0 };
    }
    
    const warmupSeconds = tournament.settings.warmupMinutes * 60;
    const gameSeconds = tournament.settings.gameLengthMinutes * 60;
    const flexSeconds = tournament.settings.flexMinutes * 60;
    
    // Calculate total elapsed time (minus paused time)
    const finishedAt = game.result.finishedAt;
    const elapsed = finishedAt - game.timers.startedAt;
    const adjustedElapsed = Math.floor((elapsed - game.timers.totalPausedTime) / 1000);
    
    // Determine what phases were used based on elapsed time
    // Games progress: warmup -> game -> flex -> overtime
    const totalScheduled = warmupSeconds + gameSeconds + flexSeconds;
    
    let warmupUsed = 0;
    let gameUsed = 0;
    let flexUsed = 0;
    let overrunUsed = 0;
    
    if (adjustedElapsed <= warmupSeconds) {
      // Finished during warmup
      warmupUsed = adjustedElapsed;
    } else if (adjustedElapsed <= warmupSeconds + gameSeconds) {
      // Finished during game time
      warmupUsed = warmupSeconds;
      gameUsed = adjustedElapsed - warmupSeconds;
    } else if (adjustedElapsed <= totalScheduled) {
      // Finished during flex time
      warmupUsed = warmupSeconds;
      gameUsed = gameSeconds;
      flexUsed = adjustedElapsed - warmupSeconds - gameSeconds;
    } else {
      // Finished during overrun
      warmupUsed = warmupSeconds;
      gameUsed = gameSeconds;
      flexUsed = flexSeconds;
      overrunUsed = adjustedElapsed - totalScheduled;
    }
    
    const total = warmupUsed + gameUsed + flexUsed + overrunUsed;
    
    return { total, warmup: warmupUsed, game: gameUsed, flex: flexUsed, overrun: overrunUsed };
  };
  
  // Format duration breakdown
  const formatDurationBreakdown = (duration: ReturnType<typeof calculateGameDuration>): string => {
    const parts: string[] = [];
    parts.push(`Warmup: ${formatTime(duration.warmup)}`);
    parts.push(`Game: ${formatTime(duration.game)}`);
    if (duration.flex > 0) {
      parts.push(`Flex: ${formatTime(duration.flex)}`);
    }
    if (duration.overrun > 0) {
      parts.push(`Overrun: ${formatTime(duration.overrun)}`);
    }
    return parts.join(' • ');
  };
  
  // Organize games by bracket type and round
  const isDoubleElimination = tournament.bracket?.losers && tournament.bracket.losers.length > 0;
  
  const organizeGamesByBracket = () => {
    const winnersGames: Record<number, Game[]> = {};
    const losersGames: Record<number, Game[]> = {};
    const grandFinal: Game[] = [];
    
    finishedGames.forEach(game => {
      if (game.bracketType === 'Final') {
        grandFinal.push(game);
      } else if (game.bracketType === 'L') {
        const round = game.round;
        if (!losersGames[round]) {
          losersGames[round] = [];
        }
        losersGames[round].push(game);
      } else {
        const round = game.round;
        if (!winnersGames[round]) {
          winnersGames[round] = [];
        }
        winnersGames[round].push(game);
      }
    });
    
    return { winnersGames, losersGames, grandFinal };
  };
  
  const { winnersGames, losersGames, grandFinal } = organizeGamesByBracket();
  
  const winnersRounds = Object.keys(winnersGames)
    .map(Number)
    .sort((a, b) => a - b);
  
  const losersRounds = Object.keys(losersGames)
    .map(Number)
    .sort((a, b) => a - b);
  
  // Check if tournament is complete (final round finished)
  const isTournamentComplete = () => {
    if (!tournament.bracket) return false;
    
    // Check if grand final is finished
    if (tournament.bracket.grandFinal) {
      return tournament.bracket.grandFinal.status === 'Finished' && tournament.bracket.grandFinal.result;
    }
    
    // Check if final round of winners bracket is finished
    if (tournament.bracket.winners.length > 0) {
      const finalRound = tournament.bracket.winners[tournament.bracket.winners.length - 1];
      return finalRound.every(game => game.status === 'Finished' && game.result);
    }
    
    return false;
  };
  
  // Get champion
  const getChampion = () => {
    if (!tournament.bracket) return null;
    
    if (tournament.bracket.grandFinal && tournament.bracket.grandFinal.result) {
      const winnerId = tournament.bracket.grandFinal.result.winnerId;
      const winnerSlot = tournament.bracket.grandFinal.teamA.type === 'Team' && tournament.bracket.grandFinal.teamA.teamId === winnerId
        ? tournament.bracket.grandFinal.teamA
        : tournament.bracket.grandFinal.teamB;
      
      if (winnerSlot.type === 'Team') {
        const team = tournament.teams.find(t => t.id === winnerSlot.teamId);
        return team?.name || tournament.bracket.grandFinal.result.teamAName || tournament.bracket.grandFinal.result.teamBName;
      }
    }
    
    // Check final round of winners bracket
    if (tournament.bracket.winners.length > 0) {
      const finalRound = tournament.bracket.winners[tournament.bracket.winners.length - 1];
      const finalGame = finalRound.find(g => g.status === 'Finished' && g.result);
      if (finalGame && finalGame.result) {
        const winnerId = finalGame.result.winnerId;
        const winnerSlot = finalGame.teamA.type === 'Team' && finalGame.teamA.teamId === winnerId
          ? finalGame.teamA
          : finalGame.teamB;
        
        if (winnerSlot.type === 'Team') {
          const team = tournament.teams.find(t => t.id === winnerSlot.teamId);
          return team?.name || finalGame.result.teamAName || finalGame.result.teamBName;
        }
      }
    }
    
    return null;
  };
  
  const champion = getChampion();
  const tournamentComplete = isTournamentComplete();
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-sport-orange mb-6">Results</h2>
      
      {tournamentComplete && champion && (
        <div className="mb-8 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-xl p-6 shadow-lg">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-2">
              {champion} are the Champions!
            </h3>
            <p className="text-xl text-white/90">
              {tournament.name}
            </p>
          </div>
        </div>
      )}
      
      {finishedGames.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No games finished yet</div>
      ) : (
        <div className="space-y-8">
          {/* Winners Bracket */}
          {winnersRounds.length > 0 && (
            <div>
              {isDoubleElimination && (
                <h3 className="text-2xl font-heading uppercase tracking-wide-heading text-green-700 mb-6 pb-2 border-b-2 border-green-500" style={{ fontStyle: 'oblique' }}>
                  Winners Bracket
                </h3>
              )}
              <div className="space-y-8">
                {winnersRounds.map(round => {
                  const roundName = tournament.bracket 
                    ? getRoundNameFromGame(round, tournament.bracket.winners)
                    : `Round ${round}`;
                  
                  return (
                    <div key={`W-${round}`}>
                      <h4 className="text-xl font-semibold mb-4 text-gray-700">{roundName}</h4>
                      <div className="space-y-4">
                        {winnersGames[round].map(game => {
                          const duration = calculateGameDuration(game);
                          const teamAName = getTeamName(game.teamA, game);
                          const teamBName = getTeamName(game.teamB, game);
                          const winnerId = game.result?.winnerId;
                          const teamAId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
                          const teamBId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
                          const teamAWon = winnerId === teamAId;
                          const teamBWon = winnerId === teamBId;
                          
                          return (
                            <div key={game.id} className="card">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={`font-semibold ${teamAWon ? 'text-sport-green font-bold text-lg' : 'text-gray-700'}`}>
                                      {teamAName}
                                    </div>
                                    <span className="text-gray-400">vs</span>
                                    <div className={`font-semibold ${teamBWon ? 'text-sport-green font-bold text-lg' : 'text-gray-700'}`}>
                                      {teamBName}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {formatDurationBreakdown(duration)}
                                  </div>
                                </div>
                                {game.result && (
                                  <div className="text-right ml-4">
                                    <div className={`text-2xl font-bold ${teamAWon ? 'text-sport-green' : teamBWon ? 'text-sport-green' : 'text-gray-700'}`}>
                                      {game.result.scoreA} - {game.result.scoreB}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Losers Bracket */}
          {isDoubleElimination && losersRounds.length > 0 && (
            <div>
              <h3 className="text-2xl font-heading uppercase tracking-wide-heading text-red-700 mb-6 pb-2 border-b-2 border-red-500" style={{ fontStyle: 'oblique' }}>
                Losers Bracket
              </h3>
              <div className="space-y-8">
                {losersRounds.map(round => {
                  const roundName = tournament.bracket && tournament.bracket.losers
                    ? (() => {
                        const roundIndex = round - 1;
                        const gamesInRound = tournament.bracket.losers[roundIndex]?.length || 0;
                        return getRoundName(roundIndex, tournament.bracket.losers.length, gamesInRound);
                      })()
                    : `Round ${round}`;
                  
                  return (
                    <div key={`L-${round}`}>
                      <h4 className="text-xl font-semibold mb-4 text-gray-700">{roundName}</h4>
                      <div className="space-y-4">
                        {losersGames[round].map(game => {
                          const duration = calculateGameDuration(game);
                          const teamAName = getTeamName(game.teamA, game);
                          const teamBName = getTeamName(game.teamB, game);
                          const winnerId = game.result?.winnerId;
                          const teamAId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
                          const teamBId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
                          const teamAWon = winnerId === teamAId;
                          const teamBWon = winnerId === teamBId;
                          
                          return (
                            <div key={game.id} className="card">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={`font-semibold ${teamAWon ? 'text-sport-green font-bold text-lg' : 'text-gray-700'}`}>
                                      {teamAName}
                                    </div>
                                    <span className="text-gray-400">vs</span>
                                    <div className={`font-semibold ${teamBWon ? 'text-sport-green font-bold text-lg' : 'text-gray-700'}`}>
                                      {teamBName}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {formatDurationBreakdown(duration)}
                                  </div>
                                </div>
                                {game.result && (
                                  <div className="text-right ml-4">
                                    <div className={`text-2xl font-bold ${teamAWon ? 'text-sport-green' : teamBWon ? 'text-sport-green' : 'text-gray-700'}`}>
                                      {game.result.scoreA} - {game.result.scoreB}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Grand Final */}
          {grandFinal.length > 0 && (
            <div>
              <h3 className="text-2xl font-heading uppercase tracking-wide-heading text-accent-orange mb-6 pb-2 border-b-2 border-accent-orange" style={{ fontStyle: 'oblique' }}>
                Grand Final
              </h3>
              <div className="space-y-4">
                {grandFinal.map(game => {
                  const duration = calculateGameDuration(game);
                  const teamAName = getTeamName(game.teamA, game);
                  const teamBName = getTeamName(game.teamB, game);
                  const winnerId = game.result?.winnerId;
                  const teamAId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
                  const teamBId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
                  const teamAWon = winnerId === teamAId;
                  const teamBWon = winnerId === teamBId;
                  
                  return (
                    <div key={game.id} className="card border-2 border-accent-orange">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`font-semibold ${teamAWon ? 'text-sport-green font-bold text-lg' : 'text-gray-700'}`}>
                              {teamAName}
                            </div>
                            <span className="text-gray-400">vs</span>
                            <div className={`font-semibold ${teamBWon ? 'text-sport-green font-bold text-lg' : 'text-gray-700'}`}>
                              {teamBName}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDurationBreakdown(duration)}
                          </div>
                        </div>
                        {game.result && (
                          <div className="text-right ml-4">
                            <div className={`text-2xl font-bold ${teamAWon ? 'text-sport-green' : teamBWon ? 'text-sport-green' : 'text-gray-700'}`}>
                              {game.result.scoreA} - {game.result.scoreB}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

