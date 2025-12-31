import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import type { Game, GameSlot, Tournament } from '../types';
import { getRoundName, getLosersRoundName } from '../lib/roundNames';
import { ReactFlowTournamentBracket } from '../components/ReactFlowTournamentBracket';
import { advanceByeInBracket } from '../lib/bracket';
import {
  Layout,
  Typography,
  Button,
  Select,
  Card,
  Space,
  Segmented,
  Alert,
  Modal,
  Row,
  Col,
  message,
} from 'antd';
import { QuestionCircleOutlined, BranchesOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

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
    autoAssignTeamsToBracket,
    autoAssignTeamsToBracketLosers,
    updateGame,
    updateTournament,
    getAllGames,
  } = store;
  const [editingSlot, setEditingSlot] = useState<{ gameId: string; slot: 'A' | 'B' } | null>(null);
  const [draggedTeam, setDraggedTeam] = useState<string | null>(null);
  const [draggedTeamPool, setDraggedTeamPool] = useState<'winners' | 'losers' | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'flow'>(viewerMode ? 'flow' : 'editor');
  const [dragOverSlot, setDragOverSlot] = useState<{ gameId: string; slot: 'A' | 'B' } | null>(null);
  const [collapsedRounds, setCollapsedRounds] = useState<Record<string, boolean>>({});
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  
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
    return <div className="p-3 sm:p-4 md:p-6 lg:p-8">No tournament loaded</div>;
  }
  
  if (!tournament.bracket) {
    // In viewer mode, don't show bracket generation buttons
    if (viewerMode) {
      return (
        <Layout style={{ minHeight: '100vh', background: '#f9fafb' }}>
          <Content style={{ padding: '24px', maxWidth: '100%', width: '100%' }}>
            <Card
              style={{
                maxWidth: '800px',
                margin: '0 auto',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '32px', fontSize: '16px' }}>
                Bracket has not been generated yet.
              </Text>
            </Card>
          </Content>
        </Layout>
      );
    }
    
    // Normal mode - show bracket generation buttons
    return (
      <Layout style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <Content style={{ padding: '24px', maxWidth: '100%', width: '100%' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#f97316' }}>
              BRACKET
            </Title>
          </div>
          
          <Card
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
            bodyStyle={{ padding: '48px' }}
          >
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <Title level={3} style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                Generate Bracket
              </Title>
              <Text style={{ fontSize: '15px', color: '#6b7280' }}>
                Choose how you want to create the tournament bracket:
              </Text>
              
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Button
                  type="primary"
                  onClick={() => generateBracket(true)}
                  size="large"
                  block
                  style={{
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                  }}
                >
                  AUTO-GENERATE BRACKET
                </Button>
                <Button
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
                  size="large"
                  block
                  style={{
                    height: '56px',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  CREATE BRACKET MANUALLY
                </Button>
                {tournament.seedingMode !== 'off' && tournament.seedingMode !== 'random' && (
                  <Alert
                    message={
                      <Text>
                        <Text strong>Seeding Active:</Text> Your tournament uses {tournament.seedingMode === 'manual' ? 'manual' : 'uploaded'} seeding 
                        {tournament.seedingType && ` with ${tournament.seedingType} seeding type`}. 
                        Auto-generating the bracket will respect your seeding configuration.
                      </Text>
                    }
                    type="warning"
                    showIcon
                    style={{ borderRadius: '12px' }}
                  />
                )}
              </Space>
            </Space>
          </Card>
        </Content>
      </Layout>
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
  
  
  const isRoundComplete = (roundIndex: number) => {
    if (roundIndex < 0 || roundIndex >= tournament.bracket!.winners.length) return false;
    const round = tournament.bracket!.winners[roundIndex];
    if (!round || round.length === 0) return false;
    // Check if all games in the round are finished
    return round.every(game => game.status === 'Finished' && game.result);
  };
  
  const isTournamentComplete = () => {
    if (!tournament.bracket) return false;

    // First check: if there are 0 remaining games, tournament is complete
    const allGames = getAllGames();
    const unfinishedGames = allGames.filter((g: Game) => {
      // Exclude BYE vs BYE games
      if (g.teamA.type === 'BYE' && g.teamB.type === 'BYE') {
        return false;
      }
      return g.status !== 'Finished';
    });
    if (unfinishedGames.length === 0) {
      return true;
    }

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
    
    // Check grand final reset game first (if it exists and is active)
    if (tournament.bracket!.grandFinalReset) {
      const resetGame = tournament.bracket!.grandFinalReset;
      if (resetGame.status === 'Finished' && resetGame.result) {
        // Reset game finished - tournament complete
        const resetWinnerId = resetGame.result.winnerId;
        winnersPool.add(resetWinnerId);
        losersPool.delete(resetWinnerId);
        
        const resetLoserId = resetGame.teamA.type === 'Team' && resetGame.teamA.teamId === resetWinnerId
          ? (resetGame.teamB.type === 'Team' ? resetGame.teamB.teamId : undefined)
          : (resetGame.teamA.type === 'Team' ? resetGame.teamA.teamId : undefined);
        if (resetLoserId) {
          eliminated.add(resetLoserId);
          losersPool.delete(resetLoserId);
          winnersPool.delete(resetLoserId);
        }
      } else if (resetGame.teamA.type !== 'OPEN' && resetGame.teamB.type !== 'OPEN') {
        // Reset game is active but not finished - both teams are still in play
        if (resetGame.teamA.type === 'Team' && resetGame.teamA.teamId) {
          // Winners bracket champion (from grand final) - not in any pool, just in reset game
          eliminated.delete(resetGame.teamA.teamId);
          losersPool.delete(resetGame.teamA.teamId);
          winnersPool.delete(resetGame.teamA.teamId);
        }
        if (resetGame.teamB.type === 'Team' && resetGame.teamB.teamId) {
          // Losers bracket champion (winner of grand final) - stays in losers pool
          losersPool.add(resetGame.teamB.teamId);
          winnersPool.delete(resetGame.teamB.teamId);
        }
      }
    }
    
    // Check grand final
    if (tournament.bracket!.grandFinal) {
      const gf = tournament.bracket!.grandFinal;
      if (gf.status === 'Finished' && gf.result) {
        const winnerId = gf.result.winnerId;
        const winnerCameFromLosers = gf.teamB.type === 'Team' && gf.teamB.teamId === winnerId;
        
        // Check if reset game is active (populated but not finished)
        const resetGame = tournament.bracket!.grandFinalReset;
        const resetGameActive = resetGame && 
          resetGame.teamA.type !== 'OPEN' && 
          resetGame.teamB.type !== 'OPEN' &&
          resetGame.status !== 'Finished';
        
        if (winnerCameFromLosers && resetGameActive) {
          // Losers bracket champion won - reset game is active
          // Team pool logic is handled above in reset game check
          // Don't mark anyone as eliminated here
        } else if (!resetGameActive) {
          // Winners bracket champion won OR reset game doesn't exist - tournament complete
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
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* Seeding Warning Banner */}
        {tournament.seedingMode !== 'off' && tournament.seedingMode !== 'random' && (
          <Alert
            message={
              <Text>
                <Text strong>⚠️ Seeding Active:</Text> Your tournament uses {tournament.seedingMode === 'manual' ? 'manual' : 'uploaded'} seeding
                {tournament.seedingType && ` with ${tournament.seedingType} seeding type`}. 
                Manually editing the bracket will disrupt the seeding configuration and may affect bracket accuracy.
              </Text>
            }
            type="warning"
            showIcon
            style={{ borderRadius: '12px' }}
          />
        )}
        
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Team Pools - Hide when tournament is complete */}
          {!tournamentComplete && (
            <div style={{ width: '300px', flexShrink: 0 }}>
              <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '4px',
                    height: '24px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    borderRadius: '2px',
                  }} />
                  <Title level={4} style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                    Team Pools
                  </Title>
                </div>
              }
              style={{
                position: 'sticky',
                top: '24px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
              }}
              headStyle={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                borderBottom: '2px solid #f3f4f6',
                borderRadius: '16px 16px 0 0',
                padding: '24px',
              }}
              bodyStyle={{
                padding: '24px',
                background: '#fafafa',
              }}
            >
              <div style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #fcd34d',
              }}>
                <Text style={{ fontSize: '13px', lineHeight: '1.6', color: '#92400e', fontWeight: 500 }}>
                  💡 Drag teams to bracket slots or click slots to edit, or press auto-assign teams in order to populate the bracket.
                </Text>
              </div>
              <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                  {/* Teams Pool - for single elimination */}
                  {!tournament.settings.includeLosersBracket && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #dcfce7',
                      }}>
                        <div style={{
                          width: '3px',
                          height: '20px',
                          background: '#16a34a',
                          borderRadius: '2px',
                        }} />
                        <Text strong style={{ fontSize: '14px', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Teams
                        </Text>
                      </div>
                      {availableTeams.winnersAvailable.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Available</Text>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {availableTeams.winnersAvailable.map(team => {
                              const eligibleForWinners = tournament.bracket!.winners.some((_, idx) => 
                                !isRoundComplete(idx) && canEditRound(idx) && getEligibleTeamsForRound(idx).has(team.id)
                              );
                              const canDrag = eligibleForWinners && !tournamentComplete;
                              return (
                                <Card
                                  key={team.id}
                                  draggable={canDrag}
                                  onDragStart={() => canDrag && handleDragStart(team.id, 'winners')}
                                  size="small"
                                  style={{
                                    cursor: canDrag ? 'move' : 'not-allowed',
                                    opacity: canDrag ? 1 : 0.5,
                                    background: canDrag ? '#f0fdf4' : '#f3f4f6',
                                    borderColor: canDrag ? '#86efac' : '#d1d5db',
                                    borderRadius: '10px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: canDrag ? '0 2px 8px rgba(22, 163, 74, 0.1)' : 'none',
                                  }}
                                  bodyStyle={{ padding: '14px' }}
                                  hoverable={canDrag}
                                >
                                  <Text strong={canDrag} style={{ color: canDrag ? undefined : '#6b7280' }}>
                                    {team.name}
                                  </Text>
                                  {team.seed && (
                                    <div>
                                      <Text type="secondary" style={{ fontSize: '12px' }}>Seed: {team.seed}</Text>
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                          </Space>
                        </div>
                      )}
                      {availableTeams.winnersAssigned.length > 0 && (
                        <div>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Assigned</Text>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {availableTeams.winnersAssigned.map(team => (
                              <Card
                                key={team.id}
                                size="small"
                                style={{
                                  background: '#f3f4f6',
                                  borderColor: '#d1d5db',
                                  borderRadius: '10px',
                                  opacity: 0.6,
                                }}
                                bodyStyle={{ padding: '14px' }}
                              >
                                <Text strong>{team.name}</Text>
                                {team.seed && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>Seed: {team.seed}</Text>
                                  </div>
                                )}
                              </Card>
                            ))}
                          </Space>
                        </div>
                      )}
                      {availableTeams.winnersAvailable.length === 0 && availableTeams.winnersAssigned.length === 0 && (
                        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '8px', fontSize: '13px' }}>
                          No teams available
                        </Text>
                      )}
                    </div>
                  )}
                  
                  {/* Winners Pool - only show if double elimination */}
                  {tournament.settings.includeLosersBracket && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #dcfce7',
                      }}>
                        <div style={{
                          width: '3px',
                          height: '20px',
                          background: '#16a34a',
                          borderRadius: '2px',
                        }} />
                        <Text strong style={{ fontSize: '14px', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Winners Bracket Pool
                        </Text>
                      </div>
                      {availableTeams.winnersAvailable.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Available</Text>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {availableTeams.winnersAvailable.map(team => {
                              const eligibleForWinners = tournament.bracket!.winners.some((_, idx) => 
                                !isRoundComplete(idx) && canEditRound(idx) && getEligibleTeamsForRound(idx).has(team.id)
                              );
                              const canDrag = eligibleForWinners && !tournamentComplete;
                              return (
                                <Card
                                  key={team.id}
                                  draggable={canDrag}
                                  onDragStart={() => canDrag && handleDragStart(team.id, 'winners')}
                                  size="small"
                                  style={{
                                    cursor: canDrag ? 'move' : 'not-allowed',
                                    opacity: canDrag ? 1 : 0.5,
                                    background: canDrag ? '#f0fdf4' : '#f3f4f6',
                                    borderColor: canDrag ? '#86efac' : '#d1d5db',
                                    borderRadius: '8px',
                                  }}
                                  bodyStyle={{ padding: '12px' }}
                                >
                                  <Text strong={canDrag} style={{ color: canDrag ? undefined : '#6b7280' }}>
                                    {team.name}
                                  </Text>
                                  {team.seed && (
                                    <div>
                                      <Text type="secondary" style={{ fontSize: '12px' }}>Seed: {team.seed}</Text>
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                          </Space>
                        </div>
                      )}
                      {availableTeams.winnersAssigned.length > 0 && (
                        <div>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Assigned</Text>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {availableTeams.winnersAssigned.map(team => (
                              <Card
                                key={team.id}
                                size="small"
                                style={{
                                  background: '#f3f4f6',
                                  borderColor: '#d1d5db',
                                  borderRadius: '8px',
                                  opacity: 0.6,
                                }}
                                bodyStyle={{ padding: '12px' }}
                              >
                                <Text strong>{team.name}</Text>
                                {team.seed && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>Seed: {team.seed}</Text>
                                  </div>
                                )}
                              </Card>
                            ))}
                          </Space>
                        </div>
                      )}
                      {availableTeams.winnersAvailable.length === 0 && availableTeams.winnersAssigned.length === 0 && (
                        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '8px', fontSize: '13px' }}>
                          No teams in winners pool
                        </Text>
                      )}
                    </div>
                  )}

                  {/* Losers Pool - only show if double elimination */}
                  {isDoubleElimination && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #fee2e2',
                      }}>
                        <div style={{
                          width: '3px',
                          height: '20px',
                          background: '#dc2626',
                          borderRadius: '2px',
                        }} />
                        <Text strong style={{ fontSize: '14px', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Losers Bracket Pool
                        </Text>
                      </div>
                      {availableTeams.losersAvailable.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Available</Text>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
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
                                <Card
                                  key={team.id}
                                  draggable={canDrag}
                                  onDragStart={() => canDrag && handleDragStart(team.id, 'losers')}
                                  size="small"
                                  style={{
                                    cursor: canDrag ? 'move' : 'not-allowed',
                                    opacity: canDrag ? 1 : 0.5,
                                    background: canDrag ? '#fef2f2' : '#f3f4f6',
                                    borderColor: canDrag ? '#fca5a5' : '#d1d5db',
                                    borderRadius: '10px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: canDrag ? '0 2px 8px rgba(220, 38, 38, 0.1)' : 'none',
                                  }}
                                  bodyStyle={{ padding: '14px' }}
                                  hoverable={canDrag}
                                >
                                  <Text strong={canDrag} style={{ color: canDrag ? undefined : '#6b7280' }}>
                                    {team.name}
                                  </Text>
                                  {team.seed && (
                                    <div>
                                      <Text type="secondary" style={{ fontSize: '12px' }}>Seed: {team.seed}</Text>
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                          </Space>
                        </div>
                      )}
                      {availableTeams.losersAssigned.length > 0 && (
                        <div>
                          <Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Assigned</Text>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {availableTeams.losersAssigned.map(team => (
                              <Card
                                key={team.id}
                                size="small"
                                style={{
                                  background: '#f3f4f6',
                                  borderColor: '#d1d5db',
                                  borderRadius: '10px',
                                  opacity: 0.6,
                                }}
                                bodyStyle={{ padding: '14px' }}
                              >
                                <Text strong>{team.name}</Text>
                                {team.seed && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>Seed: {team.seed}</Text>
                                  </div>
                                )}
                              </Card>
                            ))}
                          </Space>
                        </div>
                      )}
                      {availableTeams.losersAvailable.length === 0 && availableTeams.losersAssigned.length === 0 && (
                        <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '8px', fontSize: '13px' }}>
                          No teams in losers pool
                        </Text>
                      )}
                    </div>
                  )}

                  {/* Eliminated Teams */}
                  {availableTeams.eliminated.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #e5e7eb',
                      }}>
                        <div style={{
                          width: '3px',
                          height: '20px',
                          background: '#6b7280',
                          borderRadius: '2px',
                        }} />
                        <Text strong style={{ fontSize: '14px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Eliminated
                        </Text>
                      </div>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {availableTeams.eliminated.map(team => (
                          <Card
                            key={team.id}
                            size="small"
                            style={{
                              background: '#f3f4f6',
                              borderColor: '#d1d5db',
                              borderRadius: '10px',
                              opacity: 0.5,
                            }}
                            bodyStyle={{ padding: '14px' }}
                          >
                            <Text strong style={{ color: '#9ca3af', textDecoration: 'line-through' }}>
                              {team.name}
                            </Text>
                            {team.seed && (
                              <div>
                                <Text type="secondary" style={{ fontSize: '12px', color: '#9ca3af' }}>Seed: {team.seed}</Text>
                              </div>
                            )}
                          </Card>
                        ))}
                      </Space>
                    </div>
                  )}
                </Space>
              </div>
            </Card>
          </div>
          )}
        
          {/* Bracket Editor */}
          <div style={{ flex: 1 }}>
            {/* Winners Bracket */}
            <div style={{ marginBottom: '32px' }}>
              {isDoubleElimination && (
                <Title level={3} style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 700 }}>
                  Winners Bracket
                </Title>
              )}
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                {tournament.bracket!.winners.map((round, roundIndex) => {
                  if (!shouldShowRound(roundIndex)) return null;
                  const key = `W-${roundIndex}`;
                  const isCollapsed = !!collapsedRounds[key];
                  
                  return (
                    <Card
                      key={roundIndex}
                      style={{
                        marginBottom: '24px',
                        borderRadius: '16px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e5e7eb',
                      }}
                      bodyStyle={{ padding: '24px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, lineHeight: '1.2' }}>
                            {getRoundName(roundIndex, tournament.bracket!.winners.length, round.length).toUpperCase()}
                          </Title>
                          <Button
                            size="small"
                            onClick={() =>
                              setCollapsedRounds(prev => ({ ...prev, [key]: !prev[key] }))
                            }
                            style={{
                              borderRadius: '8px',
                              fontSize: '12px',
                              height: '28px',
                              padding: '0 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isCollapsed ? 'Show' : 'Hide'}
                          </Button>
                        </div>
                        {!canEditRound(roundIndex) && (
                          <Alert
                            message={`Complete ${getRoundName(roundIndex - 1, tournament.bracket!.winners.length, tournament.bracket!.winners[roundIndex - 1]?.length || 0)} first`}
                            type="warning"
                            showIcon
                            style={{ borderRadius: '8px', fontSize: '13px' }}
                          />
                        )}
                        {canEditRound(roundIndex) && !isRoundComplete(roundIndex) && (
                          <Space size={8} wrap>
                            {tournament.settings.openSlotPolicy !== 'BYE' && (
                              <Button
                                size="small"
                                onClick={() => assignAllOpenToBye(roundIndex)}
                                style={{
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  height: '32px',
                                }}
                              >
                                Assign All OPEN to BYE
                              </Button>
                            )}
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => autoAssignTeamsToBracket(roundIndex)}
                              style={{
                                borderRadius: '8px',
                                fontSize: '13px',
                                height: '32px',
                                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                border: 'none',
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                              }}
                            >
                              Auto-Assign Teams
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={() => {
                                // Check if any games in the round are in progress
                                const gamesInProgress = round.filter(g => 
                                  g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused'
                                );
                                const gamesToClear = round.filter(g => 
                                  g.status === 'Queued' || g.status === 'Finished'
                                );
                                
                                if (gamesToClear.length === 0) {
                                  message.info('No games to clear. All games are currently in progress.');
                                  return;
                                }
                                
                                Modal.confirm({
                                  title: 'Clear All Games',
                                  content: gamesInProgress.length > 0
                                    ? `Are you sure you want to clear ${gamesToClear.length} game(s) in Round ${roundIndex + 1}? ${gamesInProgress.length} game(s) are currently in progress and will not be cleared.`
                                    : `Are you sure you want to clear all games in Round ${roundIndex + 1}?`,
                                  onOk: () => {
                                    clearRoundGames(roundIndex);
                                    if (gamesInProgress.length > 0) {
                                      message.warning(`${gamesInProgress.length} or more match(es) were unable to be cleared because they are in progress.`);
                                    }
                                  },
                                  okText: 'Clear',
                                  okButtonProps: { danger: true },
                                });
                              }}
                              style={{
                                borderRadius: '8px',
                                fontSize: '13px',
                                height: '32px',
                              }}
                            >
                              Clear All Games
                            </Button>
                          </Space>
                        )}
                      </div>
                    {!isCollapsed && (
                      <Row gutter={[16, 16]}>
                        {round.map((game) => {
                          const gameInProgress = isGameInProgress(game);
                          const status = getGameStatus(game, roundIndex);
                          
                          // Determine card border color based on status
                          let borderColor = '#d1d5db';
                          let backgroundColor = '#ffffff';
                          if (game.status === 'Finished') {
                            borderColor = '#9ca3af';
                            backgroundColor = '#f3f4f6';
                          } else if (status === 'valid' || (status === 'bye-vs-bye' && roundIndex === 0 && game.round === 1)) {
                            borderColor = '#16a34a';
                            backgroundColor = '#f0fdf4';
                          } else if (status === 'bye-vs-bye') {
                            borderColor = '#dc2626';
                            backgroundColor = '#fef2f2';
                          } else if (status === 'open-vs-bye' || status === 'open-vs-open' || status === 'team-vs-open') {
                            borderColor = '#f59e0b';
                            backgroundColor = '#fffbeb';
                          }
                          
                          return (
                            <Col xs={24} sm={12} lg={8} xl={6} key={game.id}>
                              <Card
                                style={{
                                  border: `2px solid ${borderColor}`,
                                  borderRadius: '12px',
                                  background: backgroundColor,
                                  opacity: !canEditRound(roundIndex) ? 0.5 : game.status === 'Finished' ? 0.6 : 1,
                                  boxShadow: gameInProgress ? '0 0 0 3px rgba(249, 115, 22, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                                  transition: 'all 0.2s ease',
                                }}
                                bodyStyle={{ padding: '16px' }}
                              >
                                {game.status === 'Finished' && (
                                  <div style={{ 
                                    textAlign: 'center', 
                                    fontSize: '11px', 
                                    color: '#6b7280', 
                                    fontWeight: 600, 
                                    marginBottom: '12px', 
                                    paddingBottom: '8px', 
                                    borderBottom: '1px solid #e5e7eb' 
                                  }}>
                                    Completed
                                  </div>
                                )}
                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                  <div
                                    draggable={false}
                                    onDragOver={(e) => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDragOver(e, game.id, 'A', 'winners')}
                                    onDragLeave={handleDragLeave}
                                    onDrop={() => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDrop(game, 'A', 'winners')}
                                    onClick={() => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleSlotClick(game, 'A', game.teamA)}
                                    style={{
                                      cursor: gameInProgress || game.status === 'Finished' ? 'not-allowed' : 'pointer',
                                      opacity: gameInProgress || game.status === 'Finished' ? 0.75 : 1,
                                      padding: '12px',
                                      borderRadius: '8px',
                                      border: `2px dashed ${dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'A' ? '#3b82f6' : 'transparent'}`,
                                      background: dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'A' 
                                        ? '#dbeafe' 
                                        : game.teamA.type === 'Team' 
                                          ? '#eff6ff' 
                                          : '#f9fafb',
                                      transition: 'all 0.2s ease',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <Text strong style={{ fontSize: '14px', display: 'block' }}>
                                      {getTeamName(game.teamA, game, 'A')}
                                    </Text>
                                    {canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && (
                                      <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#f97316' }}>
                                        (click to edit)
                                      </Text>
                                    )}
                                    {gameInProgress && (
                                      <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#ea580c' }}>
                                        (in progress)
                                      </Text>
                                    )}
                                  </div>
                                  
                                  <div style={{ textAlign: 'center' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
                                      VS
                                    </Text>
                                  </div>
                                  
                                  <div
                                    draggable={false}
                                    onDragOver={(e) => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDragOver(e, game.id, 'B', 'winners')}
                                    onDragLeave={handleDragLeave}
                                    onDrop={() => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDrop(game, 'B', 'winners')}
                                    onClick={() => canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleSlotClick(game, 'B', game.teamB)}
                                    style={{
                                      cursor: gameInProgress || game.status === 'Finished' ? 'not-allowed' : 'pointer',
                                      opacity: gameInProgress || game.status === 'Finished' ? 0.75 : 1,
                                      padding: '12px',
                                      borderRadius: '8px',
                                      border: `2px dashed ${dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'B' ? '#3b82f6' : 'transparent'}`,
                                      background: dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'B' 
                                        ? '#dbeafe' 
                                        : game.teamB.type === 'Team' 
                                          ? '#eff6ff' 
                                          : '#f9fafb',
                                      transition: 'all 0.2s ease',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <Text strong style={{ fontSize: '14px', display: 'block' }}>
                                      {getTeamName(game.teamB, game, 'B')}
                                    </Text>
                                    {canEditRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && (
                                      <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#f97316' }}>
                                        (click to edit)
                                      </Text>
                                    )}
                                    {gameInProgress && (
                                      <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#ea580c' }}>
                                        (in progress)
                                      </Text>
                                    )}
                                  </div>
                                  
                                  {(() => {
                                    if (status === 'bye-vs-bye' && roundIndex !== 0 && game.round !== 1) {
                                      return (
                                        <Alert
                                          message="Invalid Game"
                                          type="error"
                                          showIcon
                                          style={{ borderRadius: '8px', fontSize: '12px', marginTop: '8px' }}
                                        />
                                      );
                                    }
                                    if (status === 'open-vs-bye') {
                                      return (
                                        <Alert
                                          message="Missing Team"
                                          type="warning"
                                          showIcon
                                          style={{ borderRadius: '8px', fontSize: '12px', marginTop: '8px' }}
                                        />
                                      );
                                    }
                                    if (status === 'open-vs-open') {
                                      return (
                                        <Alert
                                          message="Place Teams to Complete Game"
                                          type="warning"
                                          showIcon
                                          style={{ borderRadius: '8px', fontSize: '12px', marginTop: '8px' }}
                                        />
                                      );
                                    }
                                    if (status === 'team-vs-open') {
                                      return (
                                        <Alert
                                          message="Place Team to Complete Game"
                                          type="warning"
                                          showIcon
                                          style={{ borderRadius: '8px', fontSize: '12px', marginTop: '8px' }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {game.result && (
                                    <div style={{ 
                                      textAlign: 'center', 
                                      marginTop: '8px', 
                                      padding: '8px', 
                                      background: '#f3f4f6', 
                                      borderRadius: '8px' 
                                    }}>
                                      <Text style={{ fontSize: '13px', color: '#6b7280' }}>
                                        {getTeamName(game.teamA, game, 'A')} {game.result.scoreA} - {game.result.scoreB} {getTeamName(game.teamB, game, 'B')}
                                      </Text>
                                    </div>
                                  )}
                                  
                                  {game.courtId && (
                                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                                      <Text type="secondary" style={{ fontSize: '11px' }}>
                                        {tournament.courts.find(c => c.id === game.courtId)?.name}
                                      </Text>
                                    </div>
                                  )}
                                </Space>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    )}
                    </Card>
                  );
                })}
              </Space>
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
            <div style={{ marginBottom: '32px' }}>
              <Title level={3} style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 700 }}>
                Losers Bracket
              </Title>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                {visibleLosersRounds.map(({ round, idx }) => {
                  const roundIndex = idx;
                  const key = `L-${roundIndex}`;
                  const isCollapsed = !!collapsedRounds[key];
                  
                  return (
                    <Card
                      key={roundIndex}
                      style={{
                        marginBottom: '24px',
                        borderRadius: '16px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e5e7eb',
                      }}
                      bodyStyle={{ padding: '24px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, lineHeight: '1.2' }}>
                            {getLosersRoundName(roundIndex, tournament.bracket!.losers.length, round.length).toUpperCase()}
                          </Title>
                          <Button
                            size="small"
                            onClick={() =>
                              setCollapsedRounds(prev => ({ ...prev, [key]: !prev[key] }))
                            }
                            style={{
                              borderRadius: '8px',
                              fontSize: '12px',
                              height: '28px',
                              padding: '0 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isCollapsed ? 'Show' : 'Hide'}
                          </Button>
                        </div>
                        {!isCollapsed && canEditLosersRound(roundIndex) && !isLosersRoundComplete(roundIndex) && (
                          <Space size={8} wrap>
                            {tournament.settings.openSlotPolicy !== 'BYE' && (
                              <Button
                                size="small"
                                onClick={() => assignAllOpenToByeLosers(roundIndex)}
                                style={{
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  height: '32px',
                                }}
                              >
                                Assign All OPEN to BYE
                              </Button>
                            )}
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => autoAssignTeamsToBracketLosers(roundIndex)}
                              style={{
                                borderRadius: '8px',
                                fontSize: '13px',
                                height: '32px',
                                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                border: 'none',
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                              }}
                            >
                              Auto-Assign Teams
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const round = tournament.bracket!.losers[roundIndex];
                                if (!round) {
                                  console.error('Round not found at index:', roundIndex);
                                  return;
                                }
                                const gamesInProgress = round.filter(g => 
                                  g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused'
                                );
                                const gamesToClear = round.filter(g => 
                                  g.status === 'Queued' || g.status === 'Finished'
                                );
                                
                                if (gamesToClear.length === 0) {
                                  message.info('No games to clear. All games are currently in progress.');
                                  return;
                                }
                                
                                Modal.confirm({
                                  title: 'Clear All Games',
                                  content: gamesInProgress.length > 0
                                    ? `Are you sure you want to clear ${gamesToClear.length} game(s) in Losers Round ${roundIndex + 1}? ${gamesInProgress.length} game(s) are currently in progress and will not be cleared.`
                                    : `Are you sure you want to clear all games in Losers Round ${roundIndex + 1}?`,
                                  onOk: () => {
                                    try {
                                      clearLosersRoundGames(roundIndex);
                                      if (gamesInProgress.length > 0) {
                                        message.warning(`${gamesInProgress.length} or more match(es) were unable to be cleared because they are in progress.`);
                                      }
                                    } catch (error) {
                                      console.error('Error clearing losers round games:', error);
                                      message.error('Failed to clear games. Please try again.');
                                    }
                                  },
                                  okText: 'Clear',
                                  okButtonProps: { danger: true },
                                });
                              }}
                              style={{
                                borderRadius: '8px',
                                fontSize: '13px',
                                height: '32px',
                              }}
                            >
                              Clear All Games
                            </Button>
                          </Space>
                        )}
                      </div>
                    {!isCollapsed && (
                      <Row gutter={[16, 16]}>
                        {round.map((game) => {
                          const gameInProgress = isGameInProgress(game);
                          const status = getGameStatus(game, roundIndex);
                          
                          // Determine card border color based on status
                          let borderColor = '#d1d5db';
                          let backgroundColor = '#ffffff';
                          if (game.status === 'Finished') {
                            borderColor = '#9ca3af';
                            backgroundColor = '#f3f4f6';
                          } else if (status === 'valid' || (status === 'bye-vs-bye' && roundIndex === 0 && game.round === 1)) {
                            borderColor = '#16a34a';
                            backgroundColor = '#f0fdf4';
                          } else if (status === 'bye-vs-bye') {
                            borderColor = '#dc2626';
                            backgroundColor = '#fef2f2';
                          } else if (status === 'open-vs-bye' || status === 'open-vs-open' || status === 'team-vs-open') {
                            borderColor = '#f59e0b';
                            backgroundColor = '#fffbeb';
                          }
                          
                          return (
                            <Col xs={24} sm={12} lg={8} xl={6} key={game.id}>
                              <Card
                                style={{
                                  border: `2px solid ${borderColor}`,
                                  borderRadius: '12px',
                                  background: backgroundColor,
                                  opacity: !canEditLosersRound(roundIndex) ? 0.5 : game.status === 'Finished' ? 0.6 : 1,
                                  boxShadow: gameInProgress ? '0 0 0 3px rgba(249, 115, 22, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                                  transition: 'all 0.2s ease',
                                }}
                                bodyStyle={{ padding: '16px' }}
                              >
                                {game.status === 'Finished' && (
                                  <div style={{ 
                                    textAlign: 'center', 
                                    fontSize: '11px', 
                                    color: '#6b7280', 
                                    fontWeight: 600, 
                                    marginBottom: '12px', 
                                    paddingBottom: '8px', 
                                    borderBottom: '1px solid #e5e7eb' 
                                  }}>
                                    Completed
                                  </div>
                                )}
                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                  <div
                                    draggable={false}
                                    onDragOver={(e) => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDragOver(e, game.id, 'A', 'losers')}
                                    onDragLeave={handleDragLeave}
                                    onDrop={() => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDrop(game, 'A', 'losers')}
                                    onClick={() => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleSlotClick(game, 'A', game.teamA)}
                                    style={{
                                      cursor: gameInProgress || game.status === 'Finished' ? 'not-allowed' : 'pointer',
                                      opacity: gameInProgress || game.status === 'Finished' ? 0.75 : 1,
                                      padding: '12px',
                                      borderRadius: '8px',
                                      border: `2px dashed ${dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'A' ? '#dc2626' : 'transparent'}`,
                                      background: dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'A' 
                                        ? '#fee2e2' 
                                        : game.teamA.type === 'Team' 
                                          ? '#fef2f2' 
                                          : '#f9fafb',
                                      transition: 'all 0.2s ease',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <Text strong style={{ fontSize: '14px', display: 'block' }}>
                                      {getTeamName(game.teamA, game, 'A')}
                                    </Text>
                                    {canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && (
                                      <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#f97316' }}>
                                        (click to edit)
                                      </Text>
                                    )}
                                    {gameInProgress && (
                                      <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#ea580c' }}>
                                        (in progress)
                                      </Text>
                                    )}
                                  </div>
                                  
                                  <div style={{ textAlign: 'center' }}>
                                    <Text strong style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
                                      VS
                                    </Text>
                                  </div>
                                  
                                  <div
                                    draggable={false}
                                    onDragOver={(e) => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDragOver(e, game.id, 'B', 'losers')}
                                    onDragLeave={handleDragLeave}
                                    onDrop={() => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleDrop(game, 'B', 'losers')}
                                    onClick={() => canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && handleSlotClick(game, 'B', game.teamB)}
                                    style={{
                                      cursor: gameInProgress || game.status === 'Finished' ? 'not-allowed' : 'pointer',
                                      opacity: gameInProgress || game.status === 'Finished' ? 0.75 : 1,
                                      padding: '12px',
                                      borderRadius: '8px',
                                      border: `2px dashed ${dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'B' ? '#dc2626' : 'transparent'}`,
                                      background: dragOverSlot?.gameId === game.id && dragOverSlot?.slot === 'B' 
                                        ? '#fee2e2' 
                                        : game.teamB.type === 'Team' 
                                          ? '#fef2f2' 
                                          : '#f9fafb',
                                      transition: 'all 0.2s ease',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <Text strong style={{ fontSize: '14px', display: 'block' }}>
                                      {getTeamName(game.teamB, game, 'B')}
                                    </Text>
                                    {canEditLosersRound(roundIndex) && !gameInProgress && game.status !== 'Finished' && (
                                      <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#f97316' }}>
                                        (click to edit)
                                      </Text>
                                    )}
                                    {gameInProgress && (
                                      <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#ea580c' }}>
                                        (in progress)
                                      </Text>
                                    )}
                                  </div>
                                  
                                  {(() => {
                                    if (status === 'bye-vs-bye' && roundIndex !== 0 && game.round !== 1) {
                                      return (
                                        <Alert
                                          message="Invalid Game"
                                          type="error"
                                          showIcon
                                          style={{ borderRadius: '8px', fontSize: '12px', marginTop: '8px' }}
                                        />
                                      );
                                    }
                                    if (status === 'open-vs-bye') {
                                      return (
                                        <Alert
                                          message="Missing Team"
                                          type="warning"
                                          showIcon
                                          style={{ borderRadius: '8px', fontSize: '12px', marginTop: '8px' }}
                                        />
                                      );
                                    }
                                    if (status === 'open-vs-open') {
                                      return (
                                        <Alert
                                          message="Place Teams to Complete Game"
                                          type="warning"
                                          showIcon
                                          style={{ borderRadius: '8px', fontSize: '12px', marginTop: '8px' }}
                                        />
                                      );
                                    }
                                    if (status === 'team-vs-open') {
                                      return (
                                        <Alert
                                          message="Place Team to Complete Game"
                                          type="warning"
                                          showIcon
                                          style={{ borderRadius: '8px', fontSize: '12px', marginTop: '8px' }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {game.result && (
                                    <div style={{ 
                                      textAlign: 'center', 
                                      marginTop: '8px', 
                                      padding: '8px', 
                                      background: '#f3f4f6', 
                                      borderRadius: '8px' 
                                    }}>
                                      <Text style={{ fontSize: '13px', color: '#6b7280' }}>
                                        {getTeamName(game.teamA, game, 'A')} {game.result.scoreA} - {game.result.scoreB} {getTeamName(game.teamB, game, 'B')}
                                      </Text>
                                    </div>
                                  )}
                                  
                                  {game.courtId && (
                                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                                      <Text type="secondary" style={{ fontSize: '11px' }}>
                                        {tournament.courts.find(c => c.id === game.courtId)?.name}
                                      </Text>
                                    </div>
                                  )}
                                </Space>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    )}
                    </Card>
                  );
                })}
              </Space>
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
                  {tournament.settings.scoringRequired !== false
                    ? `${getTeamName(tournament.bracket!.grandFinal.teamA)} ${tournament.bracket!.grandFinal.result.scoreA} - ${tournament.bracket!.grandFinal.result.scoreB} ${getTeamName(tournament.bracket!.grandFinal.teamB)}`
                    : `${getTeamName(tournament.bracket!.grandFinal.teamA)} vs ${getTeamName(tournament.bracket!.grandFinal.teamB)} - ${tournament.bracket!.grandFinal.result.winnerId === (tournament.bracket!.grandFinal.teamA.type === 'Team' ? tournament.bracket!.grandFinal.teamA.teamId : undefined) ? getTeamName(tournament.bracket!.grandFinal.teamA) : getTeamName(tournament.bracket!.grandFinal.teamB)} won`}
                </div>
              )}
            </div>
          </div>
          </div>
            )}
            
            {/* Grand Final Reset - Show when grand final is finished and losers bracket champion won, or if reset exists and has teams assigned */}
            {tournament.bracket!.grandFinalReset &&
        tournament.bracket!.grandFinalReset.teamA.type !== 'OPEN' &&
        tournament.bracket!.grandFinalReset.teamB.type !== 'OPEN' && (
          <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Grand Final Reset</h3>
          <div
            className={`card border-4 max-w-md mx-auto ${
              tournament.bracket!.grandFinalReset.status === 'Finished'
                ? 'border-gray-400 bg-gray-100 opacity-60'
                : ''
            }`}
          >
            <div className="text-center space-y-2">
              <div className="font-semibold text-lg">
                {getTeamName(tournament.bracket!.grandFinalReset.teamA)}
              </div>
              <div className="text-sport-green font-bold text-xl">VS</div>
              <div className="font-semibold text-lg">
                {getTeamName(tournament.bracket!.grandFinalReset.teamB)}
              </div>
              {tournament.bracket!.grandFinalReset.result && (
                <div className="text-lg text-gray-600 mt-2">
                  {tournament.settings.scoringRequired !== false
                    ? `${getTeamName(tournament.bracket!.grandFinalReset.teamA)} ${tournament.bracket!.grandFinalReset.result.scoreA} - ${tournament.bracket!.grandFinalReset.result.scoreB} ${getTeamName(tournament.bracket!.grandFinalReset.teamB)}`
                    : `${getTeamName(tournament.bracket!.grandFinalReset.teamA)} vs ${getTeamName(tournament.bracket!.grandFinalReset.teamB)} - ${tournament.bracket!.grandFinalReset.result.winnerId === (tournament.bracket!.grandFinalReset.teamA.type === 'Team' ? tournament.bracket!.grandFinalReset.teamA.teamId : undefined) ? getTeamName(tournament.bracket!.grandFinalReset.teamA) : getTeamName(tournament.bracket!.grandFinalReset.teamB)} won`}
                </div>
              )}
            </div>
          </div>
          </div>
            )}
          </div>
        </div>
      </Space>
    );
  };
              
  return (
    <Layout style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Poppins', sans-serif; }
      `}</style>

      <Content style={{ padding: '24px', maxWidth: '100%', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BranchesOutlined style={{ fontSize: '32px', color: '#f97316' }} />
              <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#f97316' }}>
                {viewerMode || viewMode === 'flow' ? 'BRACKET VIEWER' : 'BRACKET EDITOR'}
              </Title>
            </div>
            {!viewerMode && (
              <Space size={12} align="center">
                <style>{`
                  .bracket-view-toggle .ant-segmented-item-selected {
                    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
                    color: #ffffff !important;
                    font-weight: 700 !important;
                    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3) !important;
                  }
                  .bracket-view-toggle .ant-segmented-item {
                    font-weight: 600;
                    transition: all 0.2s ease;
                    padding: 0 24px !important;
                  }
                  .bracket-view-toggle .ant-segmented-item:hover:not(.ant-segmented-item-selected) {
                    color: #f97316;
                    background: #fef3c7;
                  }
                `}</style>
                <Segmented
                  className="bracket-view-toggle"
                  options={[
                    { label: 'Editor', value: 'editor' },
                    { label: 'Viewer', value: 'flow' },
                  ]}
                  value={viewMode}
                  onChange={(value) => setViewMode(value as 'editor' | 'flow')}
                  size="large"
                  style={{
                    background: '#f3f4f6',
                    padding: '4px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                />
                <Button
                  icon={<QuestionCircleOutlined />}
                  onClick={() => setHelpModalVisible(true)}
                  style={{
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Help
                </Button>
              </Space>
            )}
          </div>
        </div>
      
        {viewerMode || viewMode === 'flow'
          ? <ReactFlowTournamentBracket tournament={tournament} />
          : renderEditorView()}
      
      {/* Help Modal */}
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#f97316' }}>
            Bracket Helpdesk
          </Title>
        }
        open={helpModalVisible}
        onCancel={() => setHelpModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setHelpModalVisible(false)}>
            Got it!
          </Button>
        ]}
        width={700}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
              Editor vs Viewer
            </Title>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
              • <strong>Editor Mode:</strong> Use this to pair teams and set up your bracket. Drag teams from the Team Pools sidebar into game slots, or click on slots to manually assign teams, or click on the auto-assign teams button.
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
              • <strong>Viewer Mode:</strong> Click "Viewer" to see your bracket in full visual form based on the games you've paired in the editor. This shows the complete tournament flow.
            </Text>
          </div>

          <div>
            <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
              Pairing Teams
            </Title>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
              • <strong>Drag and Drop:</strong> Drag teams from the Team Pools sidebar and drop them into game slots (the boxes labeled "Team A" or "Team B").
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
              • <strong>Click to Edit:</strong> Click on any game slot to manually assign a team, create a new team, or set a BYE.
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
              • <strong>Auto-Assign:</strong> Use the "Auto-Assign Teams" button on each round to automatically pair available teams based on seeding.
            </Text>
          </div>

          <div>
            <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
              Game Status Colors
            </Title>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #16a34a', background: '#f0fdf4' }} />
                <Text style={{ fontSize: '14px' }}>
                  <strong>Green Border:</strong> Valid game with both teams properly paired. This game will appear as available in the Courts page.
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #f59e0b', background: '#fffbeb' }} />
                <Text style={{ fontSize: '14px' }}>
                  <strong>Yellow/Orange Border:</strong> Game needs teams assigned. Missing one or both teams.
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #dc2626', background: '#fef2f2' }} />
                <Text style={{ fontSize: '14px' }}>
                  <strong>Red Border:</strong> Invalid game (e.g., BYE vs BYE in later rounds). Fix this before proceeding.
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #9ca3af', background: '#f3f4f6', opacity: 0.6 }} />
                <Text style={{ fontSize: '14px' }}>
                  <strong>Gray Border:</strong> Game is completed.
                </Text>
              </div>
            </Space>
          </div>

          <div>
            <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
              From Editor to Courts
            </Title>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
              Once you properly pair teams and the game shows a <strong style={{ color: '#16a34a' }}>green border</strong>, that game becomes available in the <strong>Courts</strong> page. You can then assign it to a court and start playing!
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block' }}>
              Games with incomplete pairings (yellow/orange borders) or invalid configurations (red borders) will not appear in the Courts page until they are fixed.
            </Text>
          </div>

          <div>
            <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
              Tips
            </Title>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '4px' }}>
              • Complete earlier rounds before moving to later rounds
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '4px' }}>
              • Use "Clear All Games" to reset a round if needed
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '4px' }}>
              • Check the Viewer mode to see how your bracket looks visually
            </Text>
            <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block' }}>
              • Team Pools show which teams are available, assigned, or eliminated
            </Text>
          </div>
        </Space>
      </Modal>
      
      {/* Edit Slot Modal */}
      <Modal
        title={<Title level={3} style={{ margin: 0, fontWeight: 700 }}>Edit Team Slot</Title>}
        open={!!editingSlot}
        onCancel={() => {
          setEditingSlot(null);
        }}
        footer={null}
        width={500}
      >
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
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Select Team
              </Text>
              <Select
                size="large"
                style={{ width: '100%', borderRadius: '12px' }}
                placeholder="Select a team"
                defaultValue={currentSlot.type === 'Team' ? currentSlot.teamId : currentSlot.type}
                onChange={(value) => {
                  if (value === '') {
                    // Remove team
                    handleSlotUpdate({ type: 'OPEN' });
                    setEditingSlot(null);
                  } else if (value === 'BYE') {
                    handleSlotUpdate({ type: 'BYE' });
                    setEditingSlot(null);
                  } else {
                    handleSlotUpdate({ type: 'Team', teamId: value });
                    setEditingSlot(null);
                  }
                }}
                options={[
                  { label: 'Remove (set to OPEN)', value: '' },
                  { label: 'Set to BYE', value: 'BYE' },
                  ...availableTeamsForRound.map(team => ({
                    label: `${team.name}${team.seed ? ` (Seed ${team.seed})` : ''}`,
                    value: team.id,
                  })),
                ]}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button
                onClick={() => {
                  setEditingSlot(null);
                }}
                size="large"
                style={{ borderRadius: '12px' }}
              >
                Close
              </Button>
            </div>
          </Space>
        );
      })()}
      </Modal>
      </Content>
    </Layout>
  );
}
