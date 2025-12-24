# Flex Tournament

A production-quality web application for running basketball tournaments with bracket management, court scheduling, live timers, and referee assignment.

## Features

- **Tournament Formats**: Single elimination and double elimination (winners + losers bracket)
- **Team Management**: Upload teams via CSV/XLSX or manual entry
- **Seeding Options**: No seeding, random seeding, manual seeding, or upload with seeds
- **Court Management**: Multiple courts with live timers (warmup, game, flex time)
- **Bracket Generation**: Automatic bracket generation with BYE/OPEN slot handling
- **Referee Assignment**: Auto-assign or manually assign referees to games
- **Live Timers**: Real-time countdown timers for warmup, game, and flex periods
- **Results Entry**: Enter game results and automatically advance teams through brackets
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Styling**: TailwindCSS (sporty orange + green theme)
- **Routing**: React Router v7
- **State Management**: Zustand with localStorage persistence
- **Drag & Drop**: @dnd-kit/core
- **File Parsing**: papaparse (CSV), xlsx (Excel)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Usage

### Creating a Tournament

1. Click "Create New Tournament" on the landing page
2. Follow the setup wizard:
   - **Format**: Choose single or double elimination, set empty slot policy (BYE vs OPEN)
   - **Teams**: Upload CSV/XLSX or add teams manually, configure seeding
   - **Referees**: Optionally upload or add referees
   - **Settings**: Configure game length, warmup time, flex time, number of courts
   - **Review**: Review settings and generate tournament

### Managing Games

- **Courts View**: See all courts with assigned games, timers, and controls
- **Bracket View**: View the complete bracket, click games for details
- **Auto-Assign**: Automatically assign queued games to available courts
- **Manual Assignment**: Drag and drop games to courts (coming soon)
- **Start All Games**: Start all queued games simultaneously
- **Enter Results**: Click on a game to enter scores and winner

### File Upload Formats

**Teams CSV/XLSX**:
- Headers: `team`, `team_name`, `name`, or single column
- Optional: `seed`, `rank`, `seeding` column for seeding

**Referees CSV/XLSX**:
- Headers: `ref`, `ref_name`, `name`, or single column

## Project Structure

```
src/
  app/          # App-level components
  pages/        # Page components
  components/   # Reusable UI components
  store/        # Zustand state management
  lib/          # Utility functions (bracket generation, timers, file parsing)
  types/        # TypeScript type definitions
  styles/       # Global styles
```

## Key Components

- **SidebarNav**: Navigation sidebar for tournament dashboard
- **CourtCard**: Displays court status, game info, and timer controls
- **StepWizard**: Multi-step wizard for tournament setup
- **UploadDropzone**: File upload component for CSV/XLSX
- **GameResultModal**: Modal for entering game results
- **BracketView**: Visual bracket display

## Tournament Logic

- **Bracket Size**: Automatically calculates next power of 2
- **BYE vs OPEN**: Choose how to handle empty slots
- **Seeding**: Standard tournament seeding algorithm (1 vs last, 2 vs second-last, etc.)
- **Double Elimination**: Winners bracket + losers bracket + grand final
- **Bracket Advancement**: Automatically advances winners to next round

## Development

The app uses TypeScript strict mode. All types are properly defined in `src/types/index.ts`.

State is persisted to localStorage automatically using Zustand's persist middleware.

## License

MIT
