# Visual Tournament Bracket Redesign Prompt

## Context
I have a React/TypeScript tournament bracket application using Tailwind CSS. The current visual bracket view has connection lines and game cards, but the layout and visual design need improvement to be more appealing and better fit on the page.

## Current Implementation

The visual bracket is rendered in a React component with the following structure:

- **Layout**: Horizontal flex layout with rounds displayed left-to-right
- **Rounds**: Each round is a column containing game cards
- **Game Cards**: Each game shows two teams (Team A vs Team B) with:
  - Team names
  - VS divider
  - Score display (if game is finished)
  - Color-coded borders/backgrounds based on game state (valid games = green, invalid = red/yellow/orange, completed = gray)
  - Winner highlighting (green background, bold text)
- **Connection Lines**: Gray lines connecting games to the next round:
  - Horizontal line extending right from each game
  - Vertical connector line connecting pairs of games
  - Horizontal line from vertical connector to next round
- **Spacing**: Fixed spacing (20px gap between games, 48px horizontal gap between rounds)
- **Grand Final**: Special styled card at the end with gradient background

## Current Issues

1. **Layout Problems**:
   - Connection lines don't always align properly
   - Spacing can be inconsistent across different bracket sizes
   - The bracket can overflow horizontally on smaller screens
   - Vertical alignment of games across rounds can be off

2. **Visual Design**:
   - Connection lines are basic gray lines (not visually appealing)
   - Game cards are simple rectangles (could be more modern)
   - No visual hierarchy or emphasis on important games
   - Colors and styling could be more polished

3. **Responsiveness**:
   - Horizontal scrolling on smaller screens
   - No mobile-friendly layout
   - Fixed widths don't adapt well

## Requirements

1. **Visual Appeal**:
   - Modern, clean design that looks professional
   - Smooth connection lines (possibly curved or styled)
   - Better visual hierarchy (final rounds should stand out more)
   - Consistent spacing and alignment
   - Professional color scheme that works with the existing sport-orange and sport-green theme colors

2. **Layout**:
   - Properly aligned connection lines between rounds
   - Games should visually connect in pairs to the next round
   - Rounds should be evenly spaced
   - The bracket should fit well on the page (consider vertical layout option for smaller screens)

3. **Game Card Design**:
   - Clean, readable team names
   - Clear indication of winners
   - Score display should be prominent when available
   - Status indicators (valid/invalid game states) should be clear but not overwhelming

4. **Technical Constraints**:
   - Must use React functional components
   - Must use Tailwind CSS for styling
   - Must work with existing TypeScript types
   - Must preserve existing functionality (game status checks, winner highlighting, etc.)
   - The bracket data structure: `tournament.bracket.winners` is an array of rounds, where each round is an array of `Game` objects

## Existing Code Structure

The component receives:
- `tournament.bracket.winners`: Array of rounds (each round is Game[])
- `tournament.bracket.grandFinal`: Optional final game
- `tournament.teams`: Array of teams for name lookup

Each Game has:
- `id`: string
- `teamA`, `teamB`: GameSlot (can be Team, BYE, or OPEN)
- `result`: Optional GameResult with winnerId, scoreA, scoreB, teamAName, teamBName
- `status`: 'Queued' | 'Warmup' | 'Live' | 'Flex' | 'Paused' | 'Finished'

Helper functions available:
- `getTeamName(slot, game, slotType)`: Returns team name, "BYE", "OPEN", or "TBD"
- `getRoundName(roundIndex, totalRounds, gamesInRound)`: Returns "Final", "Semi Finals", etc.
- `getGameStatus(game)`: Returns game validity status
- `shouldShowRound(roundIndex)`: Determines if round should be visible

## What I Need

Please provide:
1. **Improved React component code** for the `renderVisualBracket` function
2. **Better connection line rendering** that properly aligns and looks professional
3. **Modern game card design** that's visually appealing
4. **Responsive layout considerations** (at least desktop-first, with notes on mobile)
5. **Visual hierarchy** that emphasizes later rounds and the final
6. **Clean, maintainable code** that follows React best practices

The solution should be production-ready, well-commented, and maintain the existing functionality while significantly improving the visual design and layout.

