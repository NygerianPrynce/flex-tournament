import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserTournaments, deleteTournament } from '../lib/database';
import type { Tournament } from '../types';
import {
  Layout,
  Typography,
  Button,
  Card,
  Row,
  Col,
  Space,
  Modal,
  message,
} from 'antd';
import {
  PlusOutlined,
  LogoutOutlined,
  DeleteOutlined,
  TrophyOutlined,
  TeamOutlined,
  CalendarOutlined,
  UserOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { getSportConfig } from '../lib/sports';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// Helper function to check if tournament is finished
const isTournamentFinished = (tournament: Tournament): boolean => {
  if (!tournament.bracket) return false;
  
  // Check if grand final is finished
  if (tournament.bracket.grandFinal) {
    const gf = tournament.bracket.grandFinal;
    if (gf.status === 'Finished' && gf.result) {
      // If winners bracket champion won (teamA), tournament is complete
      // If losers bracket champion won (teamB), reset game should be played
      const winnerCameFromLosers = gf.teamB.type === 'Team' && gf.teamB.teamId === gf.result.winnerId;
      
      if (winnerCameFromLosers) {
        // Losers bracket champion won - check if reset game exists and is finished
        if (tournament.bracket.grandFinalReset) {
          return tournament.bracket.grandFinalReset.status === 'Finished' && !!tournament.bracket.grandFinalReset.result;
        }
        return false;
      } else {
        // Winners bracket champion won - no reset needed, tournament is complete
        return true;
      }
    }
    return false;
  }
  
  // Check if final round of winners bracket is finished (single elimination)
  if (tournament.bracket.winners.length > 0) {
    const finalRound = tournament.bracket.winners[tournament.bracket.winners.length - 1];
    return finalRound.every(game => game.status === 'Finished' && !!game.result);
  }
  
  return false;
};

export function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ tournamentId: string; tournamentName: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      loadTournaments(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        loadTournaments(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadTournaments = async (userId: string) => {
    try {
      setLoading(true);
      const data = await getUserTournaments(userId);
      setTournaments(data);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      message.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleCreateTournament = () => {
    navigate('/setup');
  };

  const handleSelectTournament = (tournamentId: string) => {
    navigate(`/tournament/bracket`, { state: { tournamentId } });
  };

  const handleDeleteTournament = async (e: React.MouseEvent, tournamentId: string, tournamentName: string) => {
    e.stopPropagation(); // Prevent card click
    setDeleteConfirm({ tournamentId, tournamentName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !user) return;

    try {
      await deleteTournament(deleteConfirm.tournamentId, user.id);
      await loadTournaments(user.id);
      setDeleteConfirm(null);
      message.success('Tournament deleted successfully');
    } catch (error) {
      console.error('Failed to delete tournament:', error);
      message.error(error instanceof Error ? error.message : 'Failed to delete tournament');
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          * { font-family: 'Poppins', sans-serif; }
        `}</style>
        <Content style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Trophy Icons Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            opacity: 0.3,
          }}>
            {[
              // Top row
              { x: '8%', y: '5%', size: '32px', rotate: 15 },
              { x: '20%', y: '5%', size: '28px', rotate: 45 },
              { x: '32%', y: '5%', size: '30px', rotate: 75 },
              { x: '44%', y: '5%', size: '34px', rotate: 25 },
              { x: '56%', y: '5%', size: '28px', rotate: 55 },
              { x: '68%', y: '5%', size: '32px', rotate: 85 },
              { x: '80%', y: '5%', size: '30px', rotate: 115 },
              { x: '92%', y: '5%', size: '28px', rotate: 35 },
              // Second row
              { x: '5%', y: '18%', size: '30px', rotate: 65 },
              { x: '16%', y: '18%', size: '34px', rotate: 95 },
              { x: '27%', y: '18%', size: '28px', rotate: 125 },
              { x: '38%', y: '18%', size: '32px', rotate: 5 },
              { x: '49%', y: '18%', size: '30px', rotate: 45 },
              { x: '60%', y: '18%', size: '28px', rotate: 75 },
              { x: '71%', y: '18%', size: '34px', rotate: 105 },
              { x: '82%', y: '18%', size: '30px', rotate: 15 },
              { x: '93%', y: '18%', size: '28px', rotate: 55 },
              // Third row
              { x: '10%', y: '32%', size: '32px', rotate: 85 },
              { x: '22%', y: '32%', size: '28px', rotate: 25 },
              { x: '34%', y: '32%', size: '30px', rotate: 65 },
              { x: '46%', y: '32%', size: '34px', rotate: 95 },
              { x: '58%', y: '32%', size: '28px', rotate: 35 },
              { x: '70%', y: '32%', size: '32px', rotate: 75 },
              { x: '82%', y: '32%', size: '30px', rotate: 115 },
              { x: '94%', y: '32%', size: '28px', rotate: 5 },
              // Fourth row
              { x: '7%', y: '46%', size: '30px', rotate: 45 },
              { x: '18%', y: '46%', size: '34px', rotate: 85 },
              { x: '29%', y: '46%', size: '28px', rotate: 125 },
              { x: '40%', y: '46%', size: '32px', rotate: 15 },
              { x: '51%', y: '46%', size: '30px', rotate: 55 },
              { x: '62%', y: '46%', size: '28px', rotate: 95 },
              { x: '73%', y: '46%', size: '34px', rotate: 25 },
              { x: '84%', y: '46%', size: '30px', rotate: 65 },
              { x: '95%', y: '46%', size: '28px', rotate: 105 },
              // Fifth row
              { x: '12%', y: '60%', size: '32px', rotate: 35 },
              { x: '24%', y: '60%', size: '28px', rotate: 75 },
              { x: '36%', y: '60%', size: '30px', rotate: 115 },
              { x: '48%', y: '60%', size: '34px', rotate: 5 },
              { x: '60%', y: '60%', size: '28px', rotate: 45 },
              { x: '72%', y: '60%', size: '32px', rotate: 85 },
              { x: '84%', y: '60%', size: '30px', rotate: 125 },
              { x: '96%', y: '60%', size: '28px', rotate: 15 },
              // Sixth row
              { x: '9%', y: '74%', size: '30px', rotate: 55 },
              { x: '20%', y: '74%', size: '34px', rotate: 95 },
              { x: '31%', y: '74%', size: '28px', rotate: 25 },
              { x: '42%', y: '74%', size: '32px', rotate: 65 },
              { x: '53%', y: '74%', size: '30px', rotate: 105 },
              { x: '64%', y: '74%', size: '28px', rotate: 5 },
              { x: '75%', y: '74%', size: '34px', rotate: 45 },
              { x: '86%', y: '74%', size: '30px', rotate: 85 },
              { x: '97%', y: '74%', size: '28px', rotate: 125 },
              // Bottom row
              { x: '6%', y: '88%', size: '32px', rotate: 75 },
              { x: '17%', y: '88%', size: '28px', rotate: 115 },
              { x: '28%', y: '88%', size: '30px', rotate: 15 },
              { x: '39%', y: '88%', size: '34px', rotate: 55 },
              { x: '50%', y: '88%', size: '28px', rotate: 95 },
              { x: '61%', y: '88%', size: '32px', rotate: 25 },
              { x: '72%', y: '88%', size: '30px', rotate: 65 },
              { x: '83%', y: '88%', size: '28px', rotate: 105 },
              { x: '94%', y: '88%', size: '34px', rotate: 35 },
            ].map((trophy, index) => (
              <TrophyOutlined
                key={index}
                style={{
                  position: 'absolute',
                  left: trophy.x,
                  top: trophy.y,
                  fontSize: trophy.size,
                  transform: `rotate(${trophy.rotate}deg)`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                  color: '#f97316',
                }}
              />
            ))}
          </div>
          <Space direction="vertical" size={24} align="center" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}>
              <TrophyOutlined 
                style={{ 
                  fontSize: '32px', 
                  color: '#f97316',
                  animation: 'spin 1s linear infinite',
                }} 
              />
            </div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <Text style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>Loading tournaments...</Text>
          </Space>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Poppins', sans-serif; }
      `}</style>

      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 48px',
          height: '80px',
          lineHeight: '80px',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space align="center" size={12}>
            <img 
              src="/favicon.png" 
              alt="Bracketooski Logo" 
              style={{ width: '40px', height: '40px' }}
            />
            <Title level={3} style={{ margin: 0, fontWeight: 700, fontSize: '24px' }}>
              Bracketooski
            </Title>
          </Space>
          <Space size={16}>
            <Text style={{ color: '#6b7280', fontSize: '15px' }}>{user?.email}</Text>
            <Button 
              icon={<LogoutOutlined />}
              onClick={handleSignOut}
              style={{
                borderRadius: '12px',
                height: '40px',
              }}
            >
              Sign Out
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '48px', background: '#f9fafb' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleCreateTournament}
              style={{
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                fontSize: '16px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              }}
            >
              Create New Tournament
            </Button>
          </div>

          {tournaments.length === 0 ? (
            <Card
              style={{
                borderRadius: '24px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                textAlign: 'center',
                padding: '64px 32px',
              }}
              bodyStyle={{ padding: 0 }}
            >
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <TrophyOutlined style={{ fontSize: '64px', color: '#d1d5db' }} />
                <div>
                  <Title level={3} style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                    No tournaments yet
                  </Title>
                  <Text style={{ color: '#6b7280', fontSize: '16px', display: 'block', marginTop: '8px' }}>
                    Create your first tournament to get started
                  </Text>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  onClick={handleCreateTournament}
                  style={{
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                  }}
                >
                  Create Your First Tournament
                </Button>
              </Space>
            </Card>
          ) : (
            <Row gutter={[24, 24]}>
              {tournaments.map((tournament) => (
                <Col xs={24} sm={12} lg={8} key={tournament.id}>
                  <Card
                    hoverable
                    onClick={() => handleSelectTournament(tournament.id)}
                    style={{
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      height: '100%',
                    }}
                    bodyStyle={{ padding: '24px', position: 'relative' }}
                    className="tournament-card"
                  >
                    <style>{`
                      .tournament-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
                      }
                    `}</style>
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, flex: 1 }}>
                            {tournament.name}
                          </Title>
                          {isTournamentFinished(tournament) ? (
                            <Text style={{ 
                              background: '#10b981', 
                              color: '#fff', 
                              padding: '4px 12px', 
                              borderRadius: '12px', 
                              fontSize: '12px', 
                              fontWeight: 600 
                            }}>
                              Finished
                            </Text>
                          ) : (
                            <Text style={{ 
                              background: '#f97316', 
                              color: '#fff', 
                              padding: '4px 12px', 
                              borderRadius: '12px', 
                              fontSize: '12px', 
                              fontWeight: 600 
                            }}>
                              In Progress
                            </Text>
                          )}
                        </div>
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Text style={{ color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                            <CalendarOutlined style={{ marginRight: '4px' }} />
                            {new Date(tournament.createdAt).toLocaleDateString()}
                          </Text>
                          {tournament.settings.sport && (
                            <Text style={{ color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                              Sport: <Text style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{getSportConfig(tournament.settings.sport).name}</Text>
                            </Text>
                          )}
                          <Text style={{ color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                            Tournament: <Text style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{tournament.settings.includeLosersBracket ? 'Double Elimination' : 'Single Elimination'}</Text>
                          </Text>
                          {tournament.shareCode && (
                            <Text style={{ color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
                              Share Code: <Text style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{tournament.shareCode}</Text>
                            </Text>
                          )}
                        </Space>
                      </div>
                      <div style={{ position: 'relative', marginTop: '-10px' }}>
                        <Space size={20} wrap>
                          <div>
                            <Text style={{ color: '#6b7280', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Teams</Text>
                            <Text style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <TeamOutlined style={{ color: '#f97316' }} />
                              {tournament.teams.length}
                            </Text>
                          </div>
                          <div>
                            <Text style={{ color: '#6b7280', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Courts</Text>
                            <Text style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <HomeOutlined style={{ color: '#f97316' }} />
                              {tournament.courts.length}
                            </Text>
                          </div>
                          {tournament.settings.useRefs && tournament.refs.length > 0 && (
                            <div>
                              <Text style={{ color: '#6b7280', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Referees</Text>
                              <Text style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <UserOutlined style={{ color: '#f97316' }} />
                                {tournament.refs.length}
                              </Text>
                            </div>
                          )}
                        </Space>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => handleDeleteTournament(e, tournament.id, tournament.name)}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            zIndex: 10,
                          }}
                        />
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Content>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Tournament"
        open={!!deleteConfirm}
        onOk={confirmDelete}
        onCancel={cancelDelete}
        okText="Delete"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
      >
        <Text>
          Are you sure you want to delete <strong>"{deleteConfirm?.tournamentName}"</strong>? 
          This action cannot be undone.
        </Text>
      </Modal>
    </Layout>
  );
}
