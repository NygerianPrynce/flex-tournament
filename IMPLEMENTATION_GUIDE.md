# Implementation Guide: Database Integration & Viewer Mode

## Prerequisites

1. **Install Supabase client**:
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Set up Supabase project**:
   - Go to https://supabase.com and create a new project
   - Get your project URL and anon key from Settings > API
   - Your secret key is: `sb_secret_mLjPZGiasarRS5f_CCM7wg_MvIINkUT`

## Step 1: Database Setup

1. **Run the migration**:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Run the migration

2. **Configure environment variables**:
   Create a `.env.local` file in the root directory:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SECRET_KEY=sb_secret_mLjPZGiasarRS5f_CCM7wg_MvIINkUT
   ```

## Step 2: Update App Routing

The app now needs to support:
- `/login` - Authentication page
- `/tournaments` - Tournament list (protected)
- `/tournament/*` - Tournament management (protected)
- `/view/:code` - Viewer mode (public, read-only)

## Step 3: Update Tournament Store

The store needs to be updated to:
1. Load tournaments from Supabase instead of localStorage
2. Save all changes to Supabase in real-time
3. Support viewer mode (read-only)

## Step 4: Viewer Mode Implementation

Viewer mode allows users to view tournaments using a share code:
- Read-only access to:
  - Results page
  - Full bracket view
  - Teams (names only)
  - Courts (queued games only, no buttons, no available games section)

## Step 5: Render Deployment

1. **Build configuration**:
   - Render will run `npm run build`
   - Static files will be served

2. **Environment variables**:
   - Add all environment variables in Render dashboard
   - Use the same values as `.env.local`

3. **Deploy**:
   - Connect your GitHub repo to Render
   - Set build command: `npm run build`
   - Set publish directory: `dist`

## Next Steps

1. Update `App.tsx` to include new routes
2. Create viewer mode components
3. Update all tournament pages to support viewer mode
4. Migrate tournament store to use Supabase
5. Test authentication flow
6. Test viewer mode
7. Deploy to Render

