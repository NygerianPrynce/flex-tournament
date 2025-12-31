import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import type { Tournament } from '../types';
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
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

interface TournamentTeamsProps {
  tournament?: Tournament;
  viewerMode?: boolean;
}

export function TournamentTeams({ tournament: propTournament, viewerMode = false }: TournamentTeamsProps = {} as TournamentTeamsProps) {
  const store = useTournamentStore();
  const tournament = propTournament || store.tournament;
  const { updateTeam, removeTeam, getAllGames } = store;
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ teamId: string; teamName: string; uncompletedGames: number } | null>(null);
  
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
  
  const handleEdit = (teamId: string, currentName: string) => {
    if (tournamentComplete) {
      message.warning('Cannot edit teams after the tournament is finished.');
      return;
    }
    setEditingTeam(teamId);
    setEditName(currentName);
  };
  
  const handleSaveEdit = (teamId: string) => {
    if (tournamentComplete) {
      message.warning('Cannot edit teams after the tournament is finished.');
      return;
    }
    if (editName.trim()) {
      const trimmedName = editName.trim();
      const nameLower = trimmedName.toLowerCase();
      
      // Check for duplicate names (case-insensitive), excluding the current team
      const existingNames = tournament.teams
        .filter(t => t.id !== teamId)
        .map(t => t.name.toLowerCase());
      
      if (existingNames.includes(nameLower)) {
        message.error(`A team with the name "${trimmedName}" already exists. Please use a different name.`);
        return;
      }
      
      updateTeam(teamId, { name: trimmedName });
      message.success('Team name updated successfully!');
    }
    setEditingTeam(null);
    setEditName('');
  };
  
  const handleDelete = (teamId: string, teamName: string) => {
    if (tournamentComplete) {
      message.warning('Cannot remove teams after the tournament is finished.');
      return;
    }
    // Check if team is in any uncompleted games
    const allGames = getAllGames();
    const uncompletedGames = allGames.filter(g => 
      g.status !== 'Finished' && 
      !g.result &&
      ((g.teamA.type === 'Team' && g.teamA.teamId === teamId) ||
       (g.teamB.type === 'Team' && g.teamB.teamId === teamId))
    );
    
    setDeleteConfirm({ teamId, teamName, uncompletedGames: uncompletedGames.length });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    removeTeam(deleteConfirm.teamId);
    setDeleteConfirm(null);
    message.success('Team removed successfully!');
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };
  
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Content style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ 
            margin: 0, 
            fontWeight: 700, 
            fontSize: '32px',
            color: '#f97316',
            fontFamily: 'Poppins, sans-serif',
          }}>
            <TeamOutlined style={{ marginRight: '12px' }} />
            Teams
          </Title>
        </div>
        
        {tournamentComplete && (
          <Alert
            message="Tournament is finished. Teams cannot be edited or removed."
            type="info"
            showIcon
            style={{ marginBottom: '24px', borderRadius: '8px' }}
          />
        )}
        
        <Row gutter={[16, 16]}>
          {tournament.teams.map(team => (
            <Col xs={24} sm={12} lg={8} key={team.id}>
              <Card
                hoverable
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb',
                  height: '100%',
                }}
                bodyStyle={{ padding: '20px' }}
              >
                {!viewerMode && editingTeam === team.id ? (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit(team.id);
                        } else if (e.key === 'Escape') {
                          setEditingTeam(null);
                          setEditName('');
                        }
                      }}
                      placeholder="Team name"
                      size="large"
                      style={{
                        textAlign: 'center',
                        fontSize: '16px',
                        fontWeight: 600,
                      }}
                      autoFocus
                    />
                    <Space size={8} style={{ width: '100%', justifyContent: 'center' }}>
                      <Button
                        type="primary"
                        onClick={() => handleSaveEdit(team.id)}
                        style={{
                          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingTeam(null);
                          setEditName('');
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
                ) : (
                  <Space direction="vertical" size={12} style={{ width: '100%', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: '18px', textAlign: 'center', display: 'block' }}>
                      {team.name}
                    </Text>
                    {team.seed && (
                      <Tag color="orange" style={{ fontSize: '12px', padding: '4px 12px' }}>
                        Seed: {team.seed}
                      </Tag>
                    )}
                    {!viewerMode && !tournamentComplete && (
                      <Space size={8} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => handleEdit(team.id, team.name)}
                          style={{
                            borderRadius: '8px',
                            fontWeight: 600,
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(team.id, team.name)}
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
                )}
              </Card>
            </Col>
          ))}
        </Row>

        {/* Delete Confirmation Modal */}
        <Modal
          title={
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '20px' }}>
              <DeleteOutlined style={{ marginRight: '8px' }} />
              Remove Team
            </span>
          }
          open={!!deleteConfirm}
          onOk={confirmDelete}
          onCancel={cancelDelete}
          okText="Remove"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
          style={{ borderRadius: '12px' }}
        >
          {deleteConfirm && (
            <div>
              {deleteConfirm.uncompletedGames > 0 ? (
                <>
                  <Text strong style={{ color: '#ef4444', display: 'block', marginBottom: '12px' }}>
                    Warning:
                  </Text>
                  <Text style={{ display: 'block', marginBottom: '12px', lineHeight: '1.6' }}>
                    Removing <strong>"{deleteConfirm.teamName}"</strong> will convert {deleteConfirm.uncompletedGames} uncompleted game{deleteConfirm.uncompletedGames !== 1 ? 's' : ''} to BYE.
                  </Text>
                  <Text style={{ display: 'block', color: '#6b7280', lineHeight: '1.6' }}>
                    This effectively disqualifies the team and removes them from the tournament. Are you sure you want to continue?
                  </Text>
                </>
              ) : (
                <Text style={{ display: 'block', lineHeight: '1.6' }}>
                  Are you sure you want to remove <strong>"{deleteConfirm.teamName}"</strong>? This action cannot be undone.
                </Text>
              )}
            </div>
          )}
        </Modal>
      </Content>
    </Layout>
  );
}
