import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
      <div className="min-h-screen bg-light-off-white flex items-center justify-center">
        <div className="text-xl text-dark-charcoal">Loading tournament...</div>
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
