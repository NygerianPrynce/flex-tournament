# Database Setup & Implementation Plan

## Database Schema (Supabase)

### Tables

1. **tournaments**
   - `id` (uuid, primary key)
   - `user_id` (uuid, foreign key to auth.users)
   - `name` (text)
   - `settings` (jsonb) - stores TournamentSettings
   - `seeding_mode` (text)
   - `seeding_type` (text, nullable)
   - `share_code` (text, unique) - for viewer access
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

2. **teams**
   - `id` (uuid, primary key)
   - `tournament_id` (uuid, foreign key to tournaments)
   - `name` (text)
   - `seed` (integer, nullable)
   - `created_at` (timestamp)

3. **refs**
   - `id` (uuid, primary key)
   - `tournament_id` (uuid, foreign key to tournaments)
   - `name` (text)
   - `is_paused` (boolean, default false)
   - `created_at` (timestamp)

4. **courts**
   - `id` (uuid, primary key)
   - `tournament_id` (uuid, foreign key to tournaments)
   - `name` (text)
   - `created_at` (timestamp)

5. **games**
   - `id` (uuid, primary key)
   - `tournament_id` (uuid, foreign key to tournaments)
   - `bracket_type` (text) - 'W', 'L', or 'Final'
   - `round` (integer)
   - `match_number` (integer)
   - `team_a` (jsonb) - GameSlot
   - `team_b` (jsonb) - GameSlot
   - `status` (text)
   - `court_id` (uuid, nullable, foreign key to courts)
   - `ref_id` (uuid, nullable, foreign key to refs)
   - `result` (jsonb, nullable) - GameResult
   - `timers` (jsonb) - TimerState
   - `scheduled_order` (integer)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

## Row Level Security (RLS) Policies

- **tournaments**: Users can only read/write their own tournaments
- **teams, refs, courts, games**: Users can only read/write data for their tournaments
- **Viewer access**: Public read access via share_code (special policy)

## Implementation Steps

1. Install Supabase client
2. Set up Supabase configuration
3. Create database schema (SQL migrations)
4. Set up authentication (login/signup)
5. Migrate tournament store to use Supabase
6. Add share code generation
7. Create viewer mode routes
8. Update all pages for viewer mode
9. Set up Render deployment

