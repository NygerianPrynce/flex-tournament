import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CourtCard } from '../components/CourtCard';
import { useTournamentStore } from '../store/tournamentStore';
import type { Game, Tournament } from '../types';
import { updateGameTimers } from '../lib/timer';
import { getRoundNameFromGame, getRoundName, getLosersRoundName } from '../lib/roundNames';
import { useSport } from '../hooks/useSport';
import {
  Layout,
  Typography,
  Button,
  Card,
  Space,
  Row,
  Col,
  Alert,
  Select,
  Modal,
  message,
} from 'antd';
import {
  HomeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

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
  
  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        border: '2px solid #16a34a',
        borderRadius: '12px',
        cursor: viewerMode ? 'default' : 'move',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
      {...(!viewerMode ? { ...attributes, ...listeners } : {})}
      hoverable={!viewerMode}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          {getRoundNameWithBracket()}
        </Text>
        <Text strong style={{ fontSize: '13px', display: 'block' }}>
          {getTeamName(game.teamA)}
        </Text>
        <Text strong style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', margin: '4px 0' }}>
          VS
        </Text>
        <Text strong style={{ fontSize: '13px', display: 'block' }}>
          {getTeamName(game.teamB)}
        </Text>
      </div>
    </Card>
  );
}

function DroppableCourt({ court, game, onEdit, onRemove, viewerMode = false, tournamentComplete = false }: { court: { id: string; name: string }; game: Game | null; onEdit: () => void; onRemove?: () => void; viewerMode?: boolean; tournamentComplete?: boolean }) {
  const { setNodeRef, isOver } = useSortable({ 
    id: `court-${court.id}`,
    disabled: viewerMode || tournamentComplete // Disable dropping in viewer mode or when tournament is complete
  });
  
  return (
    <div
      ref={setNodeRef}
      style={{
        outline: isOver && !viewerMode && !tournamentComplete ? '4px solid #f97316' : 'none',
        outlineOffset: '4px',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
      }}
    >
      <CourtCard court={court} game={game} onEdit={onEdit} onRemove={onRemove} viewerMode={viewerMode} tournamentComplete={tournamentComplete} />
    </div>
  );
}

export function TournamentCourts({ tournament: propTournament, viewerMode = false }: TournamentCourtsProps = {} as TournamentCourtsProps) {
  const store = useTournamentStore();
  const tournament = propTournament || store.tournament;
  const { autoAssignGames, autoAssignRefs, updateGameTimer, getAllGames, assignGameToCourt, unassignGameFromCourt, clearAllCourts, pauseGame, resumeGame, finishGame } = store;
  const { venueTermPlural } = useSport();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingCourt, setEditingCourt] = useState<string | null>(null);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  if (!tournament || !tournament.bracket) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          * { font-family: 'Poppins', sans-serif; }
        `}</style>
        <Content style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '48px 0' }}>
            <Text style={{ fontSize: '16px' }}>
              {!tournament 
                ? 'No tournament loaded' 
                : viewerMode 
                  ? 'Bracket has not yet been generated.' 
                  : 'Bracket not generated yet. Please generate bracket first.'}
            </Text>
        </div>
        </Content>
      </Layout>
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
    
    // First check: if there are 0 remaining games, tournament is complete
    const allGames = getAllGames();
    const unfinishedGames = allGames.filter(g => {
      // Exclude BYE vs BYE games
      if (g.teamA.type === 'BYE' && g.teamB.type === 'BYE') {
        return false;
      }
      return g.status !== 'Finished';
    });
    if (unfinishedGames.length === 0) {
      return true;
    }
    
    // Check if grand final reset is finished (if it exists and was played)
    if (tournament.bracket.grandFinalReset && 
        tournament.bracket.grandFinalReset.status === 'Finished' && 
        tournament.bracket.grandFinalReset.result) {
      return true;
    }
    
    // Check if grand final is finished AND winners bracket champion won (no reset needed)
    if (tournament.bracket.grandFinal) {
      const gf = tournament.bracket.grandFinal;
      if (gf.status === 'Finished' && gf.result) {
        // If winners bracket champion won (teamA), tournament is complete
        // If losers bracket champion won (teamB), reset game should be played
        const winnerCameFromLosers = gf.teamB.type === 'Team' && gf.teamB.teamId === gf.result.winnerId;
        if (!winnerCameFromLosers) {
          // Winners bracket champion won - tournament complete
          return true;
        }
        // Losers bracket champion won - check if reset is finished
        if (tournament.bracket.grandFinalReset) {
          return tournament.bracket.grandFinalReset.status === 'Finished' && tournament.bracket.grandFinalReset.result;
        }
      }
    }
    
    // Check if final round of winners bracket is finished (single elimination)
    if (tournament.bracket.winners.length > 0 && !tournament.bracket.grandFinal) {
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
        // Losers bracket games: available as soon as both slots are filled (no round restriction)
        if (g.bracketType === 'L') {
          // Both slots must be filled (no OPEN)
          if (g.teamA.type === 'OPEN' || g.teamB.type === 'OPEN') return false;
          // Both must be either Team or BYE
          if (!((g.teamA.type === 'Team' || g.teamA.type === 'BYE') &&
                (g.teamB.type === 'Team' || g.teamB.type === 'BYE'))) {
            return false;
          }
          // Not BYE vs BYE
          if (isByeVsBye(g)) return false;
          // At least one must be a real team
          return g.teamA.type === 'Team' || g.teamB.type === 'Team';
        }
        
        // Grand final and grand final reset: available when both slots are filled
        if (g.bracketType === 'Final') {
          if (g.teamA.type === 'OPEN' || g.teamB.type === 'OPEN') return false;
          if (!((g.teamA.type === 'Team' || g.teamA.type === 'BYE') &&
                (g.teamB.type === 'Team' || g.teamB.type === 'BYE'))) {
            return false;
          }
          if (isByeVsBye(g)) return false;
          return g.teamA.type === 'Team' || g.teamB.type === 'Team';
        }
        
        // Winners bracket games: restrict to the current winners round if known
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
      
      // Losers bracket games: available as soon as both slots are filled (no round restriction)
      if (g.bracketType === 'L') {
        if (bothOpen) return false;
        if (hasOpen) return false;
        // Both slots must be Team or BYE, at least one Team
        return (g.teamA.type === 'Team' || g.teamB.type === 'Team');
      }
      
      // Grand final and grand final reset: available when both slots are filled
      if (g.bracketType === 'Final') {
        if (bothOpen) return false;
        if (hasOpen) return false;
        return (g.teamA.type === 'Team' || g.teamB.type === 'Team');
      }
      
      // Winners bracket games: restrict to the current winners round if known
      if (currentRoundNumber !== null && g.round !== currentRoundNumber) {
        return false;
      }
      
      // Determine if this is a final-round game
      const isFinalRoundGame =
        finalRoundNumber !== null && g.round === finalRoundNumber;

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
          
          // Store the old phase before updating
          const oldPhase = game.timers.currentPhase;
          
          // Update the timer state
          updateGameTimer(game.id, updates);
          
          // Auto-transition phases
          if (updates.currentPhase === 'game' && oldPhase === 'warmup') {
            useTournamentStore.getState().updateGame(game.id, { status: 'Live' });
          } else if (updates.currentPhase === 'flex' && oldPhase === 'game') {
            useTournamentStore.getState().updateGame(game.id, { status: 'Flex' });
          } else if (updates.currentPhase === 'overtime' && oldPhase === 'flex') {
            // Transition to overtime - keep game in Flex status but ensure timer state is updated
            // The timer state is already updated by updateGameTimer, just ensure it's persisted
            useTournamentStore.getState().updateGame(game.id, { 
              status: 'Flex',
              timers: {
                ...game.timers,
                ...updates,
              }
            });
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
      // Use the same logic as the individual start button in CourtCard
      // Check for BYE games - if it's a BYE game, auto-finish it instead of starting it
      const isByeGame = game.teamA.type === 'BYE' || game.teamB.type === 'BYE';
      
      if (isByeGame) {
        // BYE game - auto-win with score 1-0 (same logic as CourtCard handleStart)
        const winnerId = game.teamA.type === 'BYE' 
          ? (game.teamB.type === 'Team' ? game.teamB.teamId! : '')
          : (game.teamA.type === 'Team' ? game.teamA.teamId! : '');
        
        if (winnerId) {
          // Score is 1-0: non-BYE team gets 1, BYE gets 0
          const scoreA = game.teamA.type === 'BYE' ? 0 : 1;
          const scoreB = game.teamB.type === 'BYE' ? 0 : 1;
          finishGame(game.id, winnerId, scoreA, scoreB);
        }
      } else {
        // Regular game - start it normally
      useTournamentStore.getState().startGame(game.id);
      }
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
    <Layout style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Poppins', sans-serif; }
      `}</style>
    <DndContext
        sensors={viewerMode ? [] : sensors}
      collisionDetection={closestCenter}
        onDragStart={viewerMode ? undefined : handleDragStart}
        onDragEnd={viewerMode ? undefined : handleDragEnd}
      >
        <Content style={{ padding: '24px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <HomeOutlined style={{ fontSize: '32px', color: '#f97316' }} />
              <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#f97316' }}>
                {venueTermPlural}
              </Title>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
              {!viewerMode && !tournamentComplete && (
                <Space size={6} style={{ display: 'flex', flexWrap: 'nowrap' }}>
                  <Button
                  type="primary"
                  onClick={autoAssignGames}
                  disabled={tournamentComplete === true}
                  style={{
                    borderRadius: '8px',
                    fontSize: '12px',
                    height: '36px',
                    padding: '0 12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                  }}
                >
              Auto-Assign Games
                </Button>
                {tournament.refs.length > 0 && tournament.settings.useRefs !== false && (
                  <Button
                    type="primary"
                    onClick={() => {
                      const allGames = getAllGames();
                      const gamesOnCourts = allGames.filter(g => g.courtId && g.status !== 'Finished');
                      if (gamesOnCourts.length === 0) {
                        message.info('No games are currently assigned to courts. Assign games to courts first.');
                        return;
                      }
                      autoAssignRefs();
                    }}
                    style={{
                      borderRadius: '8px',
                      fontSize: '12px',
                      height: '36px',
                      padding: '0 12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                    }}
                  >
                    Auto-Assign Referees
                  </Button>
                )}
                <Button
                  type="primary"
                  onClick={handleStartAll}
                  style={{
                    borderRadius: '8px',
                    fontSize: '12px',
                    height: '36px',
                    padding: '0 12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                  }}
                >
              Start All Games
                </Button>
                {hasPausedGames ? (
                  <Button
                    onClick={handleResumeAll}
                    style={{
                      borderRadius: '8px',
                      fontSize: '12px',
                      height: '36px',
                      padding: '0 12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Resume All
                  </Button>
                ) : (
                  <Button
                    onClick={handlePauseAll}
                    style={{
                      borderRadius: '8px',
                      fontSize: '12px',
                      height: '36px',
                      padding: '0 12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
              Pause All
                  </Button>
                )}
                <Button
                  onClick={handleRestartAll}
                  style={{
                    borderRadius: '8px',
                    fontSize: '12px',
                    height: '36px',
                    padding: '0 12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Restart All Games
                </Button>
                <Button
                  danger
                  onClick={() => {
                    const allGames = getAllGames();
                    const gamesInProgress = allGames.filter(g => 
                      g.courtId && (g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused')
                    );
                    const gamesToClear = allGames.filter(g => 
                      g.courtId && g.status === 'Queued'
                    );
                    
                    if (gamesToClear.length === 0) {
                      message.info('No games to clear. All games are currently in progress.');
                      return;
                    }
                    
                    Modal.confirm({
                      title: 'Clear All Courts',
                      content: gamesInProgress.length > 0
                        ? `Are you sure you want to clear ${gamesToClear.length} game(s) from all ${venueTermPlural.toLowerCase()}? ${gamesInProgress.length} game(s) are currently in progress and will not be cleared.`
                        : `Clear all games from all ${venueTermPlural.toLowerCase()}? Games will be returned to the available games section.`,
                      onOk: () => {
                        clearAllCourts();
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
                    fontSize: '12px',
                    height: '36px',
                    padding: '0 12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Clear All {venueTermPlural}
                </Button>
              </Space>
              )}
              {!viewerMode && (
                <Button
                  icon={<QuestionCircleOutlined />}
                  onClick={() => setHelpModalVisible(true)}
                  style={{
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    height: '36px',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Help
                </Button>
              )}
            </div>
          </div>
          
          {tournamentComplete && (
            <Alert
              message="Tournament is finished. Courts are no longer in use."
              type="info"
              showIcon
              style={{ marginBottom: '24px', borderRadius: '8px' }}
            />
          )}
        
          {/* Available Games Pool */}
        {availableGames.length > 0 && (
            <Card
              style={{
                marginBottom: '24px',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid #e5e7eb',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <Title level={4} style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 700 }}>
                Available Games
              </Title>
            <SortableContext items={availableGames.map(g => g.id)}>
                <Row gutter={[12, 12]}>
                {availableGames.map(game => (
                    <Col xs={12} sm={8} md={6} lg={4} xl={3} key={game.id}>
                      <GamePoolItem game={game} teams={tournament.teams} tournament={tournament} viewerMode={viewerMode} />
                    </Col>
                ))}
                </Row>
            </SortableContext>
            </Card>
        )}
        
        {/* Courts */}
          <Row gutter={[16, 16]}>
          {tournament.courts.map(court => {
            const game = getGameForCourt(court.id);
            const eligibleGames = editingCourt === court.id ? getEligibleGames(court.id) : [];
            
            return (
                <Col xs={24} sm={12} lg={8} key={court.id}>
                <DroppableCourt
                  court={court}
                  game={game}
                  onEdit={() => handleEditCourt(court.id)}
                    onRemove={() => {
                      if (game && game.status === 'Queued') {
                        unassignGameFromCourt(game.id);
                      }
                    }}
                    viewerMode={viewerMode || tournamentComplete}
                    tournamentComplete={tournamentComplete}
                  />
                  
                  {/* Edit Court Dropdown - Hidden in viewer mode */}
                  {!viewerMode && editingCourt === court.id && (
                    <Card
                      style={{
                        marginTop: '12px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e5e7eb',
                      }}
                      bodyStyle={{ padding: '16px' }}
                    >
                      <Text strong style={{ display: 'block', marginBottom: '12px', fontSize: '14px' }}>
                        Select Game:
                      </Text>
                      <Select
                        style={{ width: '100%', marginBottom: '12px' }}
                        placeholder="Choose a game..."
                        onChange={(value) => {
                          if (value) {
                            handleSelectGameForCourt(court.id, value);
                          }
                        }}
                        value={undefined}
                      >
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
                            <Select.Option key={g.id} value={g.id}>
                              {getTeamName(g.teamA)} vs {getTeamName(g.teamB)} ({tournament.bracket ? getRoundNameFromGame(g.round, tournament.bracket.winners) : `Round ${g.round}`})
                            </Select.Option>
                        );
                      })}
                      </Select>
                      <Button
                        block
                      onClick={() => setEditingCourt(null)}
                        style={{
                          borderRadius: '8px',
                          fontSize: '14px',
                          height: '36px',
                        }}
                    >
                      Cancel
                      </Button>
                    </Card>
                )}
                </Col>
            );
          })}
          </Row>
        </Content>
      
      <DragOverlay>
        {activeGame ? (
            <Card
              style={{
                border: '2px solid #f97316',
                borderRadius: '12px',
                opacity: 0.9,
                boxShadow: '0 4px 16px rgba(249, 115, 22, 0.3)',
                background: '#ffffff',
              }}
              bodyStyle={{ padding: '16px' }}
            >
              <div style={{ textAlign: 'center' }}>
                <Text strong style={{ fontSize: '14px', display: 'block' }}>
                {activeGame.teamA.type === 'Team' ? tournament.teams.find(t => t.id === activeGame.teamA.teamId)?.name : activeGame.teamA.type}
                </Text>
                <Text strong style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, display: 'block', margin: '4px 0' }}>
                  VS
                </Text>
                <Text strong style={{ fontSize: '14px', display: 'block' }}>
                {activeGame.teamB.type === 'Team' ? tournament.teams.find(t => t.id === activeGame.teamB.teamId)?.name : activeGame.teamB.type}
                </Text>
              </div>
            </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
    
    {/* Help Modal */}
    <Modal
      title={
        <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#f97316' }}>
          Courts Helpdesk
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
            Assigning Games to Courts
          </Title>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Auto-Assign Games:</strong> Click the "Auto-Assign Games" button to automatically assign available games to available courts. This will fill courts with eligible games from the earliest rounds.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Drag and Drop:</strong> Drag games from the "Available Games" section and drop them onto a court card to assign them manually.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block' }}>
            • <strong>Edit Button:</strong> Click the "Edit" button on a court card to select a game from a dropdown list of available games.
          </Text>
        </div>

        <div>
          <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
            Starting and Managing Games
          </Title>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Start:</strong> Click "Start" on a court card to begin a game. This initiates the warmup phase, followed by game time, and then flex time.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Pause/Resume:</strong> Use "Pause" to temporarily stop the game timer, and "Resume" to continue. The timer will account for paused time.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Next:</strong> Click "Next" to skip to the next phase (e.g., from warmup to game time, or from game time to flex time).
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>End:</strong> Click "End" when the game is finished to enter the final score and determine the winner.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block' }}>
            • <strong>Restart:</strong> Use "Restart" to reset a game back to the beginning if needed.
          </Text>
        </div>

        <div>
          <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
            Bulk Actions
          </Title>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Start All Games:</strong> Starts all games that are currently assigned to courts and in "Queued" status.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Pause All / Resume All:</strong> Pauses or resumes all active games across all courts.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Restart All Games:</strong> Resets all active games back to the beginning.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block' }}>
            • <strong>Clear All Courts:</strong> Removes all queued games from courts, returning them to the available games pool. Games in progress will not be cleared.
          </Text>
        </div>

        <div>
          <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
            Referees
          </Title>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '8px' }}>
            • <strong>Auto-Assign Referees:</strong> Automatically assigns available referees to games that need them, based on your tournament settings.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block' }}>
            • <strong>Manual Assignment:</strong> For queued games, you can manually select referees from the dropdown on each court card.
          </Text>
        </div>

        <div>
          <Title level={4} style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 700 }}>
            Tips
          </Title>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '4px' }}>
            • Games must be properly paired in the Bracket Editor before they appear as available games
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '4px' }}>
            • Only games with green borders in the Bracket Editor will show up here
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block', marginBottom: '4px' }}>
            • Use "Auto-Assign Games" to quickly fill all available courts
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.8', display: 'block' }}>
            • The timer automatically transitions between phases (warmup → game → flex → overtime)
          </Text>
        </div>
      </Space>
    </Modal>
    </Layout>
  );
}
