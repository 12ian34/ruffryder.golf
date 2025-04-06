import type { Game } from '../../types/game';
import { useHoleDistances } from '../../hooks/useHoleDistances';

interface GameScoreTableProps {
  game: Game;
  useHandicaps: boolean;
}

export default function GameScoreTable({ game, useHandicaps }: GameScoreTableProps) {
  const { distances, isLoading: isLoadingDistances, error: distancesError } = useHoleDistances();

  // Calculate totals from stored scores
  const totals = {
    usaRaw: game.strokePlayScore.USA,
    europeRaw: game.strokePlayScore.EUROPE,
    usaAdjusted: useHandicaps ? game.strokePlayScore.adjustedUSA : game.strokePlayScore.USA,
    europeAdjusted: useHandicaps ? game.strokePlayScore.adjustedEUROPE : game.strokePlayScore.EUROPE,
    usaMatchPlayRaw: game.matchPlayScore.USA,
    europeMatchPlayRaw: game.matchPlayScore.EUROPE,
    usaMatchPlayAdjusted: useHandicaps ? game.matchPlayScore.adjustedUSA : game.matchPlayScore.USA,
    europeMatchPlayAdjusted: useHandicaps ? game.matchPlayScore.adjustedEUROPE : game.matchPlayScore.EUROPE,
    
    // Front 9 totals
    front9UsaRaw: game.holes.slice(0, 9).reduce((sum, hole) => sum + (hole.usaPlayerScore ?? 0), 0),
    front9EuropeRaw: game.holes.slice(0, 9).reduce((sum, hole) => sum + (hole.europePlayerScore ?? 0), 0),
    front9UsaAdjusted: game.holes.slice(0, 9).reduce((sum, hole) => sum + (useHandicaps ? (hole.usaPlayerAdjustedScore ?? hole.usaPlayerScore ?? 0) : (hole.usaPlayerScore ?? 0)), 0),
    front9EuropeAdjusted: game.holes.slice(0, 9).reduce((sum, hole) => sum + (useHandicaps ? (hole.europePlayerAdjustedScore ?? hole.europePlayerScore ?? 0) : (hole.europePlayerScore ?? 0)), 0),
    
    // Back 9 totals
    back9UsaRaw: game.holes.slice(9).reduce((sum, hole) => sum + (hole.usaPlayerScore ?? 0), 0),
    back9EuropeRaw: game.holes.slice(9).reduce((sum, hole) => sum + (hole.europePlayerScore ?? 0), 0),
    back9UsaAdjusted: game.holes.slice(9).reduce((sum, hole) => sum + (useHandicaps ? (hole.usaPlayerAdjustedScore ?? hole.usaPlayerScore ?? 0) : (hole.usaPlayerScore ?? 0)), 0),
    back9EuropeAdjusted: game.holes.slice(9).reduce((sum, hole) => sum + (useHandicaps ? (hole.europePlayerAdjustedScore ?? hole.europePlayerScore ?? 0) : (hole.europePlayerScore ?? 0)), 0),
  };

  // Get hole scores directly from stored values
  const getHoleScore = (hole: Game['holes'][0], team: 'USA' | 'EUROPE') => {
    const rawScore = team === 'USA' ? hole.usaPlayerScore : hole.europePlayerScore;
    const adjustedScore = team === 'USA' ? hole.usaPlayerAdjustedScore : hole.europePlayerAdjustedScore;

    if (rawScore === undefined || rawScore === null) {
      return { raw: null, adjusted: null };
    }

    return {
      raw: rawScore,
      adjusted: adjustedScore ?? rawScore
    };
  };

  return (
    <div className="space-y-6" data-attr="game-score-table">
      {/* Player Names and Handicaps */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-sm font-medium text-usa-500 mb-1">USA</h3>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold dark:text-white">{game.usaPlayerName}</p>
            {useHandicaps && (
              <span className="text-sm text-gray-500">(Handicap: {game.usaPlayerHandicap})</span>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-europe-500 mb-1">Europe</h3>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold dark:text-white">{game.europePlayerName}</p>
            {useHandicaps && (
              <span className="text-sm text-gray-500">(Handicap: {game.europePlayerHandicap})</span>
            )}
          </div>
        </div>
      </div>

      {useHandicaps && game.handicapStrokes > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          {game.higherHandicapTeam === 'USA' ? game.europePlayerName : game.usaPlayerName} gets {game.handicapStrokes} strokes
        </div>
      )}

      {/* Score Table */}
      <div className="overflow-x-auto" data-attr="game-score-table-container">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-attr="game-score-table-scores">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">HOLE</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-usa-500 uppercase tracking-wider">USA</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-europe-500 uppercase tracking-wider">EUR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {game.holes.map((hole, index) => {
              const usaScores = getHoleScore(hole, 'USA');
              const europeScores = getHoleScore(hole, 'EUROPE');
              const holeDistance = distances[index] || null;

              return (
                <tr key={hole.holeNumber} data-attr={`game-score-hole-${hole.holeNumber}`}>
                  <td className="px-4 py-2">
                    <span className="text-sm text-gray-900 dark:text-white">{hole.holeNumber}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400"> (SI: {hole.strokeIndex})</span>
                    {isLoadingDistances && (
                      <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">Loading...</span>
                    )}
                    {!isLoadingDistances && holeDistance && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">- {holeDistance}yd</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {useHandicaps ? (usaScores.adjusted ?? '-') : (usaScores.raw ?? '-')}
                      </span>
                      {useHandicaps && usaScores.raw !== null && (
                        <span className="text-xs text-gray-500">({usaScores.raw})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {useHandicaps ? (europeScores.adjusted ?? '-') : (europeScores.raw ?? '-')}
                      </span>
                      {useHandicaps && europeScores.raw !== null && (
                        <span className="text-xs text-gray-500">({europeScores.raw})</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Front 9 Total Row */}
            <tr className="bg-gray-50 dark:bg-gray-800">
              <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                Front 9
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {totals.front9UsaAdjusted}
                  </span>
                  {useHandicaps && totals.front9UsaAdjusted !== totals.front9UsaRaw && (
                    <span className="text-xs text-gray-500">({totals.front9UsaRaw})</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {totals.front9EuropeAdjusted}
                  </span>
                  {useHandicaps && totals.front9EuropeAdjusted !== totals.front9EuropeRaw && (
                    <span className="text-xs text-gray-500">({totals.front9EuropeRaw})</span>
                  )}
                </div>
              </td>
            </tr>
            
            {/* Back 9 Total Row */}
            <tr className="bg-gray-50 dark:bg-gray-800">
              <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                Back 9
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {totals.back9UsaAdjusted}
                  </span>
                  {useHandicaps && totals.back9UsaAdjusted !== totals.back9UsaRaw && (
                    <span className="text-xs text-gray-500">({totals.back9UsaRaw})</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {totals.back9EuropeAdjusted}
                  </span>
                  {useHandicaps && totals.back9EuropeAdjusted !== totals.back9EuropeRaw && (
                    <span className="text-xs text-gray-500">({totals.back9EuropeRaw})</span>
                  )}
                </div>
              </td>
            </tr>
            
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4" data-attr="game-score-totals">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4" data-attr="game-score-stroke-play">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Stroke Play</h3>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">USA:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {totals.usaAdjusted}
              {useHandicaps && totals.usaAdjusted !== totals.usaRaw && (
                <span className="text-gray-500 dark:text-gray-400 ml-2">({totals.usaRaw})</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">EUROPE:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {totals.europeAdjusted}
              {useHandicaps && totals.europeAdjusted !== totals.europeRaw && (
                <span className="text-gray-500 dark:text-gray-400 ml-2">({totals.europeRaw})</span>
              )}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Front 9:</span>
              <div className="flex gap-4">
                <span className="text-xs text-usa-500 font-medium">{totals.front9UsaAdjusted}</span>
                <span className="text-xs text-europe-500 font-medium">{totals.front9EuropeAdjusted}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Back 9:</span>
              <div className="flex gap-4">
                <span className="text-xs text-usa-500 font-medium">{totals.back9UsaAdjusted}</span>
                <span className="text-xs text-europe-500 font-medium">{totals.back9EuropeAdjusted}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4" data-attr="game-score-match-play">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Match Play</h3>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">USA:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {totals.usaMatchPlayAdjusted}
              {useHandicaps && totals.usaMatchPlayAdjusted !== totals.usaMatchPlayRaw && (
                <span className="text-gray-500 dark:text-gray-400 ml-2">({totals.usaMatchPlayRaw})</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">EUROPE:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {totals.europeMatchPlayAdjusted}
              {useHandicaps && totals.europeMatchPlayAdjusted !== totals.europeMatchPlayRaw && (
                <span className="text-gray-500 dark:text-gray-400 ml-2">({totals.europeMatchPlayRaw})</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {distancesError && (
        <div className="text-sm text-red-500 mt-2">
          Error loading hole distances: {distancesError}
        </div>
      )}
    </div>
  );
} 