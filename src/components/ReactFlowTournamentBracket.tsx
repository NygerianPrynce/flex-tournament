import React, { useMemo, useState, useEffect, useRef } from 'react';
import ReactFlow, { Background, Controls, Handle, Position, MiniMap } from 'reactflow';
import type { Node, Edge, NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';

// Use existing app types
import type { Tournament, GameSlot, Game, Team } from '../types';
import { getLosersRoundName } from '../lib/roundNames';

// Custom node data type
interface GameNodeData {
  game: Game;
  teams: Team[];
  tournament?: Tournament;
  isGrandFinal?: boolean;
  bracketType?: 'winners' | 'losers';
}

interface RoundLabelData {
  text: string;
  variant?: 'header';
}

// Mobile Tutorial Overlay Component
const MobileTutorial: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  return (
    <div 
      className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <div 
        className="bg-white rounded-2xl p-6 max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">Navigate Your Bracket</h3>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Pinch to Zoom</p>
              <p className="text-gray-600 text-xs">Use two fingers to zoom in and out</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Drag to Pan</p>
              <p className="text-gray-600 text-xs">Swipe to move around the bracket</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Use Controls</p>
              <p className="text-gray-600 text-xs">Bottom-left buttons for zoom and fit</p>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

// Helper function to check if a game is active (started but not finished)
const isGameActive = (status: string): boolean => {
  return status === 'Warmup' || status === 'Live' || status === 'Flex' || status === 'Paused';
};

// Helper function to get team name

const getTeamName = (
  slot: GameSlot,
  game: Game,
  slotType: 'A' | 'B',
  teams: Team[],
  tournament?: Tournament
): string => {
  if (slot.type === 'BYE') return 'BYE';
  if (slot.type === 'OPEN') return 'TBD';

  // If this game is finished, show the result
  if (game.result) {
    const name = slotType === 'A' ? game.result.teamAName : game.result.teamBName;
    if (name) return name;
  }

  // For games in round > 1, only show team name if previous round game is finished
  if (game.round > 1 && tournament?.bracket && slot.type === 'Team' && slot.teamId) {
    const previousRound = tournament.bracket.winners[game.round - 2];
    if (previousRound) {
      const currentRound = tournament.bracket.winners[game.round - 1];
      const currentGameIndex = currentRound?.findIndex(g => g.id === game.id) ?? -1;
      if (currentGameIndex >= 0) {
        const prevGameIndex = slotType === 'A' ? currentGameIndex * 2 : currentGameIndex * 2 + 1;
        const prevGame = previousRound[prevGameIndex];
        
        if (prevGame && prevGame.status === 'Finished' && prevGame.result) {
          const team = teams.find(t => t.id === slot.teamId);
          if (team) return team.name;
        } else {
          return 'TBD';
        }
      }
    }
  }

  if (slot.teamId) {
    const team = teams.find(t => t.id === slot.teamId);
    if (team) return team.name;
  }

  return 'TBD';
};

// Improved Compact Game Card with better mobile sizing
const CompactGameCard: React.FC<NodeProps<GameNodeData>> = ({ data }) => {
  const { game, teams, isGrandFinal, tournament } = data;

  const teamAName = getTeamName(game.teamA, game, 'A', teams, tournament);
  const teamBName = getTeamName(game.teamB, game, 'B', teams, tournament);

  const winnerId = game.result?.winnerId;
  const teamAWon = winnerId && game.teamA.teamId === winnerId;
  const teamBWon = winnerId && game.teamB.teamId === winnerId;

  const isFinished = game.status === 'Finished';
  const isActive = game.status === 'Warmup' || game.status === 'Live' || game.status === 'Flex' || game.status === 'Paused';

  return (
    <div className="relative">
      {/* Connection Handles - hidden but still functional */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-transparent !border-0 !w-3 !h-3 !-left-1.5 !opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-transparent !border-0 !w-3 !h-3 !-right-1.5 !opacity-0"
      />

      {/* Active Game Indicator - larger and more visible */}
      {isActive && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="relative">
            <div className="bg-red-500 w-4 h-4 rounded-full animate-pulse" />
            <div className="absolute inset-0 bg-red-500 w-4 h-4 rounded-full animate-ping" />
          </div>
        </div>
      )}

      {/* Improved Game Card - better mobile sizing */}
      <div
        className={`
          w-44 bg-white rounded-lg border-2 shadow-md
          ${isActive ? 'border-green-500 shadow-green-200 ring-2 ring-green-200' : 'border-gray-300'}
          ${isGrandFinal ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-yellow-50 ring-2 ring-orange-200' : ''}
          transition-all duration-200
        `}
      >
        {/* Team A */}
        <div
          className={`
            px-3 py-2 border-b flex items-center justify-between
            ${teamAWon ? 'bg-green-50 border-green-300 font-bold' : 'border-gray-200'}
            rounded-t-lg
          `}
        >
          <span
            className={`
              text-sm truncate flex-1
              ${teamAWon ? 'text-green-900' : 'text-gray-800'}
              ${teamAName === 'BYE' || teamAName === 'TBD' ? 'italic text-gray-400 font-normal' : ''}
            `}
          >
            {teamAName}
          </span>
          {isFinished && game.result && tournament?.settings.scoringRequired !== false && (
            <span
              className={`
                ml-2 text-sm font-bold flex-shrink-0 min-w-[1.5rem] text-right
                ${teamAWon ? 'text-green-700' : 'text-gray-500'}
              `}
            >
              {game.result.scoreA}
            </span>
          )}
        </div>

        {/* Team B */}
        <div
          className={`
            px-3 py-2 flex items-center justify-between
            ${teamBWon ? 'bg-green-50 border-t border-green-300 font-bold' : ''}
            rounded-b-lg
          `}
        >
          <span
            className={`
              text-sm truncate flex-1
              ${teamBWon ? 'text-green-900' : 'text-gray-800'}
              ${teamBName === 'BYE' || teamBName === 'TBD' ? 'italic text-gray-400 font-normal' : ''}
            `}
          >
            {teamBName}
          </span>
          {isFinished && game.result && tournament?.settings.scoringRequired !== false && (
            <span
              className={`
                ml-2 text-sm font-bold flex-shrink-0 min-w-[1.5rem] text-right
                ${teamBWon ? 'text-green-700' : 'text-gray-500'}
              `}
            >
              {game.result.scoreB}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Node types
const nodeTypes = {
  gameCard: CompactGameCard,
  roundLabel: ({ data }: NodeProps<RoundLabelData>) => (
    <div
      className={`px-4 py-2 rounded-lg border-2 text-sm font-bold uppercase tracking-wide shadow-md ${
        data.variant === 'header'
          ? 'bg-gradient-to-r from-orange-400 to-orange-500 border-orange-600 text-white'
          : 'bg-white border-gray-300 text-gray-700'
      }`}
    >
      {data.text}
    </div>
  ),
};

// SIMPLIFIED LAYOUT ALGORITHM - Mobile First
const transformToMobileFirstLayout = (tournament: Tournament) => {
  const nodes: Node<GameNodeData | RoundLabelData>[] = [];
  const edges: Edge[] = [];

  if (!tournament.bracket) {
    return { nodes, edges, bounds: null };
  }

  const bracket = tournament.bracket;
  
  // Simplified spacing constants - optimized for mobile
  const ROUND_WIDTH = 260;      // Horizontal space between rounds
  const BASE_GAME_HEIGHT = 100; // Base vertical spacing
  const LABEL_OFFSET = 50;      // Space above round labels

  // WINNERS BRACKET
  const winnersRounds = bracket.winners;
  let winnersBottomY = 0; // Track the bottommost Y position of winners bracket
  
  winnersRounds.forEach((round, roundIndex) => {
    const gamesInRound = round.length;
    
    // Simple exponential spacing - doubles each round
    const gameSpacing = BASE_GAME_HEIGHT * Math.pow(2, roundIndex);
    
    // Center this round vertically
    const totalHeight = (gamesInRound - 1) * gameSpacing;
    const startY = -totalHeight / 2;

    // Round label
    const labelY = startY - LABEL_OFFSET;
    nodes.push({
      id: `winners-label-${roundIndex}`,
      type: 'roundLabel',
      position: { x: roundIndex * ROUND_WIDTH, y: labelY },
      draggable: false,
      selectable: false,
      data: {
        text:
          roundIndex === winnersRounds.length - 1
            ? 'Final'
            : roundIndex === winnersRounds.length - 2
              ? 'Semi Final'
              : `Round ${roundIndex + 1}`,
      },
    });

    round.forEach((game, gameIndex) => {
      const nodeId = `winners-${roundIndex}-${gameIndex}`;
      const x = roundIndex * ROUND_WIDTH;
      const y = startY + gameIndex * gameSpacing;

      nodes.push({
        id: nodeId,
        type: 'gameCard',
        position: { x, y },
        draggable: false,
        selectable: false,
        data: {
          game,
          teams: tournament.teams,
          tournament,
          bracketType: 'winners',
        },
      });

      // Track the bottommost position (node Y + card height)
      const CARD_HEIGHT = 80; // approximate card height
      const nodeBottomY = y + CARD_HEIGHT;
      if (nodeBottomY > winnersBottomY) {
        winnersBottomY = nodeBottomY;
      }

      // Connect to next round
      if (roundIndex < winnersRounds.length - 1) {
        const nextGameIndex = Math.floor(gameIndex / 2);
        const targetId = `winners-${roundIndex + 1}-${nextGameIndex}`;

        edges.push({
          id: `${nodeId}-${targetId}`,
          source: nodeId,
          target: targetId,
          type: 'smoothstep',
          animated: isGameActive(game.status),
          style: {
            stroke: isGameActive(game.status) ? '#10b981' : '#9ca3af',
            strokeWidth: 2.5,
            strokeDasharray: isGameActive(game.status) ? '8 4' : undefined,
          },
        });
      }

      // Connect to grand final
      if (bracket.grandFinal && roundIndex === winnersRounds.length - 1) {
        edges.push({
          id: `${nodeId}-grandFinal`,
          source: nodeId,
          target: 'grandFinal',
          type: 'smoothstep',
          animated: isGameActive(game.status),
          style: {
            stroke: isGameActive(game.status) ? '#10b981' : '#9ca3af',
            strokeWidth: 2.5,
            strokeDasharray: isGameActive(game.status) ? '8 4' : undefined,
          },
        });
      }
    });
  });

  // LOSERS BRACKET (if exists)
  if (bracket.losers && bracket.losers.length > 0) {
    const losersRounds = bracket.losers;
    
    // Calculate offset to align losers final with winners final
    const losersXOffset = Math.max(0, (winnersRounds.length - losersRounds.length) * ROUND_WIDTH);
    
    // Calculate the topmost Y position needed for losers bracket
    // Find the round with the most games to determine the maximum height needed
    let maxLosersRoundHeight = 0;
    losersRounds.forEach((round, roundIndex) => {
      const gamesInRound = round.length;
      const gameSpacing = BASE_GAME_HEIGHT * Math.pow(2, Math.floor(roundIndex / 2));
      const totalHeight = (gamesInRound - 1) * gameSpacing;
      if (totalHeight > maxLosersRoundHeight) {
        maxLosersRoundHeight = totalHeight;
      }
    });
    
    // Position losers bracket below winners with clear separation
    // Start losers bracket below the bottommost winners bracket node
    const BRACKET_SEPARATION = 200; // Minimum gap between brackets
    const losersTopY = winnersBottomY + BRACKET_SEPARATION;
    
    // Calculate the topmost Y position for the first round
    // Find the first round's height to position it correctly
    const firstRoundGames = losersRounds[0].length;
    const firstRoundSpacing = BASE_GAME_HEIGHT * Math.pow(2, Math.floor(0 / 2));
    const firstRoundHeight = (firstRoundGames - 1) * firstRoundSpacing;
    const firstRoundStartY = losersTopY; // Topmost node of first round starts here

    losersRounds.forEach((round, roundIndex) => {
      const gamesInRound = round.length;
      
      // Simplified spacing for losers bracket
      const gameSpacing = BASE_GAME_HEIGHT * Math.pow(2, Math.floor(roundIndex / 2));
      
      const totalHeight = (gamesInRound - 1) * gameSpacing;
      // Position first round starting at losersTopY, center other rounds relative to first round
      const startY = roundIndex === 0 
        ? firstRoundStartY
        : firstRoundStartY + firstRoundHeight / 2 - totalHeight / 2;

      // Round label
      nodes.push({
        id: `losers-label-${roundIndex}`,
        type: 'roundLabel',
        position: { x: losersXOffset + roundIndex * ROUND_WIDTH, y: startY - LABEL_OFFSET },
        draggable: false,
        selectable: false,
      data: {
        text: `LB - ${getLosersRoundName(roundIndex, losersRounds.length, gamesInRound)}`,
      },
      });

      round.forEach((game, gameIndex) => {
        const nodeId = `losers-${roundIndex}-${gameIndex}`;
        const x = losersXOffset + roundIndex * ROUND_WIDTH;
        const y = startY + gameIndex * gameSpacing;

        nodes.push({
          id: nodeId,
          type: 'gameCard',
          position: { x, y },
          draggable: false,
          selectable: false,
          data: {
            game,
            teams: tournament.teams,
            tournament,
            bracketType: 'losers',
          },
        });

        // Connect to next round in losers
        if (roundIndex < losersRounds.length - 1) {
          const nextGameIndex = roundIndex % 2 === 0 ? gameIndex : Math.floor(gameIndex / 2);
          const targetId = `losers-${roundIndex + 1}-${nextGameIndex}`;

          edges.push({
            id: `${nodeId}-${targetId}`,
            source: nodeId,
            target: targetId,
            type: 'smoothstep',
            animated: isGameActive(game.status),
            style: {
              stroke: isGameActive(game.status) ? '#10b981' : '#9ca3af',
              strokeWidth: 2.5,
              strokeDasharray: isGameActive(game.status) ? '8 4' : undefined,
            },
          });
        }

        // Connect final losers game to grand final
        if (bracket.grandFinal && roundIndex === losersRounds.length - 1) {
          edges.push({
            id: `${nodeId}-grandFinal`,
            source: nodeId,
            target: 'grandFinal',
            type: 'smoothstep',
            animated: isGameActive(game.status),
            style: {
              stroke: isGameActive(game.status) ? '#10b981' : '#9ca3af',
              strokeWidth: 2.5,
              strokeDasharray: isGameActive(game.status) ? '8 4' : undefined,
            },
          });
        }
      });
    });

    // Drop-down connections from winners to losers removed per user request
  }

  // GRAND FINAL
  if (bracket.grandFinal) {
    const finalX = (winnersRounds.length - 1) * ROUND_WIDTH + ROUND_WIDTH + 100;
    const finalY = bracket.losers ? 200 : 0; // Center between brackets

    nodes.push({
      id: 'grandFinal',
      type: 'gameCard',
      position: { x: finalX, y: finalY },
      draggable: false,
      selectable: false,
      data: {
        game: bracket.grandFinal,
        teams: tournament.teams,
        tournament,
        isGrandFinal: true,
      },
    });

    nodes.push({
      id: 'grandFinal-label',
      type: 'roundLabel',
      position: { x: finalX, y: finalY - LABEL_OFFSET },
      draggable: false,
      selectable: false,
      data: { 
        text: 'Grand Final',
        variant: 'header',
      },
    });
    
    // GRAND FINAL RESET - Show when reset game exists and has teams assigned
    if (bracket.grandFinalReset &&
        bracket.grandFinalReset.teamA.type !== 'OPEN' &&
        bracket.grandFinalReset.teamB.type !== 'OPEN') {
      const resetX = finalX + ROUND_WIDTH;
      const resetY = finalY;

      nodes.push({
        id: 'grandFinalReset',
        type: 'gameCard',
        position: { x: resetX, y: resetY },
        draggable: false,
        selectable: false,
        data: {
          game: bracket.grandFinalReset,
          teams: tournament.teams,
          tournament,
          isGrandFinal: true,
        },
      });

      nodes.push({
        id: 'grandFinalReset-label',
        type: 'roundLabel',
        position: { x: resetX, y: resetY - LABEL_OFFSET },
        draggable: false,
        selectable: false,
        data: { 
          text: 'Grand Final Reset',
          variant: 'header',
        },
      });
      
      // Connect grand final to reset
      edges.push({
        id: 'grandFinal-grandFinalReset',
        source: 'grandFinal',
        target: 'grandFinalReset',
        type: 'smoothstep',
        animated: isGameActive(bracket.grandFinalReset.status),
        style: {
          stroke: isGameActive(bracket.grandFinalReset.status) ? '#10b981' : '#9ca3af',
          strokeWidth: 2.5,
          strokeDasharray: isGameActive(bracket.grandFinalReset.status) ? '8 4' : undefined,
        },
      });
    }
  }

  // Calculate bounds to prevent infinite scrolling
  if (nodes.length > 0) {
    const CARD_WIDTH = 176; // w-44 in pixels
    const CARD_HEIGHT = 80; // approximate card height
    const PADDING = 100; // padding around the bracket
    
    const minX = Math.min(...nodes.map(n => n.position.x)) - PADDING;
    const maxX = Math.max(...nodes.map(n => n.position.x)) + CARD_WIDTH + PADDING;
    const minY = Math.min(...nodes.map(n => n.position.y)) - PADDING;
    const maxY = Math.max(...nodes.map(n => n.position.y)) + CARD_HEIGHT + PADDING;

    return { 
      nodes, 
      edges, 
      bounds: { minX, maxX, minY, maxY }
    };
  }

  return { nodes, edges, bounds: null };
};

// Main Component with Mobile Improvements
export const ReactFlowTournamentBracket: React.FC<{ tournament: Tournament }> = ({
  tournament,
}) => {
  const hasBracket = !!tournament.bracket;
  const [showTutorial, setShowTutorial] = useState(false);
  const hasSeenTutorial = useRef(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Check if mobile and show tutorial on first load
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const hasSeenBefore = localStorage.getItem('bracketTutorialSeen');
    
    if (isMobile && !hasSeenBefore && !hasSeenTutorial.current) {
      setTimeout(() => setShowTutorial(true), 500);
      hasSeenTutorial.current = true;
    }
  }, []);

  const handleDismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('bracketTutorialSeen', 'true');
  };

  const { nodes, edges, bounds } = useMemo(
    () => (hasBracket ? transformToMobileFirstLayout(tournament) : { nodes: [], edges: [], bounds: null }),
    [hasBracket, tournament]
  );

  if (!hasBracket) {
    return (
      <div className="p-8 text-center text-gray-500">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-lg font-semibold mb-2">No Bracket Yet</p>
        <p className="text-sm">Generate a bracket to view the tournament structure</p>
      </div>
    );
  }

  return (
    <div 
      ref={reactFlowWrapper}
      className="relative w-full h-[500px] sm:h-[600px] md:h-[700px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden border-2 border-gray-300 shadow-lg"
    >
      {showTutorial && <MobileTutorial onDismiss={handleDismissTutorial} />}

      {/* Help Button - always accessible */}
      <button
        onClick={() => setShowTutorial(true)}
        className="absolute top-4 right-4 z-40 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
        aria-label="Show tutorial"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.15,
          includeHiddenNodes: false,
          minZoom: 0.3,
          maxZoom: 1.5,
        }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={true}
        translateExtent={
          bounds
            ? [
                [bounds.minX, bounds.minY],
                [bounds.maxX, bounds.maxY],
              ]
            : undefined
        }
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background 
          color="#cbd5e1" 
          gap={20} 
          size={1} 
        />
        
        {/* Enhanced Controls with better mobile sizing */}
        <Controls
          className="!bg-white !border-gray-300 !shadow-xl !rounded-lg"
          showInteractive={false}
          showZoom={true}
          showFitView={true}
          position="bottom-left"
        />

        {/* MiniMap - hidden on mobile, shown on desktop */}
        <MiniMap
          className="!bg-white !border-2 !border-gray-300 !shadow-lg !rounded-lg hidden md:block"
          nodeColor={(node) => {
            if (node.type === 'roundLabel') return '#f3f4f6';
            const gameData = node.data as GameNodeData;
            if (gameData?.isGrandFinal) return '#fdba74';
            if (gameData?.game && isGameActive(gameData.game.status)) return '#86efac';
            return '#e5e7eb';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
};

export default ReactFlowTournamentBracket;
