import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserTournaments } from '../lib/database';
import type { Tournament } from '../types';

export function TournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleCreateTournament = () => {
    navigate('/setup');
  };

  const handleSelectTournament = (tournamentId: string) => {
    navigate(`/tournament/bracket`, { state: { tournamentId } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light-off-white flex items-center justify-center">
        <div className="text-xl text-dark-charcoal">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-off-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-heading uppercase tracking-wide-heading text-accent-orange" style={{ fontStyle: 'oblique' }}>
            bracketooski
          </h1>
          <div className="flex gap-4 items-center">
            <span className="text-dark-charcoal">{user?.email}</span>
            <button onClick={handleSignOut} className="btn-secondary">
              Sign Out
            </button>
          </div>
        </div>

        <div className="mb-6">
          <button onClick={handleCreateTournament} className="btn-primary text-lg px-6 py-3">
            Create New Tournament
          </button>
        </div>

        {tournaments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-dark-charcoal text-lg mb-4">No tournaments yet.</p>
            <button onClick={handleCreateTournament} className="btn-primary">
              Create Your First Tournament
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                onClick={() => handleSelectTournament(tournament.id)}
                className="bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
              >
                <h2 className="text-2xl font-heading uppercase tracking-wide-heading text-accent-orange mb-2" style={{ fontStyle: 'oblique' }}>
                  {tournament.name}
                </h2>
                <p className="text-sm text-dark-charcoal mb-4">
                  Created: {new Date(tournament.createdAt).toLocaleDateString()}
                </p>
                <div className="text-sm text-dark-charcoal">
                  <p>Teams: {tournament.teams.length}</p>
                  <p>Courts: {tournament.courts.length}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

