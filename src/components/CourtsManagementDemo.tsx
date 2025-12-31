import { useState, useEffect } from 'react';
import { Card, Typography, Tag, Space, Badge } from 'antd';
import { formatTime } from '../lib/timer';
import { HomeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// Hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

interface DemoGame {
  id: string;
  teamA: string;
  teamB: string;
  status: 'Warmup' | 'Live' | 'Flex' | 'Queued';
  currentPhase: 'warmup' | 'game' | 'flex' | 'overtime';
  remainingTime: number;
  roundName: string;
}

interface DemoCourt {
  id: string;
  name: string;
  game: DemoGame | null;
}

export function CourtsManagementDemo() {
  const isMobile = useIsMobile();
  const [courts, setCourts] = useState<DemoCourt[]>([
    {
      id: 'court-1',
      name: 'Court 1',
      game: {
        id: 'game-1',
        teamA: 'Team A',
        teamB: 'Team B',
        status: 'Warmup',
        currentPhase: 'warmup',
        remainingTime: 300, // 5 minutes
        roundName: 'Winners Bracket - Quarter Finals',
      },
    },
    {
      id: 'court-2',
      name: 'Court 2',
      game: {
        id: 'game-2',
        teamA: 'Team C',
        teamB: 'Team D',
        status: 'Live',
        currentPhase: 'game',
        remainingTime: 1200, // 20 minutes
        roundName: 'Winners Bracket - Quarter Finals',
      },
    },
    {
      id: 'court-3',
      name: 'Court 3',
      game: {
        id: 'game-3',
        teamA: 'Team E',
        teamB: 'Team F',
        status: 'Flex',
        currentPhase: 'flex',
        remainingTime: 180, // 3 minutes
        roundName: 'Winners Bracket - Semi Finals',
      },
    },
    {
      id: 'court-4',
      name: 'Court 4',
      game: {
        id: 'game-4',
        teamA: 'Team G',
        teamB: 'Team H',
        status: 'Queued',
        currentPhase: 'warmup',
        remainingTime: 0,
        roundName: 'Winners Bracket - Quarter Finals',
      },
    },
  ]);

  // Filter to 2 courts on mobile
  const displayCourts = isMobile ? courts.slice(0, 2) : courts;

  // Timer update loop - updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCourts(prevCourts => {
        return prevCourts.map(court => {
          if (!court.game || court.game.status === 'Queued') return court;
          
          const game = { ...court.game };
          
          // Decrement timer
          if (game.remainingTime > 0 && game.currentPhase !== 'overtime') {
            game.remainingTime -= 1;
          }
          
          // Handle phase transitions
          if (game.currentPhase === 'warmup' && game.remainingTime === 0) {
            // Transition to game phase
            game.currentPhase = 'game';
            game.status = 'Live';
            game.remainingTime = 1200; // 20 minutes
          } else if (game.currentPhase === 'game' && game.remainingTime === 0) {
            // Transition to flex phase
            game.currentPhase = 'flex';
            game.status = 'Flex';
            game.remainingTime = 300; // 5 minutes
          } else if (game.currentPhase === 'flex' && game.remainingTime === 0) {
            // Transition to overtime
            game.currentPhase = 'overtime';
            game.remainingTime = 60; // Start overtime at 1 minute
          } else if (game.currentPhase === 'overtime') {
            // Overtime counts up
            game.remainingTime += 1;
          }
          
          return { ...court, game };
        });
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Warmup':
        return 'warning';
      case 'Live':
        return 'success';
      case 'Flex':
        return 'processing';
      case 'Queued':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'warmup':
        return 'Warmup';
      case 'game':
        return 'Game Time';
      case 'flex':
        return 'Flex Time';
      case 'overtime':
        return 'Overrun';
      default:
        return '';
    }
  };

  return (
    <div style={{ width: '100%' }} className="courts-demo">
      <style>{`
        @media (max-width: 768px) {
          .courts-demo .ant-typography {
            font-size: 1.25rem !important;
          }
          .courts-demo .ant-typography + .ant-typography {
            font-size: 0.875rem !important;
          }
          .courts-demo .ant-card-body {
            padding: 16px !important;
          }
          .courts-demo .court-title {
            font-size: 16px !important;
          }
          .courts-demo .court-team-name {
            font-size: 12px !important;
          }
          .courts-demo .court-round-name {
            font-size: 10px !important;
          }
          .courts-demo .court-timer {
            font-size: 28px !important;
          }
          .courts-demo .court-phase-label {
            font-size: 11px !important;
          }
          .courts-demo .court-tip {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Space direction="vertical" size={4}>
            <Title level={4} style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              Live Courts Management
            </Title>
            <Text style={{ fontSize: '14px', color: '#6b7280' }}>
              {displayCourts.length} Courts • Multiple Games in Progress • Real-Time Timers
            </Text>
          </Space>
          <Space>
            <Badge count="Live" style={{ background: '#22c55e', color: '#fff' }} />
            <Badge count="Active" style={{ background: '#f97316', color: '#fff' }} />
          </Space>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          {displayCourts.map(court => (
            <Card
              key={court.id}
              style={{
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                height: '100%',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HomeOutlined style={{ fontSize: '20px', color: '#f97316' }} />
                  <Title level={5} className="court-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                    {court.name}
                  </Title>
                </div>

                {court.game ? (
                  <>
                    <div style={{ 
                      padding: '12px', 
                      background: '#f3f4f6', 
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <Text type="secondary" className="court-round-name" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                        {court.game.roundName}
                      </Text>
                      <Text strong className="court-team-name" style={{ fontSize: '14px', display: 'block' }}>
                        {court.game.teamA}
                      </Text>
                      <Text strong style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', margin: '4px 0' }}>
                        VS
                      </Text>
                      <Text strong className="court-team-name" style={{ fontSize: '14px', display: 'block' }}>
                        {court.game.teamB}
                      </Text>
                    </div>

                    {court.game.status !== 'Queued' && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '16px', 
                        background: '#f9fafb', 
                        borderRadius: '12px',
                        border: '2px solid',
                        borderColor: court.game.status === 'Live' ? '#22c55e' : 
                                    court.game.status === 'Warmup' ? '#f59e0b' : 
                                    court.game.status === 'Flex' ? '#3b82f6' : '#e5e7eb'
                      }}>
                        <Text type="secondary" className="court-phase-label" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                          {getPhaseLabel(court.game.currentPhase)}
                        </Text>
                        <Text className="court-timer" style={{ 
                          fontSize: '36px', 
                          fontWeight: 700, 
                          color: court.game.currentPhase === 'overtime' ? '#dc2626' : '#f97316',
                          display: 'block',
                          fontFamily: 'monospace',
                        }}>
                          {court.game.currentPhase === 'overtime' ? (
                            `+${formatTime(court.game.remainingTime)}`
                          ) : (
                            formatTime(court.game.remainingTime)
                          )}
                        </Text>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Tag color={getStatusColor(court.game.status)} style={{ fontSize: '12px', padding: '4px 12px' }}>
                        {court.game.status === 'Queued' ? 'Queued' : 
                         court.game.status === 'Warmup' ? 'Warmup' :
                         court.game.status === 'Live' ? 'Live' :
                         court.game.status === 'Flex' ? 'Flex Time' : 'Finished'}
                      </Tag>
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#9ca3af',
                    fontSize: '14px'
                  }}>
                    No game assigned
                  </div>
                )}
              </Space>
            </Card>
          ))}
        </div>

        <div style={{ textAlign: 'center', paddingTop: '16px' }}>
          <Text className="court-tip" style={{ fontSize: '14px', color: '#9ca3af' }}>
            💡 <strong>Watch:</strong> Timers automatically transition through Warmup → Game → Flex → Overtime phases
          </Text>
        </div>
      </Space>
    </div>
  );
}

