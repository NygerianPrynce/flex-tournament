import { supabase } from './supabase';
import type { Tournament, Team, Ref, Court, Game, TournamentSettings, SeedingMode, SeedingType, Bracket } from '../types';

// Helper to generate share code
export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Tournament operations
export async function createTournament(
  userId: string,
  name: string,
  settings: TournamentSettings,
  teams: Team[],
  refs: Ref[],
  courts: Court[],
  seedingMode: SeedingMode,
  seedingType?: SeedingType
): Promise<string> {
  const shareCode = generateShareCode();
  
  // Create tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .insert({
      user_id: userId,
      name,
      settings,
      seeding_mode: seedingMode,
      seeding_type: seedingType || null,
      share_code: shareCode,
    })
    .select('id')
    .single();

  if (tournamentError || !tournament) {
    throw new Error(`Failed to create tournament: ${tournamentError?.message}`);
  }

  const tournamentId = tournament.id;

  // Create teams
  if (teams.length > 0) {
    const { error: teamsError } = await supabase
      .from('teams')
      .insert(
        teams.map(team => ({
          tournament_id: tournamentId,
          name: team.name,
          seed: team.seed || null,
        }))
      );

    if (teamsError) {
      throw new Error(`Failed to create teams: ${teamsError.message}`);
    }
  }

  // Create refs
  if (refs.length > 0) {
    const { error: refsError } = await supabase
      .from('refs')
      .insert(
        refs.map(ref => ({
          tournament_id: tournamentId,
          name: ref.name,
          is_paused: !(ref.available !== false), // Default to available (true) if undefined
        }))
      );

    if (refsError) {
      throw new Error(`Failed to create refs: ${refsError.message}`);
    }
  }

  // Create courts
  if (courts.length > 0) {
    const { error: courtsError } = await supabase
      .from('courts')
      .insert(
        courts.map(court => ({
          tournament_id: tournamentId,
          name: court.name,
        }))
      );

    if (courtsError) {
      throw new Error(`Failed to create courts: ${courtsError.message}`);
    }
  }

  return tournamentId;
}

export async function getTournament(tournamentId: string, _userId?: string): Promise<Tournament | null> {
  const query = supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  const { data, error } = await query;

  if (error || !data) {
    return null;
  }

  // Load related data
  const [teams, refs, courts, games] = await Promise.all([
    getTeams(tournamentId),
    getRefs(tournamentId),
    getCourts(tournamentId),
    getGames(tournamentId),
  ]);

  // Reconstruct bracket
  const bracket = games.length > 0 ? reconstructBracket(games) : null;

  return {
    id: data.id,
    name: data.name,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
    teams,
    refs,
    courts,
    bracket,
    settings: data.settings as TournamentSettings,
    seedingMode: data.seeding_mode as SeedingMode,
    seedingType: data.seeding_type as SeedingType | undefined,
    shareCode: data.share_code || undefined,
  };
}

export async function getTournamentByShareCode(shareCode: string): Promise<Tournament | null> {
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('id')
    .eq('share_code', shareCode)
    .single();

  if (error || !tournament) {
    return null;
  }

  return getTournament(tournament.id);
}

export async function updateTournament(
  tournamentId: string,
  updates: {
    name?: string;
    settings?: TournamentSettings;
    seedingMode?: SeedingMode;
    seedingType?: SeedingType;
  }
): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.settings !== undefined) updateData.settings = updates.settings;
  if (updates.seedingMode !== undefined) updateData.seeding_mode = updates.seedingMode;
  if (updates.seedingType !== undefined) updateData.seeding_type = updates.seedingType;

  const { error } = await supabase
    .from('tournaments')
    .update(updateData)
    .eq('id', tournamentId);

  if (error) {
    throw new Error(`Failed to update tournament: ${error.message}`);
  }
}

export async function deleteTournament(tournamentId: string, userId: string): Promise<void> {
  // Verify ownership first
  const { data: tournament, error: checkError } = await supabase
    .from('tournaments')
    .select('user_id')
    .eq('id', tournamentId)
    .single();

  if (checkError || !tournament) {
    throw new Error('Tournament not found');
  }

  if (tournament.user_id !== userId) {
    throw new Error('Unauthorized: You can only delete your own tournaments');
  }

  // Delete tournament (cascade will handle related records)
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId);

  if (error) {
    throw new Error(`Failed to delete tournament: ${error.message}`);
  }
}

export async function getUserTournaments(userId: string): Promise<Tournament[]> {
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tournaments: ${error.message}`);
  }

  const tournamentList = await Promise.all(
    (tournaments || []).map(t => getTournament(t.id, userId))
  );

  return tournamentList.filter((t): t is Tournament => t !== null);
}

// Teams operations
export async function getTeams(tournamentId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('seed', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch teams: ${error.message}`);
  }

  return (data || []).map(t => ({
    id: t.id,
    name: t.name,
    seed: t.seed || undefined,
  }));
}

export async function addTeam(tournamentId: string, team: Omit<Team, 'id'>): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      tournament_id: tournamentId,
      name: team.name,
      seed: team.seed || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to add team: ${error?.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    seed: data.seed || undefined,
  };
}

export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.seed !== undefined) updateData.seed = updates.seed || null;

  const { error } = await supabase
    .from('teams')
    .update(updateData)
    .eq('id', teamId);

  if (error) {
    throw new Error(`Failed to update team: ${error.message}`);
  }
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    throw new Error(`Failed to delete team: ${error.message}`);
  }
}

// Refs operations
export async function getRefs(tournamentId: string): Promise<Ref[]> {
  const { data, error } = await supabase
    .from('refs')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch refs: ${error.message}`);
  }

  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    available: !r.is_paused,
  }));
}

export async function addRef(tournamentId: string, ref: Omit<Ref, 'id'>): Promise<Ref> {
  const { data, error } = await supabase
    .from('refs')
    .insert({
      tournament_id: tournamentId,
      name: ref.name,
      is_paused: !(ref.available !== false), // Default to available (true) if undefined
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to add ref: ${error?.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    available: !data.is_paused,
  };
}

export async function updateRef(refId: string, updates: Partial<Ref>): Promise<void> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.available !== undefined) updateData.is_paused = !updates.available;

  const { error } = await supabase
    .from('refs')
    .update(updateData)
    .eq('id', refId);

  if (error) {
    throw new Error(`Failed to update ref: ${error.message}`);
  }
}

export async function deleteRef(refId: string): Promise<void> {
  const { error } = await supabase
    .from('refs')
    .delete()
    .eq('id', refId);

  if (error) {
    throw new Error(`Failed to delete ref: ${error.message}`);
  }
}

// Courts operations
export async function getCourts(tournamentId: string): Promise<Court[]> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch courts: ${error.message}`);
  }

  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
  }));
}

// Games operations
export async function getGames(tournamentId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch games: ${error.message}`);
  }

  return (data || []).map(g => ({
    id: g.id,
    bracketType: g.bracket_type as Game['bracketType'],
    round: g.round,
    matchNumber: g.match_number,
    teamA: g.team_a as Game['teamA'],
    teamB: g.team_b as Game['teamB'],
    courtId: g.court_id || undefined,
    scheduledOrder: g.scheduled_order,
    status: g.status as Game['status'],
    timers: g.timers as Game['timers'],
    refId: g.ref_id || undefined,
    result: g.result as Game['result'] | undefined,
  }));
}

export async function saveBracket(tournamentId: string, bracket: Bracket): Promise<void> {
  // Delete existing games FIRST to prevent duplicates from concurrent operations
  // Then insert all games in a single transaction
  const { error: deleteError } = await supabase
    .from('games')
    .delete()
    .eq('tournament_id', tournamentId);

  if (deleteError) {
    throw new Error(`Failed to clear existing games: ${deleteError.message}`);
  }

  // Prepare all games for insertion
  const gamesToInsert: any[] = [];

  // Winners bracket
  bracket.winners.forEach((round) => {
    round.forEach((game) => {
      gamesToInsert.push({
        tournament_id: tournamentId,
        bracket_type: game.bracketType,
        round: game.round,
        match_number: game.matchNumber,
        team_a: game.teamA,
        team_b: game.teamB,
        status: game.status,
        court_id: game.courtId || null,
        ref_id: game.refId || null,
        result: game.result || null,
        timers: game.timers,
        scheduled_order: game.scheduledOrder,
      });
    });
  });

  // Losers bracket
  bracket.losers.forEach((round) => {
    round.forEach((game) => {
      gamesToInsert.push({
        tournament_id: tournamentId,
        bracket_type: game.bracketType,
        round: game.round,
        match_number: game.matchNumber,
        team_a: game.teamA,
        team_b: game.teamB,
        status: game.status,
        court_id: game.courtId || null,
        ref_id: game.refId || null,
        result: game.result || null,
        timers: game.timers,
        scheduled_order: game.scheduledOrder,
      });
    });
  });

  // Grand final
  if (bracket.grandFinal) {
    const game = bracket.grandFinal;
    gamesToInsert.push({
      tournament_id: tournamentId,
      bracket_type: game.bracketType,
      round: game.round,
      match_number: game.matchNumber,
      team_a: game.teamA,
      team_b: game.teamB,
      status: game.status,
      court_id: game.courtId || null,
      ref_id: game.refId || null,
      result: game.result || null,
      timers: game.timers,
      scheduled_order: game.scheduledOrder,
    });
  }

  // Insert all games
  if (gamesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('games')
      .insert(gamesToInsert);

    if (insertError) {
      throw new Error(`Failed to save bracket: ${insertError.message}`);
    }
  }
}

export async function updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
  const updateData: any = {};
  if (updates.teamA !== undefined) updateData.team_a = updates.teamA;
  if (updates.teamB !== undefined) updateData.team_b = updates.teamB;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.courtId !== undefined) updateData.court_id = updates.courtId || null;
  if (updates.refId !== undefined) updateData.ref_id = updates.refId || null;
  if (updates.result !== undefined) updateData.result = updates.result || null;
  if (updates.timers !== undefined) updateData.timers = updates.timers;

  const { error } = await supabase
    .from('games')
    .update(updateData)
    .eq('id', gameId);

  if (error) {
    throw new Error(`Failed to update game: ${error.message}`);
  }
}

// Helper to reconstruct bracket from flat games array
function reconstructBracket(games: Game[]): Bracket {
  let grandFinal: Game | undefined;

  // Deduplicate games: keep only one game per round/matchNumber combination
  // Use a Map to track seen games, keeping the most recently updated one (by updated_at or id)
  const gameMap = new Map<string, Game>();
  
  games.forEach(game => {
    const key = `${game.bracketType}-${game.round}-${game.matchNumber}`;
    const existing = gameMap.get(key);
    
    // If we have a duplicate, prefer the one with more data (finished games, or later updated)
    // Also prefer games with results over those without
    if (!existing || 
        (game.status === 'Finished' && existing.status !== 'Finished') ||
        (game.result && !existing.result) ||
        (game.id && existing.id && game.id > existing.id)) { // Use id as tiebreaker (UUIDs are sortable)
      gameMap.set(key, game);
    }
  });
  
  // Convert back to array
  const deduplicatedGames = Array.from(gameMap.values());

  // Group games by bracket type and round
  const winnersByRound: Record<number, Game[]> = {};
  const losersByRound: Record<number, Game[]> = {};

  deduplicatedGames.forEach(game => {
    if (game.bracketType === 'Final') {
      grandFinal = game;
    } else if (game.bracketType === 'W') {
      if (!winnersByRound[game.round]) {
        winnersByRound[game.round] = [];
      }
      winnersByRound[game.round].push(game);
    } else if (game.bracketType === 'L') {
      if (!losersByRound[game.round]) {
        losersByRound[game.round] = [];
      }
      losersByRound[game.round].push(game);
    }
  });

  // Convert to arrays sorted by round
  const winnersRounds = Object.keys(winnersByRound)
    .map(Number)
    .sort((a, b) => a - b)
    .map(round => {
      const roundGames = winnersByRound[round];
      return roundGames.sort((a, b) => a.matchNumber - b.matchNumber);
    });

  const losersRounds = Object.keys(losersByRound)
    .map(Number)
    .sort((a, b) => a - b)
    .map(round => {
      const roundGames = losersByRound[round];
      return roundGames.sort((a, b) => a.matchNumber - b.matchNumber);
    });

  return {
    winners: winnersRounds,
    losers: losersRounds,
    grandFinal,
  };
}

