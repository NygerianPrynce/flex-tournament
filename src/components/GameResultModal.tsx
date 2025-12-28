import { useState } from 'react';
import type { Game, Team } from '../types';

interface GameResultModalProps {
  game: Game;
  teams: Team[];
  onClose: () => void;
  onSave: (winnerId: string, scoreA: number, scoreB: number) => void;
}

export function GameResultModal({ game, teams, onClose, onSave }: GameResultModalProps) {
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
  
  // Validate that winner matches scores
  const isWinnerValid = () => {
    if (!winnerId) return false;
    
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
      alert('Please select a winner');
      return;
    }
    
    if (!isWinnerValid()) {
      alert('Winner selection does not match the scores. The winning team must have the higher score.');
      return;
    }
    
    onSave(winnerId, getNumericScoreA(), getNumericScoreB());
    onClose();
  };
  
  const getWinnerName = () => {
    if (!winnerId) return '';
    if (winnerId === teamAId) return getTeamName(game.teamA);
    if (winnerId === teamBId) return getTeamName(game.teamB);
    return '';
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3 sm:px-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center space-y-5">
          {/* Header */}
          <div className="text-center w-full">
            <h3 className="text-lg sm:text-xl md:text-2xl font-heading uppercase tracking-wide-heading text-accent-orange mb-2" style={{ fontStyle: 'oblique' }}>
              Review Game Result
            </h3>
            <p className="text-xs text-gray-500">Confirm winner and scores before saving</p>
          </div>

          {/* Teams Display */}
          <div className="w-full flex flex-col items-center space-y-2 py-2">
            <div className="text-base sm:text-lg md:text-xl font-bold text-dark-near-black text-center truncate">{getTeamName(game.teamA)}</div>
            <div className="text-sm sm:text-base md:text-lg font-heading uppercase tracking-wide-heading text-sport-green" style={{ fontStyle: 'oblique' }}>
              VS
            </div>
            <div className="text-base sm:text-lg md:text-xl font-bold text-dark-near-black text-center truncate">{getTeamName(game.teamB)}</div>
          </div>

          {/* Scores Input */}
          <div className="w-full grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center">
              <label className="block text-xs font-medium mb-2 text-center text-gray-700 uppercase tracking-wide">
                {getTeamName(game.teamA)} Score
              </label>
              <input
                type="number"
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setScoreA('0');
                  }
                }}
                className="w-full px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-lg text-center text-base sm:text-lg font-bold text-dark-near-black focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all"
                min="0"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="block text-xs font-medium mb-2 text-center text-gray-700 uppercase tracking-wide">
                {getTeamName(game.teamB)} Score
              </label>
              <input
                type="number"
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setScoreB('0');
                  }
                }}
                className="w-full px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-lg text-center text-base sm:text-lg font-bold text-dark-near-black focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all"
                min="0"
              />
            </div>
          </div>

          {/* Winner Selection */}
          <div className="w-full flex flex-col items-center">
            <label className="block text-xs font-medium mb-2 text-center text-gray-700 uppercase tracking-wide">Winner</label>
            <select
              value={winnerId}
              onChange={(e) => setWinnerId(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-center text-base font-semibold text-dark-near-black focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all"
            >
              <option value="">Select winner...</option>
              {teamAId && (
                <option value={teamAId}>{getTeamName(game.teamA)}</option>
              )}
              {teamBId && (
                <option value={teamBId}>{getTeamName(game.teamB)}</option>
              )}
            </select>
          </div>

          {/* Results Summary Box */}
          {winnerId && getNumericScoreA() >= 0 && getNumericScoreB() >= 0 && (
            <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 shadow-inner">
              <div className="space-y-3 text-center">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Winner</div>
                  <div className="text-lg font-bold text-dark-near-black">{getWinnerName()}</div>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Score</div>
                  <div className="text-base font-bold text-dark-near-black">
                    {getTeamName(game.teamA)} {getNumericScoreA()} - {getNumericScoreB()} {getTeamName(game.teamB)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {!isWinnerValid() && winnerId && (
            <div className="w-full text-xs text-red-600 bg-red-50 p-3 rounded-lg border-2 border-red-200 text-center">
              ⚠️ Winner must match the higher score and scores cannot be equal.
            </div>
          )}
          {getNumericScoreA() === getNumericScoreB() && getNumericScoreA() > 0 && (
            <div className="w-full text-xs text-red-600 bg-red-50 p-3 rounded-lg border-2 border-red-200 text-center">
              ⚠️ Scores cannot be equal. There must be a winner.
            </div>
          )}

          {/* Final Warning */}
          <div className="w-full text-xs text-orange-700 bg-orange-50 p-3 rounded-lg border-2 border-orange-200 text-center flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>Warning: This cannot be changed once you click Submit</span>
          </div>

          {/* Buttons */}
          <div className="w-full grid grid-cols-3 gap-3 pt-2">
            <button 
              onClick={handleSave} 
              className={`w-full px-4 py-2 rounded-lg font-heading uppercase tracking-wide-heading text-sm transition-all ${
                isWinnerValid()
                  ? 'btn-primary hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!isWinnerValid()}
              style={{ fontStyle: 'oblique' }}
            >
              Submit
            </button>
            <button 
              onClick={() => setWinnerId('')} 
              className="btn-secondary w-full px-4 py-2 rounded-lg font-heading uppercase tracking-wide-heading text-sm hover:shadow-lg transition-all"
              style={{ fontStyle: 'oblique' }}
            >
              Edit
            </button>
            <button 
              onClick={onClose} 
              className="btn-secondary w-full px-4 py-2 rounded-lg font-heading uppercase tracking-wide-heading text-sm hover:shadow-lg transition-all"
              style={{ fontStyle: 'oblique' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

