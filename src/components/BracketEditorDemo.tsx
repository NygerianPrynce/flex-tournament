import { useState } from 'react';
import { Card, Typography, Space, Button, Modal, Select, Row, Col } from 'antd';
import { BranchesOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface DemoTeam {
  id: string;
  name: string;
  seed?: number;
}

interface DemoGame {
  id: string;
  teamA: { type: 'Team' | 'OPEN' | 'BYE'; teamId?: string };
  teamB: { type: 'Team' | 'OPEN' | 'BYE'; teamId?: string };
  status: 'Queued' | 'Finished';
  round: number;
}

export function BracketEditorDemo() {
  const [teams] = useState<DemoTeam[]>([
    { id: 'team-1', name: 'Thunder Hawks', seed: 1 },
    { id: 'team-2', name: 'Wildcats', seed: 2 },
    { id: 'team-3', name: 'Eagles', seed: 3 },
    { id: 'team-4', name: 'Lions', seed: 4 },
    { id: 'team-5', name: 'Sharks', seed: 5 },
    { id: 'team-6', name: 'Tigers', seed: 6 },
  ]);

  const [games, setGames] = useState<DemoGame[]>([
    {
      id: 'game-1',
      teamA: { type: 'Team', teamId: 'team-1' },
      teamB: { type: 'Team', teamId: 'team-4' },
      status: 'Finished',
      round: 1,
    },
    {
      id: 'game-2',
      teamA: { type: 'Team', teamId: 'team-2' },
      teamB: { type: 'OPEN' },
      status: 'Queued',
      round: 1,
    },
    {
      id: 'game-3',
      teamA: { type: 'Team', teamId: 'team-3' },
      teamB: { type: 'Team', teamId: 'team-5' },
      status: 'Queued',
      round: 1,
    },
  ]);

  const [draggedTeam, setDraggedTeam] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ gameId: string; slot: 'A' | 'B' } | null>(null);
  const [editingSlot, setEditingSlot] = useState<{ gameId: string; slot: 'A' | 'B' } | null>(null);

  const getTeamName = (slot: DemoGame['teamA']) => {
    if (slot.type === 'Team' && slot.teamId) {
      const team = teams.find(t => t.id === slot.teamId);
      return team?.name || 'Unknown';
    }
    if (slot.type === 'BYE') return 'BYE';
    if (slot.type === 'OPEN') return 'OPEN';
    return 'TBD';
  };

  const getGameStatusColor = (game: DemoGame) => {
    if (game.status === 'Finished') {
      return { border: '2px solid #9ca3af', background: '#f3f4f6', opacity: 0.7 };
    }
    
    const bothAssigned = game.teamA.type === 'Team' && game.teamB.type === 'Team';
    const bothOpen = game.teamA.type === 'OPEN' && game.teamB.type === 'OPEN';
    
    if (bothAssigned) {
      return { border: '2px solid #16a34a', background: '#f0fdf4' }; // Green - valid
    }
    
    if (bothOpen) {
      return { border: '2px solid #d1d5db', background: '#ffffff' }; // White - empty
    }
    
    return { border: '2px solid #f59e0b', background: '#fffbeb' }; // Yellow - needs teams
  };

  const getGameStatusText = (game: DemoGame) => {
    if (game.status === 'Finished') return 'Completed';
    
    const bothAssigned = game.teamA.type === 'Team' && game.teamB.type === 'Team';
    const bothOpen = game.teamA.type === 'OPEN' && game.teamB.type === 'OPEN';
    
    if (bothAssigned) return 'Ready';
    if (bothOpen) return 'Empty';
    return 'Needs Team';
  };

  const handleDragStart = (teamId: string) => {
    setDraggedTeam(teamId);
  };

  const handleDragOver = (e: React.DragEvent, gameId: string, slot: 'A' | 'B') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot({ gameId, slot });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (game: DemoGame, slot: 'A' | 'B') => {
    if (!draggedTeam || game.status === 'Finished') {
      setDraggedTeam(null);
      setDragOverSlot(null);
      return;
    }

    setGames(prevGames =>
      prevGames.map(g => {
        if (g.id === game.id) {
          return {
            ...g,
            [slot === 'A' ? 'teamA' : 'teamB']: { type: 'Team' as const, teamId: draggedTeam },
          };
        }
        return g;
      })
    );

    setDraggedTeam(null);
    setDragOverSlot(null);
  };

  const handleSlotClick = (game: DemoGame, slot: 'A' | 'B') => {
    if (game.status === 'Finished') return;
    setEditingSlot({ gameId: game.id, slot });
  };

  const handleEditSlot = (gameId: string, slot: 'A' | 'B', teamId: string | null) => {
    setGames(prevGames =>
      prevGames.map(g => {
        if (g.id === gameId) {
          if (teamId === null) {
            return {
              ...g,
              [slot === 'A' ? 'teamA' : 'teamB']: { type: 'OPEN' as const },
            };
          } else {
            return {
              ...g,
              [slot === 'A' ? 'teamA' : 'teamB']: { type: 'Team' as const, teamId },
            };
          }
        }
        return g;
      })
    );
    setEditingSlot(null);
  };

  const handleAutoAssign = () => {
    const availableTeams = teams.filter(team => {
      // Check if team is already assigned to a game
      return !games.some(game => 
        (game.teamA.type === 'Team' && game.teamA.teamId === team.id) ||
        (game.teamB.type === 'Team' && game.teamB.teamId === team.id)
      );
    });

    setGames(prevGames =>
      prevGames.map((game, index) => {
        if (game.status === 'Finished') return game;
        
        const teamA = game.teamA.type === 'OPEN' && availableTeams.length > index * 2
          ? { type: 'Team' as const, teamId: availableTeams[index * 2].id }
          : game.teamA;
        
        const teamB = game.teamB.type === 'OPEN' && availableTeams.length > index * 2 + 1
          ? { type: 'Team' as const, teamId: availableTeams[index * 2 + 1].id }
          : game.teamB;

        return { ...game, teamA, teamB };
      })
    );
  };

  const availableTeams = teams.filter(team => {
    return !games.some(game => 
      (game.teamA.type === 'Team' && game.teamA.teamId === team.id) ||
      (game.teamB.type === 'Team' && game.teamB.teamId === team.id)
    );
  });

  return (
    <div style={{ width: '100%' }} className="bracket-editor-demo">
      <style>{`
        @media (max-width: 768px) {
          .bracket-editor-demo .ant-typography {
            font-size: 1.25rem !important;
          }
          .bracket-editor-demo .ant-typography + .ant-typography {
            font-size: 0.875rem !important;
          }
        }
      `}</style>
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Space direction="vertical" size={4}>
            <Title level={4} style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              Bracket Editor
            </Title>
            <Text style={{ fontSize: '14px', color: '#6b7280' }}>
              Drag teams to slots • Click to edit • Auto-assign available • Visual status indicators
            </Text>
          </Space>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Team Pools Sidebar */}
          <Card
            style={{
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              minWidth: '240px',
              maxWidth: '280px',
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BranchesOutlined style={{ fontSize: '20px', color: '#f97316' }} />
                <Title level={5} style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  Team Pools
                </Title>
              </div>
              
              <div style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #fcd34d',
              }}>
                <Text style={{ fontSize: '12px', lineHeight: '1.6', color: '#92400e', fontWeight: 500 }}>
                  💡 Drag teams to bracket slots or click slots to edit, or press auto-assign teams to populate the bracket.
                </Text>
              </div>

              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {availableTeams.map(team => (
                  <Card
                    key={team.id}
                    draggable
                    onDragStart={() => handleDragStart(team.id)}
                    style={{
                      borderRadius: '8px',
                      border: '1px solid #86efac',
                      background: '#f0fdf4',
                      cursor: 'move',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.1)',
                    }}
                    bodyStyle={{ padding: '12px' }}
                    hoverable
                  >
                    <Text strong style={{ fontSize: '14px' }}>
                      {team.name}
                      {team.seed && (
                        <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                          (Seed {team.seed})
                        </Text>
                      )}
                    </Text>
                  </Card>
                ))}
                {availableTeams.length === 0 && (
                  <Text type="secondary" style={{ fontSize: '13px', textAlign: 'center', display: 'block', padding: '12px' }}>
                    All teams assigned
                  </Text>
                )}
              </Space>

              <Button
                type="primary"
                block
                onClick={handleAutoAssign}
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  border: 'none',
                  fontWeight: 600,
                  marginTop: '8px',
                }}
              >
                Auto-Assign Teams
              </Button>
            </Space>
          </Card>

          {/* Bracket Games */}
          <div style={{ flex: 1, minWidth: '400px' }}>
            <Card
              style={{
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                border: '1px solid #e5e7eb',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              <Title level={4} style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 700 }}>
                QUARTER FINALS
              </Title>
              <Row gutter={[16, 16]}>
                {games.map(game => (
                  <Col xs={24} sm={12} lg={8} key={game.id}>
                    <Card
                      style={{
                        ...getGameStatusColor(game),
                        borderRadius: '12px',
                        cursor: game.status === 'Finished' ? 'not-allowed' : 'default',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
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
                          onDragOver={(e) => game.status !== 'Finished' && handleDragOver(e, game.id, 'A')}
                          onDragLeave={handleDragLeave}
                          onDrop={() => game.status !== 'Finished' && handleDrop(game, 'A')}
                          onClick={() => game.status !== 'Finished' && handleSlotClick(game, 'A')}
                          style={{
                            cursor: game.status === 'Finished' ? 'not-allowed' : 'pointer',
                            opacity: game.status === 'Finished' ? 0.75 : 1,
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
                            {getTeamName(game.teamA)}
                          </Text>
                          {game.status !== 'Finished' && (
                            <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#f97316' }}>
                              (click to edit)
                            </Text>
                          )}
                        </div>
                        <Text strong style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'block', textAlign: 'center' }}>
                          VS
                        </Text>
                        <div
                          draggable={false}
                          onDragOver={(e) => game.status !== 'Finished' && handleDragOver(e, game.id, 'B')}
                          onDragLeave={handleDragLeave}
                          onDrop={() => game.status !== 'Finished' && handleDrop(game, 'B')}
                          onClick={() => game.status !== 'Finished' && handleSlotClick(game, 'B')}
                          style={{
                            cursor: game.status === 'Finished' ? 'not-allowed' : 'pointer',
                            opacity: game.status === 'Finished' ? 0.75 : 1,
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
                            {getTeamName(game.teamB)}
                          </Text>
                          {game.status !== 'Finished' && (
                            <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: '#f97316' }}>
                              (click to edit)
                            </Text>
                          )}
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '8px' }}>
                          <Text style={{ fontSize: '11px', color: '#6b7280' }}>
                            {getGameStatusText(game)}
                          </Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </div>
        </div>

        {/* Edit Slot Modal */}
        <Modal
          title="Edit Team Slot"
          open={editingSlot !== null}
          onCancel={() => setEditingSlot(null)}
          footer={null}
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {editingSlot && (() => {
            const game = games.find(g => g.id === editingSlot.gameId);
            if (!game) return null;
            const currentSlot = editingSlot.slot === 'A' ? game.teamA : game.teamB;
            
            return (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Select a team..."
                  value={currentSlot.type === 'Team' ? currentSlot.teamId : undefined}
                  onChange={(value) => {
                    if (value) {
                      handleEditSlot(editingSlot.gameId, editingSlot.slot, value);
                    }
                  }}
                >
                  {availableTeams.map(team => (
                    <Select.Option key={team.id} value={team.id}>
                      {team.name}
                    </Select.Option>
                  ))}
                </Select>
                <Button
                  block
                  onClick={() => handleEditSlot(editingSlot.gameId, editingSlot.slot, null)}
                >
                  Set to OPEN
                </Button>
              </Space>
            );
          })()}
        </Modal>

        {/* Legend */}
        <Card
          style={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
          }}
          bodyStyle={{ padding: '16px' }}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '14px', display: 'block' }}>
              Game Status Colors:
            </Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <Space>
                <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#f0fdf4', border: '2px solid #16a34a' }}></div>
                <Text style={{ fontSize: '13px' }}>Green = Ready (both teams assigned)</Text>
              </Space>
              <Space>
                <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#fffbeb', border: '2px solid #f59e0b' }}></div>
                <Text style={{ fontSize: '13px' }}>Yellow = Needs teams</Text>
              </Space>
              <Space>
                <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#f3f4f6', border: '2px solid #9ca3af' }}></div>
                <Text style={{ fontSize: '13px' }}>Gray = Completed</Text>
              </Space>
            </div>
          </Space>
        </Card>

        <div style={{ textAlign: 'center', paddingTop: '16px' }}>
          <Text style={{ fontSize: '14px', color: '#9ca3af' }}>
            💡 <strong>Try it:</strong> Drag teams from the pool to game slots • Click slots to manually edit • Use auto-assign to quickly populate
          </Text>
        </div>
      </Space>
    </div>
  );
}
