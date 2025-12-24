import { useState } from 'react';

interface OpenSlotModalProps {
  teamName: string;
  onAddTeam: (name: string) => void;
  onAssignBye: () => void;
  onCancel: () => void;
}

export function OpenSlotModal({ teamName, onAddTeam, onAssignBye, onCancel }: OpenSlotModalProps) {
  const [newTeamName, setNewTeamName] = useState('');
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Resolve OPEN Slot</h3>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            The game includes an OPEN slot for <strong>{teamName}</strong>. How would you like to proceed?
          </p>
          
          <div>
            <label className="block text-sm font-medium mb-2">Add New Team</label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter team name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => {
                if (newTeamName.trim()) {
                  onAddTeam(newTeamName.trim());
                }
              }}
              disabled={!newTeamName.trim()}
              className="btn-primary w-full mt-2 disabled:opacity-50"
            >
              Add Team
            </button>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={onAssignBye}
              className="btn-secondary w-full"
            >
              Assign BYE (Auto-advance opponent)
            </button>
          </div>
          
          <button onClick={onCancel} className="text-gray-600 hover:text-gray-800 w-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

