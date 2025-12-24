# G-Loot React Tournament Brackets - Implementation Guide

## Installation

```bash
npm install @g-loot/react-tournament-brackets
# or
yarn add @g-loot/react-tournament-brackets
```

## Quick Start

### 1. Import the Component

```typescript
import { GLootTournamentBracket } from './components/GLootTournamentBracket';
```

### 2. Use in Your App

```typescript
function TournamentPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Tournament Bracket</h1>
      <GLootTournamentBracket tournament={tournament} />
    </div>
  );
}
```

## What You Get

✅ **Professional bracket visualization** - Battle-tested library used in production
✅ **Automatic connection lines** - Perfect bracket tree structure
✅ **SVG-based rendering** - Crisp at any zoom level
✅ **Panning and zooming** - Built-in SVGViewer for large brackets
✅ **Customizable theme** - Colors match your brand
✅ **Responsive** - Works on all screen sizes

## Features

- ✅ Winner highlighting (green background)
- ✅ Live game status ("LIVE NOW" indicator)
- ✅ Score display
- ✅ BYE and TBD team handling
- ✅ Round headers (Round 1, Semi Finals, Grand Final)
- ✅ Professional bracket connectors
- ✅ Zoom and pan for large tournaments
- ✅ Custom theming with your colors

## Customization

### Change Theme Colors

Edit the `CustomTheme` in the component:

```typescript
const CustomTheme = createTheme({
  textColor: {
    main: '#your-color',           // Regular text
    highlighted: '#your-color',     // Winner text
    dark: '#your-color',           // Dark text
  },
  matchBackground: {
    wonColor: '#your-color',       // Winner background
    lostColor: '#your-color',      // Loser background
  },
  score: {
    background: {
      wonColor: '#your-color',     // Winner score bg
      lostColor: '#your-color',    // Loser score bg
    },
    text: {
      highlightedWonColor: '#fff', // Winner score text
      highlightedLostColor: '#fff',// Loser score text
    },
  },
  border: {
    color: '#your-color',          // Regular border
    highlightedColor: '#your-color', // Winner border
  },
  roundHeader: {
    backgroundColor: '#your-color', // Round header bg
    fontColor: '#fff',             // Round header text
  },
  connectorColor: '#your-color',   // Connection lines
  connectorColorHighlight: '#your-color', // Highlighted lines
});
```

### Adjust SVG Viewer Size

```typescript
<SVGViewer
  width={1000}  // Change width
  height={800}  // Change height
  background="transparent"
  {...props}
>
  {children}
</SVGViewer>
```

### Make SVG Viewer Responsive

```typescript
import { useState, useEffect } from 'react';

const useWindowSize = () => {
  const [size, setSize] = useState({ width: 800, height: 600 });
  
  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth - 100,
        height: window.innerHeight - 200,
      });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return size;
};

// In your component:
const { width, height } = useWindowSize();

<SVGViewer
  width={width}
  height={height}
  {...props}
>
  {children}
</SVGViewer>
```

## Data Structure

The component automatically transforms your existing data structure:

### Your Format (Input):
```typescript
{
  bracket: {
    winners: [
      [
        {
          id: "sf1",
          teamA: { type: "Team", teamId: "t1" },
          teamB: { type: "Team", teamId: "t2" },
          status: "Finished",
          result: { winnerId: "t1", scoreA: 3, scoreB: 1 }
        }
      ]
    ],
    grandFinal: { /* ... */ }
  },
  teams: [{ id: "t1", name: "Alpha Squad" }]
}
```

### G-Loot Format (Auto-transformed):
```typescript
[
  {
    id: 0,
    name: "Game 1",
    nextMatchId: 2,
    tournamentRoundText: "Round 1",
    state: "DONE",
    participants: [
      {
        id: "t1",
        name: "Alpha Squad",
        resultText: "3",
        isWinner: true,
        status: "PLAYED"
      },
      {
        id: "t2",
        name: "Beta Team",
        resultText: "1",
        isWinner: false,
        status: "PLAYED"
      }
    ]
  }
]
```

## Game States

The library supports these states:
- `SCHEDULED` - Not started yet (your "Queued")
- `RUNNING` - Currently playing (your "Live")
- `DONE` - Finished (your "Finished")

## Advanced Features

### Custom Match Component

If you want even more customization:

```typescript
import { Match } from '@g-loot/react-tournament-brackets';

const CustomMatch = (props) => {
  return (
    <div>
      {/* Your custom match rendering */}
      <Match {...props} />
    </div>
  );
};

<SingleEliminationBracket
  matches={matches}
  matchComponent={CustomMatch}
  theme={CustomTheme}
/>
```

### Without SVG Viewer

If you don't need pan/zoom:

```typescript
<SingleEliminationBracket
  matches={matches}
  matchComponent={Match}
  theme={CustomTheme}
/>
```

### Double Elimination

If you need double elimination brackets:

```typescript
import { DoubleEliminationBracket } from '@g-loot/react-tournament-brackets';

<DoubleEliminationBracket
  matches={{
    upper: upperBracketMatches,
    lower: lowerBracketMatches
  }}
  matchComponent={Match}
  theme={CustomTheme}
/>
```

## Example with Real Data

```typescript
const sampleTournament = {
  bracket: {
    winners: [
      // Semi Finals
      [
        {
          id: "sf1",
          teamA: { type: "Team" as const, teamId: "t1" },
          teamB: { type: "Team" as const, teamId: "t2" },
          status: "Finished" as const,
          result: {
            winnerId: "t1",
            scoreA: 3,
            scoreB: 1,
            teamAName: "Alpha Squad",
            teamBName: "Beta Team"
          }
        },
        {
          id: "sf2",
          teamA: { type: "Team" as const, teamId: "t3" },
          teamB: { type: "BYE" as const },
          status: "Finished" as const,
          result: {
            winnerId: "t3",
            scoreA: 1,
            scoreB: 0,
          }
        }
      ],
      // Final
      [
        {
          id: "final",
          teamA: { type: "Team" as const, teamId: "t1" },
          teamB: { type: "Team" as const, teamId: "t3" },
          status: "Live" as const,
        }
      ]
    ],
    grandFinal: {
      id: "gf",
      teamA: { type: "Team" as const, teamId: "t1" },
      teamB: { type: "OPEN" as const },
      status: "Queued" as const,
    }
  },
  teams: [
    { id: "t1", name: "Alpha Squad" },
    { id: "t2", name: "Beta Team" },
    { id: "t3", name: "Gamma Force" },
  ]
};

<GLootTournamentBracket tournament={sampleTournament} />
```

## Troubleshooting

### Issue: Matches not connecting properly

**Solution:** Make sure your game IDs are unique and the transformation logic is working correctly. Check the browser console for errors.

### Issue: Theme colors not applying

**Solution:** Make sure you're passing the `theme` prop to the bracket component.

### Issue: SVG not displaying

**Solution:** Check that the container has enough space. Try setting explicit width/height.

### Issue: TypeScript errors

**Solution:** The library may need type definitions:

```bash
npm install --save-dev @types/react-tournament-brackets
```

Or add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

## Benefits of Using G-Loot Library

✅ **No manual line calculations** - Library handles all bracket tree logic
✅ **SVG rendering** - Perfect quality at any zoom level
✅ **Built-in pan/zoom** - Great for large tournaments
✅ **Battle-tested** - Used in production apps
✅ **Active maintenance** - Regular updates and bug fixes
✅ **TypeScript support** - Full type safety
✅ **Customizable** - Full control over appearance
✅ **Performance** - Efficient rendering even with many games

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support (with touch pan/zoom)

## Next Steps

1. ✅ Install the package: `npm install @g-loot/react-tournament-brackets`
2. ✅ Copy the `GLootTournamentBracket.tsx` component
3. ✅ Import and use with your tournament data
4. ✅ Customize the theme colors
5. ✅ Test with different bracket sizes
6. ✅ Add responsive sizing if needed
7. ✅ Deploy!

## Additional Resources

- **NPM Package:** https://www.npmjs.com/package/@g-loot/react-tournament-brackets
- **GitHub Repo:** https://github.com/g-loot/react-tournament-brackets
- **Live Demo:** Check the GitHub repo for Storybook examples

## Why This Library?

Compared to building it yourself:
- **Saves 10-20 hours** of development time
- **No bracket math bugs** - All edge cases handled
- **Professional appearance** - Used by real tournament platforms
- **Easy maintenance** - Get updates and fixes automatically
- **Focus on features** - Spend time on your app, not bracket rendering

You now have a production-ready bracket visualization with perfect connection lines! 🎉
