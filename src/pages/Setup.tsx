import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import {
  Layout,
  Typography,
  Button,
  Input,
  Select,
  Radio,
  Card,
  Space,
  Steps,
  Alert,
  Modal,
  message,
  Row,
  Col,
  InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

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
  const [seedingMode, setSeedingMode] = useState<SeedingMode>('random');
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [settings, setSettings] = useState<TournamentSettings>({
    sport: 'basketball',
    gameLengthMinutes: 20,
    warmupMinutes: 5,
    flexMinutes: 5,
    numberOfCourts: 2,
    courtNames: ['Court 1', 'Court 2'],
    includeLosersBracket: false,
    openSlotPolicy: 'BYE',
    refereesPerGame: 0,
    scoringRequired: true,
  });
  // Local state for number inputs to allow empty strings while typing
  const [gameLengthDisplay, setGameLengthDisplay] = useState<string>('20');
  const [warmupTimeDisplay, setWarmupTimeDisplay] = useState<string>('5');
  const [flexTimeDisplay, setFlexTimeDisplay] = useState<string>('5');
  const [numberOfCourtsDisplay, setNumberOfCourtsDisplay] = useState<string>('2');
  const [refereesPerGameDisplay, setRefereesPerGameDisplay] = useState<string>('0');
  
  // Automatically set refereesPerGame to 1 when first referee is added
  useEffect(() => {
    if (refs.length > 0 && (settings.refereesPerGame ?? 0) === 0) {
      setSettings(prev => ({ ...prev, refereesPerGame: 1 }));
      setRefereesPerGameDisplay('1');
    }
  }, [refs.length, settings.refereesPerGame]);
  
  // Sync display values with settings when they change externally
  useEffect(() => {
    setGameLengthDisplay(settings.gameLengthMinutes.toString());
    setWarmupTimeDisplay(settings.warmupMinutes.toString());
    setFlexTimeDisplay(settings.flexMinutes.toString());
    setNumberOfCourtsDisplay(settings.numberOfCourts.toString());
    setRefereesPerGameDisplay((settings.refereesPerGame ?? 0).toString());
  }, [settings.gameLengthMinutes, settings.warmupMinutes, settings.flexMinutes, settings.numberOfCourts, settings.refereesPerGame]);
  
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
  
  const validateTournament = (): string[] => {
    const errors: string[] = [];
    
    if (!tournamentName.trim()) {
      errors.push('Tournament name is required');
    }
    
    if (teams.length < 3) {
      errors.push(`At least 3 teams are required (currently have ${teams.length})`);
    }
    
    const refereesPerGame = settings.refereesPerGame ?? 0;
    if (refereesPerGame > 0 && refs.length < refereesPerGame) {
      errors.push(`At least ${refereesPerGame} referee${refereesPerGame > 1 ? 's are' : ' is'} required (one per game requirement). Currently have ${refs.length}.`);
    }
    
    return errors;
  };

  const handleGenerate = async () => {
    // Validate all requirements
    const errors = validateTournament();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationModal(true);
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
  
  // Validation function to check if current step requirements are met
  const canProceedFromStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Format - always can proceed (just name and format selection)
        return tournamentName.trim().length > 0;
      case 1: // Teams - need at least 3 teams
        return teams.length >= 3;
      case 2: // Seeding - can always proceed (optional)
        return true;
      case 3: // Refs - need at least as many refs as required per game (if refs are required)
        const refereesPerGame = settings.refereesPerGame ?? 0;
        if (refereesPerGame > 0) {
          return refs.length >= refereesPerGame;
        }
        return true; // If 0 refs per game, any number of refs is fine
      case 4: // Settings - can always proceed
        return true;
      case 5: // Review - can always proceed (will validate before generate)
        return true;
      default:
        return true;
    }
  };

  // Check if we can navigate to a step (can go to completed steps or current step)
  const canNavigateToStep = (stepIndex: number): boolean => {
    // Can always go back to previous steps
    if (stepIndex < currentStep) {
      return true;
    }
    // Can go to current step
    if (stepIndex === currentStep) {
      return true;
    }
    // Can only go forward if all previous steps are valid
    if (stepIndex > currentStep) {
      // Check if we can proceed from current step
      return canProceedFromStep(currentStep);
    }
    return false;
  };

  const handleStepClick = (stepIndex: number) => {
    if (canNavigateToStep(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Format
        return (
          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              Tournament Format
            </Title>
            
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Tournament Name
                </Text>
                <Input
                  size="large"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="Enter tournament name"
                  style={{
                    borderRadius: '12px',
                    fontSize: '15px',
                  }}
                />
              </div>
              
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Sport
                </Text>
                <Select
                  size="large"
                  value={sport}
                  onChange={(newSport) => {
                    setSport(newSport as Sport);
                    updateCourtNamesForSport(newSport as Sport);
                  }}
                  style={{ width: '100%', borderRadius: '12px' }}
                  options={Object.entries(SPORT_CONFIGS).map(([key, config]) => ({
                    label: config.name,
                    value: key,
                  }))}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '13px' }}>
                  This will set the terminology ({getSportConfig(sport).venueTermPlural.toLowerCase()}) and aesthetics for your tournament
                </Text>
              </div>
              
              <div>
                <Text strong style={{ display: 'block', marginBottom: '12px', fontSize: '14px' }}>
                  Tournament Format
                </Text>
                <Radio.Group
                  value={includeLosersBracket ? 'double' : 'single'}
                  onChange={(e) => setIncludeLosersBracket(e.target.value === 'double')}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" size={12}>
                    <Radio value="single" style={{ fontSize: '15px' }}>
                      Single Elimination
                    </Radio>
                    <Radio value="double" style={{ fontSize: '15px' }}>
                      Double Elimination (Losers Bracket)
                    </Radio>
                  </Space>
                </Radio.Group>
              </div>
              
              <div>
                <Text strong style={{ display: 'block', marginBottom: '12px', fontSize: '14px' }}>
                  Scoring
                </Text>
                <Space>
                  <input
                    type="checkbox"
                    checked={settings.scoringRequired !== false}
                    onChange={(e) => {
                      setSettings({ ...settings, scoringRequired: e.target.checked });
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <Text style={{ fontSize: '15px' }}>
                    Require scores for games
                  </Text>
                </Space>
              </div>
            </Space>
          </Space>
        );
        
      case 1: // Teams
        return (
          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              Teams
            </Title>
            {teams.length < 3 && (
              <Alert
                message={
                  <Text strong>
                    Requirement: You need at least 3 teams to create a tournament. 
                    Currently you have {teams.length} team{teams.length !== 1 ? 's' : ''}.
                  </Text>
                }
                type="warning"
                showIcon
                style={{ borderRadius: '12px' }}
              />
            )}
            
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div>
                <Title level={4} style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>
                  Upload Teams (CSV/XLSX)
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '13px' }}>
                  Only include the team names in the file. It should be arranged like a column (no need for a header). All cells will be read (the first one won't be skipped).
                </Text>
                <UploadDropzone onFileSelect={handleTeamFileUpload} />
              </div>
              
              <div>
                <Title level={4} style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>
                  Or Paste Teams
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '13px' }}>
                  Paste multiple team names separated by enters or commas (e.g., from Excel)
                </Text>
                <Input.TextArea
                  value={bulkTeamInput}
                  onChange={(e) => setBulkTeamInput(e.target.value)}
                  placeholder="Team 1&#10;Team 2&#10;Team 3&#10;or&#10;Team 1, Team 2, Team 3"
                  style={{
                    borderRadius: '12px',
                    minHeight: '120px',
                    fontSize: '15px',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <Button
                    type="primary"
                    onClick={handleBulkTeamInput}
                    disabled={!bulkTeamInput.trim()}
                    size="large"
                    style={{
                      borderRadius: '12px',
                      height: '44px',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      border: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Add Teams
                  </Button>
                </div>
              </div>
            
              <div>
                <EditableList
                  items={teams}
                  renderItem={(team) => (
                    <div>
                      <Text strong>{team.name}</Text>
                      {team.seed && <Text type="secondary" style={{ marginLeft: '8px' }}>(Seed {team.seed})</Text>}
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
              </div>
            </Space>
            
            {/* Add Team Modal */}
            <Modal
              title={<Title level={3} style={{ margin: 0, fontWeight: 700 }}>Add Team</Title>}
              open={showAddTeam}
              onCancel={() => {
                setShowAddTeam(false);
                setNewTeamName('');
              }}
              footer={[
                <Button
                  key="cancel"
                  onClick={() => {
                    setShowAddTeam(false);
                    setNewTeamName('');
                  }}
                >
                  Cancel
                </Button>,
                <Button
                  key="add"
                  type="primary"
                  onClick={() => {
                    if (newTeamName.trim()) {
                      const trimmedName = newTeamName.trim();
                      const nameLower = trimmedName.toLowerCase();
                      
                      // Check for duplicate names (case-insensitive)
                      const existingNames = teams.map(t => t.name.toLowerCase());
                      if (existingNames.includes(nameLower)) {
                        message.error(`A team with the name "${trimmedName}" already exists. Please use a different name.`);
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
                  disabled={!newTeamName.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                  }}
                >
                  Add Team
                </Button>,
              ]}
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                    Team Name *
                  </Text>
                  <Input
                    size="large"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onPressEnter={() => {
                      if (newTeamName.trim()) {
                        const trimmedName = newTeamName.trim();
                        const nameLower = trimmedName.toLowerCase();
                        
                        // Check for duplicate names (case-insensitive)
                        const existingNames = teams.map(t => t.name.toLowerCase());
                        if (existingNames.includes(nameLower)) {
                          message.error(`A team with the name "${trimmedName}" already exists. Please use a different name.`);
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
                    }}
                    placeholder="Enter team name"
                    autoFocus
                    style={{ borderRadius: '12px' }}
                  />
                </div>
              </Space>
            </Modal>
          </Space>
        );
        
      case 2: // Seeding
        return (
          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              Seeding (Optional)
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              You can skip this step to use random seeding, or configure how teams are seeded in the bracket.
            </Text>
            
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Seeding Mode
                </Text>
                <Select
                  size="large"
                  value={seedingMode}
                  onChange={(mode) => {
                    setSeedingMode(mode as SeedingMode);
                    if (mode === 'random') {
                      // Apply random seeding immediately
                      const shuffled = [...teams].sort(() => Math.random() - 0.5);
                      setTeams(shuffled.map((team, index) => ({ ...team, seed: index + 1 })));
                    } else if (mode === 'manual') {
                      // For manual, keep existing seeds or assign sequential seeds
                      if (teams.some(t => t.seed)) {
                        // Already has seeds, keep them
                      } else {
                        // No seeds yet, assign sequential
                        setTeams(teams.map((team, index) => ({ ...team, seed: index + 1 })));
                      }
                    }
                  }}
                  style={{ width: '100%', borderRadius: '12px' }}
                  options={[
                    { label: 'Random Seeding', value: 'random' },
                    { label: 'Manual Seeding', value: 'manual' },
                  ]}
                />
              </div>
              
              {(seedingMode === 'manual' || seedingMode === 'random') && (
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                    Seeding Type
                  </Text>
                  <Select
                    size="large"
                    value={seedingType}
                    onChange={(type) => setSeedingType(type as SeedingType)}
                    style={{ width: '100%', borderRadius: '12px' }}
                    options={[
                      { label: 'Standard Seeding (1 vs last, 2 vs second-last)', value: 'standard' },
                      { label: 'Snake Seeding', value: 'snake' },
                      { label: 'BYE Seeding', value: 'bye' },
                    ]}
                  />
                </div>
              )}
              
              {seedingMode === 'manual' && (
                <div>
                  <Title level={4} style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
                    Drag and drop teams to reorder, or set seed numbers
                  </Title>
                  <SeedingTeamList teams={teams} setTeams={setTeams} sensors={sensors} />
                </div>
              )}
              
              {seedingMode === 'random' && teams.length > 0 && (
                <Alert
                  message="Teams have been randomly seeded. You can see the seed numbers above if you switch to Manual Seeding."
                  type="info"
                  showIcon
                  style={{ borderRadius: '12px' }}
                />
              )}
            </Space>
          </Space>
        );
        
      case 3: // Refs
        const refereesPerGame = settings.refereesPerGame ?? 0;
        const hasEnoughRefs = refereesPerGame === 0 || refs.length >= refereesPerGame;
        
        return (
          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              Referees (Optional)
            </Title>
            {refereesPerGame > 0 && !hasEnoughRefs && (
              <Alert
                message={
                  <Text strong>
                    Requirement: You need at least {refereesPerGame} referee{refereesPerGame > 1 ? 's' : ''} 
                    (one per game requirement). Currently you have {refs.length} referee{refs.length !== 1 ? 's' : ''}.
                  </Text>
                }
                type="warning"
                showIcon
                style={{ borderRadius: '12px' }}
              />
            )}
            
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <div>
                <Title level={4} style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>
                  Upload Referees (CSV/XLSX)
                </Title>
                <UploadDropzone onFileSelect={handleRefFileUpload} />
              </div>
              
              <div>
                <Title level={4} style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>
                  Or Paste Referees
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '13px' }}>
                  Paste multiple referee names separated by enters or commas (e.g., from Excel)
                </Text>
                <Input.TextArea
                  value={bulkRefInput}
                  onChange={(e) => setBulkRefInput(e.target.value)}
                  placeholder="Referee 1&#10;Referee 2&#10;Referee 3&#10;or&#10;Referee 1, Referee 2, Referee 3"
                  style={{
                    borderRadius: '12px',
                    minHeight: '120px',
                    fontSize: '15px',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <Button
                    type="primary"
                    onClick={handleBulkRefInput}
                    disabled={!bulkRefInput.trim()}
                    size="large"
                    style={{
                      borderRadius: '12px',
                      height: '44px',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      border: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Add Referees
                  </Button>
                </div>
              </div>
              
              <div>
                <EditableList
                  items={refs}
                  renderItem={(ref) => <Text strong>{ref.name}</Text>}
                  onAdd={() => {}}
                  onRemove={(index) => {
                    setRefs(refs.filter((_, i) => i !== index));
                  }}
                  addLabel=""
                  emptyMessage="No referees added yet (optional)"
                />
              </div>
            </Space>
          </Space>
        );
        
      case 4: // Settings
        return (
          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              Settings
            </Title>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Game Length (minutes)
                </Text>
                <InputNumber
                  size="large"
                  value={gameLengthDisplay ? parseInt(gameLengthDisplay) : undefined}
                  onChange={(val) => {
                    const str = val?.toString() || '';
                    setGameLengthDisplay(str);
                    if (str !== '') {
                      setSettings({ ...settings, gameLengthMinutes: parseInt(str) || 20 });
                    }
                  }}
                  onBlur={() => {
                    if (gameLengthDisplay === '') {
                      setGameLengthDisplay('20');
                      setSettings({ ...settings, gameLengthMinutes: 20 });
                    }
                  }}
                  min={1}
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              </Col>
              
              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Warmup Time (minutes)
                </Text>
                <InputNumber
                  size="large"
                  value={warmupTimeDisplay ? parseInt(warmupTimeDisplay) : undefined}
                  onChange={(val) => {
                    const str = val?.toString() || '';
                    setWarmupTimeDisplay(str);
                    if (str !== '') {
                      setSettings({ ...settings, warmupMinutes: parseInt(str) || 0 });
                    }
                  }}
                  onBlur={() => {
                    if (warmupTimeDisplay === '') {
                      setWarmupTimeDisplay('0');
                      setSettings({ ...settings, warmupMinutes: 0 });
                    }
                  }}
                  min={0}
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              </Col>
              
              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Flex Time (minutes)
                </Text>
                <InputNumber
                  size="large"
                  value={flexTimeDisplay ? parseInt(flexTimeDisplay) : undefined}
                  onChange={(val) => {
                    const str = val?.toString() || '';
                    setFlexTimeDisplay(str);
                    if (str !== '') {
                      setSettings({ ...settings, flexMinutes: parseInt(str) || 0 });
                    }
                  }}
                  onBlur={() => {
                    if (flexTimeDisplay === '') {
                      setFlexTimeDisplay('0');
                      setSettings({ ...settings, flexMinutes: 0 });
                    }
                  }}
                  min={0}
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              </Col>
              
              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Number of {getSportConfig(sport).venueTermPlural}
                </Text>
                <InputNumber
                  size="large"
                  value={numberOfCourtsDisplay ? parseInt(numberOfCourtsDisplay) : undefined}
                  onChange={(val) => {
                    const str = val?.toString() || '';
                    setNumberOfCourtsDisplay(str);
                    if (str !== '') {
                      const num = parseInt(str) || 1;
                      const sportConfig = getSportConfig(sport);
                      const newCourtNames = Array.from({ length: num }, (_, i) =>
                        settings.courtNames[i] || `${sportConfig.venueTerm} ${i + 1}`
                      );
                      setSettings({ ...settings, numberOfCourts: num, courtNames: newCourtNames });
                    }
                  }}
                  onBlur={() => {
                    if (numberOfCourtsDisplay === '') {
                      setNumberOfCourtsDisplay('1');
                      const sportConfig = getSportConfig(sport);
                      const newCourtNames = Array.from({ length: 1 }, (_, i) =>
                        settings.courtNames[i] || `${sportConfig.venueTerm} ${i + 1}`
                      );
                      setSettings({ ...settings, numberOfCourts: 1, courtNames: newCourtNames });
                    }
                  }}
                  min={1}
                  max={20}
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              </Col>
              
              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Referees per Game
                </Text>
                <InputNumber
                  size="large"
                  value={refereesPerGameDisplay ? parseInt(refereesPerGameDisplay) : undefined}
                  onChange={(val) => {
                    const str = val?.toString() || '';
                    setRefereesPerGameDisplay(str);
                    if (str !== '') {
                      setSettings({ ...settings, refereesPerGame: parseInt(str) || 0 });
                    }
                  }}
                  onBlur={() => {
                    if (refereesPerGameDisplay === '') {
                      setRefereesPerGameDisplay('0');
                      setSettings({ ...settings, refereesPerGame: 0 });
                    }
                  }}
                  min={0}
                  max={10}
                  style={{ width: '100%', borderRadius: '12px' }}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '13px' }}>
                  Number of referees required per game (0 to disable)
                </Text>
              </Col>
            </Row>
            
            <div>
              <Text strong style={{ display: 'block', marginBottom: '12px', fontSize: '14px' }}>
                {getSportConfig(sport).venueTermPlural} Names
              </Text>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {Array.from({ length: settings.numberOfCourts }).map((_, i) => (
                  <Input
                    key={i}
                    size="large"
                    value={settings.courtNames[i] || `Court ${i + 1}`}
                    onChange={(e) => {
                      const newNames = [...settings.courtNames];
                      newNames[i] = e.target.value;
                      setSettings({ ...settings, courtNames: newNames });
                    }}
                    placeholder={`${getSportConfig(sport).venueTerm} ${i + 1}`}
                    style={{ borderRadius: '12px' }}
                  />
                ))}
              </Space>
            </div>
            
            {teams.length >= 3 && (
              <Alert
                message={
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: '16px' }}>Estimated Tournament Duration</Text>
                    {(() => {
                      const duration = calculateTournamentDuration(teams.length, settings, includeLosersBracket);
                      return (
                        <>
                          <Text>
                            <Text strong>Estimated Length:</Text> {duration.formatted}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '13px' }}>
                            Based on {settings.numberOfCourts} {getSportConfig(sport).venueTermPlural.toLowerCase()}, {duration.gamesCount} game(s), 
                            and {duration.roundsCount} round(s). Includes warmup ({settings.warmupMinutes} min), 
                            game time ({settings.gameLengthMinutes} min), and flex time ({settings.flexMinutes} min) per game.
                          </Text>
                        </>
                      );
                    })()}
                  </Space>
                }
                type="info"
                showIcon
                style={{ borderRadius: '12px', marginTop: '8px' }}
              />
            )}
            
            {teams.length < 3 && (
              <Alert
                message="Add at least 3 teams to see tournament duration estimate."
                type="warning"
                showIcon
                style={{ borderRadius: '12px', marginTop: '8px' }}
              />
            )}
          </Space>
        );
        
      case 5: // Review
        return (
          <Space direction="vertical" size={32} style={{ width: '100%' }}>
            <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              Review & Generate
            </Title>
            
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <Card style={{ borderRadius: '12px' }}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                      Tournament Name
                    </Text>
                    <Text>{tournamentName}</Text>
                  </div>
                  
                  <div>
                    <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                      Format
                    </Text>
                    <Text>{includeLosersBracket ? 'Double Elimination' : 'Single Elimination'}</Text>
                  </div>
                  
                  <div>
                    <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                      Teams ({teams.length})
                    </Text>
                    <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                      {teams.map(team => (
                        <li key={team.id} style={{ marginBottom: '4px' }}>
                          <Text>{team.name} {team.seed && <Text type="secondary">(Seed {team.seed})</Text>}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                      Referees ({refs.length})
                    </Text>
                    {refs.length > 0 ? (
                      <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                        {refs.map(ref => (
                          <li key={ref.id} style={{ marginBottom: '4px' }}>
                            <Text>{ref.name}</Text>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Text type="secondary">None</Text>
                    )}
                  </div>
                  
                  <div>
                    <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>
                      Settings
                    </Text>
                    <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                      <li style={{ marginBottom: '4px' }}>
                        <Text>Game Length: {settings.gameLengthMinutes} minutes</Text>
                      </li>
                      <li style={{ marginBottom: '4px' }}>
                        <Text>Warmup: {settings.warmupMinutes} minutes</Text>
                      </li>
                      <li style={{ marginBottom: '4px' }}>
                        <Text>Flex: {settings.flexMinutes} minutes</Text>
                      </li>
                      <li style={{ marginBottom: '4px' }}>
                        <Text>Courts: {settings.numberOfCourts}</Text>
                      </li>
                    </ul>
                  </div>
                </Space>
              </Card>
            </Space>
          </Space>
        );
        
      default:
        return null;
    }
  };
  
  const canProceed = canProceedFromStep(currentStep);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Poppins', sans-serif; }
      `}</style>

      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 48px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/tournaments" style={{ display: 'flex', alignItems: 'center' }}>
            <Space align="center" size={12}>
              <img 
                src="/favicon.png" 
                alt="Bracketooski Logo" 
                style={{ width: '40px', height: '40px', display: 'block' }}
              />
              <Title level={3} style={{ margin: 0, fontWeight: 700, fontSize: '24px', lineHeight: '1.2' }}>
                Bracketooski
              </Title>
            </Space>
          </Link>
        </div>
      </Header>

      <Content style={{ padding: '48px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Card
          style={{
            borderRadius: '24px',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
          bodyStyle={{ padding: '48px' }}
        >
          <Steps
            current={currentStep}
            onChange={(step) => {
              if (canNavigateToStep(step)) {
                handleStepClick(step);
              }
            }}
            style={{ marginBottom: '48px' }}
            items={STEPS.map((step, index) => ({
              title: step.label,
              status: index < currentStep ? 'finish' : index === currentStep ? 'process' : 'wait',
            }))}
          />

          <div style={{ minHeight: '400px' }}>
            {renderStep()}
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '48px', 
            paddingTop: '24px', 
            borderTop: '1px solid #e5e7eb' 
          }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              size="large"
              style={{
                borderRadius: '12px',
                height: '48px',
                paddingLeft: '24px',
                paddingRight: '24px',
              }}
            >
              Previous
            </Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => {
                if (currentStep < STEPS.length - 1) {
                  if (canProceed) {
                    setCurrentStep(currentStep + 1);
                  }
                } else {
                  handleGenerate();
                }
              }}
              disabled={!canProceed && currentStep < STEPS.length - 1}
              size="large"
              style={{
                borderRadius: '12px',
                height: '48px',
                paddingLeft: '24px',
                paddingRight: '24px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                fontSize: '16px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              }}
            >
              {currentStep === STEPS.length - 1 ? 'Generate Tournament' : 'Next'}
            </Button>
          </div>
        </Card>
      </Content>

      {/* Validation Error Modal */}
      <Modal
        title={<span style={{ color: '#ef4444', fontWeight: 700 }}>Missing Requirements</span>}
        open={showValidationModal}
        onCancel={() => setShowValidationModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowValidationModal(false)}>
            Close
          </Button>,
          <Button
            key="fix"
            type="primary"
            onClick={() => {
              setShowValidationModal(false);
              // Navigate to the first step with an error
              if (!tournamentName.trim()) {
                setCurrentStep(0);
              } else if (teams.length < 3) {
                setCurrentStep(1);
              } else {
                const refereesPerGame = settings.refereesPerGame ?? 0;
                if (refereesPerGame > 0 && refs.length < refereesPerGame) {
                  setCurrentStep(3); // Refs step
                }
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              border: 'none',
            }}
          >
            Go to Fix
          </Button>,
        ]}
      >
        <Text style={{ display: 'block', marginBottom: '16px' }}>
          Please fix the following issues before generating your tournament:
        </Text>
        <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
          {validationErrors.map((error, index) => (
            <li key={index} style={{ marginBottom: '8px' }}>
              <Text style={{ fontSize: '14px' }}>{error}</Text>
            </li>
          ))}
        </ul>
      </Modal>
    </Layout>
  );
}

