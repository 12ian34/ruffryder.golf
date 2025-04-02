import type { Game } from '../../types/game';

interface GameScoreTableProps {
  game: Game;
}

export default function GameScoreTable({ game }: GameScoreTableProps) {
  const calculateHoleScore = (score: number | undefined, playerTeam: 'USA' | 'EUROPE', holeIndex: number) => {
    if (score === undefined) return null;
    
    // If player is on the higher handicap team, they keep their raw score
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
    <div className="space-y-6">
      {/* Player Names and Handicaps */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-sm font-medium text-usa-500 mb-1">USA</h3>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold dark:text-white">{game.usaPlayerName}</p>
            <span className="text-sm text-gray-500">
              (Handicap: {game.usaPlayerHandicap})
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-europe-500 mb-1">Europe</h3>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold dark:text-white">{game.europePlayerName}</p>
            <span className="text-sm text-gray-500">
              (Handicap: {game.europePlayerHandicap})
            </span>
          </div>
        </div>
      </div>

      {game.handicapStrokes > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
        </div>
      )}

      {/* Score Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                <div>Hole</div>
                <div className="text-xs font-normal">SI</div>
              </th>
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
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    <div className="font-medium">Hole {hole.holeNumber}</div>
                    <div className="text-gray-500 dark:text-gray-400">SI: {hole.strokeIndex}</div>
                  </td>
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
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">Total</td>
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

      {/* Score Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Stroke Play</h3>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">USA:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {game.higherHandicapTeam === 'USA' ? (
                game.strokePlayScore.USA
              ) : (
                <>
                  <span className="font-medium">{game.strokePlayScore.USA + game.handicapStrokes}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">({game.strokePlayScore.USA})</span>
                </>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">EUROPE:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {game.higherHandicapTeam === 'EUROPE' ? (
                game.strokePlayScore.EUROPE
              ) : (
                <>
                  <span className="font-medium">{game.strokePlayScore.EUROPE + game.handicapStrokes}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">({game.strokePlayScore.EUROPE})</span>
                </>
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
  );
} 