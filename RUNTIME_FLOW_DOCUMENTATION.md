# Tournament Bracket Runtime Flow Documentation

## Overview
This document describes the runtime flow for BYE game resolution and losers bracket finalization. This is critical for ensuring consistent behavior across different team counts (5, 6, 7, 9 teams, etc.).

## Key Functions

### 1. `finalizeLosersRound(bracket: Bracket, losersRoundIndex: number): void`
**Location:** `src/lib/bracket.ts:775-794`

**Purpose:** Fills OPEN slots in a losers bracket round with BYEs when one side has a team and the other is OPEN.

**Current Status:** ⚠️ **DEFINED BUT NEVER CALLED** - This function exists but is not used anywhere in the codebase.

**When it SHOULD be called:**
- After all games from a winners bracket round are complete
- When a losers bracket round has games with OPEN slots that need to be filled with BYEs
- Specifically: When a team advances from a previous losers round but has no opponent yet (OPEN slot)

**Logic:**
```typescript
// If one side has a team and the other is OPEN, fill OPEN with BYE
if (hasTeamA && hasOpenB) {
  game.teamB = { type: 'BYE' };
} else if (hasTeamB && hasOpenA) {
  game.teamA = { type: 'BYE' };
}
```

---

### 2. BYE Game Auto-Resolution

#### A. BYE vs BYE Games (First Round Only)
**Location:** `src/pages/TournamentBracket.tsx:38-86`

**When:** Automatically resolved via `useEffect` hook that runs when bracket changes

**Trigger Conditions:**
- Game is in Round 1 (first round of winners bracket)
- `game.bracketType === 'W'` (winners bracket)
- `game.teamA.type === 'BYE' && game.teamB.type === 'BYE'`
- `game.status !== 'Finished'` (not already completed)

**Flow:**
1. Call `advanceByeInBracket(game, tournament.bracket)` - advances a BYE to next round
2. Update bracket in store via `updateTournament({ bracket: tournament.bracket })`
3. Mark game as finished with special result:
   ```typescript
   {
     status: 'Finished',
     result: {
       winnerId: 'BYE', // Special marker
       scoreA: 0,
       scoreB: 0,
       finishedAt: Date.now(),
       teamAName: 'BYE',
       teamBName: 'BYE',
     }
   }
   ```
4. Redistribute BYEs in next round: `autoAssignTeamsToBracket(nextRoundIndex)`

**Note:** This only handles BYE vs BYE in the **first round**. BYE vs BYE should not occur in later rounds (prevented by redistribution logic).

---

#### B. Team vs BYE Games
**Location:** `src/components/CourtCard.tsx:73-101` and `src/pages/TournamentCourts.tsx:405-442`

**When:** User clicks "Start" button on a game OR clicks "Start All Games"

**Trigger Conditions:**
- Game has `game.teamA.type === 'BYE' || game.teamB.type === 'BYE'`
- Game is NOT BYE vs BYE (at least one team is real)
- Game status is 'Queued'

**Flow:**
1. Identify winner (the non-BYE team):
   ```typescript
   const winnerId = game.teamA.type === 'BYE' 
     ? (game.teamB.type === 'Team' ? game.teamB.teamId! : '')
     : (game.teamA.type === 'Team' ? game.teamA.teamId! : '');
   ```
2. Set score to 1-0 (non-BYE team gets 1, BYE gets 0):
   ```typescript
   const scoreA = game.teamA.type === 'BYE' ? 0 : 1;
   const scoreB = game.teamB.type === 'BYE' ? 0 : 1;
   ```
3. Call `finishGame(game.id, winnerId, scoreA, scoreB)` - this advances the winner and handles bracket progression

**Note:** Team vs BYE games are **automatically finished** when started - they don't go through warmup/live/flex phases.

---

### 3. `finishGame` Function Flow
**Location:** `src/store/tournamentStore.ts:705-867`

**When:** Called when any game finishes (Team vs Team, Team vs BYE, or manually finished)

**Flow:**
1. Get team names (preserve for results even if teams deleted later)
2. **Advance bracket:**
   - If BYE vs BYE: Skip (BYE already advanced via `advanceByeInBracket`)
   - Otherwise: Call `advanceTeamInBracket(game, winnerId, tournament.bracket)`
3. Update game status to 'Finished' with result
4. Unassign from court
5. Handle Grand Final Reset logic (if applicable)
6. Handle 2-team double elimination special case (if applicable)

---

### 4. `advanceTeamInBracket` Function Flow
**Location:** `src/lib/bracket.ts:851-987`

**Purpose:** Advances winner to next round and places loser in losers bracket (for double elimination)

**Flow for Winners Bracket Games:**
1. Advance winner to next winners round (or Grand Final if final round)
2. **If double elimination:** Place loser in losers bracket:
   - **Round 1 losers:** Go to Losers R1 (first losers round)
   - **Final round losers:** Go to last losers bracket round (Losers Final)
   - **Other rounds:** Find appropriate drop-in round (first round with OPEN teamB slot)

**Flow for Losers Bracket Games:**
1. Advance winner to next losers round (or Grand Final if last round)
2. Find first available OPEN slot in next round

**Key Issue:** When multiple teams lose from same winners round, they should be placed sequentially:
- First loser → first OPEN teamB in drop-in round
- Second loser → first OPEN teamB in consolidation round (if exists)

---

## Expected Runtime Flow for Different Team Counts

### 5 Teams (Double Elimination)
**Bracket Size:** 8 slots (3 BYEs needed)

**Winners Bracket Round 1:**
- Games: 3 Team vs BYE, 1 Team vs Team
- **BYE Resolution:**
  - Team vs BYE games: Auto-finish when started (score 1-0, team wins)
  - No BYE vs BYE games (prevented by redistribution)
- **Losers:**
  - 1 real loser from Team vs Team game (e.g., t1 from t2 vs t1)
  - Goes to Losers R1 (gets bye, only 1 loser)

**Winners Bracket Semi Final:**
- Games: 2 Team vs Team (no BYEs)
- **Losers:**
  - 2 real losers (e.g., t1 from t4 vs t1, t2 from t5 vs t2)
  - **Placement:**
    - First loser (t1) → Losers R2 drop-in round (t3 vs t1)
    - Second loser (t2) → Losers R3 consolidation round (Winner(t3 vs t1) vs t2)

**Winners Bracket Final:**
- Games: 1 Team vs Team
- **Losers:**
  - 1 real loser (e.g., t4 from t5 vs t4)
  - Goes to Losers Final (Winner(LB R3) vs t4)

**When `finalizeLosersRound` should be called:**
- After Round 1 completes: Check Losers R1 - if any games have OPEN slots, fill with BYEs
- After Semi Final completes: Check Losers R2 and R3 - fill OPEN slots with BYEs
- After Final completes: Check Losers Final - fill OPEN slots with BYEs

**Current Problem:** `finalizeLosersRound` is never called, so OPEN slots in losers bracket may remain unfilled.

---

### 6 Teams (Double Elimination)
**Bracket Size:** 8 slots (2 BYEs needed)

**Winners Bracket Round 1:**
- Games: 2 Team vs BYE, 2 Team vs Team
- **BYE Resolution:** Same as 5 teams
- **Losers:** 2 real losers from Team vs Team games

**Winners Bracket Semi Final:**
- Games: 2 Team vs Team
- **Losers:** 2 real losers

**Flow similar to 5 teams but with 2 losers in Round 1 instead of 1.**

---

### 7 Teams (Double Elimination)
**Bracket Size:** 8 slots (1 BYE needed)

**Winners Bracket Round 1:**
- Games: 1 Team vs BYE, 3 Team vs Team
- **Losers:** 3 real losers from Team vs Team games

**Flow similar but with more consolidation rounds needed.**

---

### 9 Teams (Double Elimination)
**Bracket Size:** 16 slots (7 BYEs needed)

**Winners Bracket Round 1:**
- Games: 7 Team vs BYE, 1 Team vs Team
- **Losers:** 1 real loser from Team vs Team game

**More complex losers bracket structure with multiple consolidation rounds.**

---

## Critical Issues to Fix

### Issue 1: `finalizeLosersRound` Never Called
**Problem:** OPEN slots in losers bracket rounds are never filled with BYEs automatically.

**Solution:** Call `finalizeLosersRound` after:
- All games in a winners bracket round complete
- Before advancing to next round
- Specifically: After `finishGame` completes for the last game in a winners round

**Proposed Integration Point:**
```typescript
// In finishGame, after advancing bracket:
if (game.bracketType === 'W' && tournament.settings.includeLosersBracket) {
  // Check if this was the last game in the winners round
  const winnersRound = tournament.bracket.winners[game.round - 1];
  const allGamesFinished = winnersRound.every(g => g.status === 'Finished');
  
  if (allGamesFinished) {
    // Finalize corresponding losers bracket rounds
    // Determine which losers rounds correspond to this winners round
    // Call finalizeLosersRound for those rounds
  }
}
```

---

### Issue 2: Team vs BYE Auto-Resolution Consistency
**Current:** Team vs BYE games auto-finish when started (via `handleStart` or `handleStartAll`)

**Status:** ✅ **WORKING CORRECTLY** - Both individual start and "Start All Games" now use same logic.

---

### Issue 3: Losers Bracket Placement Logic
**Problem:** When multiple teams lose from same winners round, they may not be placed in correct sequential order.

**Current Logic:** `advanceTeamInBracket` finds first OPEN teamB slot, which may place teams in wrong rounds.

**Solution:** Ensure sequential placement:
1. First loser → first OPEN teamB in drop-in round
2. Second loser → first OPEN teamB in consolidation round (created for unmatched new losers)

**Status:** ⚠️ **PARTIALLY FIXED** - Logic updated but may need refinement.

---

## Recommended Fix Strategy

### Step 1: Integrate `finalizeLosersRound`
Call `finalizeLosersRound` at appropriate times:
- After winners bracket round completes
- Before teams advance to next round
- When losers bracket round has OPEN slots that need BYEs

### Step 2: Ensure Sequential Loser Placement
When multiple losers from same winners round:
- Track which round is drop-in vs consolidation
- Place losers sequentially: first in drop-in, second in consolidation

### Step 3: Test All Team Counts
Verify behavior for:
- 5 teams (1, 2, 1 losers pattern)
- 6 teams (2, 2, 1 losers pattern)
- 7 teams (3, 2, 1 losers pattern)
- 9 teams (1, 4, 2, 1 losers pattern)

---

## File Locations Summary

- **BYE vs BYE auto-resolution:** `src/pages/TournamentBracket.tsx:38-86`
- **Team vs BYE auto-resolution:** `src/components/CourtCard.tsx:73-101`, `src/pages/TournamentCourts.tsx:405-442`
- **finishGame:** `src/store/tournamentStore.ts:705-867`
- **advanceTeamInBracket:** `src/lib/bracket.ts:851-987`
- **finalizeLosersRound:** `src/lib/bracket.ts:775-794` (defined but unused)
- **advanceByeInBracket:** `src/lib/bracket.ts:799-845`
- **generateLosersBracketStructure:** `src/lib/bracket.ts:329-636`

---

## Key Data Structures

### Game Status Flow
```
Queued → Warmup → Live → Flex → Finished
         (Team vs BYE skips to Finished)
```

### Slot Types
- `Team`: Real team assigned
- `BYE`: Automatic win for opponent
- `OPEN`: Not yet assigned (should be filled with BYE if team has no opponent)

### Bracket Types
- `W`: Winners bracket
- `L`: Losers bracket
- `Final`: Grand Final or Grand Final Reset

