import { useState } from 'react';
import type { Game, Court } from '../types';
import { formatTime, calculateRemainingTime } from '../lib/timer';
import { useTournamentStore } from '../store/tournamentStore';
import { GameResultModal } from './GameResultModal';
import { OpenSlotModal } from './OpenSlotModal';
import { getRoundNameFromGame, getLosersRoundName } from '../lib/roundNames';
import { Card, Typography, Button, Tag, Space, Select } from 'antd';

const { Title, Text } = Typography;

interface CourtCardProps {
  court: Court;
  game: Game | null;
  onEdit?: () => void;
  onRemove?: () => void;
  viewerMode?: boolean;
  tournamentComplete?: boolean;
}

export function CourtCard({ court, game, onEdit, onRemove, viewerMode = false, tournamentComplete = false }: CourtCardProps) {
  const { tournament, finishGame, startGame, updateGame, addTeam, skipStage, assignRefToGame, assignRefsToGame, getAllGames } = useTournamentStore();
  const [showResultModal, setShowResultModal] = useState(false);
  const [showOpenSlotModal, setShowOpenSlotModal] = useState(false);
  const teams = tournament?.teams || [];
  
  const getTeamName = (slot: Game['teamA']) => {
    if (slot.type === 'Team' && slot.teamId) {
      return teams.find(t => t.id === slot.teamId)?.name || 'Unknown';
    }
    if (slot.type === 'BYE') return 'BYE';
    if (slot.type === 'OPEN') return 'OPEN';
    return 'TBD';
  };
  
  const getRefNames = () => {
    if (!game || !tournament) return [];
    const refIds = game.refIds || (game.refId ? [game.refId] : []);
    return refIds.map(id => {
      const ref = tournament.refs.find(r => r.id === id);
      return ref?.name || 'Unknown';
    });
  };
  
  const getRefName = () => {
    const names = getRefNames();
    if (names.length === 0) return 'Unassigned';
    return names.join(', ');
  };
  
  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'Warmup':
        return 'warning';
      case 'Live':
        return 'success';
      case 'Flex':
        return 'processing';
      case 'Finished':
        return 'default';
      case 'Paused':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const remainingTime = game && tournament ? calculateRemainingTime(
    game.timers,
    tournament.settings.warmupMinutes * 60,
    tournament.settings.gameLengthMinutes * 60,
    tournament.settings.flexMinutes * 60
  ) : 0;
  const currentPhase = game?.timers.currentPhase || 'idle';
  
  const isByeGame = game && (game.teamA.type === 'BYE' || game.teamB.type === 'BYE');
  
  // Get round name with bracket type
  const getRoundNameWithBracket = () => {
    if (!game || !tournament?.bracket) return '';
    
    if (game.bracketType === 'Final') {
      // Check if it's the reset game
      if (game.id === 'grand-final-reset') {
        return 'Grand Final Reset';
      }
      return 'Grand Final';
    }
    
    const isDoubleElimination = tournament.settings.includeLosersBracket;
    const bracketType = game.bracketType === 'L' ? 'Losers Bracket' : (isDoubleElimination ? 'Winners Bracket' : '');
    let roundName: string;
    
    if (game.bracketType === 'L' && tournament.bracket.losers) {
      // For losers bracket, use losers-specific round naming
      const roundIndex = game.round - 1;
      if (roundIndex >= 0 && roundIndex < tournament.bracket.losers.length) {
        const gamesInRound = tournament.bracket.losers[roundIndex]?.length || 0;
        roundName = getLosersRoundName(roundIndex, tournament.bracket.losers.length, gamesInRound);
      } else {
        roundName = `Round ${game.round}`;
      }
    } else {
      // For winners bracket
      roundName = getRoundNameFromGame(game.round, tournament.bracket.winners);
    }
    
    return bracketType ? `${bracketType} - ${roundName}` : roundName;
  };
  
  const handleStart = () => {
    if (!game || !tournament) return;
    
    // Check for OPEN slots
    if (game.teamA.type === 'OPEN' || game.teamB.type === 'OPEN') {
      if (tournament.settings.openSlotPolicy === 'OPEN') {
        setShowOpenSlotModal(true);
        return;
      }
    }
    
    // Check for BYE
    if (isByeGame) {
      // BYE game - auto-win with score 1-0
      const winnerId = game.teamA.type === 'BYE' 
        ? (game.teamB.type === 'Team' ? game.teamB.teamId! : '')
        : (game.teamA.type === 'Team' ? game.teamA.teamId! : '');
      
      if (winnerId) {
        // Score is 1-0: non-BYE team gets 1, BYE gets 0
        const scoreA = game.teamA.type === 'BYE' ? 0 : 1;
        const scoreB = game.teamB.type === 'BYE' ? 0 : 1;
        finishGame(game.id, winnerId, scoreA, scoreB);
      }
      return;
    }
    
    startGame(game.id);
  };
  
  const handleFinish = () => {
    if (!game) return;
    setShowResultModal(true);
  };
  
  const handleResultSave = (winnerId: string, scoreA: number, scoreB: number) => {
    if (!game) return;
    finishGame(game.id, winnerId, scoreA, scoreB);
    setShowResultModal(false);
    // Game will be removed from court automatically
  };
  
  const handleOpenSlotResolve = (teamName: string, isBye: boolean) => {
    if (!game || !tournament) return;
    
    if (isBye) {
      // Convert OPEN to BYE and auto-win
      const otherTeamId = game.teamA.type === 'OPEN' 
        ? (game.teamB.type === 'Team' ? game.teamB.teamId : undefined)
        : (game.teamA.type === 'Team' ? game.teamA.teamId : undefined);
      
      if (game.teamA.type === 'OPEN') {
        updateGame(game.id, { teamA: { type: 'BYE' } });
      } else {
        updateGame(game.id, { teamB: { type: 'BYE' } });
      }
      
      if (otherTeamId) {
        finishGame(game.id, otherTeamId, 0, 0);
      }
    } else {
      // Add new team
      const newTeam = {
        id: `team-${Date.now()}-${Math.random()}`,
        name: teamName,
      };
      addTeam(newTeam);
      
      if (game.teamA.type === 'OPEN') {
        updateGame(game.id, { teamA: { type: 'Team', teamId: newTeam.id } });
      } else {
        updateGame(game.id, { teamB: { type: 'Team', teamId: newTeam.id } });
      }
      
      // Now start the game
      startGame(game.id);
    }
    
    setShowOpenSlotModal(false);
  };
  
  if (!tournament) {
    // Fallback rendering if tournament is not loaded yet
    return (
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
        }}
        bodyStyle={{ padding: '20px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f97316' }}>
            {court.name}
          </Title>
        </div>
        <div style={{ 
          height: '160px', 
          marginBottom: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#f3f4f6', 
          borderRadius: '12px' 
        }}>
          {!tournamentComplete && (
            <Text type="secondary" style={{ fontSize: '14px' }}>No game assigned</Text>
          )}
        </div>
      </Card>
    );
  }
  
  const isBasketball = tournament.settings.sport === 'basketball';

  return (
    <>
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.2s ease',
        }}
        bodyStyle={{ padding: '20px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f97316' }}>
              {court.name}
            </Title>
            {game && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px', fontWeight: 500 }}>
                {getRoundNameWithBracket()}
              </Text>
            )}
          </div>
          {game && (
            <Tag color={getStatusColor(game.status)} style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>
              {game.timers.currentPhase === 'overtime' ? 'Overrun' : game.status}
            </Tag>
          )}
        </div>

        <div
          style={{
            height: '160px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6',
            borderRadius: '12px',
            position: 'relative',
            border: '1px solid #e5e7eb',
          }}
        >
          {game ? (
            <div style={{
              textAlign: 'center',
              position: 'relative',
              zIndex: 10,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '12px 16px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              minWidth: '200px',
            }}>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                {getTeamName(game.teamA)}
              </Text>
              <Text strong style={{ 
                fontSize: '18px', 
                color: '#f97316', 
                fontWeight: 700, 
                display: 'block', 
                margin: '4px 0' 
              }}>
                VS
              </Text>
              <Text strong style={{ fontSize: '16px', display: 'block', marginTop: '8px' }}>
                {getTeamName(game.teamB)}
              </Text>
            </div>
          ) : (
            !tournamentComplete && (
              <Text type="secondary" style={{ fontSize: '14px', position: 'relative', zIndex: 10 }}>
                No game assigned
              </Text>
            )
          )}
        </div>

        {game ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {!isByeGame && game.status !== 'Queued' && game.status !== 'Finished' && (
              <div style={{ textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '12px' }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  {currentPhase === 'warmup' && 'Warmup'}
                  {currentPhase === 'game' && 'Game Time'}
                  {currentPhase === 'flex' && 'Flex Time'}
                  {currentPhase === 'overtime' && 'Overrun'}
                </Text>
                <Text style={{ 
                  fontSize: '32px', 
                  fontWeight: 700, 
                  color: currentPhase === 'overtime' ? '#dc2626' : '#f97316',
                  display: 'block',
                }}>
                  {currentPhase === 'overtime' ? (
                    `+${formatTime(remainingTime)}`
                  ) : (
                    formatTime(remainingTime)
                  )}
                </Text>
              </div>
            )}
            
            {game.result && (
              <div style={{ 
                textAlign: 'center', 
                background: '#f3f4f6', 
                borderRadius: '12px', 
                padding: '12px' 
              }}>
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  Final Score
                </Text>
                <div>
                  <Text strong style={{ fontSize: '14px', display: 'block' }}>
                    {getTeamName(game.teamA)} {game.result.scoreA}
                  </Text>
                  <Text strong style={{ fontSize: '14px', color: '#f97316', display: 'block', margin: '4px 0' }}>
                    -
                  </Text>
                  <Text strong style={{ fontSize: '14px', display: 'block' }}>
                    {game.result.scoreB} {getTeamName(game.teamB)}
                  </Text>
                </div>
                {game.result.winnerId && (
                  <Text style={{ 
                    fontSize: '12px', 
                    color: '#16a34a', 
                    display: 'block', 
                    marginTop: '8px',
                    fontWeight: 600,
                  }}>
                    Winner: {teams.find(t => t.id === game.result!.winnerId)?.name || getTeamName(
                      game.teamA.type === 'Team' && game.teamA.teamId === game.result.winnerId ? game.teamA :
                      game.teamB.type === 'Team' && game.teamB.teamId === game.result.winnerId ? game.teamB :
                      game.teamA
                    )}
                  </Text>
                )}
              </div>
            )}
            
            {tournament && tournament.refs.length > 0 && (tournament.settings.useRefs !== false) && 
             !isByeGame && (
              <div>
                <Text style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '8px' }}>
                  Ref{(() => {
                    const refereesPerGame = tournament.settings.refereesPerGame ?? 0;
                    return refereesPerGame > 1 ? 's' : '';
                  })()}:
                </Text>
                {game && game.status === 'Queued' && !viewerMode ? (
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {(() => {
                      const refereesPerGame = tournament.settings.refereesPerGame ?? 0;
                      const currentRefIds = game.refIds || (game.refId ? [game.refId] : []);
                      const allGames = getAllGames();
                      
                      // Get available refs (not in active games and not paused)
                      const activeRefIds = new Set<string>();
                      allGames.forEach(g => {
                        if (g.id !== game.id && (g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused')) {
                          const refIds = g.refIds || (g.refId ? [g.refId] : []);
                          refIds.forEach(id => activeRefIds.add(id));
                        }
                      });
                      
                      const availableRefs = tournament.refs.filter(r => 
                        !activeRefIds.has(r.id) && 
                        (r.available !== false)
                      );
                      
                      return Array.from({ length: refereesPerGame }, (_, index) => {
                        const currentRefId = currentRefIds[index];
                        return (
                          <Select
                            key={index}
                            value={currentRefId || undefined}
                            onChange={(value) => {
                              const newRefIds = [...currentRefIds];
                              if (value) {
                                newRefIds[index] = value;
                              } else {
                                newRefIds.splice(index, 1);
                              }
                              // Remove duplicates and empty values
                              const uniqueRefIds = Array.from(new Set(newRefIds.filter(id => id)));
                              assignRefsToGame(game.id, uniqueRefIds);
                            }}
                            placeholder="Unassigned"
                            style={{ width: '100%' }}
                            size="small"
                          >
                            {availableRefs
                              .filter(ref => {
                                // Don't show refs already assigned to this game (except at this index)
                                const alreadyAssigned = currentRefIds.some((id, idx) => id === ref.id && idx !== index);
                                return !alreadyAssigned;
                              })
                              .map(ref => (
                                <Select.Option key={ref.id} value={ref.id}>
                                  {ref.name}
                                </Select.Option>
                              ))}
                          </Select>
                        );
                      });
                    })()}
                  </Space>
                ) : (
                  <Text style={{
                    fontSize: '13px',
                    color: (() => {
                      const currentRefIds = game?.refIds || (game?.refId ? [game.refId] : []);
                      const refereesPerGame = tournament.settings.refereesPerGame ?? 0;
                      const isComplete = currentRefIds.length >= refereesPerGame;
                      return isComplete ? '#6b7280' : '#dc2626';
                    })(),
                    fontWeight: (() => {
                      const currentRefIds = game?.refIds || (game?.refId ? [game.refId] : []);
                      const refereesPerGame = tournament.settings.refereesPerGame ?? 0;
                      const isComplete = currentRefIds.length >= refereesPerGame;
                      return isComplete ? 400 : 600;
                    })(),
                  }}>
                    {getRefName() || 'Unassigned'}
                  </Text>
                )}
              </div>
            )}
            
            {!viewerMode && !tournamentComplete && (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {game.status === 'Queued' && (
                    <Space size={8} style={{ width: '100%', justifyContent: 'center' }} wrap>
                      <Button
                        type="primary"
                        onClick={handleStart}
                        style={{
                          borderRadius: '8px',
                          fontSize: '14px',
                          height: '40px',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                        }}
                      >
                        Start
                      </Button>
                      {onEdit && (
                        <Button
                          onClick={onEdit}
                          style={{
                            borderRadius: '8px',
                            fontSize: '14px',
                            height: '40px',
                            fontWeight: 600,
                          }}
                        >
                          Edit
                        </Button>
                      )}
                      {onRemove && (
                        <Button
                          danger
                          onClick={onRemove}
                          style={{
                            borderRadius: '8px',
                            fontSize: '14px',
                            height: '40px',
                            fontWeight: 600,
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </Space>
                  )}
                  {(game.status === 'Warmup' || game.status === 'Live' || game.status === 'Flex') && (
                    <Space size={8} style={{ width: '100%', justifyContent: 'center' }} wrap>
                      <Button
                        onClick={() => useTournamentStore.getState().pauseGame(game.id)}
                        style={{
                          borderRadius: '8px',
                          fontSize: '14px',
                          height: '40px',
                          fontWeight: 600,
                        }}
                      >
                        Pause
                      </Button>
                      {currentPhase !== 'overtime' && !(currentPhase === 'game' && tournament.settings.flexMinutes === 0) && (
                        <Button
                          onClick={() => skipStage(game.id)}
                          style={{
                            borderRadius: '8px',
                            fontSize: '14px',
                            height: '40px',
                            fontWeight: 600,
                          }}
                        >
                          Next
                        </Button>
                      )}
                      <Button
                        type="primary"
                        onClick={handleFinish}
                        style={{
                          borderRadius: '8px',
                          fontSize: '14px',
                          height: '40px',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                        }}
                      >
                        End
                      </Button>
                      <Button
                        onClick={() => {
                          if (!tournament) return;
                          // Reset game to Queued status with fresh timers (same state as when first assigned to court)
                          updateGame(game.id, {
                            status: 'Queued',
                            timers: {
                              warmupRemaining: tournament.settings.warmupMinutes * 60,
                              gameRemaining: tournament.settings.gameLengthMinutes * 60,
                              flexRemaining: tournament.settings.flexMinutes * 60,
                              currentPhase: 'idle',
                              startedAt: undefined,
                              pausedAt: undefined,
                              totalPausedTime: 0,
                            },
                          });
                        }}
                        style={{
                          borderRadius: '8px',
                          fontSize: '14px',
                          height: '40px',
                          fontWeight: 600,
                        }}
                      >
                        Restart
                      </Button>
                    </Space>
                  )}
                {game.status === 'Paused' && (
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <Button
                      type="primary"
                      onClick={() => {
                        const now = Date.now();
                        const pausedTime = game.timers.pausedAt ? now - game.timers.pausedAt : 0;
                        useTournamentStore.getState().updateGameTimer(game.id, {
                          pausedAt: undefined,
                          totalPausedTime: game.timers.totalPausedTime + pausedTime,
                        });
                        useTournamentStore.getState().updateGame(game.id, {
                          status: game.timers.currentPhase === 'warmup' ? 'Warmup' :
                                  game.timers.currentPhase === 'game' ? 'Live' : 
                                  game.timers.currentPhase === 'overtime' ? 'Flex' : 'Flex',
                        });
                      }}
                      style={{
                        borderRadius: '8px',
                        fontSize: '14px',
                        height: '40px',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                      }}
                    >
                      Resume
                    </Button>
                  </div>
                )}
                </Space>
              </div>
            )}
          </Space>
        ) : null}
      </Card>
      
      {!viewerMode && showResultModal && game && (
        <GameResultModal
          game={game}
          teams={teams}
          onClose={() => setShowResultModal(false)}
          onSave={handleResultSave}
          scoringRequired={tournament?.settings.scoringRequired !== false}
        />
      )}
      
      {!viewerMode && showOpenSlotModal && game && (
        <OpenSlotModal
          teamName={game.teamA.type === 'OPEN' ? getTeamName(game.teamA) : getTeamName(game.teamB)}
          onAddTeam={(name) => handleOpenSlotResolve(name, false)}
          onAssignBye={() => handleOpenSlotResolve('', true)}
          onCancel={() => setShowOpenSlotModal(false)}
        />
      )}
    </>
  );
}
