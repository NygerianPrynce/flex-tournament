import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { calculateTournamentDuration } from '../lib/tournamentDuration';
import { useSport } from '../hooks/useSport';
import { getTournament } from '../lib/database';
import type { Tournament } from '../types';
import {
  Layout,
  Typography,
  Card,
  Button,
  Input,
  Space,
  Alert,
  message,
} from 'antd';
import {
  InfoCircleOutlined,
  CopyOutlined,
  CheckOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

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
    
    // Check if tournament has database ID (not localStorage tournament)
    const hasDatabaseId = tournament.id && !tournament.id.startsWith('tournament-');
    
    // If it's a database tournament and we don't have shareCode, or if we want to refresh it
    if (hasDatabaseId && !loadingShareCode) {
      setLoadingShareCode(true);
      
      getTournament(tournament.id)
        .then((updatedTournament) => {
          if (updatedTournament) {
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
    }
  }, [tournament?.id, setTournament]);
  
  if (!tournament) {
    return <div style={{ padding: '32px' }}>No tournament loaded</div>;
  }
  
  // Check if tournament is complete
  const isTournamentComplete = () => {
    if (!tournament.bracket) return false;
    
    // First check: if there are 0 remaining games, tournament is complete
    const remainingGames = getRemainingGames();
    if (remainingGames === 0) {
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
  
  // Calculate remaining games based on current bracket state
  const getRemainingGames = () => {
    if (!tournament.bracket) return 0;
    
    const allGames = getAllGames();
    // Filter out BYE vs BYE games and games that are finished
    const unfinishedGames = allGames.filter(g => {
      // Exclude BYE vs BYE games
      if (g.teamA.type === 'BYE' && g.teamB.type === 'BYE') {
        return false;
      }
      return g.status !== 'Finished';
    });
    return unfinishedGames.length;
  };

  // Get actual completion time (when final game finished)
  const getActualCompletionTime = () => {
    if (!tournament.bracket) return null;
    
    let finalGame = null;
    // Check grand final reset first (if it exists and is finished, it's the true final game)
    if (tournament.bracket.grandFinalReset && 
        tournament.bracket.grandFinalReset.status === 'Finished' && 
        tournament.bracket.grandFinalReset.result) {
      finalGame = tournament.bracket.grandFinalReset;
    } else if (tournament.bracket.grandFinal && 
               tournament.bracket.grandFinal.status === 'Finished' && 
               tournament.bracket.grandFinal.result) {
      // Check if winners bracket champion won (no reset needed)
      const gf = tournament.bracket.grandFinal;
      const winnerCameFromLosers = gf.teamB.type === 'Team' && gf.teamB.teamId === gf.result.winnerId;
      // Only use grand final as final game if winners bracket champion won (no reset)
      if (!winnerCameFromLosers) {
        finalGame = tournament.bracket.grandFinal;
      }
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
  
  // Store the completion time when tournament becomes complete (to stop the clock)
  const [frozenCompletionTime, setFrozenCompletionTime] = useState<number | null>(null);
  
  useEffect(() => {
    // Freeze timer when tournament is complete (which now includes 0 remaining games check)
    if (tournamentComplete && actualCompletionTime) {
      // Freeze the completion time when tournament becomes complete
      setFrozenCompletionTime(actualCompletionTime.getTime());
    } else if (tournamentComplete && !actualCompletionTime && frozenCompletionTime === null) {
      // Tournament is complete but we don't have completion time - use current time as fallback
      setFrozenCompletionTime(currentTime);
    } else if (!tournamentComplete) {
      // Tournament is not complete - reset frozen time
      setFrozenCompletionTime(null);
    }
  }, [tournamentComplete, actualCompletionTime, currentTime, frozenCompletionTime]);
  
  // Calculate time elapsed since tournament started
  const getElapsedTime = () => {
    if (tournamentComplete && frozenCompletionTime !== null) {
      // If complete, show time from start to completion (frozen)
      return frozenCompletionTime - tournament.createdAt;
    }
    // Otherwise, show time from start to now (updating)
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
        message.success('Share code copied to clipboard!');
      }
    }
  };
  
  const handleCopyUrl = async () => {
    if (shareUrl) {
      const success = await copyToClipboard(shareUrl);
      if (success) {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
        message.success('Share URL copied to clipboard!');
      }
    }
  };
  
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ 
            margin: 0, 
            fontWeight: 700, 
            fontSize: '32px',
            color: '#f97316',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <InfoCircleOutlined style={{ marginRight: '12px' }} />
            Tournament Info
          </Title>
        </div>
        
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* Share Code Card - Show if tournament has database ID (not localStorage) */}
          {tournament.id && !tournament.id.startsWith('tournament-') && (
            <Card
              style={{
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                border: '2px solid #f97316',
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <Title level={4} style={{ 
                marginBottom: '20px', 
                fontWeight: 700,
                color: '#f97316',
                borderBottom: '2px solid #f97316',
                paddingBottom: '12px',
              }}>
                Share Tournament
              </Title>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {loadingShareCode ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                    Loading share code...
                  </div>
                ) : tournament.shareCode ? (
                  <>
                    <div>
                      <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                        Share Code
                      </Text>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          value={tournament.shareCode}
                          readOnly
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '18px',
                            fontWeight: 700,
                            textAlign: 'center',
                            letterSpacing: '2px',
                          }}
                        />
                        <Button
                          type="primary"
                          icon={copiedCode ? <CheckOutlined /> : <CopyOutlined />}
                          onClick={handleCopyCode}
                          style={{
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            border: 'none',
                            borderRadius: '0 8px 8px 0',
                            fontWeight: 600,
                          }}
                        >
                          {copiedCode ? 'Copied!' : 'Copy'}
                        </Button>
                      </Space.Compact>
                    </div>
                    {shareUrl && (
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                          Share URL
                        </Text>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input
                            value={shareUrl}
                            readOnly
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '13px',
                            }}
                          />
                          <Button
                            type="primary"
                            icon={copiedUrl ? <CheckOutlined /> : <CopyOutlined />}
                            onClick={handleCopyUrl}
                            style={{
                              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                              border: 'none',
                              borderRadius: '0 8px 8px 0',
                              fontWeight: 600,
                            }}
                          >
                            {copiedUrl ? 'Copied!' : 'Copy'}
                          </Button>
                        </Space.Compact>
                      </div>
                    )}
                    <Alert
                      message="Share this code or URL with others to let them view the tournament in read-only mode. They won't be able to make changes."
                      type="info"
                      showIcon
                      style={{ borderRadius: '8px' }}
                    />
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                    Share code not available for this tournament.
                  </div>
                )}
              </Space>
            </Card>
          )}
          
          {/* Tournament Information Card */}
          <Card
            style={{
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Title level={4} style={{ 
              marginBottom: '20px', 
              fontWeight: 700,
              borderBottom: '2px solid #f97316',
              paddingBottom: '12px',
            }}>
              Tournament Information
            </Title>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Name
                  </Text>
                  <Text strong style={{ fontSize: '18px', display: 'block' }}>
                    {tournament.name}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Format
                  </Text>
                  <Text strong style={{ fontSize: '18px', display: 'block' }}>
                    {tournament.settings.includeLosersBracket ? 'Double Elimination' : 'Single Elimination'}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Teams
                  </Text>
                  <Text strong style={{ fontSize: '18px', display: 'block' }}>
                    {tournament.teams.length}
                  </Text>
                </div>
              </Space>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {venueTermPlural}
                  </Text>
                  <Text strong style={{ fontSize: '18px', display: 'block' }}>
                    {tournament.settings.numberOfCourts}
                  </Text>
                </div>
                {tournament.bracket && (
                  <>
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Rounds
                      </Text>
                      <Text strong style={{ fontSize: '18px', display: 'block' }}>
                        {duration.roundsCount}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Total Games
                      </Text>
                      <Text strong style={{ fontSize: '18px', display: 'block' }}>
                        {duration.gamesCount}
                      </Text>
                    </div>
                  </>
                )}
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Created
                  </Text>
                  <Text style={{ fontSize: '14px', display: 'block', color: '#6b7280' }}>
                    <CalendarOutlined style={{ marginRight: '6px' }} />
                    {new Date(tournament.createdAt).toLocaleString()}
                  </Text>
                </div>
              </Space>
            </div>
          </Card>
          
          {/* Tournament Status Card */}
          {tournament.bracket && (
            <Card
              style={{
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <Title level={4} style={{ 
                marginBottom: '20px', 
                fontWeight: 700,
                borderBottom: '2px solid #f97316',
                paddingBottom: '12px',
              }}>
                Tournament Status
              </Title>
              {tournamentComplete ? (
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <Alert
                    message={
                      <Space direction="vertical" size={4}>
                        <Text strong style={{ fontSize: '20px', color: '#16a34a' }}>
                          Tournament Complete!
                        </Text>
                        {actualCompletionTime && (
                          <Text style={{ fontSize: '14px', color: '#16a34a' }}>
                            Completed: {actualCompletionTime.toLocaleString()}
                          </Text>
                        )}
                      </Space>
                    }
                    type="success"
                    showIcon
                    style={{ borderRadius: '12px', padding: '20px' }}
                  />
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '14px' }}>Time Elapsed:</Text>
                      <Text strong style={{ fontSize: '18px' }}>
                        <ClockCircleOutlined style={{ marginRight: '6px' }} />
                        {formatElapsedTime()}
                      </Text>
                    </div>
                    {actualTotalDuration && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: '14px' }}>Total Duration:</Text>
                        <Text strong style={{ fontSize: '18px' }}>{actualTotalDuration}</Text>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '14px' }}>Initial Estimate:</Text>
                      <Text strong style={{ fontSize: '18px' }}>{duration.formatted}</Text>
                    </div>
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <Alert
                    message={
                      <Space direction="vertical" size={8}>
                        <Text strong style={{ fontSize: '18px', color: '#3b82f6' }}>
                          Tournament In Progress
                        </Text>
                        <Text strong style={{ fontSize: '32px', color: '#1e40af', display: 'block' }}>
                          {formatElapsedTime()}
                        </Text>
                        <Text style={{ fontSize: '14px', color: '#3b82f6' }}>Time Elapsed</Text>
                      </Space>
                    }
                    type="info"
                    showIcon
                    style={{ borderRadius: '12px', padding: '20px' }}
                  />
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '14px' }}>Initial Estimated Total Time:</Text>
                      <Text strong style={{ fontSize: '18px' }}>{duration.formatted}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '14px' }}>Remaining Games:</Text>
                      <Text strong style={{ fontSize: '18px' }}>{getRemainingGames()}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '14px' }}>Estimated Remaining Time:</Text>
                      <Text strong style={{ fontSize: '18px', color: '#f97316' }}>{remainingTime.formatted}</Text>
                    </div>
                    {estimatedFinishTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: '14px' }}>Estimated Finish Time:</Text>
                        <Text strong style={{ fontSize: '18px' }}>{estimatedFinishTime.toLocaleTimeString()}</Text>
                      </div>
                    )}
                    <Alert
                      message={`Based on ${tournament.settings.numberOfCourts} ${venueTermPlural.toLowerCase()}, ${getRemainingGames()} remaining game(s). Includes warmup (${tournament.settings.warmupMinutes} min), game time (${tournament.settings.gameLengthMinutes} min), and flex time (${tournament.settings.flexMinutes} min) per game.`}
                      type="info"
                      showIcon={false}
                      style={{ borderRadius: '8px', marginTop: '8px' }}
                    />
                  </Space>
                </Space>
              )}
            </Card>
          )}
          
          {/* Estimated Duration Card (if no bracket) */}
          {!tournament.bracket && (
            <Card
              style={{
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <Title level={4} style={{ 
                marginBottom: '20px', 
                fontWeight: 700,
                borderBottom: '2px solid #f97316',
                paddingBottom: '12px',
              }}>
                Estimated Duration
              </Title>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text type="secondary" style={{ fontSize: '14px' }}>Estimated Length:</Text>
                  <Text strong style={{ fontSize: '18px' }}>{duration.formatted}</Text>
                </div>
                <Alert
                  message={`Based on ${tournament.settings.numberOfCourts} ${venueTermPlural.toLowerCase()}, ${duration.gamesCount} game(s), and ${duration.roundsCount} round(s). Includes warmup (${tournament.settings.warmupMinutes} min), game time (${tournament.settings.gameLengthMinutes} min), and flex time (${tournament.settings.flexMinutes} min) per game.`}
                  type="info"
                  showIcon={false}
                  style={{ borderRadius: '8px' }}
                />
              </Space>
            </Card>
          )}
          
          {/* Game Settings Card */}
          <Card
            style={{
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Title level={4} style={{ 
              marginBottom: '20px', 
              fontWeight: 700,
              borderBottom: '2px solid #f97316',
              paddingBottom: '12px',
            }}>
              <SettingOutlined style={{ marginRight: '8px' }} />
              Game Settings
            </Title>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Warmup Time
                  </Text>
                  <Text strong style={{ fontSize: '18px', display: 'block' }}>
                    {tournament.settings.warmupMinutes} minutes
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Game Length
                  </Text>
                  <Text strong style={{ fontSize: '18px', display: 'block' }}>
                    {tournament.settings.gameLengthMinutes} minutes
                  </Text>
                </div>
              </Space>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Flex Time
                  </Text>
                  <Text strong style={{ fontSize: '18px', display: 'block' }}>
                    {tournament.settings.flexMinutes} minutes
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total Time per Game
                  </Text>
                  <Text strong style={{ fontSize: '18px', display: 'block', color: '#f97316' }}>
                    {tournament.settings.warmupMinutes + tournament.settings.gameLengthMinutes + tournament.settings.flexMinutes} minutes
                  </Text>
                </div>
              </Space>
            </div>
          </Card>
        </Space>
      </Content>
    </Layout>
  );
}
