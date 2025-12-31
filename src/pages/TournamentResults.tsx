import { useTournamentStore } from '../store/tournamentStore';
import type { Game, Tournament } from '../types';
import { formatTime } from '../lib/timer';
import { getRoundNameFromGame, getRoundName, getLosersRoundName } from '../lib/roundNames';
import {
  Layout,
  Typography,
  Card,
  Tag,
  Space,
  Divider,
} from 'antd';
import {
  TrophyOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

interface TournamentResultsProps {
  tournament?: Tournament;
  viewerMode?: boolean;
}

export function TournamentResults({ tournament: propTournament, viewerMode: _viewerMode = false }: TournamentResultsProps = {} as TournamentResultsProps) {
  // Use selector to ensure component subscribes to tournament changes
  const storeTournament = useTournamentStore(state => state.tournament);
  const getAllGames = useTournamentStore(state => state.getAllGames);
  const tournament = propTournament || storeTournament;
  
  if (!tournament) {
    return <div style={{ padding: '32px' }}>No tournament loaded</div>;
  }
  
  // Call getAllGames with tournament to ensure we get fresh data
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
    let grandFinalResetGame: Game | null = null;
    
    finishedGames.forEach(game => {
      if (game.bracketType === 'Final') {
        if (game.id === 'grand-final-reset' || game.id.startsWith('grand-final-reset-')) {
          // Grand Final Reset - include it if it's finished
          grandFinalResetGame = game;
        } else {
          grandFinal.push(game);
        }
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
    
    // Also check bracket directly in case it's not in finishedGames yet (shouldn't happen, but safety check)
    if (!grandFinalResetGame && tournament.bracket?.grandFinalReset) {
      const resetGame = tournament.bracket.grandFinalReset;
      if (resetGame.status === 'Finished' && resetGame.result) {
        grandFinalResetGame = resetGame;
      }
    }
    
    return { winnersGames, losersGames, grandFinal, grandFinalReset: grandFinalResetGame };
  };
  
  const { winnersGames, losersGames, grandFinal, grandFinalReset } = organizeGamesByBracket();
  
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
      const gf = tournament.bracket.grandFinal;
      if (gf.status === 'Finished' && gf.result) {
        // Check if losers bracket champion won (teamB) - if so, reset game is needed
        const winnerCameFromLosers = gf.teamB.type === 'Team' && gf.teamB.teamId === gf.result.winnerId;
        
        if (winnerCameFromLosers) {
          // Losers bracket champion won - check if reset game exists and is finished
          if (tournament.bracket.grandFinalReset) {
            return tournament.bracket.grandFinalReset.status === 'Finished' && tournament.bracket.grandFinalReset.result;
          }
          // Reset game should exist but doesn't - tournament not complete yet
          return false;
        } else {
          // Winners bracket champion won - no reset needed, tournament is complete
          return true;
        }
      }
      // Grand final not finished yet
      return false;
    }
    
    // Check if final round of winners bracket is finished (single elimination)
    if (tournament.bracket.winners.length > 0) {
      const finalRound = tournament.bracket.winners[tournament.bracket.winners.length - 1];
      return finalRound.every(game => game.status === 'Finished' && game.result);
    }
    
    return false;
  };
  
  // Get champion
  const getChampion = () => {
    if (!tournament.bracket) return null;
    
    // Check grand final reset first (if it exists and is finished, it's the true champion)
    if (tournament.bracket.grandFinalReset && 
        tournament.bracket.grandFinalReset.status === 'Finished' && 
        tournament.bracket.grandFinalReset.result) {
      const winnerId = tournament.bracket.grandFinalReset.result.winnerId;
      const winnerSlot = tournament.bracket.grandFinalReset.teamA.type === 'Team' && tournament.bracket.grandFinalReset.teamA.teamId === winnerId
        ? tournament.bracket.grandFinalReset.teamA
        : tournament.bracket.grandFinalReset.teamB;
      
      if (winnerSlot.type === 'Team') {
        const team = tournament.teams.find(t => t.id === winnerSlot.teamId);
        return team?.name || tournament.bracket.grandFinalReset.result.teamAName || tournament.bracket.grandFinalReset.result.teamBName;
      }
    }
    
    // Check grand final (only if reset wasn't played or reset doesn't exist)
    if (tournament.bracket.grandFinal && tournament.bracket.grandFinal.result) {
      // Only use grand final winner if winners bracket champion won (no reset needed)
      const gf = tournament.bracket.grandFinal;
      const winnerCameFromLosers = gf.teamB.type === 'Team' && gf.teamB.teamId === gf.result.winnerId;
      
      // If losers bracket champion won, we should have a reset game - don't use grand final winner
      // Also check if reset exists but isn't finished yet - don't show champion
      if (!winnerCameFromLosers) {
        const winnerId = gf.result.winnerId;
        const winnerSlot = gf.teamA.type === 'Team' && gf.teamA.teamId === winnerId
          ? gf.teamA
          : gf.teamB;
        
        if (winnerSlot.type === 'Team') {
          const team = tournament.teams.find(t => t.id === winnerSlot.teamId);
          return team?.name || gf.result.teamAName || gf.result.teamBName;
        }
      } else {
        // Losers bracket champion won - if reset exists but isn't finished, don't show champion yet
        if (tournament.bracket.grandFinalReset && 
            tournament.bracket.grandFinalReset.status !== 'Finished') {
          return null;
        }
      }
    }
    
    // Check final round of winners bracket (single elimination)
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
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ 
            margin: 0, 
            fontWeight: 700, 
            fontSize: '32px',
            color: '#f97316',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <TrophyOutlined style={{ marginRight: '12px' }} />
            Results
          </Title>
        </div>
        
        {tournamentComplete && champion && (
          <Card
            style={{
              marginBottom: '32px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #fbbf24 100%)',
              border: 'none',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
            }}
            bodyStyle={{ padding: '32px' }}
          >
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ 
                margin: 0, 
                color: '#fff', 
                fontSize: '36px',
                fontWeight: 800,
                marginBottom: '8px',
              }}>
                {champion} are the Champions!
              </Title>
              <Text style={{ color: '#fff', fontSize: '18px', opacity: 0.95 }}>
                {tournament.name}
              </Text>
            </div>
          </Card>
        )}
        
        {finishedGames.length === 0 ? (
          <Card
            style={{
              borderRadius: '12px',
              textAlign: 'center',
              padding: '48px 24px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '16px' }}>
              No games finished yet
            </Text>
          </Card>
        ) : (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            {/* Winners Bracket */}
            {winnersRounds.length > 0 && (
              <Card
                style={{
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                {isDoubleElimination && (
                  <Title level={3} style={{ 
                    marginBottom: '24px', 
                    fontSize: '24px', 
                    fontWeight: 700,
                    color: '#16a34a',
                    borderBottom: '2px solid #16a34a',
                    paddingBottom: '12px',
                  }}>
                    Winners Bracket
                  </Title>
                )}
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  {winnersRounds.map(round => {
                    const roundName = tournament.bracket 
                      ? getRoundNameFromGame(round, tournament.bracket.winners)
                      : `Round ${round}`;
                    
                    return (
                      <div key={`W-${round}`}>
                        <Title level={4} style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                          {roundName}
                        </Title>
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
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
                              <Card
                                key={game.id}
                                style={{
                                  borderRadius: '12px',
                                  border: teamAWon || teamBWon ? '2px solid #16a34a' : '1px solid #e5e7eb',
                                  background: teamAWon || teamBWon ? '#f0fdf4' : '#fff',
                                }}
                                bodyStyle={{ padding: '16px' }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
                                  <div style={{ flex: 1, minWidth: '200px' }}>
                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                      <Space size={8} wrap>
                                        <Text strong={teamAWon} style={{ 
                                          fontSize: '16px',
                                          color: teamAWon ? '#16a34a' : '#374151',
                                          fontWeight: teamAWon ? 700 : 600,
                                        }}>
                                          {teamAName}
                                        </Text>
                                        <Text type="secondary">vs</Text>
                                        <Text strong={teamBWon} style={{ 
                                          fontSize: '16px',
                                          color: teamBWon ? '#16a34a' : '#374151',
                                          fontWeight: teamBWon ? 700 : 600,
                                        }}>
                                          {teamBName}
                                        </Text>
                                      </Space>
                                      <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {formatDurationBreakdown(duration)}
                                      </Text>
                                    </Space>
                                  </div>
                                  {game.result && (
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      {tournament.settings.scoringRequired !== false ? (
                                        <>
                                          <Text strong style={{ 
                                            fontSize: '28px',
                                            fontWeight: 700,
                                            color: teamAWon || teamBWon ? '#16a34a' : '#374151',
                                            display: 'block',
                                          }}>
                                            {game.result.scoreA} - {game.result.scoreB}
                                          </Text>
                                          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                            {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                          </Text>
                                        </>
                                      ) : (
                                        <Text strong style={{ 
                                          fontSize: '20px',
                                          fontWeight: 700,
                                          color: teamAWon || teamBWon ? '#16a34a' : '#374151',
                                          display: 'block',
                                        }}>
                                          {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                        </Text>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            );
                          })}
                        </Space>
                        {round < winnersRounds[winnersRounds.length - 1] && (
                          <Divider style={{ margin: '20px 0' }} />
                        )}
                      </div>
                    );
                  })}
                </Space>
              </Card>
            )}
            
            {/* Losers Bracket */}
            {isDoubleElimination && losersRounds.length > 0 && (
              <Card
                style={{
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Title level={3} style={{ 
                  marginBottom: '24px', 
                  fontSize: '24px', 
                  fontWeight: 700,
                  color: '#dc2626',
                  borderBottom: '2px solid #dc2626',
                  paddingBottom: '12px',
                }}>
                  Losers Bracket
                </Title>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  {losersRounds.map(round => {
                    const roundName = tournament.bracket && tournament.bracket.losers
                      ? (() => {
                          const roundIndex = round - 1;
                          const gamesInRound = tournament.bracket.losers[roundIndex]?.length || 0;
                          return getLosersRoundName(roundIndex, tournament.bracket.losers.length, gamesInRound);
                        })()
                      : `Round ${round}`;
                    
                    return (
                      <div key={`L-${round}`}>
                        <Title level={4} style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                          {roundName}
                        </Title>
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
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
                              <Card
                                key={game.id}
                                style={{
                                  borderRadius: '12px',
                                  border: teamAWon || teamBWon ? '2px solid #16a34a' : '1px solid #e5e7eb',
                                  background: teamAWon || teamBWon ? '#f0fdf4' : '#fff',
                                }}
                                bodyStyle={{ padding: '16px' }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
                                  <div style={{ flex: 1, minWidth: '200px' }}>
                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                      <Space size={8} wrap>
                                        <Text strong={teamAWon} style={{ 
                                          fontSize: '16px',
                                          color: teamAWon ? '#16a34a' : '#374151',
                                          fontWeight: teamAWon ? 700 : 600,
                                        }}>
                                          {teamAName}
                                        </Text>
                                        <Text type="secondary">vs</Text>
                                        <Text strong={teamBWon} style={{ 
                                          fontSize: '16px',
                                          color: teamBWon ? '#16a34a' : '#374151',
                                          fontWeight: teamBWon ? 700 : 600,
                                        }}>
                                          {teamBName}
                                        </Text>
                                      </Space>
                                      <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {formatDurationBreakdown(duration)}
                                      </Text>
                                    </Space>
                                  </div>
                                  {game.result && (
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      {tournament.settings.scoringRequired !== false ? (
                                        <>
                                          <Text strong style={{ 
                                            fontSize: '28px',
                                            fontWeight: 700,
                                            color: teamAWon || teamBWon ? '#16a34a' : '#374151',
                                            display: 'block',
                                          }}>
                                            {game.result.scoreA} - {game.result.scoreB}
                                          </Text>
                                          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                            {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                          </Text>
                                        </>
                                      ) : (
                                        <Text strong style={{ 
                                          fontSize: '20px',
                                          fontWeight: 700,
                                          color: teamAWon || teamBWon ? '#16a34a' : '#374151',
                                          display: 'block',
                                        }}>
                                          {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                        </Text>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            );
                          })}
                        </Space>
                        {round < losersRounds[losersRounds.length - 1] && (
                          <Divider style={{ margin: '20px 0' }} />
                        )}
                      </div>
                    );
                  })}
                </Space>
              </Card>
            )}
            
            {/* Grand Final */}
            {grandFinal.length > 0 && (
              <Card
                style={{
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '2px solid #f97316',
                  background: '#fff7ed',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Title level={3} style={{ 
                  marginBottom: '24px', 
                  fontSize: '24px', 
                  fontWeight: 700,
                  color: '#f97316',
                  borderBottom: '2px solid #f97316',
                  paddingBottom: '12px',
                }}>
                  Grand Final
                </Title>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
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
                      <Card
                        key={game.id}
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #f97316',
                          background: teamAWon || teamBWon ? '#fff7ed' : '#fff',
                        }}
                        bodyStyle={{ padding: '20px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                              <Space size={8} wrap>
                                <Text strong={teamAWon} style={{ 
                                  fontSize: '18px',
                                  color: teamAWon ? '#f97316' : '#374151',
                                  fontWeight: teamAWon ? 700 : 600,
                                }}>
                                  {teamAName}
                                </Text>
                                <Text type="secondary" style={{ fontSize: '16px' }}>vs</Text>
                                <Text strong={teamBWon} style={{ 
                                  fontSize: '18px',
                                  color: teamBWon ? '#f97316' : '#374151',
                                  fontWeight: teamBWon ? 700 : 600,
                                }}>
                                  {teamBName}
                                </Text>
                              </Space>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {formatDurationBreakdown(duration)}
                              </Text>
                            </Space>
                          </div>
                          {game.result && (
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              {tournament.settings.scoringRequired !== false ? (
                                <>
                                  <Text strong style={{ 
                                    fontSize: '32px',
                                    fontWeight: 700,
                                    color: teamAWon || teamBWon ? '#f97316' : '#374151',
                                    display: 'block',
                                  }}>
                                    {game.result.scoreA} - {game.result.scoreB}
                                  </Text>
                                  <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginTop: '4px' }}>
                                    {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                  </Text>
                                </>
                              ) : (
                                <Text strong style={{ 
                                  fontSize: '24px',
                                  fontWeight: 700,
                                  color: teamAWon || teamBWon ? '#f97316' : '#374151',
                                  display: 'block',
                                }}>
                                  {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                </Text>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </Space>
              </Card>
            )}
            
            {/* Grand Final Reset */}
            {grandFinalReset && (
              <Card
                style={{
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '2px solid #f97316',
                  background: '#fff7ed',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <Title level={3} style={{ 
                  marginBottom: '24px', 
                  fontSize: '24px', 
                  fontWeight: 700,
                  color: '#f97316',
                  borderBottom: '2px solid #f97316',
                  paddingBottom: '12px',
                }}>
                  Grand Final Reset
                </Title>
                {(() => {
                  const game = grandFinalReset;
                  const duration = calculateGameDuration(game);
                  const teamAName = getTeamName(game.teamA, game);
                  const teamBName = getTeamName(game.teamB, game);
                  const winnerId = game.result?.winnerId;
                  const teamAId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
                  const teamBId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
                  const teamAWon = winnerId === teamAId;
                  const teamBWon = winnerId === teamBId;
                  
                  return (
                    <Card
                      key={game.id}
                      style={{
                        borderRadius: '12px',
                        border: '2px solid #f97316',
                        background: teamAWon || teamBWon ? '#fff7ed' : '#fff',
                      }}
                      bodyStyle={{ padding: '20px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Space size={8} wrap>
                              <Text strong={teamAWon} style={{ 
                                fontSize: '18px',
                                color: teamAWon ? '#f97316' : '#374151',
                                fontWeight: teamAWon ? 700 : 600,
                              }}>
                                {teamAName}
                              </Text>
                              <Text type="secondary" style={{ fontSize: '16px' }}>vs</Text>
                              <Text strong={teamBWon} style={{ 
                                fontSize: '18px',
                                color: teamBWon ? '#f97316' : '#374151',
                                fontWeight: teamBWon ? 700 : 600,
                              }}>
                                {teamBName}
                              </Text>
                            </Space>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {formatDurationBreakdown(duration)}
                            </Text>
                          </Space>
                        </div>
                        {game.result && (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {tournament.settings.scoringRequired !== false ? (
                              <>
                                <Text strong style={{ 
                                  fontSize: '32px',
                                  fontWeight: 700,
                                  color: teamAWon || teamBWon ? '#f97316' : '#374151',
                                  display: 'block',
                                }}>
                                  {game.result.scoreA} - {game.result.scoreB}
                                </Text>
                                <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginTop: '4px' }}>
                                  {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                                </Text>
                              </>
                            ) : (
                              <Text strong style={{ 
                                fontSize: '24px',
                                fontWeight: 700,
                                color: teamAWon || teamBWon ? '#f97316' : '#374151',
                                display: 'block',
                              }}>
                                {teamAWon ? teamAName : teamBWon ? teamBName : ''} won
                              </Text>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })()}
              </Card>
            )}
          </Space>
        )}
      </Content>
    </Layout>
  );
}
