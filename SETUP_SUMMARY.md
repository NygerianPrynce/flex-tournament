# Setup Summary: Database Integration & Viewer Mode

## What's Been Created

### 1. Database Schema (`supabase/migrations/001_initial_schema.sql`)
- Complete SQL migration with all tables (tournaments, teams, refs, courts, games)
- Row Level Security (RLS) policies for user access
- Public read access via share_code for viewer mode
- Indexes for performance
- Auto-update triggers for timestamps

### 2. Supabase Configuration (`src/lib/supabase.ts`)
- Client setup for browser operations
- Admin client setup (for server-side if needed)
- Uses environment variables for configuration

### 3. Database Service Layer (`src/lib/database.ts`)
- Complete CRUD operations for all entities
- Tournament management functions
- Share code generation
- Bracket reconstruction from flat game array

### 4. Authentication Pages
- `src/pages/Login.tsx` - Login/signup page
- `src/pages/TournamentList.tsx` - Tournament list page (protected)

### 5. Viewer Mode
- `src/pages/ViewerMode.tsx` - Public read-only tournament view
- Supports viewing via share code

### 6. Deployment Configuration
- `render.yaml` - Render deployment config
- `.env.example` - Environment variable template

## What Still Needs to Be Done

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 2. Set Up Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Get your project URL and anon key from Settings > API
4. Run the migration from `supabase/migrations/001_initial_schema.sql` in SQL Editor

### 3. Configure Environment Variables
Create `.env.local`:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SECRET_KEY=sb_secret_mLjPZGiasarRS5f_CCM7wg_MvIINkUT
```

### 4. Update App.tsx
Add new routes:
- `/login` - Login page
- `/tournaments` - Tournament list
- `/view/:code` - Viewer mode

### 5. Update Tournament Store
- Replace Zustand persist with Supabase operations
- Load tournament from database on mount
- Save changes to database in real-time
- Support viewer mode (read-only)

### 6. Update All Tournament Pages
Each page needs to:
- Accept `tournament` prop (for viewer mode)
- Accept `viewerMode` prop (boolean)
- Hide edit/delete buttons when `viewerMode === true`
- Filter available games in Courts tab when viewer mode

### 7. Update Setup Page
- Save tournament to database after creation
- Redirect to tournament list or tournament page

### 8. Add Share Code Display
- Show share code in Settings or Info page
- Allow copying share code

## Key Implementation Notes

### Viewer Mode Requirements
- **Results**: Full read-only access
- **Full Bracket View**: Read-only
- **Teams**: Show names only, no edit/delete
- **Courts**: 
  - Only show queued games (no available games section)
  - Hide all buttons (Start, Edit, Remove, Pause, etc.)
  - Read-only court cards

### Database Structure
- All tournament data is normalized across multiple tables
- Games are stored flat and reconstructed into bracket structure
- Share codes are unique and allow public read access via RLS policies

### Authentication Flow
1. User signs up/logs in
2. Redirected to tournament list
3. Can create new tournament or select existing
4. All operations require authentication (except viewer mode)

## Next Steps

1. **Complete the migration**: Update store and pages to use Supabase
2. **Test authentication**: Ensure login/signup works
3. **Test viewer mode**: Verify read-only access works correctly
4. **Deploy to Render**: Use the provided render.yaml configuration

## Important Files to Update

- `src/App.tsx` - Add new routes
- `src/store/tournamentStore.ts` - Migrate to Supabase
- `src/pages/Setup.tsx` - Save to database
- `src/pages/TournamentBracket.tsx` - Add viewer mode support
- `src/pages/TournamentCourts.tsx` - Add viewer mode support
- `src/pages/TournamentTeams.tsx` - Add viewer mode support
- `src/pages/TournamentResults.tsx` - Add viewer mode support
- `src/pages/TournamentInfo.tsx` - Add viewer mode support & share code display

