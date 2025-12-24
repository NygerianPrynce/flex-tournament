import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CourtCard } from '../components/CourtCard';
import { useTournamentStore } from '../store/tournamentStore';
import type { Game, Tournament } from '../types';
import { updateGameTimers } from '../lib/timer';
import { getRoundNameFromGame, getRoundName } from '../lib/roundNames';
import { useSport } from '../hooks/useSport';

interface TournamentCourtsProps {
  tournament?: Tournament;
  viewerMode?: boolean;
}

function GamePoolItem({ game, teams, tournament, viewerMode = false }: { game: Game; teams: { id: string; name: string }[]; tournament: any; viewerMode?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: game.id,
    disabled: viewerMode // Disable dragging in viewer mode
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const getTeamName = (slot: Game['teamA']) => {
    if (slot.type === 'Team' && slot.teamId) {
      return teams.find(t => t.id === slot.teamId)?.name || 'Unknown';
    }
    if (slot.type === 'BYE') return 'BYE';
    if (slot.type === 'OPEN') return 'OPEN';
    return 'TBD';
  };
  
  // Get round name with bracket type
  const getRoundNameWithBracket = () => {
    if (!tournament?.bracket) return `Round ${game.round}`;
    
    if (game.bracketType === 'Final') {
      return 'Grand Final';
    }
    
    const isDoubleElimination = tournament.settings.includeLosersBracket;
    const bracketType = game.bracketType === 'L' ? 'Losers Bracket' : (isDoubleElimination ? 'Winners Bracket' : '');
    let roundName: string;
    
    if (game.bracketType === 'L' && tournament.bracket.losers) {
      // For losers bracket, use losers rounds
      const roundIndex = game.round - 1;
      if (roundIndex >= 0 && roundIndex < tournament.bracket.losers.length) {
        const gamesInRound = tournament.bracket.losers[roundIndex]?.length || 0;
        roundName = getRoundName(roundIndex, tournament.bracket.losers.length, gamesInRound);
      } else {
        roundName = `Round ${game.round}`;
      }
    } else {
      // For winners bracket
      roundName = getRoundNameFromGame(game.round, tournament.bracket.winners);
    }
    
    return bracketType ? `${bracketType} - ${roundName}` : roundName;
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!viewerMode ? { ...attributes, ...listeners } : {})}
      className={`card transition-shadow border-2 border-sport-green p-3 md:p-4 ${viewerMode ? '' : 'cursor-move hover:shadow-lg'}`}
    >
      <div className="text-center">
        <div className="text-xs md:text-sm text-gray-500 mb-1 font-medium">{getRoundNameWithBracket()}</div>
        <div className="text-sm md:text-base font-semibold">{getTeamName(game.teamA)}</div>
        <div className="text-sport-green font-bold my-1 text-xs md:text-sm">VS</div>
        <div className="text-sm md:text-base font-semibold">{getTeamName(game.teamB)}</div>
      </div>
    </div>
  );
}

function DroppableCourt({ court, game, onEdit, onRemove, viewerMode = false }: { court: { id: string; name: string }; game: Game | null; onEdit: () => void; onRemove?: () => void; viewerMode?: boolean }) {
  const { setNodeRef, isOver } = useSortable({ 
    id: `court-${court.id}`,
    disabled: viewerMode // Disable dropping in viewer mode
  });
  
  return (
    <div
      ref={setNodeRef}
      className={isOver && !viewerMode ? 'ring-4 ring-sport-orange rounded-lg' : ''}
    >
      <CourtCard court={court} game={game} onEdit={onEdit} onRemove={onRemove} viewerMode={viewerMode} />
    </div>
  );
}

export function TournamentCourts({ tournament: propTournament, viewerMode = false }: TournamentCourtsProps = {} as TournamentCourtsProps) {
  const store = useTournamentStore();
  const tournament = propTournament || store.tournament;
  const { autoAssignGames, autoAssignRefs, updateGameTimer, getAllGames, assignGameToCourt, unassignGameFromCourt, clearAllCourts, pauseGame, resumeGame } = store;
  const { venueTermPlural } = useSport();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingCourt, setEditingCourt] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  if (!tournament || !tournament.bracket) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-400 py-8">
          {!tournament ? 'No tournament loaded' : 'Bracket not generated yet. Please generate bracket first.'}
        </div>
      </div>
    );
  }
  
  // Get games assigned to each court
  const getGameForCourt = (courtId: string): Game | null => {
    const allGames = getAllGames();
    return allGames.find(g => g.courtId === courtId && (g.status !== 'Finished')) || null;
  };
  
  // Check if game is BYE vs BYE
  const isByeVsBye = (game: Game): boolean => {
    return game.teamA.type === 'BYE' && game.teamB.type === 'BYE';
  };
  
  // Check if tournament is complete
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
  
  const tournamentComplete = isTournamentComplete();

  // Determine the current editable winners round (1-based round number).
  // This is the first winners round that is not fully finished.
  const getCurrentRoundNumber = (): number | null => {
    if (!tournament.bracket) return null;

    const winners = tournament.bracket.winners;
    for (let i = 0; i < winners.length; i++) {
      const round = winners[i];
      if (!round || round.length === 0) continue;
      const allFinished = round.every(g => g.status === 'Finished' && g.result);
      if (!allFinished) {
        // rounds are 1-based in Game.round
        return i + 1;
      }
    }
    return null;
  };

  const currentRoundNumber = getCurrentRoundNumber();
  
  // Get available games (not assigned, not finished, eligible, not BYE vs BYE, both slots filled)
  const getAvailableGames = (): Game[] => {
    // If tournament is complete, no games should be available
    if (tournamentComplete) {
      return [];
    }
    
    const allGames = getAllGames();
    
    return allGames.filter(g => {
      if (!g.courtId && g.status === 'Queued') {
        // Restrict to the current winners round if known
        if (currentRoundNumber !== null && g.round !== currentRoundNumber) {
          return false;
        }
        // Both slots must be filled (no OPEN)
        if (g.teamA.type === 'OPEN' || g.teamB.type === 'OPEN') return false;
        // Both must be either Team or BYE
        if (!((g.teamA.type === 'Team' || g.teamA.type === 'BYE') &&
              (g.teamB.type === 'Team' || g.teamB.type === 'BYE'))) {
          return false;
        }
        // Not BYE vs BYE (except in first round)
        if (isByeVsBye(g) && g.round !== 1) return false;
        // At least one must be a real team (not both BYE), except BYE vs BYE in first round
        if (isByeVsBye(g) && g.round === 1) return true; // Allow first round BYE vs BYE
        return g.teamA.type === 'Team' || g.teamB.type === 'Team';
      }
      return false;
    });
  };
  
  // Get eligible games for a court (games that can be assigned)
  const getEligibleGames = (courtId: string): Game[] => {
    const allGames = getAllGames();
    
    // Get games already assigned to other courts
    const assignedGameIds = new Set(
      allGames
        .filter(g => g.courtId && g.courtId !== courtId && g.status !== 'Finished')
        .map(g => g.id)
    );
    
    // Get games in progress on other courts
    const activeGameIds = new Set(
      allGames
        .filter(g => g.courtId && g.courtId !== courtId && (g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex'))
        .map(g => g.id)
    );
    
    // Determine final winners round index (1-based in game.round)
    const winners = tournament.bracket?.winners || [];
    const finalRoundIndex = winners.length > 0 ? winners.length - 1 : -1;
    const finalRoundNumber = finalRoundIndex >= 0 ? finalRoundIndex + 1 : null;
    
    return allGames.filter(g => {
      if (g.status !== 'Queued') return false;
      if (assignedGameIds.has(g.id) || activeGameIds.has(g.id)) return false;
      if (isByeVsBye(g)) return false;
      
      const bothOpen = g.teamA.type === 'OPEN' && g.teamB.type === 'OPEN';
      const hasOpen =
        g.teamA.type === 'OPEN' || g.teamB.type === 'OPEN';
      
      // Determine if this is a final-round game
      const isFinalRoundGame =
        finalRoundNumber !== null && g.round === finalRoundNumber;

      // Restrict to the current winners round if known
      if (currentRoundNumber !== null && g.round !== currentRoundNumber) {
        return false;
      }
      
      // For the final round, only show fully eligible games:
      // both slots must be Team or BYE (no OPEN in either slot)
      if (isFinalRoundGame) {
        if (hasOpen) return false;
        // Also ensure at least one real team is involved (no BYE vs BYE already filtered)
        return g.teamA.type === 'Team' || g.teamB.type === 'Team';
      }
      
      // In all rounds, we never want pure OPEN vs OPEN in the courts selector
      if (bothOpen) return false;
      
      return true;
    });
  };
  
  // Timer update loop
  useEffect(() => {
    if (!tournament) return;
    
    const interval = setInterval(() => {
      const allGames = getAllGames();
      for (const game of allGames) {
        if (game.status === 'Warmup' || game.status === 'Live' || game.status === 'Flex') {
          const updates = updateGameTimers(game, {
            warmupMinutes: tournament.settings.warmupMinutes,
            gameLengthMinutes: tournament.settings.gameLengthMinutes,
            flexMinutes: tournament.settings.flexMinutes,
          });
          updateGameTimer(game.id, updates);
          
          // Auto-transition phases
          if (updates.currentPhase === 'game' && game.timers.currentPhase === 'warmup') {
            useTournamentStore.getState().updateGame(game.id, { status: 'Live' });
          } else if (updates.currentPhase === 'flex' && game.timers.currentPhase === 'game') {
            useTournamentStore.getState().updateGame(game.id, { status: 'Flex' });
          } else if (updates.currentPhase === 'overtime' && game.timers.currentPhase === 'flex') {
            // Transition to overtime - keep game in Flex status but show overtime timer
            useTournamentStore.getState().updateGame(game.id, { status: 'Flex' });
          }
          // Note: Game no longer auto-finishes - user must manually end the game
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [tournament]);
  
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };
  
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;
    
    const gameId = active.id;
    const overId = over.id as string;
    
    // Check if dropped on a court
    if (overId.startsWith('court-')) {
      const courtId = overId.replace('court-', '');
      const game = getAllGames().find(g => g.id === gameId);
      
      if (game && game.status === 'Queued') {
        // Check if court is available
        const currentGame = getGameForCourt(courtId);
        if (!currentGame || currentGame.status === 'Finished') {
          assignGameToCourt(gameId, courtId);
        }
      }
    }
  };
  
  const handleStartAll = () => {
    const allGames = getAllGames();
    const queuedGames = allGames.filter(g => g.courtId && g.status === 'Queued');
    
    // Check for OPEN slots
    const gamesWithOpen = queuedGames.filter(g => 
      g.teamA.type === 'OPEN' || g.teamB.type === 'OPEN'
    );
    
    if (gamesWithOpen.length > 0) {
      alert(`Cannot start games with OPEN slots. Please resolve OPEN slots first.`);
      return;
    }
    
    queuedGames.forEach(game => {
      useTournamentStore.getState().startGame(game.id);
    });
  };
  
  const handlePauseAll = () => {
    const allGames = getAllGames();
    const activeGames = allGames.filter(g => 
      g.courtId && (g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex')
    );
    activeGames.forEach(game => {
      pauseGame(game.id);
    });
  };
  
  const handleResumeAll = () => {
    const allGames = getAllGames();
    const pausedGames = allGames.filter(g => 
      g.courtId && g.status === 'Paused'
    );
    pausedGames.forEach(game => {
      resumeGame(game.id);
    });
  };
  
  const handleRestartAll = () => {
    const allGames = getAllGames();
    const activeGames = allGames.filter(g => 
      g.courtId && (g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused')
    );
    activeGames.forEach(game => {
      // Reset game to Queued status (same state as when first assigned to court)
      const warmupSeconds = tournament.settings.warmupMinutes * 60;
      const gameSeconds = tournament.settings.gameLengthMinutes * 60;
      const flexSeconds = tournament.settings.flexMinutes * 60;
      
      useTournamentStore.getState().updateGame(game.id, {
        status: 'Queued',
        timers: {
          warmupRemaining: warmupSeconds,
          gameRemaining: gameSeconds,
          flexRemaining: flexSeconds,
          currentPhase: 'idle',
          startedAt: undefined,
          pausedAt: undefined,
          totalPausedTime: 0,
          overtimeMinutes: undefined,
        },
      });
    });
  };
  
  // Check if any games are paused
  const hasPausedGames = getAllGames().some(g => 
    g.courtId && g.status === 'Paused'
  );
  
  const handleEditCourt = (courtId: string) => {
    setEditingCourt(courtId);
  };
  
  const handleSelectGameForCourt = (courtId: string, gameId: string) => {
    const currentGame = getGameForCourt(courtId);
    if (currentGame && currentGame.status === 'Queued') {
      unassignGameFromCourt(currentGame.id);
    }
    assignGameToCourt(gameId, courtId);
    setEditingCourt(null);
  };
  
  const availableGames = getAvailableGames();
  const activeGame = activeId ? getAllGames().find(g => g.id === activeId) : null;
  
  return (
    <DndContext
      sensors={viewerMode ? [] : sensors}
      collisionDetection={closestCenter}
      onDragStart={viewerMode ? undefined : handleDragStart}
      onDragEnd={viewerMode ? undefined : handleDragEnd}
    >
      <div className="p-4 md:p-6 lg:p-8">
        {tournamentComplete && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 font-semibold text-base md:text-lg">
              🏆 Tournament Complete! No more games available.
            </div>
          </div>
        )}
        <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-sport-orange">{venueTermPlural}</h2>
          {!viewerMode && (
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              <button 
                onClick={autoAssignGames} 
                className="btn-primary"
                disabled={tournamentComplete === true}
              >
                Auto-Assign Games
              </button>
              {tournament.refs.length > 0 && tournament.settings.useRefs !== false && (
                <button 
                  onClick={autoAssignRefs} 
                  className="btn-primary"
                >
                  Auto-Assign Referees
                </button>
              )}
              <button onClick={handleStartAll} className="btn-primary">
                Start All Games
              </button>
              {hasPausedGames ? (
                <button onClick={handleResumeAll} className="btn-secondary">
                  Resume All
                </button>
              ) : (
                <button onClick={handlePauseAll} className="btn-secondary">
                  Pause All
                </button>
              )}
              <button onClick={handleRestartAll} className="btn-secondary">
                Restart All Games
              </button>
              <button 
                onClick={() => {
                  if (confirm(`Clear all games from all ${venueTermPlural.toLowerCase()}? Games will be returned to the available games section.`)) {
                    clearAllCourts();
                  }
                }} 
                className="btn-secondary"
              >
                Clear All {venueTermPlural}
              </button>
            </div>
          )}
        </div>
        
        {/* Available Games Pool */}
        {availableGames.length > 0 && (
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Available Games</h3>
            <SortableContext items={availableGames.map(g => g.id)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
                {availableGames.map(game => (
                  <GamePoolItem key={game.id} game={game} teams={tournament.teams} tournament={tournament} viewerMode={viewerMode} />
                ))}
              </div>
            </SortableContext>
          </div>
        )}
        
        {/* Courts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {tournament.courts.map(court => {
            const game = getGameForCourt(court.id);
            const eligibleGames = editingCourt === court.id ? getEligibleGames(court.id) : [];
            
            return (
              <div key={court.id}>
                <DroppableCourt
                  court={court}
                  game={game}
                  onEdit={() => handleEditCourt(court.id)}
                  onRemove={() => {
                    if (game && game.status === 'Queued') {
                      unassignGameFromCourt(game.id);
                    }
                  }}
                  viewerMode={viewerMode}
                />
                
                {/* Edit Court Dropdown - Hidden in viewer mode */}
                {!viewerMode && editingCourt === court.id && (
                  <div className="mt-2 card">
                    <div className="mb-2 font-semibold">Select Game:</div>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSelectGameForCourt(court.id, e.target.value);
                        }
                      }}
                      value=""
                    >
                      <option value="">Choose a game...</option>
                      {eligibleGames.map(g => {
                        const getTeamName = (slot: Game['teamA']) => {
                          if (slot.type === 'Team' && slot.teamId) {
                            return tournament.teams.find(t => t.id === slot.teamId)?.name || 'Unknown';
                          }
                          if (slot.type === 'BYE') return 'BYE';
                          if (slot.type === 'OPEN') return 'OPEN';
                          return 'TBD';
                        };
                        return (
                          <option key={g.id} value={g.id}>
                            {getTeamName(g.teamA)} vs {getTeamName(g.teamB)} ({tournament.bracket ? getRoundNameFromGame(g.round, tournament.bracket.winners) : `Round ${g.round}`})
                          </option>
                        );
                      })}
                    </select>
                    <button
                      onClick={() => setEditingCourt(null)}
                      className="btn-secondary w-full mt-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <DragOverlay>
        {activeGame ? (
          <div className="card border-2 border-sport-orange opacity-90">
            <div className="text-center">
              <div className="font-semibold">
                {activeGame.teamA.type === 'Team' ? tournament.teams.find(t => t.id === activeGame.teamA.teamId)?.name : activeGame.teamA.type}
              </div>
              <div className="text-sport-green font-bold my-1">VS</div>
              <div className="font-semibold">
                {activeGame.teamB.type === 'Team' ? tournament.teams.find(t => t.id === activeGame.teamB.teamId)?.name : activeGame.teamB.type}
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
