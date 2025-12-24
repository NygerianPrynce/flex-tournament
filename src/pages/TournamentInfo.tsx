import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { calculateTournamentDuration } from '../lib/tournamentDuration';
import { useSport } from '../hooks/useSport';
import { getTournament } from '../lib/database';
import type { Tournament } from '../types';

interface TournamentInfoProps {
  tournament?: Tournament;
  viewerMode?: boolean;
}

export function TournamentInfo({ tournament: propTournament, viewerMode: _viewerMode = false }: TournamentInfoProps = {} as TournamentInfoProps) {
  const store = useTournamentStore();
  const tournament = propTournament || store.tournament;
  const { getAllGames, setTournament } = store;
  const { venueTermPlural } = useSport();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loadingShareCode, setLoadingShareCode] = useState(false);
  
  // Update current time every second for running clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Load shareCode if tournament has database ID but no shareCode
  useEffect(() => {
    if (!tournament) return;
    
    console.log('TournamentInfo: Tournament ID:', tournament.id);
    console.log('TournamentInfo: Has shareCode:', tournament.shareCode);
    
    // Check if tournament has database ID (not localStorage tournament)
    const hasDatabaseId = tournament.id && !tournament.id.startsWith('tournament-');
    console.log('TournamentInfo: Has database ID:', hasDatabaseId);
    console.log('TournamentInfo: Tournament ID starts with tournament-:', tournament.id?.startsWith('tournament-'));
    
    // If it's a database tournament and we don't have shareCode, or if we want to refresh it
    if (hasDatabaseId && !loadingShareCode) {
      console.log('TournamentInfo: Loading share code for tournament:', tournament.id);
      setLoadingShareCode(true);
      
      getTournament(tournament.id)
        .then((updatedTournament) => {
          console.log('TournamentInfo: Got tournament from DB:', updatedTournament);
          if (updatedTournament) {
            console.log('TournamentInfo: ShareCode from DB:', updatedTournament.shareCode);
            // Update tournament with shareCode if it exists
            setTournament(updatedTournament);
          }
        })
        .catch((error) => {
          console.error('TournamentInfo: Failed to load share code:', error);
        })
        .finally(() => {
          setLoadingShareCode(false);
        });
    } else {
      console.log('TournamentInfo: Skipping load - hasDatabaseId:', hasDatabaseId, 'loadingShareCode:', loadingShareCode);
    }
  }, [tournament?.id, setTournament]);
  
  if (!tournament) {
    return <div className="p-8">No tournament loaded</div>;
  }
  
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
  
  // Get actual completion time (when final game finished)
  const getActualCompletionTime = () => {
    if (!tournament.bracket) return null;
    
    let finalGame = null;
    if (tournament.bracket.grandFinal && tournament.bracket.grandFinal.status === 'Finished' && tournament.bracket.grandFinal.result) {
      finalGame = tournament.bracket.grandFinal;
    } else if (tournament.bracket.winners.length > 0) {
      const finalRound = tournament.bracket.winners[tournament.bracket.winners.length - 1];
      finalGame = finalRound.find(g => g.status === 'Finished' && g.result);
    }
    
    if (finalGame && finalGame.result) {
      return new Date(finalGame.result.finishedAt);
    }
    
    return null;
  };
  
  const tournamentComplete = isTournamentComplete();
  const actualCompletionTime = getActualCompletionTime();
  
  // Calculate time elapsed since tournament started
  const getElapsedTime = () => {
    if (tournamentComplete && actualCompletionTime) {
      // If complete, show time from start to completion
      return actualCompletionTime.getTime() - tournament.createdAt;
    }
    // Otherwise, show time from start to now
    return currentTime - tournament.createdAt;
  };
  
  const elapsedMs = getElapsedTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedHours = Math.floor(elapsedSeconds / 3600);
  const elapsedMinutes = Math.floor((elapsedSeconds % 3600) / 60);
  const elapsedSecs = elapsedSeconds % 60;
  
  const formatElapsedTime = () => {
    if (elapsedHours > 0) {
      return `${elapsedHours}h ${elapsedMinutes}m ${elapsedSecs}s`;
    } else if (elapsedMinutes > 0) {
      return `${elapsedMinutes}m ${elapsedSecs}s`;
    } else {
      return `${elapsedSecs}s`;
    }
  };
  
  // Calculate remaining games based on current bracket state
  const getRemainingGames = () => {
    if (!tournament.bracket) return 0;
    
    const allGames = getAllGames();
    const unfinishedGames = allGames.filter(g => g.status !== 'Finished');
    return unfinishedGames.length;
  };
  
  // Calculate estimated remaining time based on current status
  const calculateRemainingTime = () => {
    if (!tournament.bracket || tournamentComplete) {
      return { minutes: 0, formatted: '0 minutes' };
    }
    
    const remainingGames = getRemainingGames();
    if (remainingGames === 0) return { minutes: 0, formatted: '0 minutes' };
    
    const timePerGameMinutes = tournament.settings.warmupMinutes + 
                               tournament.settings.gameLengthMinutes + 
                               tournament.settings.flexMinutes;
    
    // Calculate how many batches are needed (games that can run simultaneously)
    const batchesNeeded = Math.ceil(remainingGames / tournament.settings.numberOfCourts);
    
    // Time for remaining games = number of batches × time per game
    const remainingMinutes = batchesNeeded * timePerGameMinutes;
    
    // Add small buffer (2 minutes per batch for transitions)
    const totalRemaining = remainingMinutes + (batchesNeeded * 2);
    
    const hours = Math.floor(totalRemaining / 60);
    const mins = Math.round(totalRemaining % 60);
    
    let formatted = '';
    if (hours > 0) {
      formatted = `${hours} hour${hours !== 1 ? 's' : ''}`;
      if (mins > 0) {
        formatted += ` ${mins} minute${mins !== 1 ? 's' : ''}`;
      }
    } else {
      formatted = `${mins} minute${mins !== 1 ? 's' : ''}`;
    }
    
    return { minutes: totalRemaining, formatted };
  };
  
  // Calculate estimated finish time
  const getEstimatedFinishTime = () => {
    if (tournamentComplete) return null;
    
    const remaining = calculateRemainingTime();
    const finishTime = new Date(currentTime + remaining.minutes * 60 * 1000);
    return finishTime;
  };
  
  const duration = calculateTournamentDuration(
    tournament.teams.length,
    tournament.settings,
    tournament.settings.includeLosersBracket
  );
  
  const remainingTime = calculateRemainingTime();
  const estimatedFinishTime = getEstimatedFinishTime();
  
  // Calculate actual total duration when complete
  const getActualTotalDuration = () => {
    if (!tournamentComplete || !actualCompletionTime) return null;
    
    const totalMs = actualCompletionTime.getTime() - tournament.createdAt;
    const totalMinutes = Math.floor(totalMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    let formatted = '';
    if (hours > 0) {
      formatted = `${hours} hour${hours !== 1 ? 's' : ''}`;
      if (mins > 0) {
        formatted += ` ${mins} minute${mins !== 1 ? 's' : ''}`;
      }
    } else {
      formatted = `${mins} minute${mins !== 1 ? 's' : ''}`;
    }
    
    return formatted;
  };
  
  const actualTotalDuration = getActualTotalDuration();
  
  // Share code functionality
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const shareUrl = tournament.shareCode 
    ? `${window.location.origin}/view/${tournament.shareCode}`
    : null;
  
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackErr) {
        document.body.removeChild(textArea);
        console.error('Failed to copy:', fallbackErr);
        return false;
      }
    }
  };
  
  const handleCopyCode = async () => {
    if (tournament.shareCode) {
      const success = await copyToClipboard(tournament.shareCode);
      if (success) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    }
  };
  
  const handleCopyUrl = async () => {
    if (shareUrl) {
      const success = await copyToClipboard(shareUrl);
      if (success) {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
    }
  };
  
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-light-off-white min-h-screen overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading uppercase tracking-wide-heading text-accent-orange mb-4 sm:mb-6 md:mb-8" style={{ fontStyle: 'oblique' }}>
          Tournament Info
        </h2>
        
        <div className="space-y-6">
          {/* Share Code Card - Show if tournament has database ID (not localStorage) */}
          {tournament.id && !tournament.id.startsWith('tournament-') && (
            <div className="card bg-gradient-to-r from-accent-orange/10 to-secondary-orange/10 border-2 border-accent-orange/30">
              <h3 className="text-xl font-heading uppercase tracking-wide-heading text-dark-charcoal mb-4 pb-2 border-b-2 border-accent-orange" style={{ fontStyle: 'oblique' }}>
                Share Tournament
              </h3>
              <div className="space-y-4">
                {loadingShareCode ? (
                  <div className="text-center py-4 text-gray-600">
                    Loading share code...
                  </div>
                ) : tournament.shareCode ? (
                  <>
                    <div>
                      <span className="text-sm text-gray-500 uppercase tracking-wide block mb-2">Share Code</span>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 px-4 py-3 bg-white border-2 border-accent-orange rounded-lg text-lg font-mono font-bold text-dark-near-black tracking-wider">
                          {tournament.shareCode}
                        </code>
                        <button
                          onClick={handleCopyCode}
                          className="btn-primary whitespace-nowrap"
                        >
                          {copiedCode ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-600">
                    Share code not available for this tournament.
                  </div>
                )}
                {tournament.shareCode && shareUrl && (
                  <div>
                    <span className="text-sm text-gray-500 uppercase tracking-wide block mb-2">Share URL</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-sm font-mono text-dark-near-black"
                      />
                      <button
                        onClick={handleCopyUrl}
                        className="btn-primary whitespace-nowrap"
                      >
                        {copiedUrl ? 'Copied!' : 'Copy URL'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-600 bg-white/50 p-3 rounded-lg border border-gray-200">
                  Share this code or URL with others to let them view the tournament in read-only mode. They won't be able to make changes.
                </div>
              </div>
            </div>
          )}
          
          {/* Tournament Information Card */}
          <div className="card">
            <h3 className="text-xl font-heading uppercase tracking-wide-heading text-dark-charcoal mb-4 pb-2 border-b-2 border-accent-orange" style={{ fontStyle: 'oblique' }}>
              Tournament Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-gray-700">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Name</span>
                  <div className="text-lg font-semibold text-dark-near-black mt-1">{tournament.name}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Format</span>
                  <div className="text-lg font-semibold text-dark-near-black mt-1">
                    {tournament.settings.includeLosersBracket ? 'Double Elimination' : 'Single Elimination'}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Teams</span>
                  <div className="text-lg font-semibold text-dark-near-black mt-1">{tournament.teams.length}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">{venueTermPlural}</span>
                  <div className="text-lg font-semibold text-dark-near-black mt-1">{tournament.settings.numberOfCourts}</div>
                </div>
                {tournament.bracket && (
                  <>
                    <div>
                      <span className="text-sm text-gray-500 uppercase tracking-wide">Rounds</span>
                      <div className="text-lg font-semibold text-dark-near-black mt-1">{duration.roundsCount}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 uppercase tracking-wide">Total Games</span>
                      <div className="text-lg font-semibold text-dark-near-black mt-1">{duration.gamesCount}</div>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Created</span>
                  <div className="text-sm text-gray-600 mt-1">{new Date(tournament.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tournament Status Card */}
          {tournament.bracket && (
            <div className="card">
              <h3 className="text-xl font-heading uppercase tracking-wide-heading text-dark-charcoal mb-4 pb-2 border-b-2 border-accent-orange" style={{ fontStyle: 'oblique' }}>
                Tournament Status
              </h3>
              {tournamentComplete ? (
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg">
                    <div className="text-green-800 font-heading uppercase tracking-wide-heading text-2xl mb-2" style={{ fontStyle: 'oblique' }}>
                      Tournament Complete!
                    </div>
                    {actualCompletionTime && (
                      <div className="text-green-700 font-semibold">
                        Completed: {actualCompletionTime.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 uppercase tracking-wide">Time Elapsed:</span>
                      <span className="text-lg font-semibold text-dark-near-black">{formatElapsedTime()}</span>
                    </div>
                    {actualTotalDuration && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 uppercase tracking-wide">Total Duration:</span>
                        <span className="text-lg font-semibold text-dark-near-black">{actualTotalDuration}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 uppercase tracking-wide">Initial Estimate:</span>
                      <span className="text-lg font-semibold text-dark-near-black">{duration.formatted}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                    <div className="text-blue-800 font-heading uppercase tracking-wide-heading text-xl mb-2" style={{ fontStyle: 'oblique' }}>
                      Tournament In Progress
                    </div>
                    <div className="text-2xl font-bold text-blue-900 mt-3">
                      {formatElapsedTime()}
                    </div>
                    <div className="text-sm text-blue-700 mt-1">Time Elapsed</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 uppercase tracking-wide">Initial Estimated Total Time:</span>
                      <span className="text-lg font-semibold text-dark-near-black">{duration.formatted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 uppercase tracking-wide">Remaining Games:</span>
                      <span className="text-lg font-semibold text-dark-near-black">{getRemainingGames()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 uppercase tracking-wide">Estimated Remaining Time:</span>
                      <span className="text-lg font-semibold text-accent-orange">{remainingTime.formatted}</span>
                    </div>
                    {estimatedFinishTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 uppercase tracking-wide">Estimated Finish Time:</span>
                        <span className="text-lg font-semibold text-dark-near-black">{estimatedFinishTime.toLocaleTimeString()}</span>
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      Based on {tournament.settings.numberOfCourts} {venueTermPlural.toLowerCase()}, {getRemainingGames()} remaining game(s). 
                      Includes warmup ({tournament.settings.warmupMinutes} min), 
                      game time ({tournament.settings.gameLengthMinutes} min), and flex time ({tournament.settings.flexMinutes} min) per game.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Estimated Duration Card (if no bracket) */}
          {!tournament.bracket && (
            <div className="card">
              <h3 className="text-xl font-heading uppercase tracking-wide-heading text-dark-charcoal mb-4 pb-2 border-b-2 border-accent-orange" style={{ fontStyle: 'oblique' }}>
                Estimated Duration
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Estimated Length:</span>
                  <span className="text-lg font-semibold text-dark-near-black">{duration.formatted}</span>
                </div>
                <div className="text-sm text-gray-600 mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  Based on {tournament.settings.numberOfCourts} {venueTermPlural.toLowerCase()}, {duration.gamesCount} game(s), 
                  and {duration.roundsCount} round(s). Includes warmup ({tournament.settings.warmupMinutes} min), 
                  game time ({tournament.settings.gameLengthMinutes} min), and flex time ({tournament.settings.flexMinutes} min) per game.
                </div>
              </div>
            </div>
          )}
          
          {/* Game Settings Card */}
          <div className="card">
            <h3 className="text-xl font-heading uppercase tracking-wide-heading text-dark-charcoal mb-4 pb-2 border-b-2 border-accent-orange" style={{ fontStyle: 'oblique' }}>
              Game Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Warmup Time</span>
                  <div className="text-lg font-semibold text-dark-near-black mt-1">{tournament.settings.warmupMinutes} minutes</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Game Length</span>
                  <div className="text-lg font-semibold text-dark-near-black mt-1">{tournament.settings.gameLengthMinutes} minutes</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Flex Time</span>
                  <div className="text-lg font-semibold text-dark-near-black mt-1">{tournament.settings.flexMinutes} minutes</div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 uppercase tracking-wide">Total Time per Game</span>
                  <div className="text-lg font-semibold text-accent-orange mt-1">
                    {tournament.settings.warmupMinutes + tournament.settings.gameLengthMinutes + tournament.settings.flexMinutes} minutes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

