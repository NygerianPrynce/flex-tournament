import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import {
  Layout,
  Typography,
  Card,
  Row,
  Col,
  Input,
  Button,
  Space,
  Modal,
  message,
  Tag,
  Alert,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

export function TournamentRefs() {
  const { tournament, addRef, updateRef, removeRef, updateTournament, getAllGames } = useTournamentStore();
  const [showAddRef, setShowAddRef] = useState(false);
  const [newRefName, setNewRefName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ refId: string; refName: string } | null>(null);
  const [disableRefsConfirm, setDisableRefsConfirm] = useState(false);
  
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
  
  const allGames = getAllGames();
  
  // Check if ref is in use (assigned to any game - active or queued)
  const isRefInUse = (refId: string): boolean => {
    return allGames.some(g => {
      // Check if ref is assigned to any game (queued or active)
      if (g.courtId && (g.status === 'Queued' || g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused')) {
        const refIds = g.refIds || (g.refId ? [g.refId] : []);
        return refIds.includes(refId);
      }
      return false;
    });
  };
  
  // Check if ref is assigned to any game (including queued games on courts)
  const isRefAssignedToGame = (refId: string): boolean => {
    return allGames.some(g => {
      // Check if ref is assigned to any game on a court (queued or active)
      if (g.courtId) {
        const refIds = g.refIds || (g.refId ? [g.refId] : []);
        return refIds.includes(refId);
      }
      return false;
    });
  };
  
  // Check if ref is available (not paused)
  const isRefAvailable = (ref: { available?: boolean }): boolean => {
    return ref.available !== false;
  };
  
  const handleAddRef = () => {
    if (tournamentComplete) {
      message.warning('Cannot add referees after the tournament is finished.');
      return;
    }
    if (!newRefName.trim()) {
      message.warning('Please enter a referee name.');
      return;
    }
    addRef({
      id: `ref-${Date.now()}-${Math.random()}`,
      name: newRefName.trim(),
      available: true,
    });
    setNewRefName('');
    setShowAddRef(false);
    message.success('Referee added successfully!');
  };
  
  const handleToggleAvailability = (refId: string, currentAvailable: boolean) => {
    if (tournamentComplete) {
      message.warning('Cannot edit referee status after the tournament is finished.');
      return;
    }
    if (isRefAssignedToGame(refId)) {
      message.warning('Cannot pause or resume a referee that is assigned to a game. Unassign them from the game first.');
      return;
    }
    updateRef(refId, { available: !currentAvailable });
    message.success(`Referee ${!currentAvailable ? 'resumed' : 'paused'} successfully!`);
  };
  
  const useRefs = tournament.settings.useRefs !== false && tournament.refs.length > 0;
  
  const handleToggleRefs = () => {
    if (tournamentComplete) {
      message.warning('Cannot change referee settings after the tournament is finished.');
      return;
    }
    if (useRefs) {
      // Currently enabled, disable it - show confirmation
      setDisableRefsConfirm(true);
    } else {
      // Currently disabled, enable it
      updateTournament({
        settings: {
          ...tournament.settings,
          useRefs: true,
        },
      });
      message.success('Referees enabled successfully!');
    }
  };

  const confirmDisableRefs = () => {
    updateTournament({
      settings: {
        ...tournament.settings,
        useRefs: false,
      },
    });
    setDisableRefsConfirm(false);
    message.success('Referees disabled successfully!');
  };

  const cancelDisableRefs = () => {
    setDisableRefsConfirm(false);
  };
  
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <Title level={2} style={{ 
            margin: 0, 
            fontWeight: 700, 
            fontSize: '32px',
            color: '#f97316',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <UserOutlined style={{ marginRight: '12px' }} />
            Referees
          </Title>
          {tournament.refs.length > 0 && !tournamentComplete && (
            <Button
              onClick={handleToggleRefs}
              style={{
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              {useRefs ? 'Disable Referees' : 'Enable Referees'}
            </Button>
          )}
        </div>

        {tournamentComplete && (
          <Alert
            message="Tournament is finished. Referees cannot be added, edited, or removed."
            type="info"
            showIcon
            style={{ marginBottom: '24px', borderRadius: '8px' }}
          />
        )}
        
        {!useRefs && tournament.refs.length === 0 ? (
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              textAlign: 'center',
              padding: '48px 24px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '16px', display: 'block', marginBottom: '24px' }}>
              No referees assigned. Games can proceed without referees.
            </Text>
            {!showAddRef && !tournamentComplete && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowAddRef(true)}
                size="large"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                }}
              >
                Add Referee
              </Button>
            )}
          </Card>
        ) : (
          <>
            {showAddRef ? (
              <Card
                style={{
                  marginBottom: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Input
                    placeholder="Referee name"
                    value={newRefName}
                    onChange={(e) => setNewRefName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddRef();
                      } else if (e.key === 'Escape') {
                        setShowAddRef(false);
                        setNewRefName('');
                      }
                    }}
                    size="large"
                    style={{
                      fontSize: '16px',
                    }}
                    autoFocus
                  />
                  <Space size={8} style={{ width: '100%', justifyContent: 'center' }}>
                    <Button
                      type="primary"
                      onClick={handleAddRef}
                      disabled={!newRefName.trim()}
                      style={{
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                      }}
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddRef(false);
                        setNewRefName('');
                      }}
                      style={{
                        borderRadius: '8px',
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </Button>
                  </Space>
                </Space>
              </Card>
            ) : (
              !tournamentComplete && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowAddRef(true)}
                  size="large"
                  style={{
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                  }}
                >
                  Add Referee
                </Button>
              )
            )}
            
            <Row gutter={[16, 16]}>
              {tournament.refs.map(ref => {
                const assignedToGame = isRefAssignedToGame(ref.id);
                const available = isRefAvailable(ref);
                
                return (
                  <Col xs={24} sm={12} lg={8} key={ref.id}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        border: !useRefs
                          ? '1px solid #d1d5db'
                          : assignedToGame 
                            ? '2px solid #ef4444' 
                            : available 
                              ? '2px solid #10b981' 
                              : '2px solid #f59e0b',
                        background: !useRefs
                          ? '#f3f4f6'
                          : assignedToGame
                            ? '#fef2f2'
                            : available
                              ? '#f0fdf4'
                              : '#fffbeb',
                        opacity: !useRefs ? 0.6 : 1,
                        height: '100%',
                      }}
                      bodyStyle={{ padding: '20px' }}
                    >
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '18px', display: 'block' }}>
                          {ref.name}
                        </Text>
                        <div>
                          {assignedToGame && (
                            <Tag color="red" icon={<PlayCircleOutlined />} style={{ fontSize: '12px', padding: '4px 12px' }}>
                              In Game
                            </Tag>
                          )}
                          {!assignedToGame && available && (
                            <Tag color="green" icon={<PlayCircleOutlined />} style={{ fontSize: '12px', padding: '4px 12px' }}>
                              Available
                            </Tag>
                          )}
                          {!assignedToGame && !available && (
                            <Tag color="orange" icon={<PauseCircleOutlined />} style={{ fontSize: '12px', padding: '4px 12px' }}>
                              Temp Unavailable
                            </Tag>
                          )}
                        </div>
                        {!tournamentComplete && (
                          <Space size={8} style={{ width: '100%', justifyContent: 'center' }}>
                            <Button
                              icon={available ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                              onClick={() => handleToggleAvailability(ref.id, available)}
                              disabled={assignedToGame || !useRefs}
                              style={{
                                borderRadius: '8px',
                                fontWeight: 600,
                                background: available ? '#f59e0b' : '#10b981',
                                borderColor: available ? '#f59e0b' : '#10b981',
                                color: '#fff',
                              }}
                            >
                              {available ? 'Pause' : 'Resume'}
                            </Button>
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => {
                                if (assignedToGame) {
                                  message.warning('Cannot remove a referee that is assigned to a game. Unassign them from the game first.');
                                  return;
                                }
                                setDeleteConfirm({ refId: ref.id, refName: ref.name });
                              }}
                              disabled={assignedToGame || !useRefs}
                              style={{
                                borderRadius: '8px',
                                fontWeight: 600,
                              }}
                            >
                              Remove
                            </Button>
                          </Space>
                        )}
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </>
        )}

        {/* Delete Referee Confirmation Modal */}
        <Modal
          title={
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '20px' }}>
              <DeleteOutlined style={{ marginRight: '8px' }} />
              Remove Referee
            </span>
          }
          open={!!deleteConfirm}
          onOk={() => {
            if (!deleteConfirm) return;
            // Check if ref is assigned to any game on a court
            if (isRefAssignedToGame(deleteConfirm.refId)) {
              message.warning('Cannot remove a referee that is assigned to a game. Unassign them from the game first.');
              setDeleteConfirm(null);
              return;
            }
            // Unassign from any games (safety check, though should not be needed)
            const { assignRefToGame, assignRefsToGame } = useTournamentStore.getState();
            allGames.forEach(game => {
              const refIds = game.refIds || (game.refId ? [game.refId] : []);
              if (refIds.includes(deleteConfirm.refId)) {
                const newRefIds = refIds.filter(id => id !== deleteConfirm.refId);
                assignRefsToGame(game.id, newRefIds);
              } else if (game.refId === deleteConfirm.refId) {
                assignRefToGame(game.id, undefined);
              }
            });
            removeRef(deleteConfirm.refId);
            setDeleteConfirm(null);
            message.success('Referee removed successfully!');
          }}
          onCancel={() => setDeleteConfirm(null)}
          okText="Remove"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          style={{ borderRadius: '12px' }}
        >
          {deleteConfirm && (
            <Text style={{ display: 'block', lineHeight: '1.6' }}>
              Are you sure you want to remove <strong>"{deleteConfirm.refName}"</strong>? This action cannot be undone.
            </Text>
          )}
        </Modal>

        {/* Disable Refs Confirmation Modal */}
        <Modal
          title={
            <span style={{ color: '#f97316', fontWeight: 700, fontSize: '20px' }}>
              Disable Referees
            </span>
          }
          open={disableRefsConfirm}
          onOk={confirmDisableRefs}
          onCancel={cancelDisableRefs}
          okText="Disable"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          style={{ borderRadius: '12px' }}
        >
          <Text style={{ display: 'block', lineHeight: '1.6' }}>
            This will disable referee requirements for all games. Games can start without referees. Continue?
          </Text>
        </Modal>
      </Content>
    </Layout>
  );
}
