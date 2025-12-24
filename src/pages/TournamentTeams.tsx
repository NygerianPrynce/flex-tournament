import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import type { Tournament } from '../types';

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
  
  if (!tournament) {
    return <div className="p-8">No tournament loaded</div>;
  }
  
  const handleEdit = (teamId: string, currentName: string) => {
    setEditingTeam(teamId);
    setEditName(currentName);
  };
  
  const handleSaveEdit = (teamId: string) => {
    if (editName.trim()) {
      const trimmedName = editName.trim();
      const nameLower = trimmedName.toLowerCase();
      
      // Check for duplicate names (case-insensitive), excluding the current team
      const existingNames = tournament.teams
        .filter(t => t.id !== teamId)
        .map(t => t.name.toLowerCase());
      
      if (existingNames.includes(nameLower)) {
        alert(`A team with the name "${trimmedName}" already exists. Please use a different name.`);
        return;
      }
      
      updateTeam(teamId, { name: trimmedName });
    }
    setEditingTeam(null);
    setEditName('');
  };
  
  const handleDelete = (teamId: string, teamName: string) => {
    // Check if team is in any uncompleted games
    const allGames = getAllGames();
    const uncompletedGames = allGames.filter(g => 
      g.status !== 'Finished' && 
      !g.result &&
      ((g.teamA.type === 'Team' && g.teamA.teamId === teamId) ||
       (g.teamB.type === 'Team' && g.teamB.teamId === teamId))
    );
    
    if (uncompletedGames.length > 0) {
      const message = `Warning: Deleting "${teamName}" will convert ${uncompletedGames.length} uncompleted game(s) to BYE. This effectively disqualifies the team and removes them from the tournament. Are you sure you want to continue?`;
      if (!confirm(message)) {
        return;
      }
    }
    
    removeTeam(teamId);
  };
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-sport-orange mb-6">Teams</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournament.teams.map(team => (
          <div key={team.id} className="card">
            {!viewerMode && editingTeam === team.id ? (
              <div className="space-y-2 flex flex-col items-center">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sport-orange text-center"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit(team.id);
                    } else if (e.key === 'Escape') {
                      setEditingTeam(null);
                      setEditName('');
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleSaveEdit(team.id)}
                    className="btn-primary flex-1 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setEditName('');
                    }}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="font-semibold text-lg">{team.name}</div>
                {team.seed && (
                  <div className="text-sm text-gray-600 mt-1">Seed: {team.seed}</div>
                )}
                {!viewerMode && (
                  <div className="flex gap-2 mt-3 w-full">
                    <button
                      onClick={() => handleEdit(team.id, team.name)}
                      className="btn-secondary flex-1 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(team.id, team.name)}
                      className="btn-primary bg-red-500 hover:bg-red-600 flex-1 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

