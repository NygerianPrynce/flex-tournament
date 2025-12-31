import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tournament, Team, Ref, Court, Game, TournamentSettings, SeedingMode, SeedingType, Bracket } from '../types';
import { generateSingleEliminationBracket, generateDoubleEliminationBracket, advanceTeamInBracket, generateLosersBracketStructure, finalizeLosersRound, getLosersTargetRoundIdxForWinnersRound, advanceByeInBracket } from '../lib/bracket';

let isAutoResolvingLosersByes = false;
import { getSportConfig } from '../lib/sports';
import { 
  saveBracket, 
  addTeam as addTeamInDB, 
  updateTeam as updateTeamInDB, 
  deleteTeam,
  addRef as addRefInDB,
  updateRef as updateRefInDB,
  deleteRef,
  updateTournament as updateTournamentInDB,
} from '../lib/database';

interface TournamentState {
  tournament: Tournament | null;
  
  // Actions
  setTournament: (tournament: Tournament | null) => void;
  createTournament: (name: string, settings: TournamentSettings, teams: Team[], refs: Ref[], seedingMode: SeedingMode, seedingType?: SeedingType) => void;
  generateBracket: (autoGenerate: boolean) => void;
  updateTournament: (updates: Partial<Tournament>) => void;
  resetTournament: () => void;
  
  // Teams
  addTeam: (team: Team) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  removeTeam: (id: string) => void;
  
  // Refs
  addRef: (ref: Ref) => void;
  updateRef: (id: string, updates: Partial<Ref>) => void;
  removeRef: (id: string) => void;
  
  // Games
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  assignGameToCourt: (gameId: string, courtId: string) => void;
  unassignGameFromCourt: (gameId: string) => void;
  startGame: (gameId: string) => void;
  pauseGame: (gameId: string) => void;
  resumeGame: (gameId: string) => void;
  finishGame: (gameId: string, winnerId: string, scoreA: number, scoreB: number) => void;
  updateGameTimer: (gameId: string, timers: Partial<Game['timers']>) => void;
  skipStage: (gameId: string) => void;
  
  // Ref assignment
  assignRefToGame: (gameId: string, refId: string | undefined) => void;
  assignRefsToGame: (gameId: string, refIds: string[]) => void;
  
  // Auto-assignment
  autoAssignGames: () => void;
  autoAssignRefs: () => void;
  
  // Bracket editing
  updateGameSlot: (gameId: string, slot: 'A' | 'B', slotValue: Game['teamA']) => void;
  assignAllOpenToBye: (roundIndex: number) => void;
  assignAllOpenToByeLosers: (roundIndex: number) => void;
  clearRoundGames: (roundIndex: number) => void;
  clearLosersRoundGames: (roundIndex: number) => void;
  clearAllCourts: () => void;
  autoAssignTeamsToBracket: (roundIndex: number) => void;
  autoAssignTeamsToBracketLosers: (roundIndex: number) => void;
  
  // Helpers
  getAllGames: () => Game[];
}

export const useTournamentStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      tournament: null,
      
      setTournament: (tournament) => {
        set({ tournament });
      },
      
      createTournament: (name, settings, teams, refs, seedingMode, seedingType) => {
        const now = Date.now();
        // Use sport-appropriate venue term for default names if not provided
        const sportConfig = getSportConfig(settings.sport || 'basketball');
        const courts: Court[] = Array.from({ length: settings.numberOfCourts }, (_, i) => ({
          id: `court-${i}`,
          name: settings.courtNames[i] || `${sportConfig.venueTerm} ${i + 1}`,
        }));
        
        // Don't generate bracket initially - user will choose to create or auto-generate
        const tournament: Tournament = {
          id: `tournament-${now}`,
          name,
          createdAt: now,
          updatedAt: now,
          teams,
          refs,
          courts,
          bracket: null,
          settings,
          seedingMode,
          seedingType: seedingMode !== 'off' ? seedingType : undefined,
        };
        
        set({ tournament });
      },
      
      generateBracket: (autoGenerate: boolean) => {
        const { tournament } = get();
        if (!tournament) return;
        
        let bracket: Bracket;
        if (autoGenerate) {
          // Auto-generate bracket
          const seedingType = tournament.seedingType || 'standard';
          if (tournament.settings.includeLosersBracket) {
            const result = generateDoubleEliminationBracket(tournament.teams, tournament.settings, tournament.seedingMode, seedingType);
            bracket = {
              winners: result.winners,
              losers: result.losers,
              grandFinal: result.grandFinal,
              grandFinalReset: result.grandFinalReset,
            };
          } else {
            bracket = {
              winners: generateSingleEliminationBracket(tournament.teams, tournament.settings, tournament.seedingMode, seedingType),
              losers: [],
            };
          }
        } else {
          // Create empty bracket structure for manual creation
          // Calculate bracket size based on number of teams
          const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(tournament.teams.length, 2))));
          const numRounds = Math.log2(bracketSize);
          
          // Create first round with empty games
          const firstRound: Game[] = [];
          for (let i = 0; i < bracketSize / 2; i++) {
            firstRound.push({
              id: `game-1-${i}`,
              bracketType: 'W',
              round: 1,
              matchNumber: i,
              teamA: { type: 'OPEN' },
              teamB: { type: 'OPEN' },
              scheduledOrder: i,
              status: 'Queued',
              timers: {
                warmupRemaining: tournament.settings.warmupMinutes * 60,
                gameRemaining: tournament.settings.gameLengthMinutes * 60,
                flexRemaining: tournament.settings.flexMinutes * 60,
                currentPhase: 'idle',
                totalPausedTime: 0,
              },
            });
          }
          
          // Create subsequent rounds with OPEN slots
          const winners: Game[][] = [firstRound];
          let currentRoundSize = bracketSize / 4;
          for (let round = 2; round <= numRounds; round++) {
            const roundGames: Game[] = [];
            for (let i = 0; i < currentRoundSize; i++) {
              roundGames.push({
                id: `game-${round}-${i}`,
                bracketType: 'W',
                round: round,
                matchNumber: i,
                teamA: { type: 'OPEN' },
                teamB: { type: 'OPEN' },
                scheduledOrder: i,
                status: 'Queued',
                timers: {
                  warmupRemaining: tournament.settings.warmupMinutes * 60,
                  gameRemaining: tournament.settings.gameLengthMinutes * 60,
                  flexRemaining: tournament.settings.flexMinutes * 60,
                  currentPhase: 'idle',
                  totalPausedTime: 0,
                },
              });
            }
            winners.push(roundGames);
            currentRoundSize /= 2;
          }
          
          bracket = {
            winners,
            losers: [],
          };
          
          if (tournament.settings.includeLosersBracket) {
            // Use the same losers bracket generation logic as auto-generate
            // This ensures consistency between manual creation and auto-generate
            const losersBracketStructure = generateLosersBracketStructure(winners, tournament.settings, tournament.teams.length);
            
            // Convert the structure to games with proper IDs and timers
            const losers: Game[][] = [];
            losersBracketStructure.forEach((round, roundIdx) => {
              const roundGames: Game[] = round.map((game, gameIdx) => ({
                ...game,
                id: `loser-${roundIdx + 1}-${gameIdx}`,
                round: roundIdx + 1,
                matchNumber: gameIdx,
                timers: {
                  warmupRemaining: tournament.settings.warmupMinutes * 60,
                  gameRemaining: tournament.settings.gameLengthMinutes * 60,
                  flexRemaining: tournament.settings.flexMinutes * 60,
                  currentPhase: 'idle',
                  totalPausedTime: 0,
                },
              }));
              losers.push(roundGames);
            });
            
            bracket.losers = losers;
            
            // Grand final
            bracket.grandFinal = {
              id: 'grand-final',
              bracketType: 'Final',
              round: numRounds,
              matchNumber: 0,
              teamA: { type: 'OPEN' },
              teamB: { type: 'OPEN' },
              scheduledOrder: 0,
              status: 'Queued',
              timers: {
                warmupRemaining: tournament.settings.warmupMinutes * 60,
                gameRemaining: tournament.settings.gameLengthMinutes * 60,
                flexRemaining: tournament.settings.flexMinutes * 60,
                currentPhase: 'idle',
                totalPausedTime: 0,
              },
            };
            
            // Grand Final Reset: Only played if losers bracket champion wins Grand Final
            bracket.grandFinalReset = {
              id: 'grand-final-reset',
              bracketType: 'Final',
              round: numRounds + 1,
              matchNumber: 0,
              teamA: { type: 'OPEN' }, // Winner of winners bracket (from Grand Final)
              teamB: { type: 'OPEN' }, // Winner of losers bracket (from Grand Final)
              scheduledOrder: 0,
              status: 'Queued', // Will only be played if LB champ wins Grand Final
              timers: {
                warmupRemaining: tournament.settings.warmupMinutes * 60,
                gameRemaining: tournament.settings.gameLengthMinutes * 60,
                flexRemaining: tournament.settings.flexMinutes * 60,
                currentPhase: 'idle',
                totalPausedTime: 0,
              },
            };
          }
        }
        
        // Redistribute BYEs in all rounds to prevent double byes (only for auto-generated brackets)
        if (autoGenerate && bracket.winners.length > 1) {
          // Redistribute BYEs in rounds 2 and beyond
          // We need to do this after setting the bracket so autoAssignTeamsToBracket can access it
          set({
            tournament: {
              ...tournament,
              bracket,
              updatedAt: Date.now(),
            },
          });
          
          // Now redistribute BYEs in subsequent rounds
          for (let roundIndex = 1; roundIndex < bracket.winners.length; roundIndex++) {
            get().autoAssignTeamsToBracket(roundIndex);
          }
          
          // Get updated bracket after redistribution
          const updatedTournament = get().tournament;
          if (updatedTournament?.bracket) {
            bracket = updatedTournament.bracket;
          }
        }
        
        set({
          tournament: {
            ...tournament,
            bracket,
            updatedAt: Date.now(),
          },
        });
        
        // Sync bracket to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          saveBracket(tournament.id, bracket).catch(err => {
            console.error('Failed to sync bracket to database:', err);
          });
        }
      },
      
      updateTournament: (updates) => {
        const { tournament } = get();
        if (!tournament) return;
        
        // Deep merge settings if provided
        const mergedUpdates = { ...updates };
        if (updates.settings) {
          mergedUpdates.settings = {
            ...tournament.settings,
            ...updates.settings,
          };
        }
        
        set({
          tournament: {
            ...tournament,
            ...mergedUpdates,
            updatedAt: Date.now(),
          },
        });
        
        // Sync tournament updates to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          updateTournamentInDB(tournament.id, {
            name: updates.name,
            settings: updates.settings,
            seedingMode: updates.seedingMode,
            seedingType: updates.seedingType,
          }).catch(err => {
            console.error('Failed to sync tournament update to database:', err);
          });
        }
      },
      
      resetTournament: () => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        // Reset all games to their initial state (like right after bracket generation)
        const resetGame = (game: Game): Game => ({
          ...game,
          status: 'Queued',
          result: undefined,
          courtId: undefined,
          refId: undefined,
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
        
        // Reset winners bracket
        const resetWinners = tournament.bracket.winners.map(round =>
          round.map(resetGame)
        );
        
        // Reset losers bracket
        const resetLosers = tournament.bracket.losers.map(round =>
          round.map(resetGame)
        );
        
        // Reset grand final if it exists
        const resetGrandFinal = tournament.bracket.grandFinal
          ? resetGame(tournament.bracket.grandFinal)
          : undefined;
        
        set({
          tournament: {
            ...tournament,
            bracket: {
              winners: resetWinners,
              losers: resetLosers,
              grandFinal: resetGrandFinal,
            },
            updatedAt: Date.now(),
          },
        });
      },
      
      addTeam: (team) => {
        const { tournament } = get();
        if (!tournament) return;
        
        set({
          tournament: {
            ...tournament,
            teams: [...tournament.teams, team],
            updatedAt: Date.now(),
          },
        });
        
        // Sync to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          addTeamInDB(tournament.id, { name: team.name, seed: team.seed }).then(savedTeam => {
            // Update local team with database ID if different
            if (savedTeam.id !== team.id) {
              get().updateTeam(team.id, { id: savedTeam.id } as any);
            }
          }).catch(err => {
            console.error('Failed to sync team to database:', err);
          });
        }
      },
      
      updateTeam: (id, updates) => {
        const { tournament } = get();
        if (!tournament) return;
        
        set({
          tournament: {
            ...tournament,
            teams: tournament.teams.map(t => t.id === id ? { ...t, ...updates } : t),
            updatedAt: Date.now(),
          },
        });
        
        // Sync to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          updateTeamInDB(id, updates).catch(err => {
            console.error('Failed to sync team update to database:', err);
          });
        }
      },
      
      removeTeam: (id) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        // Helper to check if a round is complete (all games finished)
        const isRoundComplete = (round: Game[]): boolean => {
          return round.length > 0 && round.every(game => game.status === 'Finished' && game.result);
        };
        
        // Only modify the first incomplete round (current round being operated on)
        // All previous rounds are protected - they are completed and should not be touched
        const updateGameInRound = (rounds: Game[][]) => {
          let foundIncompleteRound = false;
          
          return rounds.map((round) => {
            // Skip all completed rounds - they are protected
            if (isRoundComplete(round)) {
              return round; // Don't touch completed rounds
            }
            
            // Only modify the first incomplete round (current round being operated on)
            if (foundIncompleteRound) {
              return round; // Skip subsequent incomplete rounds
            }
            
            foundIncompleteRound = true;
            
            // Only modify queued games in this round
            return round.map(game => {
              // Preserve games that have results OR are not queued
              // This ensures completed games and games in progress are never modified
              if (game.result || game.status !== 'Queued') {
                return game; // Don't modify games that have results or are in progress/finished
              }
              
              // Check if this team is in the game
              const teamInA = game.teamA.type === 'Team' && game.teamA.teamId === id;
              const teamInB = game.teamB.type === 'Team' && game.teamB.teamId === id;
              
              if (teamInA || teamInB) {
                // Convert the team slot to BYE only for queued (not started) games in current round
                if (teamInA) {
                  return { ...game, teamA: { type: 'BYE' as const } };
                } else {
                  return { ...game, teamB: { type: 'BYE' as const } };
                }
              }
              return game;
            });
          });
        };
        
        const bracket = { ...tournament.bracket };
        bracket.winners = updateGameInRound(bracket.winners);
        bracket.losers = updateGameInRound(bracket.losers);
        
        // Only modify grandFinal if it's queued (not started, not in progress) and has no result
        if (bracket.grandFinal && bracket.grandFinal.status === 'Queued' && !bracket.grandFinal.result) {
          const teamInA = bracket.grandFinal.teamA.type === 'Team' && bracket.grandFinal.teamA.teamId === id;
          const teamInB = bracket.grandFinal.teamB.type === 'Team' && bracket.grandFinal.teamB.teamId === id;
          if (teamInA) {
            bracket.grandFinal = { ...bracket.grandFinal, teamA: { type: 'BYE' as const } };
          } else if (teamInB) {
            bracket.grandFinal = { ...bracket.grandFinal, teamB: { type: 'BYE' as const } };
          }
        }
        
        set({
          tournament: {
            ...tournament,
            teams: tournament.teams.filter(t => t.id !== id),
            bracket,
            updatedAt: Date.now(),
          },
        });
        
        // Sync to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          deleteTeam(id).catch(err => {
            console.error('Failed to sync team deletion to database:', err);
          });
          // Also sync bracket changes
          if (bracket) {
            saveBracket(tournament.id, bracket).catch(err => {
              console.error('Failed to sync bracket after team deletion:', err);
            });
          }
        }
      },
      
      addRef: (ref) => {
        const { tournament } = get();
        if (!tournament) return;
        
        // Set available to true by default if not specified
        const newRef = { ...ref, available: ref.available !== undefined ? ref.available : true };
        
        set({
          tournament: {
            ...tournament,
            refs: [...tournament.refs, newRef],
            // Enable refs if adding first ref
            settings: {
              ...tournament.settings,
              useRefs: tournament.refs.length === 0 ? true : tournament.settings.useRefs,
            },
            updatedAt: Date.now(),
          },
        });
        
        // Sync to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          addRefInDB(tournament.id, { name: newRef.name, available: newRef.available }).then(savedRef => {
            // Update local ref with database ID if different
            if (savedRef.id !== newRef.id) {
              get().updateRef(newRef.id, { id: savedRef.id } as any);
            }
          }).catch(err => {
            console.error('Failed to sync ref to database:', err);
          });
        }
      },
      
      updateRef: (id, updates) => {
        const { tournament } = get();
        if (!tournament) return;
        
        set({
          tournament: {
            ...tournament,
            refs: tournament.refs.map(r => r.id === id ? { ...r, ...updates } : r),
            updatedAt: Date.now(),
          },
        });
        
        // Sync to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          updateRefInDB(id, updates).catch(err => {
            console.error('Failed to sync ref update to database:', err);
          });
        }
      },
      
      removeRef: (id) => {
        const { tournament } = get();
        if (!tournament) return;
        
        set({
          tournament: {
            ...tournament,
            refs: tournament.refs.filter(r => r.id !== id),
            updatedAt: Date.now(),
          },
        });
        
        // Sync to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          deleteRef(id).catch(err => {
            console.error('Failed to sync ref deletion to database:', err);
          });
        }
      },
      
      updateGame: (gameId, updates) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        const updateGameInRound = (rounds: Game[][]) => {
          return rounds.map(round =>
            round.map(game => game.id === gameId ? { ...game, ...updates } : game)
          );
        };
        
        const bracket = { ...tournament.bracket };
        bracket.winners = updateGameInRound(bracket.winners);
        bracket.losers = updateGameInRound(bracket.losers);
        
        if (bracket.grandFinal && bracket.grandFinal.id === gameId) {
          bracket.grandFinal = { ...bracket.grandFinal, ...updates };
        }
        
        if (bracket.grandFinalReset && bracket.grandFinalReset.id === gameId) {
          bracket.grandFinalReset = { ...bracket.grandFinalReset, ...updates };
        }
        
        set({
          tournament: {
            ...tournament,
            bracket,
            updatedAt: Date.now(),
          },
        });
        
        // Sync entire bracket to database (not individual game updates) to prevent duplicates
        // Individual game updates can conflict with saveBracket calls
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          saveBracket(tournament.id, bracket).catch(err => {
            console.error('Failed to sync bracket to database:', err);
            // Don't show error to user - local state is updated, sync will retry later
          });
        }
      },
      
      assignGameToCourt: (gameId, courtId) => {
        get().updateGame(gameId, { courtId });
      },
      
      unassignGameFromCourt: (gameId) => {
        // Clear referee assignments when unassigning from court
        get().updateGame(gameId, { 
          courtId: undefined,
          refId: undefined,
          refIds: [],
        });
      },
      
      startGame: (gameId) => {
        const { tournament } = get();
        if (!tournament) return;
        
        const game = findGame(tournament, gameId);
        if (!game) return;
        
        // Check if refs are required (if refs exist and useRefs is enabled)
        const refsRequired = tournament.refs.length > 0 && (tournament.settings.useRefs !== false);
        const refereesPerGame = tournament.settings.refereesPerGame ?? 0;
        if (refsRequired && refereesPerGame > 0) {
          const currentRefIds = game.refIds || (game.refId ? [game.refId] : []);
          if (currentRefIds.length < refereesPerGame) {
            alert(`This game requires ${refereesPerGame} referee${refereesPerGame > 1 ? 's' : ''}. Currently assigned: ${currentRefIds.length}.`);
            return;
          }
        }
        
        const now = Date.now();
        get().updateGame(gameId, {
          status: 'Warmup',
          timers: {
            ...game.timers,
            currentPhase: 'warmup',
            startedAt: now,
          },
        });
      },
      
      pauseGame: (gameId) => {
        const { tournament } = get();
        if (!tournament) return;
        
        const game = findGame(tournament, gameId);
        // Allow pausing during Warmup, Live, Flex, or Overtime (when status is Flex but in overtime phase)
        if (!game || (game.status !== 'Live' && game.status !== 'Warmup' && game.status !== 'Flex')) return;
        
        const now = Date.now();
        get().updateGame(gameId, {
          status: 'Paused',
          timers: {
            ...game.timers,
            pausedAt: now,
          },
        });
      },
      
      resumeGame: (gameId) => {
        const { tournament } = get();
        if (!tournament) return;
        
        const game = findGame(tournament, gameId);
        if (!game || game.status !== 'Paused') return;
        
        const now = Date.now();
        const pauseDuration = now - (game.timers.pausedAt || now);
        
        get().updateGame(gameId, {
          status: game.timers.currentPhase === 'warmup' ? 'Warmup' :
                  game.timers.currentPhase === 'game' ? 'Live' :
                  game.timers.currentPhase === 'flex' || game.timers.currentPhase === 'overtime' ? 'Flex' :
                  'Live',
          timers: {
            ...game.timers,
            pausedAt: undefined,
            totalPausedTime: game.timers.totalPausedTime + pauseDuration,
          },
        });
      },
      
      finishGame: (gameId, winnerId, scoreA, scoreB) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        const game = findGame(tournament, gameId);
        if (!game) return;
        
        // Get team names before advancing (to preserve them even if teams are deleted later)
        const getTeamNameFromSlot = (slot: Game['teamA']) => {
          if (slot.type === 'Team' && slot.teamId) {
            const team = tournament.teams.find(t => t.id === slot.teamId);
            return team?.name || 'Unknown';
          }
          if (slot.type === 'BYE') return 'BYE';
          return 'TBD';
        };
        
        const teamAName = getTeamNameFromSlot(game.teamA);
        const teamBName = getTeamNameFromSlot(game.teamB);
        
        // Advance bracket
        // IMPORTANT: handle BYE vs BYE HERE so any auto-resolution works everywhere (W + L)
        if (game.teamA.type === 'BYE' && game.teamB.type === 'BYE') {
          advanceByeInBracket(game, tournament.bracket);
        } else {
          advanceTeamInBracket(game, winnerId, tournament.bracket);
        }
        
        get().updateGame(gameId, {
          status: 'Finished',
          result: {
            winnerId,
            scoreA,
            scoreB,
            finishedAt: Date.now(),
            teamAName,
            teamBName,
          },
          timers: {
            ...game.timers,
            currentPhase: 'idle',
          },
        });
        
        // Re-fetch fresh tournament state (the `tournament` const above is now stale)
        const latestTournament = get().tournament;
        if (!latestTournament || !latestTournament.bracket) return;
        
        // Unassign from court - use fresh game state to ensure we have the latest courtId
        const latestGame = findGame(latestTournament, gameId);
        if (latestGame && latestGame.courtId) {
          get().unassignGameFromCourt(gameId);
        }
        
        // Check if Grand Final was completed and losers bracket champion won
        // If so, activate Grand Final Reset game
        if (game.bracketType === 'Final' && game.id === 'grand-final' && tournament.bracket.grandFinalReset) {
          // Check if the winner came from losers bracket (teamB)
          const winnerCameFromLosers = game.teamB.type === 'Team' && game.teamB.teamId === winnerId;
          
          if (winnerCameFromLosers) {
            // Losers bracket champion won - activate reset game
            // Both teams go to reset: winners bracket champ (loser of grand final) vs losers bracket champ (winner)
            const winnersBracketChampId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
            const losersBracketChampId = winnerId;
            
            if (winnersBracketChampId && losersBracketChampId) {
              get().updateGame('grand-final-reset', {
                teamA: { type: 'Team', teamId: winnersBracketChampId },
                teamB: { type: 'Team', teamId: losersBracketChampId },
                status: 'Queued', // Make it playable
              });
            }
          }
          // If winners bracket champion won, tournament is over - no reset needed
        }
        
        // SPECIAL CASE: 2 teams in double elimination
        // Games continue until one team has 2 wins total (best-of-3 style)
        if (tournament.teams.length === 2 && tournament.settings.includeLosersBracket) {
          // Count total wins for each team across all games (winners final, grand final, reset games)
          const countWins = (teamId: string): number => {
            let wins = 0;
            const allGames = getAllGames(tournament);
            allGames.forEach(g => {
              if (g.status === 'Finished' && g.result && g.result.winnerId === teamId) {
                wins++;
              }
            });
            return wins;
          };
          
          // Check if this is a reset game (grand-final-reset or subsequent resets)
          const isResetGame = game.id === 'grand-final-reset' || 
                             (game.id.startsWith('grand-final-reset-') && game.bracketType === 'Final');
          
          if (isResetGame && game.status === 'Finished' && game.result) {
            const winnerWins = countWins(winnerId);
            const loserId = game.teamA.type === 'Team' && game.teamA.teamId === winnerId
              ? (game.teamB.type === 'Team' ? game.teamB.teamId : undefined)
              : (game.teamA.type === 'Team' ? game.teamA.teamId : undefined);
            
            // If neither team has 2 wins yet, create another reset game
            if (loserId && winnerWins < 2) {
              const loserWins = countWins(loserId);
              
              if (loserWins < 2) {
                // Initialize resetGames array if it doesn't exist
                if (!tournament.bracket.resetGames) {
                  tournament.bracket.resetGames = [];
                }
                
                // Determine the next reset game ID
                const existingResets = tournament.bracket.resetGames.length;
                const nextResetNumber = existingResets + 1;
                const nextResetId = `grand-final-reset-${nextResetNumber}`;
                
                // Create the next reset game
                const nextResetGame: Game = {
                  id: nextResetId,
                  bracketType: 'Final',
                  round: tournament.bracket.winners.length + nextResetNumber + 1,
                  matchNumber: 0,
                  teamA: { type: 'Team', teamId: loserId }, // Loser of previous reset
                  teamB: { type: 'Team', teamId: winnerId }, // Winner of previous reset
                  scheduledOrder: 0,
                  status: 'Queued',
                  timers: {
                    warmupRemaining: tournament.settings.warmupMinutes * 60,
                    gameRemaining: tournament.settings.gameLengthMinutes * 60,
                    flexRemaining: tournament.settings.flexMinutes * 60,
                    currentPhase: 'idle',
                    totalPausedTime: 0,
                  },
                };
                
                // Add to resetGames array
                tournament.bracket.resetGames.push(nextResetGame);
                
                // Update the bracket
                set({
                  tournament: {
                    ...tournament,
                    bracket: tournament.bracket,
                    updatedAt: Date.now(),
                  },
                });
                
                // Sync to database
                if (tournament.id && !tournament.id.startsWith('tournament-') && tournament.bracket) {
                  import('../lib/database').then(({ saveBracket }) => {
                    saveBracket(tournament.id!, tournament.bracket!).catch(err => {
                      console.error('Failed to sync bracket to database:', err);
                    });
                  });
                }
              }
            }
          }
        }
        
        // Redistribute BYEs in the next round to prevent double byes
        if (game.bracketType === 'W' && game.round < latestTournament.bracket.winners.length) {
          const nextRoundIndex = game.round; // round 1 -> index 1 (round 2)
          get().autoAssignTeamsToBracket(nextRoundIndex);
        }
        
        // Finalize losers bracket rounds ONLY when the ENTIRE winners round completes
        if (
          game.bracketType === 'W' &&
          latestTournament.settings.includeLosersBracket &&
          latestTournament.bracket.losers.length > 0
        ) {
          const winnersRound = latestTournament.bracket.winners[game.round - 1];
          if (winnersRound) {
            const allGamesFinished = winnersRound.every(g => g.status === 'Finished');

            if (allGamesFinished) {
              if (game.round === 1) {
                // L1 needs ghost conversion ON
                finalizeLosersRound(latestTournament.bracket, 0, { fillOpenOpen: true });
              }

              const targetRoundIdx = getLosersTargetRoundIdxForWinnersRound(
                game.round,
                latestTournament.bracket.winners.length
              );

              if (targetRoundIdx >= 0 && targetRoundIdx < latestTournament.bracket.losers.length) {
                // Later rounds: NO ghost conversion
                finalizeLosersRound(latestTournament.bracket, targetRoundIdx);
              }

              // IMPORTANT: force store update because bracket is mutated in-place
              set({
                tournament: {
                  ...latestTournament,
                  bracket: latestTournament.bracket,
                  updatedAt: Date.now(),
                },
              });

              // Save bracket after finalization
              if (latestTournament.id && !latestTournament.id.startsWith('tournament-') && latestTournament.bracket) {
                import('../lib/database').then(({ saveBracket }) => {
                  saveBracket(latestTournament.id!, latestTournament.bracket!).catch(err => {
                    console.error('Failed to sync bracket to database:', err);
                  });
                });
              }
            }
          }
        }
        
        // AUTO-RESOLVE (SAFE): queued losers-bracket BYE games (Team vs BYE and BYE vs BYE)
        // Only resolve a losers BYE game if the PREVIOUS losers round is fully finished.
        // This prevents LB from skipping ahead and filling Grand Final early.
        if (!isAutoResolvingLosersByes) {
          isAutoResolvingLosersByes = true;
          try {
            let safety = 0;

            const canResolveLosersByeGame = (t: any, g: any) => {
              if (!t?.bracket) return false;
              if (g.bracketType !== 'L') return false;
              if (g.status !== 'Queued') return false;

              // must be fully assigned (no OPEN)
              if (g.teamA.type === 'OPEN' || g.teamB.type === 'OPEN') return false;

              // must involve a BYE
              if (g.teamA.type !== 'BYE' && g.teamB.type !== 'BYE') return false;

              // round is 1-indexed
              const roundIdx = g.round - 1;

              // Check if current round is fully seeded (no OPEN slots anywhere in this round)
              const currentRound = t.bracket.losers[roundIdx];
              if (!currentRound) return false;

              // only resolve when every game in this same losers round has no OPEN slots
              const roundFullySeeded = currentRound.every((pg: any) =>
                pg.teamA.type !== 'OPEN' && pg.teamB.type !== 'OPEN'
              );
              if (!roundFullySeeded) return false;

              // L1 has no prior LB dependency
              if (roundIdx <= 0) return true;

              const prevRound = t.bracket.losers[roundIdx - 1];
              if (!prevRound) return true;

              // Only resolve if previous LB round fully finished
              return prevRound.every((pg: any) => pg.status === 'Finished');
            };

            while (safety++ < 50) {
              const t = get().tournament;
              if (!t?.bracket) break;

              const allGames = getAllGames(t);

              const candidates = allGames
                .filter(g => canResolveLosersByeGame(t, g))
                .sort((g1, g2) => (g1.round - g2.round) || (g1.matchNumber - g2.matchNumber));

              const byeGame = candidates[0];
              if (!byeGame) break;

              // BYE vs BYE
              if (byeGame.teamA.type === 'BYE' && byeGame.teamB.type === 'BYE') {
                get().finishGame(byeGame.id, 'BYE', 0, 0);
                continue;
              }

              // Team vs BYE
              const winner =
                byeGame.teamA.type === 'BYE'
                  ? (byeGame.teamB.type === 'Team' ? byeGame.teamB.teamId! : '')
                  : (byeGame.teamA.type === 'Team' ? byeGame.teamA.teamId! : '');

              if (!winner) break;

              const sA = byeGame.teamA.type === 'BYE' ? 0 : 1;
              const sB = byeGame.teamB.type === 'BYE' ? 0 : 1;

              get().finishGame(byeGame.id, winner, sA, sB);
            }
          } finally {
            isAutoResolvingLosersByes = false;
          }
        }
      },
      
      updateGameTimer: (gameId, timerUpdates) => {
        const { tournament } = get();
        if (!tournament) return;
        
        const game = findGame(tournament, gameId);
        if (!game) return;
        
        get().updateGame(gameId, {
          timers: {
            ...game.timers,
            ...timerUpdates,
          },
        });
      },
      
      skipStage: (gameId) => {
        const { tournament } = get();
        if (!tournament) return;
        
        const game = findGame(tournament, gameId);
        if (!game) return;
        
        const now = Date.now();
        const currentPhase = game.timers.currentPhase;
        
        const gameSeconds = tournament.settings.gameLengthMinutes * 60;
        const flexSeconds = tournament.settings.flexMinutes * 60;
        
        if (currentPhase === 'warmup') {
          // Skip to game phase
          get().updateGame(gameId, {
            status: 'Live',
            timers: {
              ...game.timers,
              currentPhase: 'game',
              warmupRemaining: 0,
              gameRemaining: gameSeconds,
              startedAt: now,
              totalPausedTime: 0,
            },
          });
        } else if (currentPhase === 'game') {
          // Skip to flex phase
          get().updateGame(gameId, {
            status: 'Flex',
            timers: {
              ...game.timers,
              currentPhase: 'flex',
              gameRemaining: 0,
              flexRemaining: flexSeconds,
              startedAt: now,
              totalPausedTime: 0,
            },
          });
        } else if (currentPhase === 'flex') {
          // Skip to overtime phase
          // For overtime, we need to set startedAt such that elapsed time equals total time
          // This way overtime starts at 0
          const warmupSeconds = tournament.settings.warmupMinutes * 60;
          const totalTime = warmupSeconds + gameSeconds + flexSeconds;
          // Set startedAt to (now - totalTime) so elapsed time equals total time, making overtime = 0
          get().updateGame(gameId, {
            status: 'Flex',
            timers: {
              ...game.timers,
              currentPhase: 'overtime',
              flexRemaining: 0,
              overtimeMinutes: 0,
              startedAt: now - totalTime * 1000,
              totalPausedTime: 0,
            },
          });
        }
      },
      
      assignRefToGame: (gameId, refId) => {
        // For backward compatibility, also update refIds array
        const game = findGame(get().tournament!, gameId);
        if (game) {
          const refIds = refId ? [refId] : [];
          get().updateGame(gameId, { refId, refIds });
        } else {
          get().updateGame(gameId, { refId });
        }
      },
      
      assignRefsToGame: (gameId, refIds) => {
        // Update both refIds array and refId (for backward compatibility)
        const refId = refIds.length > 0 ? refIds[0] : undefined;
        get().updateGame(gameId, { refId, refIds });
      },
      
      autoAssignGames: () => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        console.log('=== AUTO-ASSIGN GAMES START ===');
        
        // Get available courts (no game assigned and not in progress)
        const allGames = getAllGames(tournament);
        const activeCourtIds = new Set(
          allGames
            .filter(g => g.courtId && (g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex'))
            .map(g => g.courtId)
        );
        
        // Only count courts as assigned if they have a game that's NOT finished
        // Finished games should have been unassigned, but check anyway to be safe
        const assignedCourtIds = new Set(
          allGames
            .filter(g => g.courtId && g.status !== 'Finished')
            .map(g => g.courtId)
        );
        
        console.log('All games with courtId:', allGames.filter(g => g.courtId).map(g => ({
          id: g.id,
          courtId: g.courtId,
          status: g.status,
          bracketType: g.bracketType,
          round: g.round
        })));
        
        const availableCourts = tournament.courts.filter(c => 
          !activeCourtIds.has(c.id) && !assignedCourtIds.has(c.id)
        );
        
        console.log(`Available courts: ${availableCourts.length}`, availableCourts.map(c => c.name));
        
        if (availableCourts.length === 0) {
          console.log('No available courts, exiting');
          return;
        }
        
        // Helper to check if game is valid (not OPEN vs OPEN or BYE vs BYE, except first round)
        const isValidGame = (g: Game): boolean => {
          // Must have no OPEN slots
          const teamAType = (g.teamA as any).type;
          const teamBType = (g.teamB as any).type;
          if (teamAType === 'OPEN' || teamBType === 'OPEN') return false;
          // BYE vs BYE is allowed in first round (round 1)
          if (g.teamA.type === 'BYE' && g.teamB.type === 'BYE') {
            return g.round === 1;
          }
          return true;
        };
        
        // Separate winners and losers games
        const winnersRounds: { round: number; bracketType: string; games: Game[] }[] = [];
        const losersRounds: { round: number; bracketType: string; games: Game[] }[] = [];
        
        // Winners bracket rounds - collect all eligible rounds
        for (let roundIndex = 0; roundIndex < tournament.bracket.winners.length; roundIndex++) {
          const round = tournament.bracket.winners[roundIndex];
          const queuedGames = round.filter(g => 
            g.status === 'Queued' && 
            !g.courtId && 
            isValidGame(g)
          );
          if (queuedGames.length > 0) {
            console.log(`Winners Round ${roundIndex + 1}: Found ${queuedGames.length} eligible games`, 
              queuedGames.map(g => `${g.id} - ${g.teamA.type === 'Team' ? `Team ${g.teamA.teamId}` : g.teamA.type} vs ${g.teamB.type === 'Team' ? `Team ${g.teamB.teamId}` : g.teamB.type}`));
            winnersRounds.push({
              round: roundIndex + 1,
              bracketType: 'W',
              games: queuedGames,
            });
          }
        }
        
        // Losers bracket rounds - collect all eligible rounds
        for (let roundIndex = 0; roundIndex < tournament.bracket.losers.length; roundIndex++) {
          const round = tournament.bracket.losers[roundIndex];
          const queuedGames = round.filter(g => 
            g.status === 'Queued' && 
            !g.courtId && 
            isValidGame(g)
          );
          if (queuedGames.length > 0) {
            console.log(`Losers Round ${roundIndex + 1}: Found ${queuedGames.length} eligible games`, 
              queuedGames.map(g => `${g.id} - ${g.teamA.type === 'Team' ? `Team ${g.teamA.teamId}` : g.teamA.type} vs ${g.teamB.type === 'Team' ? `Team ${g.teamB.teamId}` : g.teamB.type}`));
            losersRounds.push({
              round: roundIndex + 1,
              bracketType: 'L',
              games: queuedGames,
            });
          }
        }
        
        // Grand final
        if (tournament.bracket.grandFinal && 
            tournament.bracket.grandFinal.status === 'Queued' && 
            !tournament.bracket.grandFinal.courtId &&
            isValidGame(tournament.bracket.grandFinal)) {
          console.log('Grand Final: Found eligible game', 
            `${tournament.bracket.grandFinal.id} - ${tournament.bracket.grandFinal.teamA.type === 'Team' ? `Team ${tournament.bracket.grandFinal.teamA.teamId}` : tournament.bracket.grandFinal.teamA.type} vs ${tournament.bracket.grandFinal.teamB.type === 'Team' ? `Team ${tournament.bracket.grandFinal.teamB.teamId}` : tournament.bracket.grandFinal.teamB.type}`);
        }
        
        // Grand final reset
        if (tournament.bracket.grandFinalReset && 
            tournament.bracket.grandFinalReset.status === 'Queued' && 
            !tournament.bracket.grandFinalReset.courtId &&
            isValidGame(tournament.bracket.grandFinalReset)) {
          console.log('Grand Final Reset: Found eligible game', 
            `${tournament.bracket.grandFinalReset.id} - ${tournament.bracket.grandFinalReset.teamA.type === 'Team' ? `Team ${tournament.bracket.grandFinalReset.teamA.teamId}` : tournament.bracket.grandFinalReset.teamA.type} vs ${tournament.bracket.grandFinalReset.teamB.type === 'Team' ? `Team ${tournament.bracket.grandFinalReset.teamB.teamId}` : tournament.bracket.grandFinalReset.teamB.type}`);
        }
        
        const totalWinnersGames = winnersRounds.reduce((sum, rd) => sum + rd.games.length, 0);
        const totalLosersGames = losersRounds.reduce((sum, rd) => sum + rd.games.length, 0);
        console.log(`Total eligible games found: Winners: ${totalWinnersGames}, Losers: ${totalLosersGames}`);
        console.log(`Winners rounds:`, winnersRounds.map(rd => `Round ${rd.round}: ${rd.games.length} games`));
        console.log(`Losers rounds:`, losersRounds.map(rd => `Round ${rd.round}: ${rd.games.length} games`));
        
        // Assign games: Winners bracket only from earliest round, Losers bracket from all rounds
        let courtIndex = 0;
        let assignmentsMade = 0;
        
        // Process Winners bracket - ONLY assign from the earliest round
        if (winnersRounds.length > 0) {
          const earliestWinnersRound = winnersRounds[0];
          console.log(`\nProcessing Winners bracket - earliest round only: Round ${earliestWinnersRound.round} (${earliestWinnersRound.games.length} games)`);
          for (const game of earliestWinnersRound.games) {
            if (courtIndex >= availableCourts.length) {
              console.log(`No more available courts (used ${courtIndex} of ${availableCourts.length})`);
              break;
            }
            const courtName = availableCourts[courtIndex].name;
            const gameDesc = `${game.bracketType} Round ${game.round} - ${game.teamA.type === 'Team' ? `Team ${game.teamA.teamId}` : game.teamA.type} vs ${game.teamB.type === 'Team' ? `Team ${game.teamB.teamId}` : game.teamB.type}`;
            console.log(`  Assigning: ${gameDesc} → ${courtName}`);
            get().assignGameToCourt(game.id, availableCourts[courtIndex].id);
            courtIndex++;
            assignmentsMade++;
          }
        }
        
        // Process Losers bracket - assign from ALL rounds (no restriction)
        for (const roundData of losersRounds) {
          if (courtIndex >= availableCourts.length) break;
          console.log(`\nProcessing Losers bracket: Round ${roundData.round} (${roundData.games.length} games)`);
          for (const game of roundData.games) {
            if (courtIndex >= availableCourts.length) {
              console.log(`No more available courts (used ${courtIndex} of ${availableCourts.length})`);
              break;
            }
            const courtName = availableCourts[courtIndex].name;
            const gameDesc = `${game.bracketType} Round ${game.round} - ${game.teamA.type === 'Team' ? `Team ${game.teamA.teamId}` : game.teamA.type} vs ${game.teamB.type === 'Team' ? `Team ${game.teamB.teamId}` : game.teamB.type}`;
            console.log(`  Assigning: ${gameDesc} → ${courtName}`);
            get().assignGameToCourt(game.id, availableCourts[courtIndex].id);
            courtIndex++;
            assignmentsMade++;
          }
        }
        
        console.log(`\n=== AUTO-ASSIGN COMPLETE: ${assignmentsMade} game(s) assigned ===\n`);
      },
      
      autoAssignRefs: () => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        // Check if refs are enabled
        if (tournament.refs.length === 0 || tournament.settings.useRefs === false) {
          return;
        }
        
        const refereesPerGame = tournament.settings.refereesPerGame ?? 0;
        if (refereesPerGame === 0) {
          return; // Refs disabled
        }
        
        const allGames = getAllGames(tournament);
        
        // First check: Are there any games on courts at all?
        const gamesOnCourts = allGames.filter(g => g.courtId && g.status !== 'Finished');
        if (gamesOnCourts.length === 0) {
          return; // No games on courts, nothing to do
        }
        
        // Filter for games that need refs (on courts, queued, and don't have enough refs)
        const gamesNeedingRefs = allGames.filter(g => {
          if (!g.courtId || g.status !== 'Queued') return false;
          const currentRefIds = g.refIds || (g.refId ? [g.refId] : []);
          return currentRefIds.length < refereesPerGame;
        });
        
        if (gamesNeedingRefs.length === 0) return;
        
        // Get refs that are already assigned to games on courts (active OR queued)
        // This prevents assigning the same ref to multiple games
        const assignedRefIds = new Set<string>();
        gamesOnCourts.forEach(g => {
          const refIds = g.refIds || (g.refId ? [g.refId] : []);
          refIds.forEach(id => assignedRefIds.add(id));
        });
        
        // Get available refs (not assigned to any game on a court AND marked as available)
        const availableRefs = tournament.refs.filter(r => 
          !assignedRefIds.has(r.id) && 
          (r.available !== false) // Available by default unless explicitly set to false
        );
        
        if (availableRefs.length === 0) {
          return; // No available refs
        }
        
        // Track refs as we assign them to prevent double-assignment within this function call
        const refsBeingAssigned = new Set<string>();
        
        // Assign refs round-robin to each game
        let refIndex = 0;
        for (const game of gamesNeedingRefs) {
          const currentRefIds = game.refIds || (game.refId ? [game.refId] : []);
          const refsToAssign: string[] = [...currentRefIds];
          
          // Fill up to refereesPerGame
          while (refsToAssign.length < refereesPerGame && availableRefs.length > 0) {
            // Find next available ref that's not already assigned to this game or being assigned to another game
            let attempts = 0;
            let foundRef = false;
            while (attempts < availableRefs.length && !foundRef) {
              const ref = availableRefs[refIndex % availableRefs.length];
              // Check that ref is not already in this game AND not being assigned to another game
              if (!refsToAssign.includes(ref.id) && !refsBeingAssigned.has(ref.id)) {
                refsToAssign.push(ref.id);
                refsBeingAssigned.add(ref.id);
                foundRef = true;
              }
              refIndex++;
              attempts++;
            }
            
            // If we couldn't find a ref after checking all, break to avoid infinite loop
            if (!foundRef) {
              break;
            }
          }
          
          get().assignRefsToGame(game.id, refsToAssign);
        }
      },
      
      updateGameSlot: (gameId, slot, slotValue) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        const updateGameInRound = (rounds: Game[][]) => {
          return rounds.map(round =>
            round.map(game => {
              if (game.id === gameId) {
                return {
                  ...game,
                  [slot === 'A' ? 'teamA' : 'teamB']: slotValue,
                };
              }
              return game;
            })
          );
        };
        
        const bracket = { ...tournament.bracket };
        bracket.winners = updateGameInRound(bracket.winners);
        bracket.losers = updateGameInRound(bracket.losers);
        
        if (bracket.grandFinal && bracket.grandFinal.id === gameId) {
          bracket.grandFinal = {
            ...bracket.grandFinal,
            [slot === 'A' ? 'teamA' : 'teamB']: slotValue,
          };
        }
        
        set({
          tournament: {
            ...tournament,
            bracket,
            updatedAt: Date.now(),
          },
        });
        
        // Sync bracket to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          saveBracket(tournament.id, bracket).catch(err => {
            console.error('Failed to sync bracket slot update to database:', err);
          });
        }
      },
      
      assignAllOpenToBye: (roundIndex: number) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        // Only update the specified round
        const updateRound = (rounds: Game[][], targetRoundIndex: number) => {
          if (targetRoundIndex < 0 || targetRoundIndex >= rounds.length) return rounds;
          
          return rounds.map((round, idx) => {
            if (idx !== targetRoundIndex) return round;
            
            return round.map(game => ({
              ...game,
              teamA: game.teamA.type === 'OPEN' ? { type: 'BYE' as const } : game.teamA,
              teamB: game.teamB.type === 'OPEN' ? { type: 'BYE' as const } : game.teamB,
            }));
          });
        };
        
        const bracket = { ...tournament.bracket };
        bracket.winners = updateRound(bracket.winners, roundIndex);
        
        set({
          tournament: {
            ...tournament,
            bracket,
            updatedAt: Date.now(),
          },
        });
        
        // Sync bracket to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          saveBracket(tournament.id, bracket).catch(err => {
            console.error('Failed to sync bracket to database:', err);
          });
        }
      },

      assignAllOpenToByeLosers: (roundIndex: number) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket || !tournament.bracket.losers) return;
        
        const updateRound = (rounds: Game[][], targetRoundIndex: number) => {
          if (targetRoundIndex < 0 || targetRoundIndex >= rounds.length) return rounds;
          
          return rounds.map((round, idx) => {
            if (idx !== targetRoundIndex) return round;
            
            return round.map(game => ({
              ...game,
              teamA: game.teamA.type === 'OPEN' ? { type: 'BYE' as const } : game.teamA,
              teamB: game.teamB.type === 'OPEN' ? { type: 'BYE' as const } : game.teamB,
            }));
          });
        };
        
        const bracket = { ...tournament.bracket };
        bracket.losers = updateRound(bracket.losers, roundIndex);
        
        set({
          tournament: {
            ...tournament,
            bracket,
            updatedAt: Date.now(),
          },
        });
        
        // Sync bracket to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          saveBracket(tournament.id, bracket).catch(err => {
            console.error('Failed to sync bracket to database:', err);
          });
        }
      },
      
      clearRoundGames: (roundIndex: number) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        if (roundIndex < 0 || roundIndex >= tournament.bracket.winners.length) return;
        
        // Create a new bracket with a new winners array
        const bracket = {
          ...tournament.bracket,
          winners: tournament.bracket.winners.map((round, idx) => {
            // Clear the specified round and all subsequent rounds (they depend on this round)
            if (idx < roundIndex) return round; // Don't touch previous rounds
            
            // Only clear games that are not in progress (Queued or Finished)
            return round.map(game => {
              // Protect games that are in progress
              if (game.status === 'Warmup' || game.status === 'Live' || game.status === 'Flex' || game.status === 'Paused') {
                return game;
              }
              // Clear only Queued or Finished games
              return {
                ...game,
                teamA: { type: 'OPEN' as const },
                teamB: { type: 'OPEN' as const },
                status: 'Queued' as const,
                result: undefined,
                courtId: undefined,
                refId: undefined,
              };
            });
          }),
        };
        
        // Also clear grand final if it exists (it depends on the winners bracket)
        if (bracket.grandFinal) {
          const grandFinal = bracket.grandFinal;
          if (grandFinal.status !== 'Warmup' && grandFinal.status !== 'Live' && grandFinal.status !== 'Flex' && grandFinal.status !== 'Paused') {
            bracket.grandFinal = {
              ...grandFinal,
              teamA: { type: 'OPEN' as const },
              teamB: { type: 'OPEN' as const },
              status: 'Queued' as const,
              result: undefined,
              courtId: undefined,
              refId: undefined,
            };
          }
        }
        
        set({
          tournament: {
            ...tournament,
            bracket,
            updatedAt: Date.now(),
          },
        });
        
        // Sync bracket to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          saveBracket(tournament.id, bracket).catch(err => {
            console.error('Failed to sync bracket to database:', err);
          });
        }
      },

      clearLosersRoundGames: (roundIndex: number) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket || !tournament.bracket.losers) return;
        if (roundIndex < 0 || roundIndex >= tournament.bracket.losers.length) return;
        
        const bracket = {
          ...tournament.bracket,
          losers: tournament.bracket.losers.map((round, idx) => {
            if (idx !== roundIndex) return round;
            
            return round.map(game => {
              if (game.status === 'Warmup' || game.status === 'Live' || game.status === 'Flex' || game.status === 'Paused') {
                return game;
              }
              return {
                ...game,
                teamA: { type: 'OPEN' as const },
                teamB: { type: 'OPEN' as const },
                status: 'Queued' as const,
                result: undefined,
                courtId: undefined,
                refId: undefined,
              };
            });
          }),
        };
        
        set({
          tournament: {
            ...tournament,
            bracket,
            updatedAt: Date.now(),
          },
        });
        
        // Sync bracket to database if tournament has database ID
        if (tournament.id && !tournament.id.startsWith('tournament-')) {
          saveBracket(tournament.id, bracket).catch(err => {
            console.error('Failed to sync bracket to database:', err);
          });
        }
      },
      
      clearAllCourts: () => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        const allGames = getAllGames(tournament);
        // Only clear games that are Queued (not started) - don't clear games in progress
        const gamesToClear = allGames.filter(g => 
          g.courtId && g.status === 'Queued'
        );
        
        gamesToClear.forEach(game => {
          // Just unassign from court, don't change status or timers
          get().unassignGameFromCourt(game.id);
        });
      },
      
      autoAssignTeamsToBracket: (roundIndex: number) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return;
        
        // Validate round index
        if (roundIndex < 0 || roundIndex >= tournament.bracket.winners.length) return;
        const targetRound = tournament.bracket.winners[roundIndex];
        
        // Get teams that aren't already assigned in this round
        const assignedTeamIds = new Set<string>();
        targetRound.forEach(game => {
          if (game.teamA.type === 'Team' && game.teamA.teamId) {
            assignedTeamIds.add(game.teamA.teamId);
          }
          if (game.teamB.type === 'Team' && game.teamB.teamId) {
            assignedTeamIds.add(game.teamB.teamId);
          }
        });
        
        // Round 0 (first round): assign all teams (respecting seeding) and redistribute BYEs
        if (roundIndex === 0) {
          const availableTeams = tournament.teams.filter(team => !assignedTeamIds.has(team.id));
          if (availableTeams.length === 0) return;
          
          // Get only OPEN slots (preserve manually placed teams)
          const openSlots: { gameId: string; slot: 'A' | 'B' }[] = [];
          targetRound.forEach(game => {
            if (game.teamA.type === 'OPEN') {
              openSlots.push({ gameId: game.id, slot: 'A' });
            }
            if (game.teamB.type === 'OPEN') {
              openSlots.push({ gameId: game.id, slot: 'B' });
            }
          });
          
          if (openSlots.length === 0) return;
          
          // Prepare teams based on seeding mode
          let teamsToAssign: Team[] = [];
          if (tournament.seedingMode === 'manual' || tournament.seedingMode === 'upload') {
            teamsToAssign = [...availableTeams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
          } else if (tournament.seedingMode === 'random') {
            teamsToAssign = [...availableTeams].sort(() => Math.random() - 0.5);
          } else {
            teamsToAssign = [...availableTeams].sort(() => Math.random() - 0.5);
          }
          
          // Calculate how many BYEs we need (only for OPEN slots)
          const numByesNeeded = openSlots.length - teamsToAssign.length;
          
          // Redistribute: interleave teams and BYEs evenly to prevent BYE vs BYE
          const redistributedSlots: Array<{ type: 'Team' | 'BYE'; teamId?: string }> = [];
          
          // General strategy for ALL team counts: Prioritize Team vs BYE games to use up BYEs, then Team vs Team games
          // This prevents BYE vs BYE games whenever possible (works for any number of teams)
          let teamIdx = 0;
          let byeIdx = 0;
          
          // General algorithm (works for any team count):
          // 1. Pair teams with BYEs first (Team vs BYE) - uses up BYEs efficiently
          // 2. Pair remaining teams (Team vs Team)
          // 3. If one team left, pair it with a BYE if available
          // 4. Only create BYE vs BYE if we have leftover BYEs (should be rare)
          // Priority: Team vs BYE > Team vs Team > BYE vs BYE (only if absolutely necessary)
          
          // Step 1: Create as many Team vs BYE games as possible
          // This uses up BYEs by pairing them with teams, preventing BYE vs BYE games
          const numTeamByeGames = Math.min(teamsToAssign.length, numByesNeeded);
          for (let i = 0; i < numTeamByeGames; i++) {
            redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
            redistributedSlots.push({ type: 'BYE' });
            byeIdx++;
          }
          
          // Step 2: Pair remaining teams into Team vs Team games
          const remainingTeams = teamsToAssign.length - teamIdx;
          const numTeamTeamGames = Math.floor(remainingTeams / 2);
          for (let i = 0; i < numTeamTeamGames; i++) {
            redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
            redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
          }
          
          // Step 3: If there's one team left, pair it with a BYE if available
          if (teamIdx < teamsToAssign.length && byeIdx < numByesNeeded) {
            redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
            redistributedSlots.push({ type: 'BYE' });
            byeIdx++;
          }
          
          // Step 4: Create BYE vs BYE games only if we have leftover BYEs
          // This should be rare - only happens when we have an even number of leftover BYEs
          // after all teams have been paired
          const remainingByes = numByesNeeded - byeIdx;
          const numByeByeGames = Math.floor(remainingByes / 2);
          for (let i = 0; i < numByeByeGames; i++) {
            redistributedSlots.push({ type: 'BYE' });
            redistributedSlots.push({ type: 'BYE' });
            byeIdx += 2;
          }
          
          // Safety check: fill any remaining slots (shouldn't happen in normal cases)
          while (teamIdx < teamsToAssign.length && redistributedSlots.length < openSlots.length) {
            redistributedSlots.push({ type: 'Team', teamId: teamsToAssign[teamIdx++].id });
          }
          while (byeIdx < numByesNeeded && redistributedSlots.length < openSlots.length) {
            redistributedSlots.push({ type: 'BYE' });
            byeIdx++;
          }
          
          // Now assign redistributed slots to OPEN slots only (preserve manually placed teams)
          openSlots.forEach((slot, index) => {
            const redistributed = redistributedSlots[index];
            if (redistributed) {
              if (redistributed.type === 'BYE') {
                get().updateGameSlot(slot.gameId, slot.slot, { type: 'BYE' });
              } else if (redistributed.type === 'Team' && redistributed.teamId) {
                get().updateGameSlot(slot.gameId, slot.slot, { type: 'Team', teamId: redistributed.teamId });
              }
            }
          });
          
          return;
        }
        
        // For subsequent rounds: redistribute BYEs evenly to prevent double byes
        const previousRound = tournament.bracket.winners[roundIndex - 1];
        if (!previousRound) return;
        
        // First, collect all advancing teams and BYEs
        const advancingTeams: string[] = [];
        const advancingByes: number[] = []; // Track BYE positions for redistribution
        
        previousRound.forEach((prevGame) => {
          if (prevGame.status === 'Finished' && prevGame.result?.winnerId) {
            if (prevGame.result.winnerId === 'BYE') {
              advancingByes.push(advancingByes.length); // Track BYE position
            } else {
              advancingTeams.push(prevGame.result.winnerId);
            }
          } else if (prevGame.teamA.type === 'BYE' && prevGame.teamB.type === 'BYE') {
            // BYE vs BYE - one BYE advances
            advancingByes.push(advancingByes.length);
          } else if (prevGame.teamA.type === 'BYE') {
            if (prevGame.teamB.type === 'Team' && prevGame.teamB.teamId) {
              advancingTeams.push(prevGame.teamB.teamId);
            } else {
              advancingByes.push(advancingByes.length);
            }
          } else if (prevGame.teamB.type === 'BYE') {
            if (prevGame.teamA.type === 'Team' && prevGame.teamA.teamId) {
              advancingTeams.push(prevGame.teamA.teamId);
            } else {
              advancingByes.push(advancingByes.length);
            }
          } else if (prevGame.teamA.type === 'Team' && prevGame.teamA.teamId) {
            // Game not finished, use teamA as placeholder
            advancingTeams.push(prevGame.teamA.teamId);
          } else if (prevGame.teamB.type === 'Team' && prevGame.teamB.teamId) {
            // Game not finished, use teamB as placeholder
            advancingTeams.push(prevGame.teamB.teamId);
          }
        });
        
        // Redistribute: pair teams with BYEs evenly to prevent double byes
        const numGames = targetRound.length;
        const totalSlots = numGames * 2;
        const totalAdvancing = advancingTeams.length + advancingByes.length;
        
        // Create a distribution plan: interleave teams and BYEs evenly
        // Strategy: Distribute BYEs so we get Team vs BYE pairings when possible
        // Only create BYE vs BYE games when we have excess BYEs
        const slots: Array<{ type: 'Team' | 'BYE'; teamId?: string }> = [];
        
        let teamIdx = 0;
        let byeIdx = 0;
        
        // Interleave teams and BYEs to distribute BYEs evenly
        // Calculate spacing: if we have 5 teams and 3 BYEs, we want spacing like:
        // Team, Team, BYE, Team, BYE, Team, BYE, Team
        // This creates: (Team vs Team), (BYE vs Team), (BYE vs Team), (BYE vs Team)
        for (let i = 0; i < totalSlots && (teamIdx < advancingTeams.length || byeIdx < advancingByes.length); i++) {
          // Calculate ideal distribution: spread BYEs evenly among teams
          // Decide whether to place a team or BYE
          // Prefer placing a team if we have more teams than BYEs, or if we're running out of slots
          if (teamIdx < advancingTeams.length && byeIdx < advancingByes.length) {
            // We have both - decide based on even distribution
            // Calculate how many BYEs should come before this position
            const idealByesBefore = Math.floor((i * advancingByes.length) / totalAdvancing);
            const actualByesBefore = byeIdx;
            
            if (actualByesBefore < idealByesBefore) {
              // Place a BYE to catch up to ideal distribution
              slots.push({ type: 'BYE' });
              byeIdx++;
            } else {
              // Place a team
              slots.push({ type: 'Team', teamId: advancingTeams[teamIdx] });
              teamIdx++;
            }
          } else if (teamIdx < advancingTeams.length) {
            // Only teams left
            slots.push({ type: 'Team', teamId: advancingTeams[teamIdx] });
            teamIdx++;
          } else if (byeIdx < advancingByes.length) {
            // Only BYEs left
            slots.push({ type: 'BYE' });
            byeIdx++;
          }
        }
        
        // Now assign to games, redistributing BYEs evenly
        // This redistributes ALL slots (including already-placed BYEs) to prevent double byes
        targetRound.forEach((nextGame, nextGameIndex) => {
          const slotAIndex = nextGameIndex * 2;
          const slotBIndex = nextGameIndex * 2 + 1;
          
          const slotA = slots[slotAIndex];
          const slotB = slots[slotBIndex];
          
          // Always redistribute slot A (even if already assigned) to prevent double byes
          if (slotA) {
            if (slotA.type === 'BYE') {
              get().updateGameSlot(nextGame.id, 'A', { type: 'BYE' });
            } else if (slotA.type === 'Team' && slotA.teamId) {
              get().updateGameSlot(nextGame.id, 'A', { type: 'Team', teamId: slotA.teamId });
            }
          }
          
          // Always redistribute slot B (even if already assigned) to prevent double byes
          if (slotB) {
            if (slotB.type === 'BYE') {
              get().updateGameSlot(nextGame.id, 'B', { type: 'BYE' });
            } else if (slotB.type === 'Team' && slotB.teamId) {
              get().updateGameSlot(nextGame.id, 'B', { type: 'Team', teamId: slotB.teamId });
            }
          }
        });
      },

      autoAssignTeamsToBracketLosers: (roundIndex: number) => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket || !tournament.bracket.losers) return;
        
        if (roundIndex < 0 || roundIndex >= tournament.bracket.losers.length) return;
        const targetRound = tournament.bracket.losers[roundIndex];
        
        const assignedTeamIds = new Set<string>();
        targetRound.forEach(game => {
          if (game.teamA.type === 'Team' && game.teamA.teamId) {
            assignedTeamIds.add(game.teamA.teamId);
          }
          if (game.teamB.type === 'Team' && game.teamB.teamId) {
            assignedTeamIds.add(game.teamB.teamId);
          }
        });
        
        // Also check if teams are assigned in other rounds of the losers bracket (they shouldn't be available)
        // But only count teams that are in games with actual teams assigned (not OPEN slots)
        tournament.bracket.losers.forEach((round, idx) => {
          if (idx !== roundIndex) {
            round.forEach(game => {
              // Only check games that are actually in progress or have teams assigned (not just Queued with OPEN slots)
              // Exclude finished games and games that are just Queued with OPEN slots (cleared games)
              const hasTeamsAssigned = (game.teamA.type === 'Team' || game.teamB.type === 'Team') &&
                                      !(game.teamA.type === 'OPEN' && game.teamB.type === 'OPEN');
              
              if (game.status !== 'Finished' && hasTeamsAssigned) {
                if (game.teamA.type === 'Team' && game.teamA.teamId) {
                  assignedTeamIds.add(game.teamA.teamId);
                }
                if (game.teamB.type === 'Team' && game.teamB.teamId) {
                  assignedTeamIds.add(game.teamB.teamId);
                }
              }
            });
          }
        });
        
        // Determine eligible teams based on double elimination logic:
        // Round 0: Losers from winners round 0
        // Round 1+: Winners from previous losers round + losers from corresponding winners round
        // Final: Winner of previous losers round + loser of winners final
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
          // Losers round 1 gets losers from winners round 1, etc.
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
        
        // For losers final, also include teams that are in the losers pool
        // (teams that lost in winners bracket but haven't been eliminated)
        if (roundIndex === tournament.bracket.losers.length - 1 && tournament.bracket) {
          tournament.bracket.losers.forEach((round, idx) => {
            if (idx !== roundIndex) {
              round.forEach(game => {
                // Include teams that are assigned to active losers bracket games
                if (game.status !== 'Finished') {
                  if (game.teamA.type === 'Team' && game.teamA.teamId && !assignedTeamIds.has(game.teamA.teamId)) {
                    eligibleTeamIds.add(game.teamA.teamId);
                  }
                  if (game.teamB.type === 'Team' && game.teamB.teamId && !assignedTeamIds.has(game.teamB.teamId)) {
                    eligibleTeamIds.add(game.teamB.teamId);
                  }
                }
                // Also include winners from finished losers bracket games
                if (game.status === 'Finished' && game.result?.winnerId && !assignedTeamIds.has(game.result.winnerId)) {
                  eligibleTeamIds.add(game.result.winnerId);
                }
              });
            }
          });
          
          // Also include teams that lost in winners bracket (anywhere) and aren't eliminated
          tournament.bracket.winners.forEach(round => {
            round.forEach(game => {
              if (game.status === 'Finished' && game.result) {
                const loserId = getLoserId(game);
                if (loserId && !assignedTeamIds.has(loserId)) {
                  // Check if this team hasn't been eliminated from losers bracket
                  const isEliminated = tournament.bracket?.losers.some(losersRound =>
                    losersRound.some(losersGame =>
                      losersGame.status === 'Finished' && losersGame.result &&
                      ((losersGame.teamA.type === 'Team' && losersGame.teamA.teamId === loserId && losersGame.result.winnerId !== loserId) ||
                       (losersGame.teamB.type === 'Team' && losersGame.teamB.teamId === loserId && losersGame.result.winnerId !== loserId))
                    )
                  );
                  if (!isEliminated) {
                    eligibleTeamIds.add(loserId);
                  }
                }
              }
            });
          });
        }
        
        const availableTeams = tournament.teams.filter(team => 
          eligibleTeamIds.has(team.id) && !assignedTeamIds.has(team.id)
        );
        if (availableTeams.length === 0) return;
        
        const openSlots: { gameId: string; slot: 'A' | 'B' }[] = [];
        targetRound.forEach(game => {
          if (game.teamA.type === 'OPEN') openSlots.push({ gameId: game.id, slot: 'A' });
          if (game.teamB.type === 'OPEN') openSlots.push({ gameId: game.id, slot: 'B' });
        });
        if (openSlots.length === 0) return;
        
        let teamsToAssign: Team[] = [];
        if (tournament.seedingMode === 'manual' || tournament.seedingMode === 'upload') {
          teamsToAssign = [...availableTeams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
        } else if (tournament.seedingMode === 'random') {
          teamsToAssign = [...availableTeams].sort(() => Math.random() - 0.5);
        } else {
          teamsToAssign = [...availableTeams].sort(() => Math.random() - 0.5);
        }
        
        const numSlotsToFill = Math.min(teamsToAssign.length, openSlots.length);
        for (let i = 0; i < numSlotsToFill; i++) {
          const slot = openSlots[i];
          get().updateGameSlot(slot.gameId, slot.slot, { type: 'Team', teamId: teamsToAssign[i].id });
        }
        
        if (tournament.settings.openSlotPolicy === 'BYE' && numSlotsToFill < openSlots.length) {
          for (let i = numSlotsToFill; i < openSlots.length; i++) {
            const slot = openSlots[i];
            get().updateGameSlot(slot.gameId, slot.slot, { type: 'BYE' });
          }
        }
      },
      
      getAllGames: () => {
        const { tournament } = get();
        if (!tournament || !tournament.bracket) return [];
        return getAllGames(tournament);
      },
    }),
    {
      name: 'flex-tournament-storage',
    }
  )
);

// Helper functions
function findGame(tournament: Tournament, gameId: string): Game | null {
  if (!tournament.bracket) return null;
  
  for (const round of tournament.bracket.winners) {
    const game = round.find(g => g.id === gameId);
    if (game) return game;
  }
  
  for (const round of tournament.bracket.losers) {
    const game = round.find(g => g.id === gameId);
    if (game) return game;
  }
  
  if (tournament.bracket.grandFinal?.id === gameId) {
    return tournament.bracket.grandFinal;
  }
  
  if (tournament.bracket.grandFinalReset?.id === gameId) {
    return tournament.bracket.grandFinalReset;
  }
  
  return null;
}

function getAllGames(tournament: Tournament): Game[] {
  const games: Game[] = [];
  
  if (!tournament.bracket) return games;
  
  for (const round of tournament.bracket.winners) {
    games.push(...round);
  }
  
  for (const round of tournament.bracket.losers) {
    games.push(...round);
  }
  
  if (tournament.bracket.grandFinal) {
    games.push(tournament.bracket.grandFinal);
  }
  
  if (tournament.bracket.grandFinalReset) {
    games.push(tournament.bracket.grandFinalReset);
  }
  
  return games;
}

