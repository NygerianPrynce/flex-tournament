import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { useSport } from '../hooks/useSport';
import {
  Layout,
  Typography,
  Card,
  InputNumber,
  Button,
  Space,
  Alert,
  message,
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

export function TournamentSettings() {
  const { tournament, updateTournament, getAllGames } = useTournamentStore();
  const { venueTerm } = useSport();
  
  const [gameLength, setGameLength] = useState<string>('20');
  const [warmupTime, setWarmupTime] = useState<string>('5');
  const [flexTime, setFlexTime] = useState<string>('5');
  const [numberOfCourts, setNumberOfCourts] = useState<string>('2');
  
  useEffect(() => {
    if (tournament) {
      setGameLength(tournament.settings.gameLengthMinutes.toString());
      setWarmupTime(tournament.settings.warmupMinutes.toString());
      setFlexTime(tournament.settings.flexMinutes.toString());
      setNumberOfCourts(tournament.settings.numberOfCourts.toString());
    }
  }, [tournament]);
  
  if (!tournament) {
    return <div style={{ padding: '32px' }}>No tournament loaded</div>;
  }

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
  
  const handleSaveSettings = () => {
    if (tournamentComplete) {
      message.warning('Cannot change settings after the tournament is finished.');
      return;
    }
    if (!tournament) return;
    
    const numGameLength = parseInt(gameLength) || 1;
    const numWarmupTime = parseInt(warmupTime) || 0;
    const numFlexTime = parseInt(flexTime) || 0;
    const numNumberOfCourts = parseInt(numberOfCourts) || 1;
    
    // Update court names if number of courts changed
    let newCourtNames = [...tournament.settings.courtNames];
    if (numNumberOfCourts > tournament.settings.numberOfCourts) {
      // Add new courts
      for (let i = tournament.settings.numberOfCourts; i < numNumberOfCourts; i++) {
        newCourtNames.push(`${venueTerm} ${i + 1}`);
      }
    } else if (numNumberOfCourts < tournament.settings.numberOfCourts) {
      // Remove extra courts
      newCourtNames = newCourtNames.slice(0, numNumberOfCourts);
    }
    
    // Update courts array
    const newCourts = Array.from({ length: numNumberOfCourts }, (_, i) => ({
      id: tournament.courts[i]?.id || `court-${i}`,
      name: newCourtNames[i] || `${venueTerm} ${i + 1}`,
    }));
    
    updateTournament({
      settings: {
        ...tournament.settings,
        gameLengthMinutes: numGameLength,
        warmupMinutes: numWarmupTime,
        flexMinutes: numFlexTime,
        numberOfCourts: numNumberOfCourts,
        courtNames: newCourtNames,
      },
      courts: newCourts,
    });
    
    message.success('Settings saved successfully!');
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
            <SettingOutlined style={{ marginRight: '12px' }} />
            Settings
          </Title>
          {tournamentComplete && (
            <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '14px' }}>
              Tournament is finished. Settings cannot be changed.
            </Text>
          )}
        </div>

        {tournamentComplete && (
          <Alert
            message="Tournament is finished. Settings cannot be changed."
            type="info"
            showIcon
            style={{ marginBottom: '24px', borderRadius: '8px' }}
          />
        )}
        
        <Card
          style={{
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <Title level={4} style={{ marginBottom: '20px', fontWeight: 600 }}>
            Game Settings
          </Title>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Game Length (minutes)
              </Text>
              <InputNumber
                min={1}
                value={parseInt(gameLength) || 1}
                onChange={(value) => setGameLength(value?.toString() || '1')}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setGameLength('1');
                  }
                }}
                disabled={tournamentComplete}
                style={{ width: '100%' }}
                size="large"
              />
            </div>
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Warmup Time (minutes)
              </Text>
              <InputNumber
                min={0}
                value={parseInt(warmupTime) || 0}
                onChange={(value) => setWarmupTime(value?.toString() || '0')}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setWarmupTime('0');
                  }
                }}
                disabled={tournamentComplete}
                style={{ width: '100%' }}
                size="large"
              />
            </div>
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Flex Time (minutes)
              </Text>
              <InputNumber
                min={0}
                value={parseInt(flexTime) || 0}
                onChange={(value) => setFlexTime(value?.toString() || '0')}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setFlexTime('0');
                  }
                }}
                disabled={tournamentComplete}
                style={{ width: '100%' }}
                size="large"
              />
            </div>
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Number of {venueTerm.charAt(0).toUpperCase() + venueTerm.slice(1)}s
              </Text>
              <InputNumber
                min={1}
                value={parseInt(numberOfCourts) || 1}
                onChange={(value) => setNumberOfCourts(value?.toString() || '1')}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setNumberOfCourts('1');
                  }
                }}
                disabled={tournamentComplete}
                style={{ width: '100%' }}
                size="large"
              />
            </div>
            
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveSettings}
              disabled={tournamentComplete}
              size="large"
              block
              style={{
                background: tournamentComplete ? undefined : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                marginTop: '8px',
              }}
            >
              Save Settings
            </Button>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}
