import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import type { Game, GameSlot, Tournament } from '../types';
import { getRoundName } from '../lib/roundNames';
import { ReactFlowTournamentBracket } from '../components/ReactFlowTournamentBracket';
import { advanceByeInBracket } from '../lib/bracket';

interface TournamentBracketProps {
  tournament?: Tournament;
  viewerMode?: boolean;
}

export function TournamentBracket({ tournament: propTournament, viewerMode = false }: TournamentBracketProps = {} as TournamentBracketProps) {
  const store = useTournamentStore();
  const tournament = propTournament || store.tournament;
  const {
    generateBracket,
    updateGameSlot,
    assignAllOpenToBye,
    assignAllOpenToByeLosers,
    clearRoundGames,
    clearLosersRoundGames,
    addTeam,
    autoAssignTeamsToBracket,
    autoAssignTeamsToBracketLosers,
    updateGame,
    updateTournament,
  } = store;
  const [editingSlot, setEditingSlot] = useState<{ gameId: string; slot: 'A' | 'B' } | null>(null);
  const [draggedTeam, setDraggedTeam] = useState<string | null>(null);
  const [draggedTeamPool, setDraggedTeamPool] = useState<'winners' | 'losers' | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'flow'>(viewerMode ? 'flow' : 'editor');
  const [dragOverSlot, setDragOverSlot] = useState<{ gameId: string; slot: 'A' | 'B' } | null>(null);
  const [newTeamNameInput, setNewTeamNameInput] = useState('');
  const [collapsedRounds, setCollapsedRounds] = useState<Record<string, boolean>>({});
  
  // Auto-complete BYE vs BYE games in first round
  useEffect(() => {
    if (!tournament?.bracket) return;
    
    const firstRound = tournament.bracket.winners[0];
    if (!firstRound) return;
    
    firstRound.forEach((game) => {
      // Check if it's a BYE vs BYE game in first round of winners bracket that hasn't been completed
      if (game.round === 1 && 
          game.bracketType === 'W' &&
          game.teamA.type === 'BYE' && 
          game.teamB.type === 'BYE' && 
          game.status !== 'Finished') {
        // Advance a BYE to the next round
        if (tournament.bracket) {
          advanceByeInBracket(game, tournament.bracket);
          
          // Update the bracket in the store to reflect the BYE advancement
          updateTournament({
            bracket: tournament.bracket,
          });
        }
        
        // Auto-complete: mark as finished (BYE advances automatically)
        updateGame(game.id, {
          status: 'Finished',
          result: {
            winnerId: 'BYE', // Special marker for BYE vs BYE
            scoreA: 0,
            scoreB: 0,
            finishedAt: Date.now(),
            teamAName: 'BYE',
            teamBName: 'BYE',
          },
          timers: {
            ...game.timers,
            currentPhase: 'idle',
          },
        });
        
        // Redistribute BYEs in the next round to prevent double byes
        if (tournament.bracket && game.round < tournament.bracket.winners.length) {
          const nextRoundIndex = game.round; // round 1 -> index 1 (round 2)
          autoAssignTeamsToBracket(nextRoundIndex);
        }
      }
    });
  }, [tournament?.bracket, updateGame, autoAssignTeamsToBracket]);
  
  if (!tournament) {
    return <div className="p-8">No tournament loaded</div>;
  }
  
  if (!tournament.bracket) {
    // In viewer mode, don't show bracket generation buttons
    if (viewerMode) {
      return (
        <div className="p-8">
          <h2 className="text-3xl font-bold text-sport-orange mb-6">Bracket</h2>
          <div className="card max-w-2xl mx-auto">
            <p className="text-gray-600 text-center py-8">
              Bracket has not been generated yet.
            </p>
          </div>
        </div>
      );
    }
    
    // Normal mode - show bracket generation buttons
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold text-sport-orange mb-6">Bracket</h2>
        <div className="card max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">Generate Bracket</h3>
          <p className="text-gray-600 mb-6">
            Choose how you want to create the tournament bracket:
          </p>
          <div className="space-y-4">
            <button
              onClick={() => generateBracket(true)}
              className="btn-primary w-full py-3"
            >
              <span>AUTO-GENERATE BRACKET</span>
            </button>
            <button
              onClick={() => {
                if (tournament.seedingMode !== 'off' && tournament.seedingMode !== 'random') {
                  const confirmed = confirm(
                    '⚠️ Warning: Creating a bracket manually will disrupt the seeding you configured. ' +
                    'The seeding effects may not be accurate anymore. Do you want to continue?'
                  );
                  if (!confirmed) return;
                }
                generateBracket(false);
              }}
              className="btn-secondary w-full py-3"
            >
              <span>CREATE BRACKET MANUALLY</span>
            </button>
            {tournament.seedingMode !== 'off' && tournament.seedingMode !== 'random' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Seeding Active:</strong> Your tournament uses {tournament.seedingMode === 'manual' ? 'manual' : 'uploaded'} seeding 
                  {tournament.seedingType && ` with ${tournament.seedingType} seeding type`}. 
                  Auto-generating the bracket will respect your seeding configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const isDoubleElimination = !!tournament.bracket.losers && tournament.bracket.losers.length > 0;

  const getTeamName = (slot: GameSlot, game?: Game, slotType?: 'A' | 'B') => {
    // If game has a result with stored team names, use those (preserves names even if team is deleted)
    if (game?.result) {
      // Determine which slot we're looking at
      let isTeamA = false;
      let isTeamB = false;
      
      if (slotType === 'A') {
        isTeamA = true;
      } else if (slotType === 'B') {
        isTeamB = true;
      } else {
        // Try to determine by comparing with game slots
        // Check if this slot matches teamA
        isTeamA = (slot.type === 'Team' && game.teamA.type === 'Team' && slot.teamId === game.teamA.teamId) ||
                  (slot.type === 'BYE' && game.teamA.type === 'BYE') ||
                  (slot.type === 'OPEN' && game.teamA.type === 'OPEN');
        // Check if this slot matches teamB
        isTeamB = (slot.type === 'Team' && game.teamB.type === 'Team' && slot.teamId === game.teamB.teamId) ||
                  (slot.type === 'BYE' && game.teamB.type === 'BYE') ||
                  (slot.type === 'OPEN' && game.teamB.type === 'OPEN');
      }
      
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
    if (slot.type === 'OPEN') return 'OPEN';
    return 'TBD';
  };
  
  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'Warmup':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Live':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Flex':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Finished':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'Paused':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-white text-gray-600 border-gray-200';
    }
  };
  
  const isRoundComplete = (roundIndex: number) => {
    if (roundIndex < 0 || roundIndex >= tournament.bracket!.winners.length) return false;
    const round = tournament.bracket!.winners[roundIndex];
    if (!round || round.length === 0) return false;
    // Check if all games in the round are finished
    return round.every(game => game.status === 'Finished' && game.result);
  };
  
  const isTournamentComplete = () => {
    if (!tournament.bracket) return false;

    // If there is a grand final, use that as the completion signal
    if (tournament.bracket.grandFinal) {
  return (
        tournament.bracket.grandFinal.status === 'Finished' &&
        !!tournament.bracket.grandFinal.result
      );
    }

    // Otherwise, check if the final winners round is fully finished
    if (tournament.bracket.winners.length > 0) {
      const finalRound = tournament.bracket.winners[tournament.bracket.winners.length - 1];
      return finalRound.every(game => game.status === 'Finished' && game.result);
    }

    return false;
  };

  const tournamentComplete = isTournamentComplete();

  const isWinnersFinalFinished = () => {
    if (!tournament.bracket || tournament.bracket.winners.length === 0) return false;
    const finalWinnersRound = tournament.bracket.winners[tournament.bracket.winners.length - 1];
    return finalWinnersRound.every(g => g.status === 'Finished' && g.result);
  };

  const isLosersFinalFinished = () => {
    if (!tournament.bracket || !tournament.bracket.losers || tournament.bracket.losers.length === 0) return false;
    const finalLosersRound = tournament.bracket.losers[tournament.bracket.losers.length - 1];
    return finalLosersRound.every(g => g.status === 'Finished' && g.result);
  };

  const canEditRound = (roundIndex: number) => {
    if (roundIndex === 0) return true; // First round can always be edited
    if (roundIndex >= tournament.bracket!.winners.length) return false;
    // Can edit if previous round is complete
    return isRoundComplete(roundIndex - 1);
  };
  
  const shouldShowRound = (roundIndex: number) => {
    if (roundIndex === 0) return true; // Always show first round
    // For round 1+, only show if previous round is complete
    // This checks if round 0 is actually finished, not just editable
    if (roundIndex - 1 < 0) return false;
    return isRoundComplete(roundIndex - 1);
  };
  
  const getGameStatus = (game: Game, roundIndex?: number): 'valid' | 'open-vs-open' | 'open-vs-bye' | 'bye-vs-bye' | 'team-vs-open' => {
    const isOpenVsOpen = game.teamA.type === 'OPEN' && game.teamB.type === 'OPEN';
    const isByeVsBye = game.teamA.type === 'BYE' && game.teamB.type === 'BYE';
    const isOpenVsBye = (game.teamA.type === 'OPEN' && game.teamB.type === 'BYE') || 
                        (game.teamA.type === 'BYE' && game.teamB.type === 'OPEN');
    const isTeamVsOpen = (game.teamA.type === 'Team' && game.teamB.type === 'OPEN') ||
                         (game.teamA.type === 'OPEN' && game.teamB.type === 'Team');
    
    // BYE vs BYE is valid in the first round (round 1, roundIndex 0)
    const isFirstRound = roundIndex === 0 || game.round === 1;
    if (isByeVsBye && !isFirstRound) return 'bye-vs-bye';
    if (isByeVsBye && isFirstRound) return 'valid'; // Allow BYE vs BYE in first round
    
    if (isOpenVsBye) return 'open-vs-bye';
    if (isOpenVsOpen) return 'open-vs-open';
    if (isTeamVsOpen) return 'team-vs-open';
    // Valid: Team vs Team or Team vs BYE or BYE vs BYE (first round only)
    return 'valid';
  };
  
  const getTeamsInRound = (roundIndex: number) => {
    if (roundIndex < 0 || roundIndex >= tournament.bracket!.winners.length) return new Set<string>();
    const round = tournament.bracket!.winners[roundIndex];
    const teamIds = new Set<string>();
    round.forEach(game => {
      if (game.teamA.type === 'Team' && game.teamA.teamId) {
        teamIds.add(game.teamA.teamId);
      }
      if (game.teamB.type === 'Team' && game.teamB.teamId) {
        teamIds.add(game.teamB.teamId);
      }
    });
    return teamIds;
  };
  
  const getEligibleTeamsForRound = (roundIndex: number): Set<string> => {
    if (!tournament.bracket) return new Set<string>();
    
    // Round 0 (first round): All teams are eligible
    if (roundIndex === 0) {
      return new Set(tournament.teams.map(t => t.id));
    }
    
    // For later rounds: Only teams that won their game in the previous round
    const eligibleTeamIds = new Set<string>();
    const previousRound = tournament.bracket.winners[roundIndex - 1];
    
    if (!previousRound) return eligibleTeamIds;
    
    previousRound.forEach(game => {
      // Only consider finished games with results
      if (game.status === 'Finished' && game.result && game.result.winnerId) {
        eligibleTeamIds.add(game.result.winnerId);
      }
    });
    
    return eligibleTeamIds;
  };

  const getEligibleTeamsForLosersRound = (roundIndex: number): Set<string> => {
    if (!tournament.bracket || !tournament.bracket.losers) return new Set<string>();
    
    const eligibleTeamIds = new Set<string>();
    
    // Helper function to get loser ID from a finished game
    const getLoserId = (game: Game): string | undefined => {
      if (!game.result?.winnerId) return undefined;
      const winnerId = game.result.winnerId;
      
      // First, try using team IDs directly (most reliable)
      if (game.teamA.type === 'Team' && game.teamA.teamId === winnerId) {
        // TeamA won, so teamB is the loser (if teamB is a Team)
        if (game.teamB.type === 'Team' && game.teamB.teamId) {
          return game.teamB.teamId;
        }
      } else if (game.teamB.type === 'Team' && game.teamB.teamId === winnerId) {
        // TeamB won, so teamA is the loser (if teamA is a Team)
        if (game.teamA.type === 'Team' && game.teamA.teamId) {
          return game.teamA.teamId;
        }
      }
      
      // Fallback: use team names from result to find loser
      if (game.result.teamAName && game.result.teamBName) {
        // Find which team name corresponds to the winner
        const winnerTeam = tournament.teams.find(t => t.id === winnerId);
        if (winnerTeam) {
          const winnerName = winnerTeam.name;
          // The loser is the team name that doesn't match the winner
          let loserName: string | undefined;
          if (winnerName === game.result.teamAName) {
            loserName = game.result.teamBName;
          } else if (winnerName === game.result.teamBName) {
            loserName = game.result.teamAName;
          }
          
          if (loserName && loserName !== 'BYE') {
            const loserTeam = tournament.teams.find(t => t.name === loserName);
            if (loserTeam) return loserTeam.id;
          }
        }
      }
      
      return undefined;
    };
    
    if (roundIndex === 0) {
      // First losers round: losers from winners round 0
      const winnersRound0 = tournament.bracket.winners[0];
      if (winnersRound0) {
        winnersRound0.forEach(game => {
          if (game.status === 'Finished' && game.result) {
            const loserId = getLoserId(game);
            if (loserId) eligibleTeamIds.add(loserId);
          }
        });
      }
    } else if (roundIndex === tournament.bracket.losers.length - 1) {
      // Losers final: winner of previous losers round + loser of winners final
      const previousLosersRound = tournament.bracket.losers[roundIndex - 1];
      if (previousLosersRound) {
        previousLosersRound.forEach(game => {
          if (game.status === 'Finished' && game.result?.winnerId) {
            eligibleTeamIds.add(game.result.winnerId);
          }
        });
      }
      // Add loser of winners final
      const winnersFinalRound = tournament.bracket.winners[tournament.bracket.winners.length - 1];
      if (winnersFinalRound) {
        winnersFinalRound.forEach(game => {
          if (game.status === 'Finished' && game.result) {
            const loserId = getLoserId(game);
            if (loserId) {
              eligibleTeamIds.add(loserId);
            } else {
              // Additional fallback: if getLoserId fails, try to find loser by comparing result names
              // This handles edge cases where team IDs might not match
              if (game.result?.teamAName && game.result?.teamBName && game.result?.winnerId) {
                const winnerTeam = tournament.teams.find(t => t.id === game.result?.winnerId);
                if (winnerTeam) {
                  const winnerName = winnerTeam.name;
                  const loserName = winnerName === game.result.teamAName 
                    ? game.result.teamBName 
                    : (winnerName === game.result.teamBName ? game.result.teamAName : null);
                  if (loserName && loserName !== 'BYE') {
                    const loserTeam = tournament.teams.find(t => t.name === loserName);
                    if (loserTeam) eligibleTeamIds.add(loserTeam.id);
                  }
                }
              }
            }
          }
        });
      }
    } else {
      // Middle losers rounds: winners from previous losers round + losers from corresponding winners round
      const previousLosersRound = tournament.bracket.losers[roundIndex - 1];
      if (previousLosersRound) {
        previousLosersRound.forEach(game => {
          if (game.status === 'Finished' && game.result?.winnerId) {
            eligibleTeamIds.add(game.result.winnerId);
          }
        });
      }
      // Add losers from corresponding winners round
      const correspondingWinnersRound = tournament.bracket.winners[roundIndex];
      if (correspondingWinnersRound) {
        correspondingWinnersRound.forEach(game => {
          if (game.status === 'Finished' && game.result) {
            const loserId = getLoserId(game);
            if (loserId) eligibleTeamIds.add(loserId);
          }
        });
      }
    }
    
    return eligibleTeamIds;
  };

  const canEditLosersRound = (roundIndex: number) => {
    if (!tournament.bracket || !tournament.bracket.losers) return false;
    if (roundIndex === 0) {
      // First losers round can be edited once winners round 0 is complete
      return isRoundComplete(0);
    }
    if (roundIndex === tournament.bracket.losers.length - 1) {
      // Losers final can be edited once winners final is complete
      return isWinnersFinalFinished();
    }
    // Middle rounds: can edit if previous losers round is complete
    const previousLosersRound = tournament.bracket.losers[roundIndex - 1];
    if (!previousLosersRound) return false;
    return previousLosersRound.every(game => game.status === 'Finished' && game.result);
  };

  const isLosersRoundComplete = (roundIndex: number) => {
    if (!tournament.bracket || !tournament.bracket.losers) return false;
    if (roundIndex < 0 || roundIndex >= tournament.bracket.losers.length) return false;
    const round = tournament.bracket.losers[roundIndex];
    if (!round || round.length === 0) return false;
    return round.every(game => game.status === 'Finished' && game.result);
  };
  
  const isGameInProgress = (game: Game) => {
    return game.status === 'Warmup' || game.status === 'Live' || game.status === 'Flex' || game.status === 'Paused';
  };
  
  const handleSlotClick = (game: Game, slot: 'A' | 'B', slotValue: GameSlot) => {
    // Prevent editing completed games
    if (game.status === 'Finished') {
      alert('Cannot edit a game that has been completed.');
      return;
    }
    
    // Prevent editing games that are in progress
    if (isGameInProgress(game)) {
      alert('Cannot edit a game that is currently in progress. Please finish or pause the game first.');
      return;
    }
    
    // Check if game is in winners or losers bracket
    const winnersRoundIndex = tournament.bracket!.winners.findIndex(round => 
      round.some(g => g.id === game.id)
    );
    const losersRoundIndex = tournament.bracket!.losers.findIndex(round => 
      round.some(g => g.id === game.id)
    );
    
    if (winnersRoundIndex >= 0) {
      if (!canEditRound(winnersRoundIndex)) {
        alert(`Cannot edit Round ${winnersRoundIndex + 1}. Please complete Round ${winnersRoundIndex} first.`);
        return;
      }
    } else if (losersRoundIndex >= 0) {
      if (!canEditLosersRound(losersRoundIndex)) {
        alert(`Cannot edit Losers Round ${losersRoundIndex + 1}. Please complete the previous round first.`);
        return;
      }
    } else {
      alert('Game not found in bracket.');
      return;
    }
    
    // Warn if seeding is active and this is a manual edit (only for winners bracket)
    if (winnersRoundIndex >= 0 && tournament.seedingMode !== 'off' && tournament.seedingMode !== 'random') {
      const hasSeedingWarning = sessionStorage.getItem('seeding-warning-shown');
      if (!hasSeedingWarning) {
        const confirmed = confirm(
          '⚠️ Warning: Manually editing the bracket will disrupt the seeding you configured. ' +
          'The seeding effects may not be accurate anymore. Do you want to continue?'
        );
        if (!confirmed) return;
        sessionStorage.setItem('seeding-warning-shown', 'true');
      }
    }
    
    if (slotValue.type === 'Team') {
      // Allow editing/removing teams
      setEditingSlot({ gameId: game.id, slot });
    } else if (slotValue.type === 'OPEN' || slotValue.type === 'BYE') {
      // Allow changing OPEN/BYE
      setEditingSlot({ gameId: game.id, slot });
    }
  };
  
  const handleSlotUpdate = (slotValue: GameSlot) => {
    if (!editingSlot) return;
    updateGameSlot(editingSlot.gameId, editingSlot.slot, slotValue);
    setEditingSlot(null);
  };
  
  const handleDragStart = (teamId: string, pool: 'winners' | 'losers') => {
    if (tournamentComplete) return;
    setDraggedTeam(teamId);
    setDraggedTeamPool(pool);
  };

  const handleDragOver = (e: React.DragEvent, gameId: string, slot: 'A' | 'B', bracketType: 'winners' | 'losers') => {
    e.preventDefault();
    e.stopPropagation();
    if (tournamentComplete) return;
    
    // Check if team pool matches bracket type
    if (draggedTeamPool && draggedTeamPool !== bracketType) {
      return; // Don't allow drag over if pool doesn't match
    }
    
    if (bracketType === 'winners') {
      const roundIndex = tournament.bracket!.winners.findIndex(round => 
        round.some(g => g.id === gameId)
      );
      if (canEditRound(roundIndex)) {
        setDragOverSlot({ gameId, slot });
      }
    } else {
      const roundIndex = tournament.bracket!.losers.findIndex(round => 
        round.some(g => g.id === gameId)
      );
      if (canEditLosersRound(roundIndex)) {
        setDragOverSlot({ gameId, slot });
      }
    }
  };
  
  const handleDragLeave = () => {
    setDragOverSlot(null);
  };
  
  const handleDrop = (game: Game, slot: 'A' | 'B', bracketType: 'winners' | 'losers') => {
    if (!draggedTeam || tournamentComplete) return;
    
    // Check if team pool matches bracket type
    if (draggedTeamPool && draggedTeamPool !== bracketType) {
      alert(`This team can only be placed in the ${draggedTeamPool === 'winners' ? 'Winners' : 'Losers'} bracket.`);
      setDraggedTeam(null);
      setDraggedTeamPool(null);
      setDragOverSlot(null);
      return;
    }
    
    // Prevent editing completed games
    if (game.status === 'Finished') {
      alert('Cannot edit a game that has been completed.');
      setDraggedTeam(null);
      setDraggedTeamPool(null);
      setDragOverSlot(null);
      return;
    }
    
    // Prevent editing games that are in progress
    if (isGameInProgress(game)) {
      alert('Cannot edit a game that is currently in progress. Please finish or pause the game first.');
      setDraggedTeam(null);
      setDraggedTeamPool(null);
      setDragOverSlot(null);
      return;
    }
    
    if (bracketType === 'winners') {
      const roundIndex = tournament.bracket!.winners.findIndex(round => 
        round.some(g => g.id === game.id)
      );
      if (!canEditRound(roundIndex)) {
        alert(`Cannot edit Round ${roundIndex + 1}. Please complete Round ${roundIndex} first.`);
        setDraggedTeam(null);
        setDraggedTeamPool(null);
        setDragOverSlot(null);
        return;
      }
      
      // Check if team is eligible for this round
      const eligibleTeams = getEligibleTeamsForRound(roundIndex);
      if (!eligibleTeams.has(draggedTeam)) {
        alert('This team is not eligible for this round. Only teams that won their previous round can advance.');
        setDraggedTeam(null);
        setDraggedTeamPool(null);
        setDragOverSlot(null);
        return;
      }
    } else {
      const roundIndex = tournament.bracket!.losers.findIndex(round => 
        round.some(g => g.id === game.id)
      );
      if (!canEditLosersRound(roundIndex)) {
        alert(`Cannot edit Losers Round ${roundIndex + 1}. Please complete the previous round first.`);
        setDraggedTeam(null);
        setDraggedTeamPool(null);
        setDragOverSlot(null);
        return;
      }
      
      // Check if team is eligible for this losers round
      const eligibleTeams = getEligibleTeamsForLosersRound(roundIndex);
      
      // Also check if team is in the losers pool (they're eligible if they're in the pool)
      const { losersPool } = getTeamPoolMembership();
      const isInLosersPool = losersPool.has(draggedTeam);
      
      if (!eligibleTeams.has(draggedTeam) && !isInLosersPool) {
        alert('This team is not eligible for this round.');
        setDraggedTeam(null);
        setDraggedTeamPool(null);
        setDragOverSlot(null);
        return;
      }
    }
    
    updateGameSlot(game.id, slot, { type: 'Team', teamId: draggedTeam });
    setDraggedTeam(null);
    setDraggedTeamPool(null);
    setDragOverSlot(null);
  };
  
  const getTeamPoolMembership = () => {
    // Determine which pool each team belongs to:
    // - Winners Pool: Teams still in winners bracket (not eliminated)
    // - Losers Pool: Teams that lost in winners bracket but are still in losers bracket
    // - Eliminated: Teams that lost in losers bracket
    
    const winnersPool = new Set<string>();
    const losersPool = new Set<string>();
    const eliminated = new Set<string>();
    
    // Start with all teams in winners pool (they start there)
    tournament.teams.forEach(team => winnersPool.add(team.id));
    
    // Check winners bracket - track winners and losers
    tournament.bracket!.winners.forEach(round => {
      round.forEach(game => {
        if (game.status === 'Finished' && game.result && game.result.winnerId) {
          // Game finished - winner stays in winners pool, loser moves to losers pool
          const winnerId = game.result.winnerId;
          winnersPool.add(winnerId);
          
          // Loser is the team that didn't win
          let loserId: string | undefined;
          if (game.teamA.type === 'Team' && game.teamA.teamId === winnerId) {
            // TeamA won, so teamB is the loser
            loserId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
          } else if (game.teamB.type === 'Team' && game.teamB.teamId === winnerId) {
            // TeamB won, so teamA is the loser
            loserId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
          }
          
          if (loserId) {
            winnersPool.delete(loserId);
            // Check if they're still active in losers bracket
            const stillInLosers = tournament.bracket!.losers.some(round =>
              round.some(g => 
                (g.teamA.type === 'Team' && g.teamA.teamId === loserId && g.status !== 'Finished') ||
                (g.teamB.type === 'Team' && g.teamB.teamId === loserId && g.status !== 'Finished') ||
                (g.status === 'Finished' && g.result && g.result.winnerId === loserId)
              )
            );
            if (stillInLosers) {
              losersPool.add(loserId);
            } else {
              // Check if they lost in losers bracket
              const lostInLosers = tournament.bracket!.losers.some(round =>
                round.some(g => 
                  g.status === 'Finished' && g.result &&
                  ((g.teamA.type === 'Team' && g.teamA.teamId === loserId && g.result.winnerId !== loserId) ||
                   (g.teamB.type === 'Team' && g.teamB.teamId === loserId && g.result.winnerId !== loserId))
                )
              );
              if (lostInLosers) {
                eliminated.add(loserId);
              } else {
                // Not yet eliminated, might still be in losers bracket
                losersPool.add(loserId);
              }
            }
          }
        } else if (game.status !== 'Finished') {
          // Game not finished - both teams are still in winners pool
          if (game.teamA.type === 'Team' && game.teamA.teamId) {
            winnersPool.add(game.teamA.teamId);
          }
          if (game.teamB.type === 'Team' && game.teamB.teamId) {
            winnersPool.add(game.teamB.teamId);
          }
        }
      });
    });
    
    // Check losers bracket - active teams are in losers pool, eliminated teams are out
    tournament.bracket!.losers.forEach(round => {
      round.forEach(game => {
        if (game.status === 'Finished' && game.result && game.result.winnerId) {
          // Game finished - winner stays in losers pool, loser is eliminated
          const winnerId = game.result.winnerId;
          losersPool.add(winnerId);
          winnersPool.delete(winnerId);
          
          // Loser is eliminated
          let loserId: string | undefined;
          if (game.teamA.type === 'Team' && game.teamA.teamId === winnerId) {
            // TeamA won, so teamB is the loser
            loserId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
          } else if (game.teamB.type === 'Team' && game.teamB.teamId === winnerId) {
            // TeamB won, so teamA is the loser
            loserId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
          }
          if (loserId) {
            eliminated.add(loserId);
            losersPool.delete(loserId);
            winnersPool.delete(loserId);
          }
        } else if (game.status !== 'Finished') {
          // Team is still active in losers bracket
          if (game.teamA.type === 'Team' && game.teamA.teamId) {
            losersPool.add(game.teamA.teamId);
            winnersPool.delete(game.teamA.teamId); // Remove from winners if they're here
          }
          if (game.teamB.type === 'Team' && game.teamB.teamId) {
            losersPool.add(game.teamB.teamId);
            winnersPool.delete(game.teamB.teamId); // Remove from winners if they're here
          }
        }
      });
    });
    
    // Check grand final
    if (tournament.bracket!.grandFinal) {
      const gf = tournament.bracket!.grandFinal;
      if (gf.status === 'Finished' && gf.result) {
        // Tournament complete - winner is in winners pool, loser is eliminated
        const winnerId = gf.result.winnerId;
        winnersPool.add(winnerId);
        losersPool.delete(winnerId);
        
        const loserId = gf.teamA.type === 'Team' && gf.teamA.teamId === winnerId
          ? (gf.teamB.type === 'Team' ? gf.teamB.teamId : undefined)
          : (gf.teamA.type === 'Team' ? gf.teamA.teamId : undefined);
        if (loserId) {
          eliminated.add(loserId);
          losersPool.delete(loserId);
          winnersPool.delete(loserId);
        }
      } else if (gf.status !== 'Finished') {
        // Grand final in progress
        if (gf.teamA.type === 'Team' && gf.teamA.teamId) {
          // Check which bracket they came from
          const cameFromLosers = tournament.bracket!.losers.some(round =>
            round.some(g => 
              g.status === 'Finished' && g.result && g.result.winnerId === gf.teamA.teamId
            )
          );
          if (cameFromLosers) {
            losersPool.add(gf.teamA.teamId);
            winnersPool.delete(gf.teamA.teamId);
          } else {
            winnersPool.add(gf.teamA.teamId);
          }
        }
        if (gf.teamB.type === 'Team' && gf.teamB.teamId) {
          const cameFromLosers = tournament.bracket!.losers.some(round =>
            round.some(g => 
              g.status === 'Finished' && g.result && g.result.winnerId === gf.teamB.teamId
            )
          );
          if (cameFromLosers) {
            losersPool.add(gf.teamB.teamId);
            winnersPool.delete(gf.teamB.teamId);
          } else {
            winnersPool.add(gf.teamB.teamId);
          }
        }
      }
    }
    
    return { winnersPool, losersPool, eliminated };
  };

  const getAvailableTeams = () => {
    const { winnersPool, losersPool, eliminated } = getTeamPoolMembership();
    
    // Get teams that aren't assigned to any active game
    const assignedTeamIds = new Set<string>();
    
    const allGames = [
      ...tournament.bracket!.winners.flat(),
      ...tournament.bracket!.losers.flat(),
      ...(tournament.bracket!.grandFinal ? [tournament.bracket!.grandFinal] : []),
    ];
    
    allGames.forEach(game => {
      if (game.status !== 'Finished') {
        if (game.teamA.type === 'Team' && game.teamA.teamId) {
          assignedTeamIds.add(game.teamA.teamId);
        }
        if (game.teamB.type === 'Team' && game.teamB.teamId) {
          assignedTeamIds.add(game.teamB.teamId);
        }
      }
    });
    
    const winnersAvailable = tournament.teams.filter(team => 
      winnersPool.has(team.id) && !assignedTeamIds.has(team.id)
    );
    
    const losersAvailable = tournament.teams.filter(team => 
      losersPool.has(team.id) && !assignedTeamIds.has(team.id)
    );
    
    const winnersAssigned = tournament.teams.filter(team => 
      winnersPool.has(team.id) && assignedTeamIds.has(team.id)
    );
    
    const losersAssigned = tournament.teams.filter(team => 
      losersPool.has(team.id) && assignedTeamIds.has(team.id)
    );
    
    return {
      winnersAvailable,
      losersAvailable,
      winnersAssigned,
      losersAssigned,
      eliminated: tournament.teams.filter(team => eliminated.has(team.id)),
    };
  };
  
const renderEditorView = () => {
    const availableTeams = getAvailableTeams();
    
  
    return (
      <div className="flex flex-col gap-6">
        {/* Seeding Warning Banner */}
        {tournament.seedingMode !== 'off' && tournament.seedingMode !== 'random' && (
          <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Seeding Active:</strong> Your tournament uses {tournament.seedingMode === 'manual' ? 'manual' : 'uploaded'} seeding
              {tournament.seedingType && ` with ${tournament.seedingType} seeding type`}. 
              Manually editing the bracket will disrupt the seeding configuration and may affect bracket accuracy.
            </p>
          </div>
        )}
        
        <div className="flex gap-6">
          {/* Team Pools */}
          <div className="w-64 flex-shrink-0">
            <div className="card sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Team Pools</h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag teams to bracket slots or click slots to edit
              </p>
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {/* Winners Pool - only show if double elimination */}
                {tournament.settings.includeLosersBracket && (
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2 uppercase tracking-wide">Winners Bracket Pool</h4>
                  {availableTeams.winnersAvailable.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1">Available</div>
                      <div className="space-y-2">
                        {availableTeams.winnersAvailable.map(team => {
                          const eligibleForWinners = tournament.bracket!.winners.some((_, idx) => 
                            !isRoundComplete(idx) && canEditRound(idx) && getEligibleTeamsForRound(idx).has(team.id)
                          );
                          const canDrag = eligibleForWinners && !tournamentComplete;
                          return (
                            <div
                              key={team.id}
                              draggable={canDrag}
                              onDragStart={() => canDrag && handleDragStart(team.id, 'winners')}
                              className={`p-3 border rounded-lg transition-colors ${
                                canDrag
                                  ? 'bg-green-50 border-green-200 cursor-move hover:bg-green-100'
                                  : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                              }`}
                              title={
                                canDrag
                                  ? 'Drag to Winners Bracket'
                                  : tournamentComplete
                                    ? 'Tournament is complete. Teams are locked.'
                                    : 'This team is not eligible for the current winners bracket round'
                              }
                            >
                              <div className={`font-medium ${canDrag ? '' : 'text-gray-500'}`}>{team.name}</div>
                              {team.seed && (
                                <div className="text-xs text-gray-500">Seed: {team.seed}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {availableTeams.winnersAssigned.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Assigned</div>
                      <div className="space-y-2">
                        {availableTeams.winnersAssigned.map(team => (
                          <div
                            key={team.id}
                            className="p-3 bg-gray-100 border border-gray-300 rounded-lg opacity-60"
                          >
                            <div className="font-medium">{team.name}</div>
                            {team.seed && (
                              <div className="text-xs text-gray-500">Seed: {team.seed}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {availableTeams.winnersAvailable.length === 0 && availableTeams.winnersAssigned.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      No teams in winners pool
                    </div>
                  )}
                </div>
                )}

                {/* Losers Pool - only show if double elimination */}
                {isDoubleElimination && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2 uppercase tracking-wide">Losers Bracket Pool</h4>
                    {availableTeams.losersAvailable.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">Available</div>
                        <div className="space-y-2">
                          {availableTeams.losersAvailable.map(team => {
                            // Check if team is eligible for any editable losers round
                            const eligibleForLosers = tournament.bracket!.losers.some((_, idx) => {
                              if (isLosersRoundComplete(idx) || !canEditLosersRound(idx)) return false;
                              const eligible = getEligibleTeamsForLosersRound(idx);
                              return eligible.has(team.id);
                            });
                            
                            // Also check if team lost in winners bracket (they should be eligible for losers)
                            const lostInWinners = tournament.bracket!.winners.some(round =>
                              round.some(game => {
                                if (game.status === 'Finished' && game.result) {
                                  const loserId = (() => {
                                    const winnerId = game.result.winnerId;
                                    if (game.teamA.type === 'Team' && game.teamA.teamId === winnerId) {
                                      return game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
                                    }
                                    if (game.teamB.type === 'Team' && game.teamB.teamId === winnerId) {
                                      return game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
                                    }
                                    return undefined;
                                  })();
                                  return loserId === team.id;
                                }
                                return false;
                              })
                            );
                            
                            const canDrag = (eligibleForLosers || lostInWinners) && !tournamentComplete;
                            return (
                              <div
                                key={team.id}
                                draggable={canDrag}
                                onDragStart={() => canDrag && handleDragStart(team.id, 'losers')}
                                className={`p-3 border rounded-lg transition-colors ${
                                  canDrag
                                    ? 'bg-red-50 border-red-200 cursor-move hover:bg-red-100'
                                    : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                                }`}
                                title={
                                  canDrag
                                    ? 'Drag to Losers Bracket'
                                    : tournamentComplete
                                      ? 'Tournament is complete. Teams are locked.'
                                      : 'This team is not eligible for the current losers bracket round'
                                }
                              >
                                <div className={`font-medium ${canDrag ? '' : 'text-gray-500'}`}>{team.name}</div>
                                {team.seed && (
                                  <div className="text-xs text-gray-500">Seed: {team.seed}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {availableTeams.losersAssigned.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Assigned</div>
                        <div className="space-y-2">
                          {availableTeams.losersAssigned.map(team => (
                            <div
                              key={team.id}
                              className="p-3 bg-gray-100 border border-gray-300 rounded-lg opacity-60"
                            >
                              <div className="font-medium">{team.name}</div>
                              {team.seed && (
                                <div className="text-xs text-gray-500">Seed: {team.seed}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {availableTeams.losersAvailable.length === 0 && availableTeams.losersAssigned.length === 0 && (
                      <div className="text-sm text-gray-500 text-center py-2">
                        No teams in losers pool
                      </div>
                    )}
                  </div>
                )}

                {/* Eliminated Teams */}
                {availableTeams.eliminated.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">Eliminated</h4>
                    <div className="space-y-2">
                      {availableTeams.eliminated.map(team => (
                        <div
                          key={team.id}
                          className="p-3 bg-gray-100 border border-gray-300 rounded-lg opacity-50"
                        >
                          <div className="font-medium text-gray-400 line-through">{team.name}</div>
                          {team.seed && (
                            <div className="text-xs text-gray-400">Seed: {team.seed}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        
        {/* Bracket Editor */}
        <div className="flex-1">
      {/* Winners Bracket */}
      <div className="mb-8">
            {isDoubleElimination && (
        <h3 className="text-2xl font-semibold mb-4">Winners Bracket</h3>
            )}
        <div className="space-y-6">
              {tournament.bracket!.winners.map((round, roundIndex) => {
                if (!shouldShowRound(roundIndex)) return null;
                const key = `W-${roundIndex}`;
                const isCollapsed = !!collapsedRounds[key];
                
                return (
            <div key={roundIndex}>
                    <div className="flex items-center gap-4 mb-2 flex-wrap">
                      <h4 className="text-lg font-medium">{getRoundName(roundIndex, tournament.bracket!.winners.length, round.length)}</h4>
                      <button
                        onClick={() =>
                          setCollapsedRounds(prev => ({ ...prev, [key]: !prev[key] }))
                        }
                        className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 transition"
                      >
                        <span>{isCollapsed ? 'Show' : 'Hide'}</span>
                        <span className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>⌃</span>
                      </button>
                      {!canEditRound(roundIndex) && (
                        <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          Complete {getRoundName(roundIndex - 1, tournament.bracket!.winners.length, tournament.bracket!.winners[roundIndex - 1]?.length || 0)} first
                        </span>
                      )}
                      {canEditRound(roundIndex) && !isRoundComplete(roundIndex) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {tournament.settings.openSlotPolicy !== 'BYE' && (
                            <button
                              onClick={() => assignAllOpenToBye(roundIndex)}
                              className="text-sm btn-secondary"
                            >
                              Assign All OPEN to BYE
                            </button>
                          )}
                          <button
                            onClick={() => autoAssignTeamsToBracket(roundIndex)}
                            className="text-sm btn-primary"
                          >
                            Auto-Assign Teams
                          </button>
                          <button
                            onClick={() => {
                              // Check if any games in the round are in progress
                              const gamesInProgress = round.filter(g => 
                                g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused'
                              );
                              if (gamesInProgress.length > 0) {
                                alert(`Cannot clear round ${roundIndex + 1}. Some games are currently in progress. Please finish or pause those games first.`);
                                return;
                              }
                              if (confirm(`Clear all games in Round ${roundIndex + 1}?`)) {
                                clearRoundGames(roundIndex);
                              }
                            }}
                            className="text-sm btn-secondary"
                          >
                            Clear All Games
                          </button>
                        </div>
                      )}
                    </div>
                    {!isCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {round.map((game) => {
                      const gameInProgress = isGameInProgress(game);
                      return (
                  <div
                    key={game.id}
                          className={`border-2 p-2 ${(() => {
                            // Gray out completed games
                            if (game.status === 'Finished') {
                              return 'border-gray-400 bg-gray-100 opacity-60';
                            }
                            const status = getGameStatus(game, roundIndex);
                            // BYE vs BYE in first round is valid, show green
                            if (status === 'bye-vs-bye' && roundIndex === 0 && game.round === 1) return 'border-green-500 bg-green-50 ring-2 ring-green-300';
                            if (status === 'bye-vs-bye') return 'border-red-500 bg-red-50 ring-2 ring-red-300';
                            if (status === 'open-vs-bye') return 'border-orange-500 bg-orange-50 ring-2 ring-orange-300';
                            if (status === 'open-vs-open') return 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-300';
                            if (status === 'team-vs-open') return 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-300';
                            if (status === 'valid') return 'border-green-500 bg-green-50 ring-2 ring-green-300';
                            return getStatusColor(game.status);
                          })()} ${!canEditRound(roundIndex) ? 'opacity-50' : ''} ${gameInProgress ? 'ring-2 ring-orange-400' : ''}`}
                  >
                    {game.status === 'Finished' && (
                      <div className="text-center text-xs text-gray-500 font-semibold mb-1 pb-1 border-b border-gray-300">
                        Completed
                      </div>
                    )}
                    <div className="text-center space-y-1">
                      <div 
                            draggable={false}
                            onDragOver={(e) => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDragOver(e, game.id, 'A', 'winners')}
                            onDragLeave={handleDragLeave}
                            onDrop={() => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDrop(game, 'A', 'winners')}
                            onClick={() => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleSlotClick(game, 'A', game.teamA)}
                            className={`text-sm font-semibold ${gameInProgress || game.status === 'Finished' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-gray-100'} rounded px-1.5 py-1 border-2 border-dashed transition-colors ${
                              dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'A'
                                ? 'border-blue-500 bg-blue-100'
                                : 'border-transparent'
                            } ${game.teamA.type === 'Team' ? 'bg-blue-50' : 'bg-gray-50'}`}
                      >
                            {getTeamName(game.teamA, game, 'A')}
                            {canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && (
                              <span className="text-[10px] text-sport-orange ml-1 block">(click to edit)</span>
                            )}
                            {gameInProgress && (
                              <span className="text-[10px] text-orange-600 ml-1 block">(in progress)</span>
                        )}
                      </div>
                      <div className="text-sport-green font-bold text-xs">VS</div>
                      <div 
                            draggable={false}
                            onDragOver={(e) => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDragOver(e, game.id, 'B', 'winners')}
                            onDragLeave={handleDragLeave}
                            onDrop={() => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDrop(game, 'B', 'winners')}
                            onClick={() => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleSlotClick(game, 'B', game.teamB)}
                            className={`text-sm font-semibold ${gameInProgress || game.status === 'Finished' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-gray-100'} rounded px-1.5 py-1 border-2 border-dashed transition-colors ${
                              dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'B'
                                ? 'border-blue-500 bg-blue-100'
                                : 'border-transparent'
                            } ${game.teamB.type === 'Team' ? 'bg-blue-50' : 'bg-gray-50'}`}
                          >
                            {getTeamName(game.teamB, game, 'B')}
                            {canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && (
                              <span className="text-[10px] text-sport-orange ml-1 block">(click to edit)</span>
                            )}
                            {gameInProgress && (
                              <span className="text-[10px] text-orange-600 ml-1 block">(in progress)</span>
                        )}
                      </div>
                          {(() => {
                            const status = getGameStatus(game, roundIndex);
                            // BYE vs BYE in first round is valid, don't show error
                            if (status === 'bye-vs-bye' && roundIndex !== 0 && game.round !== 1) {
                              return <div className="text-xs text-red-600 font-semibold mt-1">⚠️ Invalid Game</div>;
                            }
                            if (status === 'open-vs-bye') {
                              return <div className="text-xs text-orange-600 font-semibold mt-1">⚠️ Missing Team</div>;
                            }
                            if (status === 'open-vs-open') {
                              return <div className="text-xs text-yellow-700 font-semibold mt-1">⚠️ Place Teams to Complete Game</div>;
                            }
                            if (status === 'team-vs-open') {
                              return <div className="text-xs text-yellow-700 font-semibold mt-1">⚠️ Place Team to Complete Game</div>;
                            }
                            return null;
                          })()}
                      {game.result && (
                        <div className="text-sm text-gray-600 mt-2">
                              {getTeamName(game.teamA, game, 'A')} {game.result.scoreA} - {game.result.scoreB} {getTeamName(game.teamB, game, 'B')}
                        </div>
                      )}
                      <div className="text-xs mt-2">
                        {game.courtId && tournament.courts.find(c => c.id === game.courtId)?.name}
                      </div>
                    </div>
                  </div>
                    );
                    })}
              </div>
                    )}
            </div>
              );
              })}
        </div>
      </div>
      
      {/* Losers Bracket */}
      {tournament.bracket!.losers.length > 0 && (
        (() => {
          // Only show losers bracket rounds that have at least one non-OPEN slot
          const winnersFinalFinished = isWinnersFinalFinished();

          const visibleLosersRounds = tournament.bracket!.losers
            .map((round, idx) => ({ round, idx }))
            .filter(({ round, idx }) => {
              // Hide the last losers round until winners final completes
              const isLastLosersRound = idx === tournament.bracket!.losers.length - 1;
              if (isLastLosersRound && !winnersFinalFinished) return false;

              // Show rounds that are editable (even if cleared/all OPEN)
              // or rounds that have at least one non-OPEN slot
              const isEditable = canEditLosersRound(idx);
              const hasNonOpenSlots = round.some(game =>
                game.teamA.type !== 'OPEN' || game.teamB.type !== 'OPEN'
              );
              
              return isEditable || hasNonOpenSlots;
            });

          if (visibleLosersRounds.length === 0) return null;

          return (
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Losers Bracket</h3>
          <div className="space-y-6">
                {visibleLosersRounds.map(({ round, idx }) => {
                  const roundIndex = idx;
                  return (
              <div key={roundIndex}>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium">
                        {getRoundName(roundIndex, tournament.bracket!.losers.length, round.length)}
                      </h4>
                      <button
                        onClick={() =>
                          setCollapsedRounds(prev => ({ ...prev, [`L-${roundIndex}`]: !prev[`L-${roundIndex}`] }))
                        }
                        className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 transition"
                      >
                        <span>{collapsedRounds[`L-${roundIndex}`] ? 'Show' : 'Hide'}</span>
                        <span className={`transition-transform ${collapsedRounds[`L-${roundIndex}`] ? 'rotate-180' : ''}`}>⌃</span>
                      </button>
                    </div>
                    {!collapsedRounds[`L-${roundIndex}`] && (
                      canEditLosersRound(roundIndex) && !isLosersRoundComplete(roundIndex) && (
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {tournament.settings.openSlotPolicy !== 'BYE' && (
                            <button
                              onClick={() => assignAllOpenToByeLosers(roundIndex)}
                              className="text-sm btn-secondary"
                            >
                              Assign All OPEN to BYE
                            </button>
                          )}
                          <button
                            onClick={() => autoAssignTeamsToBracketLosers(roundIndex)}
                            className="text-sm btn-primary"
                          >
                            Auto-Assign Teams
                          </button>
                          <button
                            onClick={() => {
                              const round = tournament.bracket!.losers[roundIndex];
                              const gamesInProgress = round.filter(g => 
                                g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused'
                              );
                              if (gamesInProgress.length > 0) {
                                alert(`Cannot clear losers round ${roundIndex + 1}. Some games are currently in progress. Please finish or pause those games first.`);
                                return;
                              }
                              if (confirm(`Clear all games in Losers Round ${roundIndex + 1}?`)) {
                                clearLosersRoundGames(roundIndex);
                              }
                            }}
                            className="text-sm btn-secondary"
                          >
                            Clear All Games
                          </button>
                        </div>
                      )
                    )}
                    {!collapsedRounds[`L-${roundIndex}`] && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {round.map((game) => {
                    const gameInProgress = isGameInProgress(game);
                    return (
                    <div
                      key={game.id}
                          className={`border-2 p-2 ${(() => {
                            // Gray out completed games
                            if (game.status === 'Finished') {
                              return 'border-gray-400 bg-gray-100 opacity-60';
                            }
                            const status = getGameStatus(game, roundIndex);
                            // BYE vs BYE in first round is valid, show green
                            if (status === 'bye-vs-bye' && roundIndex === 0 && game.round === 1) return 'border-green-500 bg-green-50 ring-2 ring-green-300';
                            if (status === 'bye-vs-bye') return 'border-red-500 bg-red-50 ring-2 ring-red-300';
                            if (status === 'open-vs-bye') return 'border-orange-500 bg-orange-50 ring-2 ring-orange-300';
                            if (status === 'open-vs-open') return 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-300';
                            if (status === 'team-vs-open') return 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-300';
                            if (status === 'valid') return 'border-green-500 bg-green-50 ring-2 ring-green-300';
                            return getStatusColor(game.status);
                          })()} ${!canEditLosersRound(roundIndex) ? 'opacity-50' : ''} ${gameInProgress ? 'ring-2 ring-orange-400' : ''}`}
                    >
                      {game.status === 'Finished' && (
                        <div className="text-xs text-gray-500 mb-1 text-center pb-1 border-b border-gray-300">
                          Completed
                        </div>
                      )}
                      <div className="text-center space-y-1">
                            <div 
                              draggable={false}
                              onDragOver={(e) => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDragOver(e, game.id, 'A', 'losers')}
                              onDragLeave={handleDragLeave}
                              onDrop={() => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDrop(game, 'A', 'losers')}
                              onClick={() => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleSlotClick(game, 'A', game.teamA)}
                              className={`text-sm font-semibold ${gameInProgress || game.status === 'Finished' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-gray-100'} rounded px-1.5 py-1 border-2 border-dashed transition-colors ${
                                dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'A'
                                  ? 'border-red-500 bg-red-100'
                                  : 'border-transparent'
                              } ${game.teamA.type === 'Team' ? 'bg-red-50' : 'bg-gray-50'}`}
                            >
                              {getTeamName(game.teamA, game, 'A')}
                              {canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && (
                                <span className="text-[10px] text-sport-orange ml-1 block">(click to edit)</span>
                              )}
                              {gameInProgress && (
                                <span className="text-[10px] text-orange-600 ml-1 block">(in progress)</span>
                              )}
                            </div>
                        <div className="text-sport-green font-bold text-xs">VS</div>
                            <div 
                              draggable={false}
                              onDragOver={(e) => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDragOver(e, game.id, 'B', 'losers')}
                              onDragLeave={handleDragLeave}
                              onDrop={() => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDrop(game, 'B', 'losers')}
                              onClick={() => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleSlotClick(game, 'B', game.teamB)}
                              className={`text-sm font-semibold ${gameInProgress || game.status === 'Finished' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-gray-100'} rounded px-1.5 py-1 border-2 border-dashed transition-colors ${
                                dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'B'
                                  ? 'border-red-500 bg-red-100'
                                  : 'border-transparent'
                              } ${game.teamB.type === 'Team' ? 'bg-red-50' : 'bg-gray-50'}`}
                            >
                              {getTeamName(game.teamB, game, 'B')}
                              {canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && (
                                <span className="text-[10px] text-sport-orange ml-1 block">(click to edit)</span>
                              )}
                              {gameInProgress && (
                                <span className="text-[10px] text-orange-600 ml-1 block">(in progress)</span>
                              )}
                            </div>
                        {game.result && (
                          <div className="text-sm text-gray-600 mt-2">
                                {getTeamName(game.teamA, game, 'A')} {game.result.scoreA} -{' '}
                                {game.result.scoreB} {getTeamName(game.teamB, game, 'B')}
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
                })}
          </div>
        </div>
          );
        })()
      )}
      
      {/* Grand Final */}
      {tournament.bracket!.grandFinal &&
        !(
          tournament.bracket!.grandFinal.teamA.type === 'OPEN' &&
          tournament.bracket!.grandFinal.teamB.type === 'OPEN'
        ) &&
        (
          (!isDoubleElimination && isWinnersFinalFinished()) ||
          (isDoubleElimination && isWinnersFinalFinished() && isLosersFinalFinished())
        ) && (
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Grand Final</h3>
          <div
            className={`card border-4 max-w-md mx-auto ${
              tournament.bracket!.grandFinal.status === 'Finished'
                ? 'border-gray-400 bg-gray-100 opacity-60'
                : ''
            }`}
          >
            <div className="text-center space-y-2">
              <div className="font-semibold text-lg">
                {getTeamName(tournament.bracket!.grandFinal.teamA)}
              </div>
              <div className="text-sport-green font-bold text-xl">VS</div>
              <div className="font-semibold text-lg">
                {getTeamName(tournament.bracket!.grandFinal.teamB)}
              </div>
              {tournament.bracket!.grandFinal.result && (
                <div className="text-lg text-gray-600 mt-2">
                  {getTeamName(tournament.bracket!.grandFinal.teamA)}{' '}
                  {tournament.bracket!.grandFinal.result.scoreA} -{' '}
                  {tournament.bracket!.grandFinal.result.scoreB}{' '}
                  {getTeamName(tournament.bracket!.grandFinal.teamB)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
              </div>
                  </div>
              </div>
    );
  };
              
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
              <div>
          <h2
            className="text-4xl font-heading uppercase tracking-wide-heading text-accent-orange mb-2"
            style={{ fontStyle: 'oblique' }}
          >
            BRACKET
          </h2>
          <div className="divider-orange"></div>
                  </div>
        {!viewerMode && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('editor')}
              className={viewMode === 'editor' ? 'tab-active' : 'tab-inactive'}
            >
              <span>EDITOR</span>
            </button>
            <button
              onClick={() => setViewMode('flow')}
              className={viewMode === 'flow' ? 'tab-active' : 'tab-inactive'}
            >
              <span>FULL BRACKET VIEW</span>
            </button>
          </div>
        )}
          </div>
      
      {viewerMode || viewMode === 'flow'
        ? <ReactFlowTournamentBracket tournament={tournament} />
        : renderEditorView()}
      
      {/* Edit Slot Modal */}
      {editingSlot && (() => {
        const allGames = [
          ...tournament.bracket!.winners.flat(),
          ...tournament.bracket!.losers.flat(),
          ...(tournament.bracket!.grandFinal ? [tournament.bracket!.grandFinal] : []),
        ];
        const game = allGames.find(g => g.id === editingSlot.gameId);
        if (!game) return null;
        const currentSlot = editingSlot.slot === 'A' ? game.teamA : game.teamB;
        
        // Get round index to filter teams
        const roundIndex = tournament.bracket!.winners.findIndex(round => 
          round.some(g => g.id === editingSlot.gameId)
        );
        const teamsInRound = getTeamsInRound(roundIndex);
        const eligibleTeams = getEligibleTeamsForRound(roundIndex);
        
        // Filter teams that are:
        // 1. Eligible for this round (won previous round, or round 0)
        // 2. Not already assigned in this round (or currently selected in this slot)
        const availableTeamsForRound = tournament.teams.filter(team => 
          eligibleTeams.has(team.id) &&
          (!teamsInRound.has(team.id) || 
          (currentSlot.type === 'Team' && currentSlot.teamId === team.id))
        );
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
            setEditingSlot(null);
            setNewTeamNameInput('');
          }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Edit Team Slot</h3>
            <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium mb-2">Select Existing Team</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value === '') {
                        // Remove team
                        handleSlotUpdate({ type: 'OPEN' });
                        setEditingSlot(null);
                        setNewTeamNameInput('');
                      } else if (e.target.value === 'BYE') {
                        handleSlotUpdate({ type: 'BYE' });
                        setEditingSlot(null);
                        setNewTeamNameInput('');
                      } else {
                        handleSlotUpdate({ type: 'Team', teamId: e.target.value });
                        setEditingSlot(null);
                        setNewTeamNameInput('');
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    defaultValue={currentSlot.type === 'Team' ? currentSlot.teamId : currentSlot.type}
                  >
                    <option value="">Remove (set to OPEN)</option>
                    <option value="BYE">Set to BYE</option>
                    {availableTeamsForRound.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name} {team.seed ? `(Seed ${team.seed})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Create New Team</label>
                <input
                  type="text"
                    value={newTeamNameInput}
                    onChange={(e) => setNewTeamNameInput(e.target.value)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTeamNameInput.trim()) {
                        e.preventDefault();
                        const newTeam = {
                          id: `team-${Date.now()}-${Math.random()}`,
                          name: newTeamNameInput.trim(),
                        };
                        addTeam(newTeam);
                        handleSlotUpdate({ type: 'Team', teamId: newTeam.id });
                        setEditingSlot(null);
                        setNewTeamNameInput('');
                      }
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      e.stopPropagation();
                    }
                  }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter new team name"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                      if (newTeamNameInput.trim()) {
                        const newTeam = {
                          id: `team-${Date.now()}-${Math.random()}`,
                          name: newTeamNameInput.trim(),
                        };
                        addTeam(newTeam);
                        handleSlotUpdate({ type: 'Team', teamId: newTeam.id });
                    setEditingSlot(null);
                        setNewTeamNameInput('');
                      }
                  }}
                  className="btn-primary flex-1"
                    disabled={!newTeamNameInput.trim()}
                >
                    Create & Assign
                </button>
                <button
                  onClick={() => {
                    setEditingSlot(null);
                      setNewTeamNameInput('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
