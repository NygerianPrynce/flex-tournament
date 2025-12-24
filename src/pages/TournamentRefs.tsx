import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';

export function TournamentRefs() {
  const { tournament, addRef, updateRef, removeRef, updateTournament, getAllGames } = useTournamentStore();
  const [showAddRef, setShowAddRef] = useState(false);
  const [newRefName, setNewRefName] = useState('');
  
  if (!tournament) {
    return <div className="p-8">No tournament loaded</div>;
  }
  
  const allGames = getAllGames();
  
  // Check if ref is in use (assigned to active game)
  const isRefInUse = (refId: string): boolean => {
    return allGames.some(g => 
      g.refId === refId && 
      (g.status === 'Warmup' || g.status === 'Live' || g.status === 'Flex' || g.status === 'Paused')
    );
  };
  
  // Check if ref is available (not paused)
  const isRefAvailable = (ref: { available?: boolean }): boolean => {
    return ref.available !== false;
  };
  
  const handleAddRef = () => {
    if (newRefName.trim()) {
      addRef({
        id: `ref-${Date.now()}-${Math.random()}`,
        name: newRefName.trim(),
        available: true,
      });
      setNewRefName('');
      setShowAddRef(false);
    }
  };
  
  const handleToggleAvailability = (refId: string, currentAvailable: boolean) => {
    updateRef(refId, { available: !currentAvailable });
  };
  
  const useRefs = tournament.settings.useRefs !== false && tournament.refs.length > 0;
  
  const handleToggleRefs = () => {
    if (useRefs) {
      // Currently enabled, disable it
      if (confirm('This will disable referee requirements for all games. Games can start without referees. Continue?')) {
        updateTournament({
          settings: {
            ...tournament.settings,
            useRefs: false,
          },
        });
      }
    } else {
      // Currently disabled, enable it
      updateTournament({
        settings: {
          ...tournament.settings,
          useRefs: true,
        },
      });
    }
  };
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-sport-orange">Referees</h2>
        {tournament.refs.length > 0 && (
          <button
            onClick={handleToggleRefs}
            className="btn-secondary"
          >
            {useRefs ? 'Disable Referees' : 'Enable Referees'}
          </button>
        )}
      </div>
      
      {!useRefs && tournament.refs.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <p className="mb-4">No referees assigned. Games can proceed without referees.</p>
          {!showAddRef && (
            <button
              onClick={() => setShowAddRef(true)}
              className="btn-primary"
            >
              Add Referee
            </button>
          )}
        </div>
      ) : (
        <>
          {showAddRef ? (
            <div className="card mb-4">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Referee name"
                  value={newRefName}
                  onChange={(e) => setNewRefName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sport-orange"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddRef();
                    } else if (e.key === 'Escape') {
                      setShowAddRef(false);
                      setNewRefName('');
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddRef}
                    className="btn-primary flex-1"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddRef(false);
                      setNewRefName('');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRef(true)}
              className="btn-primary mb-4"
            >
              Add Referee
            </button>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournament.refs.map(ref => {
              const inUse = isRefInUse(ref.id);
              const available = isRefAvailable(ref);
              
              return (
                <div
                  key={ref.id}
                  className={`card relative ${
                    !useRefs
                      ? 'bg-gray-100 opacity-60 border-gray-300'
                      : inUse 
                        ? 'ring-4 ring-red-300 border-red-400' 
                        : available 
                          ? 'ring-4 ring-green-300 border-green-400' 
                          : 'ring-4 ring-yellow-300 border-yellow-400'
                  }`}
                >
                  <div className="font-semibold text-lg mb-2">{ref.name}</div>
                  <div className="text-sm text-gray-600 mb-3">
                    {inUse && <span className="text-red-600 font-semibold">● In Game</span>}
                    {!inUse && available && <span className="text-green-600 font-semibold">● Available</span>}
                    {!inUse && !available && <span className="text-yellow-600 font-semibold">● Temp Unavailable</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleAvailability(ref.id, available)}
                      className={`btn-secondary flex-1 text-sm ${
                        available ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'
                      }`}
                      disabled={inUse || !useRefs}
                    >
                      {available ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${ref.name}?`)) {
                          // Unassign from any games
                          const { assignRefToGame } = useTournamentStore.getState();
                          allGames.forEach(game => {
                            if (game.refId === ref.id) {
                              assignRefToGame(game.id, undefined);
                            }
                          });
                          removeRef(ref.id);
                        }
                      }}
                      className="btn-primary bg-red-500 hover:bg-red-600 flex-1 text-sm"
                      disabled={inUse || !useRefs}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

