import { useState } from 'react';
import type { Game, Team } from '../types';
import { Modal, Typography, InputNumber, Select, Button, Space, Alert } from 'antd';

const { Title, Text } = Typography;

interface GameResultModalProps {
  game: Game;
  teams: Team[];
  onClose: () => void;
  onSave: (winnerId: string, scoreA: number, scoreB: number) => void;
  scoringRequired?: boolean; // If false, scores are optional (default: true)
}

export function GameResultModal({ game, teams, onClose, onSave, scoringRequired = true }: GameResultModalProps) {
  const [scoreA, setScoreA] = useState<string>(game.result?.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState<string>(game.result?.scoreB?.toString() || '');
  const [winnerId, setWinnerId] = useState<string>('');
  
  const getTeamName = (slot: Game['teamA']) => {
    if (slot.type === 'Team' && slot.teamId) {
      return teams.find(t => t.id === slot.teamId)?.name || 'Unknown';
    }
    if (slot.type === 'BYE') return 'BYE';
    if (slot.type === 'OPEN') return 'OPEN';
    return 'TBD';
  };
  
  const teamAId = game.teamA.type === 'Team' ? game.teamA.teamId : undefined;
  const teamBId = game.teamB.type === 'Team' ? game.teamB.teamId : undefined;
  
  // Get numeric scores for validation
  const getNumericScoreA = () => parseInt(scoreA) || 0;
  const getNumericScoreB = () => parseInt(scoreB) || 0;
  
  // Validate that winner matches scores (only if scoring is required)
  const isWinnerValid = () => {
    if (!winnerId) return false;
    
    // If scoring is not required, just need a winner
    if (!scoringRequired) return true;
    
    const numScoreA = getNumericScoreA();
    const numScoreB = getNumericScoreB();
    
    // Scores cannot be equal (no ties)
    if (numScoreA === numScoreB) return false;
    
    // If Team A is selected as winner, scoreA must be greater than scoreB
    if (winnerId === teamAId) {
      return numScoreA > numScoreB;
    }
    
    // If Team B is selected as winner, scoreB must be greater than scoreA
    if (winnerId === teamBId) {
      return numScoreB > numScoreA;
    }
    
    return false;
  };
  
  const handleSave = () => {
    if (!winnerId) {
      Modal.warning({
        title: 'Winner Required',
        content: 'Please select a winner before submitting.',
      });
      return;
    }
    
    if (scoringRequired && !isWinnerValid()) {
      Modal.warning({
        title: 'Invalid Result',
        content: 'Winner selection does not match the scores. The winning team must have the higher score.',
      });
      return;
    }
    
    // If scoring is not required, use 0 for scores
    const finalScoreA = scoringRequired ? getNumericScoreA() : 0;
    const finalScoreB = scoringRequired ? getNumericScoreB() : 0;
    onSave(winnerId, finalScoreA, finalScoreB);
    onClose();
  };
  
  return (
    <>
      <style>{`
  .winner-select-centered .ant-select-selector {
    text-align: center !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .winner-select-centered .ant-select-selection-item {
    text-align: center !important;
    justify-content: center !important;
    display: flex !important;
    align-items: center !important;
    width: 100% !important;
    padding: 0 !important;
  }
  .winner-select-centered .ant-select-selection-placeholder {
    text-align: center !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
  }
  .winner-select-centered .ant-select-selection-search {
    text-align: center !important;
    width: 100% !important;
  }
  .winner-select-centered .ant-select-selection-search-input {
    text-align: center !important;
  }
  
  /* These target the dropdown menu items */
  .winner-select-centered .ant-select-item {
    text-align: center !important;
    justify-content: center !important;
  }
  .winner-select-centered .ant-select-item-option-content {
    text-align: center !important;
    width: 100% !important;
    display: block !important;
  }
  
  .score-input-centered .ant-input-number-input {
    text-align: center !important;
  }
  .score-input-centered .ant-input-number-input-wrap {
    text-align: center !important;
  }
`}</style>
      <Modal
        title={
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#f97316', textAlign: 'center' }}>
            Review Game Result
          </Title>
        }
        open={true}
        onCancel={onClose}
        footer={null}
        width={600}
        centered
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: '13px' }}>
          {scoringRequired ? 'Confirm winner and scores before saving' : 'Confirm winner before saving'}
        </Text>

        {/* Teams Display */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Text strong style={{ fontSize: '20px', display: 'block', marginBottom: '12px' }}>
            {getTeamName(game.teamA)}
          </Text>
          <Text strong style={{ fontSize: '16px', color: '#16a34a', fontWeight: 700, display: 'block', margin: '8px 0' }}>
            VS
          </Text>
          <Text strong style={{ fontSize: '20px', display: 'block', marginTop: '12px' }}>
            {getTeamName(game.teamB)}
          </Text>
        </div>

        {/* Scores Input - Only show if scoring is required */}
        {scoringRequired && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'center', maxWidth: '200px' }}>
              <Text style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', color: '#6b7280' }}>
                {getTeamName(game.teamA)} Score
              </Text>
              <InputNumber
                value={scoreA ? parseInt(scoreA) : undefined}
                onChange={(value) => setScoreA(value?.toString() || '0')}
                min={0}
                size="large"
                controls={true}
                className="score-input-centered"
                style={{
                  width: '100%',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              />
            </div>
            <div style={{ textAlign: 'center', maxWidth: '200px' }}>
              <Text style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', color: '#6b7280' }}>
                {getTeamName(game.teamB)} Score
              </Text>
              <InputNumber
                value={scoreB ? parseInt(scoreB) : undefined}
                onChange={(value) => setScoreB(value?.toString() || '0')}
                min={0}
                size="large"
                controls={true}
                className="score-input-centered"
                style={{
                  width: '100%',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              />
            </div>
          </div>
        )}

        {/* Winner Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Text style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', textAlign: 'center', color: '#6b7280' }}>
            Winner
          </Text>
          <Select
            value={winnerId || undefined}
            onChange={(value) => setWinnerId(value)}
            placeholder="Select winner..."
            size="large"
            style={{
              width: 'auto',
              minWidth: '150px',
              maxWidth: '250px',
              fontSize: '15px',
              fontWeight: 600,
            }}
            className="winner-select-centered"
            dropdownStyle={{ maxWidth: '250px' }}
          >
            {teamAId && (
              <Select.Option value={teamAId}>{getTeamName(game.teamA)}</Select.Option>
            )}
            {teamBId && (
              <Select.Option value={teamBId}>{getTeamName(game.teamB)}</Select.Option>
            )}
          </Select>
        </div>

        {/* Validation Warnings - Only show if scoring is required */}
        {scoringRequired && !isWinnerValid() && winnerId && (
          <Alert
            message="Invalid Result: Winner must match the higher score and scores cannot be equal."
            type="error"
            showIcon
            style={{ borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}
          />
        )}
        {scoringRequired && getNumericScoreA() === getNumericScoreB() && getNumericScoreA() > 0 && (
          <Alert
            message="Tie Game: Scores cannot be equal. There must be a winner."
            type="error"
            showIcon
            style={{ borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}
          />
        )}

        {/* Final Warning */}
        <Alert
          message="Warning: This cannot be changed once you click Submit"
          type="warning"
          showIcon
          style={{ borderRadius: '8px', fontSize: '12px', textAlign: 'center' }}
        />

        {/* Buttons */}
        <Space size={12} style={{ width: '100%', justifyContent: 'center' }}>
          <Button
            type="primary"
            onClick={handleSave}
            disabled={!isWinnerValid()}
            size="large"
            style={{
              borderRadius: '8px',
              fontSize: '14px',
              height: '44px',
              fontWeight: 600,
              minWidth: '100px',
              background: isWinnerValid() 
                ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' 
                : '#d1d5db',
              border: 'none',
              boxShadow: isWinnerValid() ? '0 2px 8px rgba(249, 115, 22, 0.3)' : 'none',
            }}
          >
            Submit
          </Button>
          <Button
            onClick={() => setWinnerId('')}
            size="large"
            style={{
              borderRadius: '8px',
              fontSize: '14px',
              height: '44px',
              fontWeight: 600,
              minWidth: '100px',
            }}
          >
            Reset
          </Button>
          <Button
            onClick={onClose}
            size="large"
            style={{
              borderRadius: '8px',
              fontSize: '14px',
              height: '44px',
              fontWeight: 600,
              minWidth: '100px',
            }}
          >
            Cancel
          </Button>
        </Space>
      </Space>
    </Modal>
    </>
  );
}

