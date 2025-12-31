import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrophyOutlined } from '@ant-design/icons';
import { getTournamentByShareCode } from '../lib/database';
import type { Tournament } from '../types';
import { TournamentBracket } from './TournamentBracket';
import { TournamentCourts } from './TournamentCourts';
import { TournamentTeams } from './TournamentTeams';
import { TournamentResults } from './TournamentResults';
import { TournamentInfo } from './TournamentInfo';
import { LandscapeOnly } from '../components/LandscapeOnly';
import { useSport } from '../hooks/useSport';

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
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          * { font-family: 'Poppins', sans-serif; }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
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
        <div style={{ 
          position: 'relative', 
          zIndex: 1,
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            margin: '0 auto 24px',
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
          <div style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>
            Loading tournament...
          </div>
        </div>
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
    <LandscapeOnly>
      <div className="flex min-h-screen overflow-x-hidden">
        <ViewerSidebar activeTab={activeTab} onTabChange={setActiveTab} onExit={() => navigate('/')} />
        <div className="flex-1 bg-light-off-white overflow-x-hidden min-w-0">
          {activeTab === 'bracket' && <TournamentBracket tournament={tournament} viewerMode />}
          {activeTab === 'courts' && <TournamentCourts tournament={tournament} viewerMode />}
          {activeTab === 'teams' && <TournamentTeams tournament={tournament} viewerMode />}
          {activeTab === 'results' && <TournamentResults tournament={tournament} viewerMode />}
          {activeTab === 'info' && <TournamentInfo tournament={tournament} viewerMode />}
        </div>
      </div>
    </LandscapeOnly>
  );
}

function ViewerSidebar({ 
  activeTab, 
  onTabChange, 
  onExit
}: { 
  activeTab: string; 
  onTabChange: (tab: 'bracket' | 'courts' | 'teams' | 'results' | 'info') => void;
  onExit: () => void;
}) {
  const { venueTermPlural } = useSport();
  
  const navItems = [
    { id: 'bracket', label: 'Bracket' },
    { id: 'courts', label: venueTermPlural },
    { id: 'teams', label: 'Teams' },
    { id: 'results', label: 'Results' },
    { id: 'info', label: 'Tournament Info' },
  ];
  
  return (
    <div style={{
      width: '256px',
      background: '#f9fafb',
      minHeight: '100vh',
      padding: '24px',
      borderRight: '1px solid #e5e7eb',
      fontFamily: 'Poppins, sans-serif',
    }}>
      {/* Branding Section */}
      <div style={{ marginBottom: '32px', marginLeft: '-8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <img 
            src="/favicon.png" 
            alt="Bracketooski Logo" 
            style={{ width: '32px', height: '32px' }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0' }}>
            <span style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#f97316',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              BRACKET
            </span>
            <span style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#fb923c',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              OOSKI
            </span>
          </div>
        </div>
        <div style={{
          height: '2px',
          background: '#f97316',
          width: 'calc(100% + 8px)',
        }} />
      </div>
      
      {/* Navigation Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                borderRadius: '0',
                backgroundColor: isActive ? '#f97316' : 'transparent',
                color: isActive ? '#fff' : '#1f2937',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#f97316';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#1f2937';
                }
              }}
            >
              {item.label.toUpperCase()}
            </button>
          );
        })}
      </nav>
      
      {/* Exit Tournament Section */}
      <div style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
      }}>
        <button
          onClick={onExit}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            borderRadius: '0',
            color: '#1f2937',
            fontWeight: 500,
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#f97316';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#1f2937';
          }}
        >
          EXIT TOURNAMENT
        </button>
      </div>
    </div>
  );
}

