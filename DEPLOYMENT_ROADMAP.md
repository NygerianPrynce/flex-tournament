# Deployment Roadmap: Taking bracketooski Online

## Current Status ✅
- Database schema created and migrated
- Authentication working (login/signup)
- Tournament creation saves to database
- Basic tournament loading works

## Critical Steps Before Deployment

### 1. **Sync All Mutations to Database** (HIGH PRIORITY)
Currently, only tournament creation saves to the database. All other operations (updating games, teams, refs, etc.) only update local state. We need to:

- [ ] Update `updateGame` to save to database
- [ ] Update `addTeam`, `updateTeam`, `deleteTeam` to save to database
- [ ] Update `addRef`, `updateRef`, `deleteRef` to save to database
- [ ] Update `generateBracket` to save bracket to database
- [ ] Update `updateGameSlot` to save to database
- [ ] Update all bracket editing functions to save to database

**Impact**: Without this, changes won't persist between sessions or across devices.

### 2. **Add Share Code Display** (MEDIUM PRIORITY)
- [ ] Show share code in Tournament Info or Settings page
- [ ] Add "Copy Share Code" button
- [ ] Display share code URL for viewers

### 3. **Implement Viewer Mode** (MEDIUM PRIORITY)
- [ ] Update TournamentBracket to accept `viewerMode` prop
- [ ] Update TournamentCourts to hide buttons and filter available games
- [ ] Update TournamentTeams to be read-only
- [ ] Update TournamentResults to work in viewer mode
- [ ] Update TournamentInfo to work in viewer mode

### 4. **Database Sync Strategy**
We have two options:

**Option A: Real-time sync (Recommended)**
- Every mutation immediately saves to database
- Load tournament from database on mount
- Keep local state for immediate UI updates

**Option B: Batch sync**
- Save to database periodically or on navigation
- Risk of data loss if user closes browser

**Recommendation**: Option A - sync immediately for critical operations.

### 5. **Render Deployment Setup**

#### A. Prepare for Deployment
1. **Create `render.yaml`** (already done ✅)
2. **Update `vite.config.ts`** for production builds
3. **Add build script** if needed
4. **Test production build locally**: `npm run build && npm run preview`

#### B. Deploy to Render
1. **Connect GitHub repo** to Render
2. **Create new Web Service** in Render
3. **Configure build settings**:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. **Add Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SECRET_KEY` (if needed server-side)
5. **Deploy!**

#### C. Post-Deployment
- [ ] Test authentication flow
- [ ] Test tournament creation
- [ ] Test viewer mode with share code
- [ ] Verify all mutations save correctly

## Quick Wins (Can Do Now)

1. **Add share code display** - Quick UI addition
2. **Test production build** - Make sure it builds correctly
3. **Set up Render account** - Get ready for deployment

## Estimated Time
- Database sync: 2-3 hours
- Viewer mode: 1-2 hours  
- Share code display: 30 minutes
- Render deployment: 30 minutes
- Testing: 1 hour

**Total: ~5-7 hours of work**

## Recommended Order

1. **First**: Sync critical mutations (games, bracket) to database
2. **Second**: Add share code display
3. **Third**: Test production build
4. **Fourth**: Deploy to Render
5. **Fifth**: Implement viewer mode (can be done post-launch)

Would you like me to start with syncing mutations to the database? That's the most critical piece.

