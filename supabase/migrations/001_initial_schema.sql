-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings JSONB NOT NULL,
  seeding_mode TEXT NOT NULL DEFAULT 'off',
  seeding_type TEXT,
  share_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  seed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refs table
CREATE TABLE refs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_paused BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courts table
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  bracket_type TEXT NOT NULL CHECK (bracket_type IN ('W', 'L', 'Final')),
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  team_a JSONB NOT NULL,
  team_b JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Queued', 'Warmup', 'Live', 'Flex', 'Paused', 'Finished')),
  court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
  ref_id UUID REFERENCES refs(id) ON DELETE SET NULL,
  result JSONB,
  timers JSONB NOT NULL,
  scheduled_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tournaments_user_id ON tournaments(user_id);
CREATE INDEX idx_tournaments_share_code ON tournaments(share_code);
CREATE INDEX idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX idx_refs_tournament_id ON refs(tournament_id);
CREATE INDEX idx_courts_tournament_id ON courts(tournament_id);
CREATE INDEX idx_games_tournament_id ON games(tournament_id);
CREATE INDEX idx_games_court_id ON games(court_id);
CREATE INDEX idx_games_ref_id ON games(ref_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Tournaments policies
-- Users can read/write their own tournaments
CREATE POLICY "Users can view their own tournaments"
  ON tournaments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tournaments"
  ON tournaments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tournaments"
  ON tournaments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tournaments"
  ON tournaments FOR DELETE
  USING (auth.uid() = user_id);

-- Public read access via share_code (for viewer mode)
CREATE POLICY "Public can view tournaments by share code"
  ON tournaments FOR SELECT
  USING (share_code IS NOT NULL);

-- Teams policies
CREATE POLICY "Users can manage teams in their tournaments"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = teams.tournament_id
      AND tournaments.user_id = auth.uid()
    )
  );

-- Public read access for teams via share_code
CREATE POLICY "Public can view teams via share code"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = teams.tournament_id
      AND tournaments.share_code IS NOT NULL
    )
  );

-- Refs policies
CREATE POLICY "Users can manage refs in their tournaments"
  ON refs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = refs.tournament_id
      AND tournaments.user_id = auth.uid()
    )
  );

-- Public read access for refs via share_code
CREATE POLICY "Public can view refs via share code"
  ON refs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = refs.tournament_id
      AND tournaments.share_code IS NOT NULL
    )
  );

-- Courts policies
CREATE POLICY "Users can manage courts in their tournaments"
  ON courts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = courts.tournament_id
      AND tournaments.user_id = auth.uid()
    )
  );

-- Public read access for courts via share_code
CREATE POLICY "Public can view courts via share code"
  ON courts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = courts.tournament_id
      AND tournaments.share_code IS NOT NULL
    )
  );

-- Games policies
CREATE POLICY "Users can manage games in their tournaments"
  ON games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = games.tournament_id
      AND tournaments.user_id = auth.uid()
    )
  );

-- Public read access for games via share_code
CREATE POLICY "Public can view games via share_code"
  ON games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = games.tournament_id
      AND tournaments.share_code IS NOT NULL
    )
  );

