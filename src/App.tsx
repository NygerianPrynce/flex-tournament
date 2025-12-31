import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { TrophyOutlined } from '@ant-design/icons';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { TournamentList } from './pages/TournamentList';
import { Setup } from './pages/Setup';
import { SidebarNav } from './components/SidebarNav';
import { TournamentCourts } from './pages/TournamentCourts';
import { TournamentBracket } from './pages/TournamentBracket';
import { TournamentTeams } from './pages/TournamentTeams';
import { TournamentRefs } from './pages/TournamentRefs';
import { TournamentSettings } from './pages/TournamentSettings';
import { TournamentInfo } from './pages/TournamentInfo';
import { TournamentResults } from './pages/TournamentResults';
import { ViewerMode } from './pages/ViewerMode';
import { TournamentNotAvailable } from './pages/TournamentNotAvailable';
import { useTournamentStore } from './store/tournamentStore';
import { getTournament } from './lib/database';

function TournamentLayout({ children }: { children: React.ReactNode }) {
  const { tournament, setTournament } = useTournamentStore();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadTournament = async () => {
      // Check if tournamentId is in location state (from Setup or TournamentList)
      const tournamentId = (location.state as any)?.tournamentId;
      
      // Always load from database if tournamentId is provided (even if we have a tournament in store)
      // This ensures we get the latest data including shareCode
      if (tournamentId) {
        try {
          console.log('TournamentLayout: Loading tournament from database:', tournamentId);
          const loadedTournament = await getTournament(tournamentId);
          if (loadedTournament) {
            console.log('TournamentLayout: Loaded tournament with shareCode:', loadedTournament.shareCode);
            setTournament(loadedTournament);
          } else {
            console.error('TournamentLayout: Tournament not found in database');
          }
        } catch (error) {
          console.error('TournamentLayout: Failed to load tournament:', error);
        }
      }
      
      setLoading(false);
    };
    
    // Always try to load if tournamentId is in state
    // This ensures we load database tournaments even if there's a localStorage tournament in store
    loadTournament();
  }, [location.state?.tournamentId, setTournament]);
  
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
  
  if (!tournament) {
    return <Navigate to="/tournaments" replace />;
  }
  
  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex-1 bg-light-off-white">
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/tournaments" element={<TournamentList />} />
        <Route path="/view/:code" element={<ViewerMode />} />
        <Route path="/tournament-not-available" element={<TournamentNotAvailable />} />
        <Route path="/setup" element={<Setup />} />
        <Route
          path="/tournament"
          element={
            <Navigate to="/tournament/bracket" replace />
          }
        />
        <Route
          path="/tournament/courts"
          element={
            <TournamentLayout>
              <TournamentCourts />
            </TournamentLayout>
          }
        />
        <Route
          path="/tournament/bracket"
          element={
            <TournamentLayout>
              <TournamentBracket />
            </TournamentLayout>
          }
        />
        <Route
          path="/tournament/teams"
          element={
            <TournamentLayout>
              <TournamentTeams />
            </TournamentLayout>
          }
        />
        <Route
          path="/tournament/refs"
          element={
            <TournamentLayout>
              <TournamentRefs />
            </TournamentLayout>
          }
        />
        <Route
          path="/tournament/info"
          element={
            <TournamentLayout>
              <TournamentInfo />
            </TournamentLayout>
          }
        />
        <Route
          path="/tournament/settings"
          element={
            <TournamentLayout>
              <TournamentSettings />
            </TournamentLayout>
          }
        />
        <Route
          path="/tournament/results"
          element={
            <TournamentLayout>
              <TournamentResults />
            </TournamentLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
