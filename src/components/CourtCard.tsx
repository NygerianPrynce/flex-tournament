import { useState } from 'react';
import type { Game, Court } from '../types';
import { formatTime, calculateRemainingTime } from '../lib/timer';
import { useTournamentStore } from '../store/tournamentStore';
import { GameResultModal } from './GameResultModal';
import { OpenSlotModal } from './OpenSlotModal';

interface CourtCardProps {
  court: Court;
  game: Game | null;
  onEdit?: () => void;
  onRemove?: () => void;
  viewerMode?: boolean;
}

export function CourtCard({ court, game, onEdit, onRemove, viewerMode = false }: CourtCardProps) {
  const { tournament, finishGame, startGame, updateGame, addTeam, skipStage, assignRefToGame, getAllGames } = useTournamentStore();
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
  
  const getRefName = () => {
    if (!game?.refId || !tournament) return 'Unassigned';
    const ref = tournament.refs.find(r => r.id === game.refId);
    return ref?.name || 'Unassigned';
  };
  
  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'Warmup':
        return 'bg-yellow-100 text-yellow-800';
      case 'Live':
        return 'bg-green-100 text-green-800';
      case 'Flex':
        return 'bg-blue-100 text-blue-800';
      case 'Finished':
        return 'bg-gray-100 text-gray-800';
      case 'Paused':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-600';
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
      <div className="card border-2 border-gray-200 bg-light-off-white transition-colors">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <h3
            className="text-base sm:text-lg md:text-xl font-heading uppercase tracking-wide-heading text-accent-orange"
            style={{ fontStyle: 'oblique' }}
          >
            {court.name}
          </h3>
        </div>
        <div className="h-32 sm:h-36 md:h-40 mb-3 sm:mb-4 flex items-center justify-center bg-light-warm-gray rounded-lg">
          <div className="text-xs sm:text-sm text-dark-charcoal font-body">No game assigned</div>
        </div>
      </div>
    );
  }
  
  const isBasketball = tournament.settings.sport === 'basketball';

  return (
    <>
      <div className="card border-2 border-gray-200 bg-light-off-white transition-colors">
        <div className="flex justify-between items-start mb-3 md:mb-4">
          <h3
            className="text-lg md:text-xl font-heading uppercase tracking-wide-heading text-accent-orange"
            style={{ fontStyle: 'oblique' }}
          >
            {court.name}
          </h3>
          {game && (
            <span className={`badge ${getStatusColor(game.status)} text-xs md:text-sm`}>
              {game.timers.currentPhase === 'overtime' ? 'Overrun' : game.status}
            </span>
          )}
        </div>

        <div
          className={
            isBasketball
              ? 'court-visual-basketball h-32 md:h-40 mb-3 md:mb-4 flex items-center justify-center relative'
              : 'h-32 md:h-40 mb-3 md:mb-4 flex items-center justify-center bg-light-warm-gray rounded-lg relative'
          }
        >
          {game ? (
            <div className="text-center relative z-10 bg-white/80 backdrop-blur-sm px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm">
              <div className="text-sm sm:text-base md:text-lg font-semibold text-dark-near-black text-center truncate">{getTeamName(game.teamA)}</div>
              <div
                className="text-base sm:text-lg md:text-xl lg:text-2xl font-heading uppercase tracking-wide-heading text-accent-orange my-0.5 sm:my-1"
                style={{ fontStyle: 'oblique' }}
              >
                VS
              </div>
              <div className="text-sm sm:text-base md:text-lg font-semibold text-dark-near-black text-center truncate">{getTeamName(game.teamB)}</div>
            </div>
          ) : (
            <div className="text-xs md:text-sm text-dark-charcoal font-body relative z-10">No game assigned</div>
          )}
        </div>

        {game ? (
          <div className="space-y-3 md:space-y-4">
            {!isByeGame && game.status !== 'Queued' && game.status !== 'Finished' && (
              <div className="text-center">
                <div className="text-xs md:text-sm text-gray-600 mb-1">
                  {currentPhase === 'warmup' && 'Warmup'}
                  {currentPhase === 'game' && 'Game Time'}
                  {currentPhase === 'flex' && 'Flex Time'}
                  {currentPhase === 'overtime' && 'Overrun'}
                </div>
                <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${currentPhase === 'overtime' ? 'text-red-600' : 'text-sport-orange'}`}>
                  {currentPhase === 'overtime' ? (
                    `+${formatTime(remainingTime)}`
                  ) : (
                    formatTime(remainingTime)
                  )}
                </div>
              </div>
            )}
            
            {game.result && (
              <div className="text-center bg-gray-50 rounded p-1.5 sm:p-2">
                <div className="text-xs sm:text-sm text-gray-600">Final Score</div>
                <div className="font-semibold text-sm sm:text-base">
                  <div className="truncate">{getTeamName(game.teamA)} {game.result.scoreA}</div>
                  <div className="text-accent-orange my-0.5">-</div>
                  <div className="truncate">{game.result.scoreB} {getTeamName(game.teamB)}</div>
                </div>
                {game.result.winnerId && (
                  <div className="text-xs text-green-600 mt-1 truncate">
                    Winner: {teams.find(t => t.id === game.result!.winnerId)?.name || getTeamName(
                      game.teamA.type === 'Team' && game.teamA.teamId === game.result.winnerId ? game.teamA :
                      game.teamB.type === 'Team' && game.teamB.teamId === game.result.winnerId ? game.teamB :
                      game.teamA
                    )}
                  </div>
                )}
              </div>
            )}
            
            {tournament && tournament.refs.length > 0 && (tournament.settings.useRefs !== false) && 
             !isByeGame && (
              <div className="text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-2">
                  <span>Ref:</span>
                  {game && game.status === 'Queued' && !viewerMode ? (
                    <select
                      value={game.refId || ''}
                      onChange={(e) => {
                        assignRefToGame(game.id, e.target.value || undefined);
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sport-orange"
                    >
                      <option value="">Unassigned</option>
                      {tournament.refs
                        .filter(ref => {
                          // Only show available refs (not in use and not paused)
                          const allGames = getAllGames();
                          // Check if ref is assigned to any active game (started games)
                          const inActiveGame = allGames.some(g => 
                            g.refId === ref.id && 
                            g.id !== game.id && // Exclude current game
                            (g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused')
                          );
                          const available = ref.available !== false;
                          return !inActiveGame && available;
                        })
                        .map(ref => (
                          <option key={ref.id} value={ref.id}>
                            {ref.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className={game?.refId ? '' : 'text-red-600 font-semibold'}>{getRefName()}</span>
                  )}
                </div>
              </div>
            )}
            
            {!viewerMode && (
              <div className="flex gap-1 flex-wrap w-full">
              {game.status === 'Queued' && (
                <>
                  <button
                    className="btn-primary flex-1 min-w-[60px]"
                    onClick={handleStart}
                  >
                    Start
                  </button>
                  {onEdit && (
                    <button
                      className="btn-secondary flex-1 min-w-[50px]"
                      onClick={onEdit}
                    >
                      Edit
                    </button>
                  )}
                  {onRemove && (
                    <button
                      className="btn-secondary flex-1 min-w-[60px] text-red-600 hover:bg-red-50"
                      onClick={onRemove}
                    >
                      Remove
                    </button>
                  )}
                </>
              )}
              {(game.status === 'Warmup' || game.status === 'Live' || game.status === 'Flex') && (
                <>
                  <button
                    className="btn-secondary flex-1 min-w-[50px]"
                    onClick={() => useTournamentStore.getState().pauseGame(game.id)}
                  >
                    Pause
                  </button>
                  {currentPhase !== 'overtime' && !(currentPhase === 'game' && tournament.settings.flexMinutes === 0) && (
                    <button
                      className="btn-secondary flex-1 min-w-[55px]"
                      onClick={() => skipStage(game.id)}
                    >
                      Skip
                    </button>
                  )}
                  <button
                    className="btn-primary flex-1 min-w-[50px]"
                    onClick={handleFinish}
                  >
                    End
                  </button>
                  <button
                    className="btn-secondary flex-1 min-w-[60px]"
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
                  >
                    Restart
                  </button>
                </>
              )}
              {game.status === 'Paused' && (
                <button
                  className="btn-primary flex-1 min-w-[70px]"
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
                >
                  Resume
                </button>
              )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No game assigned
          </div>
        )}
      </div>
      
      {!viewerMode && showResultModal && game && (
        <GameResultModal
          game={game}
          teams={teams}
          onClose={() => setShowResultModal(false)}
          onSave={handleResultSave}
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
