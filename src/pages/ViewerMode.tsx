import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTournamentByShareCode } from '../lib/database';
import type { Tournament } from '../types';
import { TournamentBracket } from './TournamentBracket';
import { TournamentCourts } from './TournamentCourts';
import { TournamentTeams } from './TournamentTeams';
import { TournamentResults } from './TournamentResults';
import { TournamentInfo } from './TournamentInfo';

export function ViewerMode() {
  const { code } = useParams<{ code: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bracket' | 'courts' | 'teams' | 'results' | 'info'>('bracket');
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      setError('No share code provided');
      setLoading(false);
      return;
    }

    loadTournament(code);
  }, [code]);

  const loadTournament = async (shareCode: string) => {
    try {
      setLoading(true);
      const data = await getTournamentByShareCode(shareCode);
      if (!data) {
        setError('Tournament not found');
      } else {
        setTournament(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light-off-white flex items-center justify-center">
        <div className="text-xl text-dark-charcoal">Loading tournament...</div>
      </div>
    );
  }

  if (error || !tournament) {
    // Redirect to tournament not available page
    navigate('/tournament-not-available', { replace: true });
    return null;
  }

  // Create a viewer-specific store context
  // For now, we'll pass tournament as a prop to components
  // In a full implementation, you'd create a viewer store or context

  return (
    <div className="flex min-h-screen">
      <ViewerSidebar activeTab={activeTab} onTabChange={setActiveTab} tournamentName={tournament.name} />
      <div className="flex-1 bg-light-off-white">
        {activeTab === 'bracket' && <TournamentBracket tournament={tournament} viewerMode />}
        {activeTab === 'courts' && <TournamentCourts tournament={tournament} viewerMode />}
        {activeTab === 'teams' && <TournamentTeams tournament={tournament} viewerMode />}
        {activeTab === 'results' && <TournamentResults tournament={tournament} viewerMode />}
        {activeTab === 'info' && <TournamentInfo tournament={tournament} viewerMode />}
      </div>
    </div>
  );
}

function ViewerSidebar({ 
  activeTab, 
  onTabChange, 
  tournamentName 
}: { 
  activeTab: string; 
  onTabChange: (tab: 'bracket' | 'courts' | 'teams' | 'results' | 'info') => void;
  tournamentName: string;
}) {
  return (
    <div className="w-64 bg-light-off-white shadow-lg min-h-screen p-6 border-r-2 border-light-warm-gray">
      <div className="mb-8">
        <h1 className="text-2xl font-heading uppercase tracking-wide-heading text-accent-orange" style={{ fontStyle: 'oblique' }}>
          bracketooski
        </h1>
        <div className="divider-orange mt-2"></div>
        <p className="text-sm text-dark-charcoal mt-4">{tournamentName}</p>
        <p className="text-xs text-gray-500 mt-2">Viewer Mode</p>
      </div>
      
      <nav className="space-y-1">
        {[
          { id: 'bracket', label: 'Bracket' },
          { id: 'courts', label: 'Courts' },
          { id: 'teams', label: 'Teams' },
          { id: 'results', label: 'Results' },
          { id: 'info', label: 'Tournament Info' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as any)}
            className={`w-full text-left flex items-center space-x-3 px-4 py-3 transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-accent-orange text-dark-near-black font-heading uppercase tracking-wide-heading'
                : 'text-dark-charcoal hover:text-accent-orange hover:bg-light-warm-gray font-body'
            }`}
            style={activeTab === item.id ? { transform: 'skewX(-3deg)' } : {}}
          >
            <span style={activeTab === item.id ? { transform: 'skewX(3deg)' } : {}} className="font-medium">
              {item.label.toUpperCase()}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

