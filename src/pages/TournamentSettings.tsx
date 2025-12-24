import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { useNavigate } from 'react-router-dom';
import { useSport } from '../hooks/useSport';

export function TournamentSettings() {
  const { tournament, resetTournament, updateTournament } = useTournamentStore();
  const { venueTerm } = useSport();
  const navigate = useNavigate();
  
  const [gameLength, setGameLength] = useState<string>('20');
  const [warmupTime, setWarmupTime] = useState<string>('5');
  const [flexTime, setFlexTime] = useState<string>('5');
  const [numberOfCourts, setNumberOfCourts] = useState<string>('2');
  
  useEffect(() => {
    if (tournament) {
      setGameLength(tournament.settings.gameLengthMinutes.toString());
      setWarmupTime(tournament.settings.warmupMinutes.toString());
      setFlexTime(tournament.settings.flexMinutes.toString());
      setNumberOfCourts(tournament.settings.numberOfCourts.toString());
    }
  }, [tournament]);
  
  if (!tournament) {
    return <div className="p-8">No tournament loaded</div>;
  }
  
  const handleReset = () => {
    if (confirm('Are you sure you want to reset the tournament? All game progress will be lost, but teams and bracket structure will remain.')) {
      resetTournament();
      // Navigate to bracket page to show the reset state
      navigate('/bracket');
    }
  };
  
  const handleSaveSettings = () => {
    if (!tournament) return;
    
    const numGameLength = parseInt(gameLength) || 1;
    const numWarmupTime = parseInt(warmupTime) || 0;
    const numFlexTime = parseInt(flexTime) || 0;
    const numNumberOfCourts = parseInt(numberOfCourts) || 1;
    
    // Update court names if number of courts changed
    let newCourtNames = [...tournament.settings.courtNames];
    if (numNumberOfCourts > tournament.settings.numberOfCourts) {
      // Add new courts
      for (let i = tournament.settings.numberOfCourts; i < numNumberOfCourts; i++) {
        newCourtNames.push(`${venueTerm} ${i + 1}`);
      }
    } else if (numNumberOfCourts < tournament.settings.numberOfCourts) {
      // Remove extra courts
      newCourtNames = newCourtNames.slice(0, numNumberOfCourts);
    }
    
    // Update courts array
    const newCourts = Array.from({ length: numNumberOfCourts }, (_, i) => ({
      id: tournament.courts[i]?.id || `court-${i}`,
      name: newCourtNames[i] || `${venueTerm} ${i + 1}`,
    }));
    
    updateTournament({
      settings: {
        ...tournament.settings,
        gameLengthMinutes: numGameLength,
        warmupMinutes: numWarmupTime,
        flexMinutes: numFlexTime,
        numberOfCourts: numNumberOfCourts,
        courtNames: newCourtNames,
      },
      courts: newCourts,
    });
    
    alert('Settings saved successfully!');
  };
  
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-sport-orange mb-6">Settings</h2>
      
      <div className="card space-y-6">
        <div>
          <h3 className="font-semibold mb-4">Game Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Game Length (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={gameLength}
                onChange={(e) => setGameLength(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setGameLength('1');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sport-orange"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warmup Time (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={warmupTime}
                onChange={(e) => setWarmupTime(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setWarmupTime('0');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sport-orange"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flex Time (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={flexTime}
                onChange={(e) => setFlexTime(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setFlexTime('0');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sport-orange"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Courts
              </label>
              <input
                type="number"
                min="1"
                value={numberOfCourts}
                onChange={(e) => setNumberOfCourts(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setNumberOfCourts('1');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sport-orange"
              />
            </div>
            
            <button
              onClick={handleSaveSettings}
              className="btn-primary w-full"
            >
              Save Settings
            </button>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Danger Zone</h3>
          <button onClick={handleReset} className="btn-primary bg-red-500 hover:bg-red-600">
            Reset Tournament
          </button>
        </div>
      </div>
    </div>
  );
}

