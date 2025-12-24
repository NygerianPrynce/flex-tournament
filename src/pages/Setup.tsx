import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepWizard } from '../components/StepWizard';
import { UploadDropzone } from '../components/UploadDropzone';
import { EditableList } from '../components/EditableList';
import type { Team, Ref, TournamentSettings, SeedingMode, SeedingType, Court } from '../types';
import { parseCSV, parseXLSX, extractColumnValue, extractSeedValue } from '../lib/fileParser';
import { calculateTournamentDuration } from '../lib/tournamentDuration';
import type { Sport } from '../types';
import { SPORT_CONFIGS, getSportConfig } from '../lib/sports';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabase';
import { createTournament as createTournamentInDB } from '../lib/database';

const STEPS = [
  { id: 'format', label: 'Format' },
  { id: 'teams', label: 'Teams' },
  { id: 'seeding', label: 'Seeding' },
  { id: 'refs', label: 'Referees' },
  { id: 'settings', label: 'Settings' },
  { id: 'review', label: 'Review' },
];

// Sortable Team Item Component for Seeding
function SortableTeamItem({ team, index, teams, setTeams }: { team: Team; index: number; teams: Team[]; setTeams: (teams: Team[]) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: team.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg cursor-move"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing"
      >
        ⋮⋮
      </div>
      <div className="flex-shrink-0 text-gray-500 font-medium w-8">
        {index + 1}
      </div>
      <div className="flex-1 font-medium">{team.name}</div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Seed:</label>
        <input
          type="number"
          value={team.seed || ''}
          onChange={(e) => {
            const seed = e.target.value === '' ? undefined : parseInt(e.target.value);
            setTeams(teams.map(t => 
              t.id === team.id ? { ...t, seed } : t
            ));
          }}
          onBlur={(e) => {
            if (e.target.value === '') {
              setTeams(teams.map(t => 
                t.id === team.id ? { ...t, seed: undefined } : t
              ));
            }
          }}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          min="1"
          placeholder="Auto"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

// Seeding Team List Component
function SeedingTeamList({ teams, setTeams, sensors }: { teams: Team[]; setTeams: (teams: Team[]) => void; sensors: ReturnType<typeof useSensors> }) {
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = teams.findIndex(t => t.id === active.id);
      const newIndex = teams.findIndex(t => t.id === over.id);
      const newTeams = arrayMove(teams, oldIndex, newIndex);
      // Update seeds based on new order
      setTeams(newTeams.map((team, index) => ({ ...team, seed: index + 1 })));
    }
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={teams.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {teams.map((team, index) => (
            <SortableTeamItem key={team.id} team={team} index={index} teams={teams} setTeams={setTeams} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function Setup() {
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [tournamentName, setTournamentName] = useState('My Tournament');
  const [sport, setSport] = useState<Sport>('basketball');
  const [includeLosersBracket, setIncludeLosersBracket] = useState(false);
  const [openSlotPolicy, setOpenSlotPolicy] = useState<'BYE' | 'OPEN'>('BYE');
  const [teams, setTeams] = useState<Team[]>([]);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [seedingMode, setSeedingMode] = useState<SeedingMode>('off');
  const [seedingType, setSeedingType] = useState<SeedingType>('standard');
  const [showAddTeam, setShowAddTeam] = useState(false);
  // Drag and drop sensors for seeding (must be at component level)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [newTeamName, setNewTeamName] = useState('');
  const [bulkTeamInput, setBulkTeamInput] = useState('');
  const [bulkRefInput, setBulkRefInput] = useState('');
  const [settings, setSettings] = useState<TournamentSettings>({
    sport: 'basketball',
    gameLengthMinutes: 20,
    warmupMinutes: 5,
    flexMinutes: 5,
    numberOfCourts: 2,
    courtNames: ['Court 1', 'Court 2'],
    includeLosersBracket: false,
    openSlotPolicy: 'BYE',
  });
  // Local state for number inputs to allow empty strings while typing
  const [gameLengthDisplay, setGameLengthDisplay] = useState<string>('20');
  const [warmupTimeDisplay, setWarmupTimeDisplay] = useState<string>('5');
  const [flexTimeDisplay, setFlexTimeDisplay] = useState<string>('5');
  const [numberOfCourtsDisplay, setNumberOfCourtsDisplay] = useState<string>('2');
  
  // Sync display values with settings when they change externally
  useEffect(() => {
    setGameLengthDisplay(settings.gameLengthMinutes.toString());
    setWarmupTimeDisplay(settings.warmupMinutes.toString());
    setFlexTimeDisplay(settings.flexMinutes.toString());
    setNumberOfCourtsDisplay(settings.numberOfCourts.toString());
  }, [settings.gameLengthMinutes, settings.warmupMinutes, settings.flexMinutes, settings.numberOfCourts]);
  
  // Update court names when sport changes
  const updateCourtNamesForSport = (newSport: Sport) => {
    const sportConfig = getSportConfig(newSport);
    const newCourtNames = Array.from({ length: settings.numberOfCourts }, (_, i) =>
      `${sportConfig.venueTerm} ${i + 1}`
    );
    setSettings({
      ...settings,
      sport: newSport,
      courtNames: newCourtNames,
    });
  };
  
  const handleTeamFileUpload = async (file: File) => {
    try {
      const rows = file.name.endsWith('.csv') 
        ? await parseCSV(file)
        : await parseXLSX(file);
      
      const existingNames = new Set(teams.map(t => t.name.toLowerCase()));
      const newTeams: Team[] = [];
      const duplicates: string[] = [];
      
      for (const row of rows) {
        // For file upload, we use the 'name' field from the parsed data (first column)
        const name = row.name as string;
        if (name && name.trim()) {
          const trimmedName = name.trim();
          const nameLower = trimmedName.toLowerCase();
          
          // Check for duplicates
          if (existingNames.has(nameLower)) {
            duplicates.push(trimmedName);
            continue;
          }
          
          existingNames.add(nameLower);
          const seed = seedingMode === 'upload' ? extractSeedValue(row) : undefined;
          newTeams.push({
            id: `team-${Date.now()}-${Math.random()}`,
            name: trimmedName,
            seed,
          });
        }
      }
      
      if (duplicates.length > 0) {
        alert(`Skipped ${duplicates.length} duplicate team name(s): ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}`);
      }
      
      if (newTeams.length > 0) {
      setTeams([...teams, ...newTeams]);
      } else if (duplicates.length === 0) {
        alert('No valid teams found in file');
      }
    } catch (error) {
      alert('Error parsing file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleBulkTeamInput = () => {
    if (!bulkTeamInput.trim()) return;
    
    // Split by newlines or commas
    const teamNames = bulkTeamInput
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (teamNames.length === 0) return;
    
    const existingNames = new Set(teams.map(t => t.name.toLowerCase()));
    const newTeams: Team[] = [];
    const duplicates: string[] = [];
    
    for (const name of teamNames) {
      const nameLower = name.toLowerCase();
      
      // Check for duplicates (both in existing teams and within the input)
      if (existingNames.has(nameLower)) {
        duplicates.push(name);
        continue;
      }
      
      existingNames.add(nameLower);
      newTeams.push({
        id: `team-${Date.now()}-${Math.random()}`,
        name,
        seed: undefined,
      });
    }
    
    if (duplicates.length > 0) {
      alert(`Skipped ${duplicates.length} duplicate team name(s): ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}`);
    }
    
    if (newTeams.length > 0) {
      setTeams([...teams, ...newTeams]);
      setBulkTeamInput('');
    } else if (duplicates.length === 0) {
      alert('No valid teams to add');
    }
  };
  
  const handleRefFileUpload = async (file: File) => {
    try {
      const rows = file.name.endsWith('.csv')
        ? await parseCSV(file)
        : await parseXLSX(file);
      
      const newRefs: Ref[] = [];
      for (const row of rows) {
        const name = extractColumnValue(row, ['ref', 'ref_name', 'name', 'Ref', 'Ref Name', 'Name']);
        if (name) {
          newRefs.push({
            id: `ref-${Date.now()}-${Math.random()}`,
            name,
            available: true,
          });
        }
      }
      
      setRefs([...refs, ...newRefs]);
    } catch (error) {
      alert('Error parsing file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleBulkRefInput = () => {
    if (!bulkRefInput.trim()) return;

    const raw = bulkRefInput;
    const names = raw
      .split(/[\n,]/)
      .map(name => name.trim())
      .filter(Boolean);

    if (names.length === 0) {
      alert('No valid referees to add');
      return;
    }

    const newRefs: Ref[] = names.map(name => ({
      id: `ref-${Date.now()}-${Math.random()}`,
      name,
      available: true,
    }));

    setRefs([...refs, ...newRefs]);
    setBulkRefInput('');
  };
  
  const handleGenerate = async () => {
    if (teams.length < 2) {
      alert('Please add at least 2 teams');
      return;
    }
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please log in to create a tournament');
      navigate('/login');
      return;
    }
    
    const sportConfig = getSportConfig(sport);
    const finalSettings: TournamentSettings = {
      ...settings,
      sport,
      includeLosersBracket,
      openSlotPolicy,
      courtNames: Array.from({ length: settings.numberOfCourts }, (_, i) =>
        settings.courtNames[i] || `${sportConfig.venueTerm} ${i + 1}`
      ),
    };
    
    // Create courts array
    const courts: Court[] = Array.from({ length: settings.numberOfCourts }, (_, i) => ({
      id: `court-${i}`,
      name: finalSettings.courtNames[i] || `${sportConfig.venueTerm} ${i + 1}`,
    }));
    
    try {
      // Save to database
      const tournamentId = await createTournamentInDB(
        session.user.id,
        tournamentName,
        finalSettings,
        teams,
        refs,
        courts,
        seedingMode,
        seedingType
      );
      
      // Don't create localStorage tournament - load from database instead
      // Navigate to tournament with ID (will load from database)
      navigate(`/tournament/bracket`, { state: { tournamentId } });
    } catch (error: any) {
      console.error('Failed to create tournament:', error);
      alert(`Failed to create tournament: ${error.message}`);
    }
  };
  
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Format
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tournament Format</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tournament Name</label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.stopPropagation();
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sport-orange focus:border-transparent"
                placeholder="Enter tournament name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Sport</label>
              <select
                value={sport}
                onChange={(e) => {
                  const newSport = e.target.value as Sport;
                  setSport(newSport);
                  updateCourtNamesForSport(newSport);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sport-orange"
              >
                {Object.entries(SPORT_CONFIGS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This will set the terminology ({getSportConfig(sport).venueTermPlural.toLowerCase()}) and aesthetics for your tournament
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tournament Format</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="tournamentFormat"
                    value="single"
                    checked={!includeLosersBracket}
                    onChange={() => setIncludeLosersBracket(false)}
                    className="w-5 h-5 text-sport-orange focus:ring-sport-orange"
                  />
                  <span>Single Elimination</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="tournamentFormat"
                    value="double"
                    checked={includeLosersBracket}
                    onChange={() => setIncludeLosersBracket(true)}
                    className="w-5 h-5 text-sport-orange focus:ring-sport-orange"
                  />
                  <span>Double Elimination (Losers Bracket)</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Empty Slot Policy</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="openSlotPolicy"
                    value="BYE"
                    checked={openSlotPolicy === 'BYE'}
                    onChange={(e) => setOpenSlotPolicy(e.target.value as 'BYE')}
                    className="w-5 h-5 text-sport-orange focus:ring-sport-orange"
                  />
                  <span>BYE (auto-advance opponent)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="openSlotPolicy"
                    value="OPEN"
                    checked={openSlotPolicy === 'OPEN'}
                    onChange={(e) => setOpenSlotPolicy(e.target.value as 'OPEN')}
                    className="w-5 h-5 text-sport-orange focus:ring-sport-orange"
                  />
                  <span>OPEN (add team later)</span>
                </label>
              </div>
            </div>
          </div>
        );
        
      case 1: // Teams
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Teams</h2>
            
            <div>
              <h3 className="font-medium mb-2">Upload Teams (CSV/XLSX)</h3>
              <p className="text-sm text-gray-600 mb-2">
                Only include the team names in the file. It should be arranged like a column (no need for a header). All cells will be read (the first one won't be skipped).
              </p>
              <UploadDropzone onFileSelect={handleTeamFileUpload} />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Or Paste Teams</h3>
              <p className="text-sm text-gray-600 mb-2">
                Paste multiple team names separated by enters or commas (e.g., from Excel)
              </p>
              <textarea
                value={bulkTeamInput}
                onChange={(e) => setBulkTeamInput(e.target.value)}
                placeholder="Team 1&#10;Team 2&#10;Team 3&#10;or&#10;Team 1, Team 2, Team 3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sport-orange min-h-[120px]"
              />
              <button
                onClick={handleBulkTeamInput}
                className="btn-primary mt-4 mx-auto block"
                disabled={!bulkTeamInput.trim()}
              >
                Add Teams
              </button>
            </div>
            
            <div>
              <EditableList
                items={teams}
                renderItem={(team) => (
                  <div>
                    <span className="font-medium">{team.name}</span>
                    {team.seed && <span className="text-gray-500 ml-2">(Seed {team.seed})</span>}
                  </div>
                )}
                onAdd={() => {}}
                onRemove={(index) => {
                  setTeams(teams.filter((_, i) => i !== index));
                }}
                addLabel=""
                emptyMessage="No teams added yet"
                label="Teams"
              />
              
              {/* Add Team Modal */}
              {showAddTeam && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
                  setShowAddTeam(false);
                  setNewTeamName('');
                }}>
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4">Add Team</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Team Name *</label>
                        <input
                          type="text"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newTeamName.trim()) {
                                const trimmedName = newTeamName.trim();
                                const nameLower = trimmedName.toLowerCase();
                                
                                // Check for duplicate names (case-insensitive)
                                const existingNames = teams.map(t => t.name.toLowerCase());
                                if (existingNames.includes(nameLower)) {
                                  alert(`A team with the name "${trimmedName}" already exists. Please use a different name.`);
                                  return;
                                }
                                
                                setTeams([...teams, {
                                  id: `team-${Date.now()}-${Math.random()}`,
                                  name: trimmedName,
                                  // Seeds will be set in the Seeding step
                                  seed: undefined,
                                }]);
                                setShowAddTeam(false);
                                setNewTeamName('');
                              }
                            }
                            if (e.key === 'Backspace' || e.key === 'Delete') {
                              e.stopPropagation();
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sport-orange"
                          placeholder="Enter team name"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (newTeamName.trim()) {
                              const trimmedName = newTeamName.trim();
                              const nameLower = trimmedName.toLowerCase();
                              
                              // Check for duplicate names (case-insensitive)
                              const existingNames = teams.map(t => t.name.toLowerCase());
                              if (existingNames.includes(nameLower)) {
                                alert(`A team with the name "${trimmedName}" already exists. Please use a different name.`);
                                return;
                              }
                              
                              setTeams([...teams, {
                                id: `team-${Date.now()}-${Math.random()}`,
                                name: trimmedName,
                                // Seeds are configured in the Seeding step
                                seed: undefined,
                              }]);
                              setShowAddTeam(false);
                              setNewTeamName('');
                            }
                          }}
                          className="btn-primary flex-1"
                          disabled={!newTeamName.trim()}
                        >
                          Add Team
                        </button>
                        <button
                          onClick={() => {
                            setShowAddTeam(false);
                            setNewTeamName('');
                          }}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 2: // Seeding
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Seeding (Optional)</h2>
            <p className="text-sm text-gray-600 mb-4">
              You can skip this step to use random seeding, or configure how teams are seeded in the bracket.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Seeding Mode</label>
                <select
                  value={seedingMode}
                  onChange={(e) => {
                    const mode = e.target.value as SeedingMode;
                    setSeedingMode(mode);
                    if (mode === 'random') {
                      // Apply random seeding immediately
                      const shuffled = [...teams].sort(() => Math.random() - 0.5);
                      setTeams(shuffled.map((team, index) => ({ ...team, seed: index + 1 })));
                    } else if (mode === 'off') {
                      // Remove all seeds
                      setTeams(teams.map(team => ({ ...team, seed: undefined })));
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sport-orange"
                >
                  <option value="off">No Seeding (Random)</option>
                  <option value="random">Random Seeding</option>
                  <option value="manual">Manual Seeding</option>
                </select>
              </div>
              
              {(seedingMode === 'manual' || seedingMode === 'random') && (
                <div>
                  <label className="block text-sm font-medium mb-2">Seeding Type</label>
                  <select
                    value={seedingType}
                    onChange={(e) => setSeedingType(e.target.value as SeedingType)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sport-orange"
                  >
                    <option value="standard">Standard Seeding (1 vs last, 2 vs second-last)</option>
                    <option value="snake">Snake Seeding</option>
                    <option value="bye">BYE Seeding</option>
                  </select>
                </div>
              )}
              
              {seedingMode === 'manual' && (
                <div>
                  <h3 className="font-medium mb-2">Drag and drop teams to reorder, or set seed numbers</h3>
                  <SeedingTeamList teams={teams} setTeams={setTeams} sensors={sensors} />
                </div>
              )}
              
              {seedingMode === 'random' && teams.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Teams have been randomly seeded. You can see the seed numbers above if you switch to Manual Seeding.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 3: // Refs
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Referees (Optional)</h2>
            
            <div>
              <h3 className="font-medium mb-2">Upload Referees (CSV/XLSX)</h3>
              <UploadDropzone onFileSelect={handleRefFileUpload} />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Or Paste Referees</h3>
              <p className="text-sm text-gray-600 mb-2">
                Paste multiple referee names separated by enters or commas (e.g., from Excel)
              </p>
              <textarea
                value={bulkRefInput}
                onChange={(e) => setBulkRefInput(e.target.value)}
                placeholder="Referee 1&#10;Referee 2&#10;Referee 3&#10;or&#10;Referee 1, Referee 2, Referee 3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sport-orange min-h-[120px]"
              />
              <button
                onClick={handleBulkRefInput}
                className="btn-primary mt-4 mx-auto block"
                disabled={!bulkRefInput.trim()}
              >
                Add Referees
              </button>
            </div>
            
            <div>
              <EditableList
                items={refs}
                renderItem={(ref) => <span className="font-medium">{ref.name}</span>}
                onAdd={() => {}}
                onRemove={(index) => {
                  setRefs(refs.filter((_, i) => i !== index));
                }}
                addLabel=""
                emptyMessage="No referees added yet (optional)"
              />
            </div>
          </div>
        );
        
      case 4: // Settings
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Game Length (minutes)</label>
                <input
                  type="number"
                  value={gameLengthDisplay}
                  onChange={(e) => {
                    setGameLengthDisplay(e.target.value);
                    const val = e.target.value;
                    if (val !== '') {
                      setSettings({ ...settings, gameLengthMinutes: parseInt(val) || 20 });
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setGameLengthDisplay('20');
                      setSettings({ ...settings, gameLengthMinutes: 20 });
                    } else {
                      setGameLengthDisplay(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      e.stopPropagation();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Warmup Time (minutes)</label>
                <input
                  type="number"
                  value={warmupTimeDisplay}
                  onChange={(e) => {
                    setWarmupTimeDisplay(e.target.value);
                    const val = e.target.value;
                    if (val !== '') {
                      setSettings({ ...settings, warmupMinutes: parseInt(val) || 0 });
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setWarmupTimeDisplay('0');
                      setSettings({ ...settings, warmupMinutes: 0 });
                    } else {
                      setWarmupTimeDisplay(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      e.stopPropagation();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Flex Time (minutes)</label>
                <input
                  type="number"
                  value={flexTimeDisplay}
                  onChange={(e) => {
                    setFlexTimeDisplay(e.target.value);
                    const val = e.target.value;
                    if (val !== '') {
                      setSettings({ ...settings, flexMinutes: parseInt(val) || 0 });
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setFlexTimeDisplay('0');
                      setSettings({ ...settings, flexMinutes: 0 });
                    } else {
                      setFlexTimeDisplay(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      e.stopPropagation();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Number of {getSportConfig(sport).venueTermPlural}</label>
                <input
                  type="number"
                  value={numberOfCourtsDisplay}
                  onChange={(e) => {
                    setNumberOfCourtsDisplay(e.target.value);
                    const val = e.target.value;
                    if (val !== '') {
                      const num = parseInt(val) || 1;
                      const sportConfig = getSportConfig(sport);
                    const newCourtNames = Array.from({ length: num }, (_, i) =>
                        settings.courtNames[i] || `${sportConfig.venueTerm} ${i + 1}`
                    );
                    setSettings({ ...settings, numberOfCourts: num, courtNames: newCourtNames });
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setNumberOfCourtsDisplay('1');
                      const sportConfig = getSportConfig(sport);
                      const newCourtNames = Array.from({ length: 1 }, (_, i) =>
                        settings.courtNames[i] || `${sportConfig.venueTerm} ${i + 1}`
                      );
                      setSettings({ ...settings, numberOfCourts: 1, courtNames: newCourtNames });
                    } else {
                      setNumberOfCourtsDisplay(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      e.stopPropagation();
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  max="20"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{getSportConfig(sport).venueTermPlural} Names</label>
              <div className="space-y-2">
                {Array.from({ length: settings.numberOfCourts }).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    value={settings.courtNames[i] || `Court ${i + 1}`}
                    onChange={(e) => {
                      const newNames = [...settings.courtNames];
                      newNames[i] = e.target.value;
                      setSettings({ ...settings, courtNames: newNames });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' || e.key === 'Delete') {
                        e.stopPropagation();
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder={`${getSportConfig(sport).venueTerm} ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            
            {teams.length >= 2 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Estimated Tournament Duration</h3>
                {(() => {
                  const duration = calculateTournamentDuration(teams.length, settings, includeLosersBracket);
                  return (
                    <div className="space-y-1 text-blue-800">
                      <div><strong>Estimated Length:</strong> {duration.formatted}</div>
                      <div className="text-sm text-blue-700">
                        Based on {settings.numberOfCourts} {getSportConfig(sport).venueTermPlural.toLowerCase()}, {duration.gamesCount} game(s), 
                        and {duration.roundsCount} round(s). Includes warmup ({settings.warmupMinutes} min), 
                        game time ({settings.gameLengthMinutes} min), and flex time ({settings.flexMinutes} min) per game.
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            
            {teams.length < 2 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Add at least 2 teams to see tournament duration estimate.
                </p>
              </div>
            )}
            
          </div>
        );
        
      case 5: // Review
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Review & Generate</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Tournament Name</h3>
                <p>{tournamentName}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">Format</h3>
                <p>{includeLosersBracket ? 'Double Elimination' : 'Single Elimination'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">Teams ({teams.length})</h3>
                <ul className="list-disc list-inside">
                  {teams.map(team => (
                    <li key={team.id}>{team.name} {team.seed && `(Seed ${team.seed})`}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold">Referees ({refs.length})</h3>
                {refs.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {refs.map(ref => <li key={ref.id}>{ref.name}</li>)}
                  </ul>
                ) : (
                  <p className="text-gray-500">None</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold">Settings</h3>
                <ul className="list-disc list-inside">
                  <li>Game Length: {settings.gameLengthMinutes} minutes</li>
                  <li>Warmup: {settings.warmupMinutes} minutes</li>
                  <li>Flex: {settings.flexMinutes} minutes</li>
                  <li>Courts: {settings.numberOfCourts}</li>
                </ul>
              </div>
            </div>
            
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-sport-light p-8">
      <StepWizard steps={STEPS} currentStep={currentStep}>
        {renderStep()}
        
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => {
              if (currentStep < STEPS.length - 1) {
                setCurrentStep(currentStep + 1);
              } else {
                handleGenerate();
              }
            }}
            className="btn-primary"
          >
            {currentStep === STEPS.length - 1 ? 'Generate Tournament' : 'Next'}
          </button>
        </div>
      </StepWizard>
    </div>
  );
}

