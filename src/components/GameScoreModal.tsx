import { Fragment } from 'react';
import type { Game } from '../types/game';

interface GameScoreModalProps {
  game: Game;
  isOpen: boolean;
  onClose: () => void;
}

export default function GameScoreModal({ game, isOpen, onClose }: GameScoreModalProps) {
  if (!isOpen) return null;

  console.log('Game data in modal:', game);
  console.log('Holes data:', game.holes);

  const calculateHoleScore = (score: number | undefined, playerTeam: 'USA' | 'EUROPE', holeIndex: number) => {
    if (score === undefined) return null;
    
    // If player is on the higher handicap team, they don't get strokes
    if (playerTeam === game.higherHandicapTeam) {
      return score;
    }

    // Calculate if this hole should get a stroke based on stroke index
    const strokeIndex = game.holes[holeIndex].strokeIndex;
    const handicapStrokes = game.handicapStrokes;
    const strokesForHole = Math.floor(handicapStrokes / 18) + 
      (strokeIndex <= (handicapStrokes % 18) ? 1 : 0);
    
    // Add strokes for handicap adjustment (better player gets strokes added)
    return score + strokesForHole;
  };

  // Calculate running totals for both raw and adjusted scores
  const totals = game.holes.reduce((acc, hole, index) => {
    if (hole.usaPlayerScore !== undefined) {
      acc.usaRaw += hole.usaPlayerScore;
      acc.usaAdjusted += calculateHoleScore(hole.usaPlayerScore, 'USA', index) || hole.usaPlayerScore;
    }
    if (hole.europePlayerScore !== undefined) {
      acc.europeRaw += hole.europePlayerScore;
      acc.europeAdjusted += calculateHoleScore(hole.europePlayerScore, 'EUROPE', index) || hole.europePlayerScore;
    }
    return acc;
  }, { usaRaw: 0, usaAdjusted: 0, europeRaw: 0, europeAdjusted: 0 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Game Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Hole</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Par</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">SI</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  {game.usaPlayerName}
                  <div className="text-xs font-normal">Adjusted (Raw)</div>
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  {game.europePlayerName}
                  <div className="text-xs font-normal">Adjusted (Raw)</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {game.holes.map((hole, index) => {
                const usaAdjusted = calculateHoleScore(hole.usaPlayerScore, 'USA', index);
                const europeAdjusted = calculateHoleScore(hole.europePlayerScore, 'EUROPE', index);
                
                return (
                  <tr key={hole.holeNumber}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{hole.holeNumber}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{hole.parScore}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{hole.strokeIndex}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {hole.usaPlayerScore !== undefined ? (
                        <>
                          <span className="font-medium">
                            {usaAdjusted !== null ? usaAdjusted : hole.usaPlayerScore}
                          </span>
                          {usaAdjusted !== hole.usaPlayerScore && (
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                              ({hole.usaPlayerScore})
                            </span>
                          )}
                        </>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {hole.europePlayerScore !== undefined ? (
                        <>
                          <span className="font-medium">
                            {europeAdjusted !== null ? europeAdjusted : hole.europePlayerScore}
                          </span>
                          {europeAdjusted !== hole.europePlayerScore && (
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                              ({hole.europePlayerScore})
                            </span>
                          )}
                        </>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 dark:bg-gray-700 font-medium">
                <td colSpan={3} className="px-4 py-2 text-sm text-gray-900 dark:text-white">Total</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">{totals.usaAdjusted}</span>
                  {totals.usaAdjusted !== totals.usaRaw && (
                    <span className="text-gray-500 dark:text-gray-400 ml-2">({totals.usaRaw})</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">{totals.europeAdjusted}</span>
                  {totals.europeAdjusted !== totals.europeRaw && (
                    <span className="text-gray-500 dark:text-gray-400 ml-2">({totals.europeRaw})</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Stroke Play</h3>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">USA:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {game.higherHandicapTeam !== 'USA' ? (
                  <>
                    <span className="font-medium">{game.strokePlayScore.USA + game.handicapStrokes}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">({game.strokePlayScore.USA})</span>
                  </>
                ) : (
                  game.strokePlayScore.USA
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">EUROPE:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {game.higherHandicapTeam !== 'EUROPE' ? (
                  <>
                    <span className="font-medium">{game.strokePlayScore.EUROPE + game.handicapStrokes}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">({game.strokePlayScore.EUROPE})</span>
                  </>
                ) : (
                  game.strokePlayScore.EUROPE
                )}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Match Play</h3>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">USA:</span>
              <span className="font-medium text-gray-900 dark:text-white">{game.matchPlayScore.USA}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">EUROPE:</span>
              <span className="font-medium text-gray-900 dark:text-white">{game.matchPlayScore.EUROPE}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 