import React, { useMemo, useState, useEffect } from 'react';
import ReactFlow, { Background, Controls, Handle, Position } from 'reactflow';
import type { Node, Edge, NodeProps } from 'reactflow';
import 'reactflow/dist/style.css';

// Use existing app types
import type { Tournament, GameSlot, Game, Team } from '../types';

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

// Helper function to get team name, checking if previous round game is finished
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
    const previousRound = tournament.bracket.winners[game.round - 2]; // round 2 -> index 0 (round 1)
    if (previousRound) {
      // Find which game in previous round feeds into this slot
      // Game index in current round determines which two games from previous round feed into it
      const currentRound = tournament.bracket.winners[game.round - 1];
      const currentGameIndex = currentRound?.findIndex(g => g.id === game.id) ?? -1;
      if (currentGameIndex >= 0) {
        // Previous round games that feed into this game:
        // Slot A comes from game (currentGameIndex * 2) in previous round
        // Slot B comes from game (currentGameIndex * 2 + 1) in previous round
        const prevGameIndex = slotType === 'A' ? currentGameIndex * 2 : currentGameIndex * 2 + 1;
        const prevGame = previousRound[prevGameIndex];
        
        // Only show team name if previous game is finished
        if (prevGame && prevGame.status === 'Finished' && prevGame.result) {
          const team = teams.find(t => t.id === slot.teamId);
          if (team) return team.name;
        } else {
          // Previous game not finished, show TBD
          return 'TBD';
        }
      }
    }
  }

  // For round 1 or if we can't determine previous game status, show team name if available
  if (slot.teamId) {
    const team = teams.find(t => t.id === slot.teamId);
    if (team) return team.name;
  }

  return 'TBD';
};

// Compact Game Card Node (like the reference image)
const CompactGameCard: React.FC<NodeProps<GameNodeData>> = ({ data }) => {
  const { game, teams, isGrandFinal, tournament } = data;

  const teamAName = getTeamName(game.teamA, game, 'A', teams, tournament);
  const teamBName = getTeamName(game.teamB, game, 'B', teams, tournament);

  const winnerId = game.result?.winnerId;
  const teamAWon = winnerId && game.teamA.teamId === winnerId;
  const teamBWon = winnerId && game.teamB.teamId === winnerId;

  const isFinished = game.status === 'Finished';
  const isLive = game.status === 'Live';

  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !border-2 !border-white !w-2 !h-2 !-left-1"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !border-2 !border-white !w-2 !h-2 !-right-1"
      />

      {/* Live Indicator */}
      {isLive && (
        <div className="absolute -top-1 -right-1 z-10 bg-red-500 w-3 h-3 rounded-full animate-pulse" />
      )}

      {/* Compact Game Card */}
      <div
        className={`
          w-40 sm:w-44 md:w-48 bg-white rounded border-2 shadow-sm
          ${isLive ? 'border-green-500 shadow-green-200' : 'border-gray-300'}
          ${isGrandFinal ? 'border-orange-400 bg-orange-50' : ''}
        `}
      >
        {/* Team A */}
        <div
          className={`
            px-2 sm:px-3 py-1 sm:py-1.5 border-b flex items-center justify-between
            ${teamAWon ? 'bg-green-50 border-green-300 font-semibold' : 'border-gray-200'}
          `}
        >
          <span
            className={`
              text-xs truncate flex-1
              ${teamAWon ? 'text-green-900' : 'text-gray-700'}
              ${teamAName === 'BYE' || teamAName === 'TBD' ? 'italic text-gray-400' : ''}
            `}
          >
            {teamAName}
          </span>
          {isFinished && game.result && (
              <span
                className={`
                ml-1 sm:ml-2 text-xs font-bold flex-shrink-0
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
            px-2 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between
            ${teamBWon ? 'bg-green-50 border-t border-green-300 font-semibold' : ''}
          `}
        >
          <span
            className={`
              text-xs truncate flex-1
              ${teamBWon ? 'text-green-900' : 'text-gray-700'}
              ${teamBName === 'BYE' || teamBName === 'TBD' ? 'italic text-gray-400' : ''}
            `}
          >
            {teamBName}
          </span>
          {isFinished && game.result && (
              <span
                className={`
                ml-1 sm:ml-2 text-xs font-bold flex-shrink-0
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
      className={`px-3 py-1 rounded-md border text-xs font-semibold uppercase tracking-wide ${
        data.variant === 'header'
          ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm'
          : 'bg-white border-gray-200 text-gray-700 shadow-sm'
      }`}
    >
      {data.text}
    </div>
  ),
};

// Transform tournament data to fixed-position React Flow nodes
const transformToFixedLayout = (tournament: Tournament, viewportWidth?: number) => {
  const nodes: Node<GameNodeData | RoundLabelData>[] = [];
  const edges: Edge[] = [];

  if (!tournament.bracket) {
    return { nodes, edges, bounds: null };
  }

  const bracket = tournament.bracket;
  // Responsive round width: smaller on mobile landscape, larger on desktop
  // Mobile landscape typically 667-926px width, so scale accordingly
  const baseRoundWidth = viewportWidth && viewportWidth < 900 ? 180 : viewportWidth && viewportWidth < 1200 ? 220 : 280;
  const roundWidth = baseRoundWidth;
  const gameHeight = viewportWidth && viewportWidth < 900 ? 60 : 70; // Vertical spacing for games

  // WINNERS BRACKET (TOP)
  const winnersRounds = bracket.winners;
  const winnersStartY = 50;

  const losersRoundsCount = bracket.losers?.length || 0;
  // Offset losers so their final column aligns with winners final column
  const losersXOffset = Math.max(0, (winnersRounds.length - losersRoundsCount) * roundWidth);

  // Add main headers as nodes so they move with the bracket
  // Removed winners/lossers header badges per request

  winnersRounds.forEach((round, roundIndex) => {
    const verticalSpacing = gameHeight * Math.pow(2, roundIndex);
    const gamesInRound = round.length;
    const totalHeight = (gamesInRound - 1) * verticalSpacing;
    const startY = winnersStartY + (200 - totalHeight / 2); // Center vertically
    const labelY = startY - 40;

    // Round label (winners lane)
    nodes.push({
      id: `winners-label-${roundIndex}`,
      type: 'roundLabel',
      position: { x: roundIndex * roundWidth + 50, y: labelY },
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
      const x = roundIndex * roundWidth + 50;
      const y = startY + gameIndex * verticalSpacing;

      nodes.push({
        id: nodeId,
        type: 'gameCard',
        position: { x, y },
        draggable: false, // Prevent dragging
        selectable: false, // Prevent selection
        data: {
          game,
          teams: tournament.teams,
          tournament,
          bracketType: 'winners',
        },
      });

      // Connect to next round
      if (roundIndex < winnersRounds.length - 1) {
        const nextGameIndex = Math.floor(gameIndex / 2);
        const targetId = `winners-${roundIndex + 1}-${nextGameIndex}`;

        edges.push({
          id: `${nodeId}-${targetId}`,
          source: nodeId,
          target: targetId,
          type: 'smoothstep',
          animated: game.status === 'Live',
          style: {
            stroke: game.status === 'Live' ? '#10b981' : '#6b7280',
            strokeWidth: 2,
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
          animated: game.status === 'Live',
          style: {
            stroke: game.status === 'Live' ? '#10b981' : '#6b7280',
            strokeWidth: 2,
          },
        });
      }
    });
  });

  // LOSERS BRACKET (BOTTOM) - always render, even if TBD
  if (bracket.losers) {
    const losersRounds = bracket.losers;
    const losersStartY = 450;

    losersRounds.forEach((round, roundIndex) => {
      const verticalSpacing = gameHeight * Math.pow(2, Math.floor(roundIndex / 2));
      const gamesInRound = round.length;
      const totalHeight = (gamesInRound - 1) * verticalSpacing;
      const startY = losersStartY + (200 - totalHeight / 2);
      const labelY = startY - 40;

      round.forEach((game, gameIndex) => {
        const nodeId = `losers-${roundIndex}-${gameIndex}`;
        const x = losersXOffset + roundIndex * roundWidth + 50;
        const y = startY + gameIndex * verticalSpacing;

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

        // Connect to next round
        if (roundIndex < losersRounds.length - 1) {
          const nextGameIndex = roundIndex % 2 === 0 ? gameIndex : Math.floor(gameIndex / 2);
          const targetId = `losers-${roundIndex + 1}-${nextGameIndex}`;

          edges.push({
            id: `${nodeId}-${targetId}`,
            source: nodeId,
            target: targetId,
            type: 'smoothstep',
            animated: game.status === 'Live',
            style: {
              stroke: game.status === 'Live' ? '#10b981' : '#6b7280',
              strokeWidth: 2,
            },
          });
        }

        // Connect final losers bracket game to grand final
        if (bracket.grandFinal && roundIndex === losersRounds.length - 1) {
          edges.push({
            id: `${nodeId}-grandFinal`,
            source: nodeId,
            target: 'grandFinal',
            type: 'smoothstep',
            animated: game.status === 'Live',
            style: {
              stroke: game.status === 'Live' ? '#10b981' : '#6b7280',
              strokeWidth: 2,
            },
          });
        }
      });

      // Round label (losers lane)
      nodes.push({
        id: `losers-label-${roundIndex}`,
        type: 'roundLabel',
        position: { x: losersXOffset + roundIndex * roundWidth + 50, y: labelY },
        draggable: false,
        selectable: false,
        data: {
          text: roundIndex === losersRounds.length - 1 ? 'Losers Final' : `Losers R${roundIndex + 1}`,
        },
      });
    });

    // Add drop-down connections from winners to losers bracket (losers feed)
    const losersRoundsFeed = bracket.losers;
    winnersRounds.forEach((round, roundIndex) => {
      if (roundIndex === 0) return; // First round doesn't feed losers

      round.forEach((_, gameIndex) => {
        const losersRoundIndex = (roundIndex - 1) * 2 + 1;
        if (losersRoundsFeed && losersRoundIndex < losersRoundsFeed.length) {
          const winnersNodeId = `winners-${roundIndex}-${gameIndex}`;
          const losersNodeId = `losers-${losersRoundIndex}-${gameIndex}`;

          edges.push({
            id: `drop-${winnersNodeId}-${losersNodeId}`,
            source: winnersNodeId,
            target: losersNodeId,
            type: 'smoothstep',
            style: {
              stroke: '#ef4444',
              strokeWidth: 1,
              strokeDasharray: '5,5',
            },
          });
        }
      });
    });
  }

  // GRAND FINAL (RIGHT SIDE)
  if (bracket.grandFinal) {
    const winnersFinalX = (winnersRounds.length - 1) * roundWidth + 50;
    const finalX = winnersFinalX + roundWidth + 100;
    const finalY = 350;

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

    // Grand Final label
    nodes.push({
      id: 'grandFinal-label',
      type: 'roundLabel',
      position: { x: finalX, y: finalY - 40 },
      draggable: false,
      selectable: false,
      data: { text: 'Grand Final' },
    });
  }

  // Calculate bounds for pan constraints
  if (nodes.length > 0) {
    const nodeWidth = 192; // w-48 = 192px
    const nodeHeight = 80; // Approximate height of game card
    const padding = 50; // Padding around nodes
    
    const minX = Math.min(...nodes.map(n => n.position.x)) - padding;
    const maxX = Math.max(...nodes.map(n => n.position.x)) + nodeWidth + padding;
    const minY = Math.min(...nodes.map(n => n.position.y)) - padding;
    const maxY = Math.max(...nodes.map(n => n.position.y)) + nodeHeight + padding;

    return { 
      nodes, 
      edges, 
      bounds: {
        minX,
        maxX,
        minY,
        maxY,
      }
    };
  }

  return { nodes, edges, bounds: null };
};

// Main Component
export const ReactFlowTournamentBracket: React.FC<{ tournament: Tournament }> = ({
  tournament,
}) => {
  const hasBracket = !!tournament.bracket;
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { nodes, edges, bounds } = useMemo(
    () => (hasBracket ? transformToFixedLayout(tournament, viewportWidth) : { nodes: [], edges: [], bounds: null }),
    [hasBracket, tournament, viewportWidth]
  );

  if (!hasBracket) {
    return (
      <div className="p-8 text-center text-gray-500">
        Bracket not generated yet. Please generate a bracket first.
      </div>
    );
  }

  // Set translate extent to constrain panning
  const translateExtent: [[number, number], [number, number]] | undefined = bounds
    ? [
        [bounds.minX, bounds.minY] as [number, number],
        [bounds.maxX, bounds.maxY] as [number, number],
      ]
    : undefined;

  return (
    <div className="w-full h-[500px] sm:h-[600px] md:h-[700px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden relative">
      {/* React Flow */}
      <div className="w-full h-full pt-4">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.05,
            includeHiddenNodes: false,
          }}
          minZoom={1}
          maxZoom={1}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch={false}
          preventScrolling={false}
          translateExtent={translateExtent}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background color="#e5e7eb" gap={20} size={1} />
          <Controls
            className="!bg-white !border-gray-300 !shadow-lg"
            showInteractive={false}
            showZoom={false}
            showFitView={false}
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default ReactFlowTournamentBracket;


