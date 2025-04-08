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

  // Calculate handicap strokes for a hole
  const getHandicapStrokes = (strokeIndex: number) => {
    if (!useHandicaps || !game.europePlayerHandicap || !game.usaPlayerHandicap) {
      return 0;
    }
    
    // Calculate handicap difference and determine which team gets strokes
    const handicapDiff = game.europePlayerHandicap - game.usaPlayerHandicap;
    
    // Calculate total strokes based on absolute difference
    const totalStrokes = Math.abs(handicapDiff);
    
    // Calculate how many complete 18-hole cycles of strokes to apply
    const fullCycles = Math.floor(totalStrokes / 18);
    
    // Calculate remaining strokes after full cycles
    const remainingStrokes = totalStrokes % 18;
    
    // Apply a stroke for each full cycle
    // Plus an additional stroke if this hole's index is low enough for remaining strokes
    return fullCycles + (strokeIndex <= remainingStrokes ? 1 : 0);
  };

  // Get team that receives strokes (the team playing against higher handicap)
  const getTeamGettingStrokes = () => {
    if (!game.europePlayerHandicap || !game.usaPlayerHandicap) return 'USA';
    const handicapDiff = game.europePlayerHandicap - game.usaPlayerHandicap;
    // Team getting strokes is opposite of the higher handicap team
    return handicapDiff > 0 ? 'USA' : 'EUROPE';
  };

  return (
    <div className="space-y-6" data-attr="game-score-table">
      {/* Player Names and Handicaps */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-950 dark:from-gray-950 dark:to-black p-3 rounded-lg shadow-md border-2 border-usa-500/50 dark:border-usa-600/40 hover:border-usa-500 transition-all">
          <h3 className="text-sm font-medium text-usa-500 mb-1">USA</h3>
          <div className="flex items-center gap-2">
            <p className="text-lg text-center font-semibold text-white">{game.usaPlayerName}</p>
            {useHandicaps && (
              <span className="text-sm text-center text-gray-400">(Handicap: {game.usaPlayerHandicap})</span>
            )}
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-950 dark:from-gray-950 dark:to-black p-3 rounded-lg shadow-md border-2 border-europe-500/50 dark:border-europe-600/40 hover:border-europe-500 transition-all">
          <h3 className="text-sm font-medium text-europe-500 mb-1">Europe</h3>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-white">{game.europePlayerName}</p>
            {useHandicaps && (
              <span className="text-sm text-center text-gray-400">(Handicap: {game.europePlayerHandicap})</span>
            )}
          </div>
        </div>
      </div>

      {useHandicaps && game.handicapStrokes > 0 && (
        <div className="text-center text-sm text-white dark:text-gray-300 mb-6 bg-gradient-to-br from-gray-800/80 to-gray-900 p-2 rounded-lg shadow-sm border border-white/10">
          {game.higherHandicapTeam === 'USA' ? game.usaPlayerName : game.europePlayerName} gets {game.handicapStrokes} strokes
        </div>
      )}

      {/* Score Table */}
      <div className="overflow-x-auto rounded-lg shadow-md border-2 border-gray-700/50 dark:border-gray-800/40" data-attr="game-score-table-container">
        <table className="min-w-full divide-y divide-gray-700/50 dark:divide-gray-800/40 bg-gradient-to-br from-gray-900 to-gray-950 dark:from-gray-950 dark:to-black" data-attr="game-score-table-scores">
          <thead>
            <tr className="bg-gray-900/40 dark:bg-black/40">
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-300 dark:text-gray-400 uppercase tracking-wider">HOLE</th>
              <th className="px-2 py-1 text-center text-xs font-medium text-usa-500 uppercase tracking-wider">USA</th>
              <th className="px-2 py-1 text-center text-xs font-medium text-europe-500 uppercase tracking-wider">EUR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50 dark:divide-gray-800/40">
            {game.holes.map((hole, index) => {
              const usaScores = getHoleScore(hole, 'USA');
              const europeScores = getHoleScore(hole, 'EUROPE');
              const holeDistance = distances[index] || null;
              const handicapStrokes = getHandicapStrokes(hole.strokeIndex);
              const teamGettingStrokes = getTeamGettingStrokes();
              const strokeColor = teamGettingStrokes === 'USA' ? 'text-usa-500' : 'text-europe-500';

              return (
                <tr key={hole.holeNumber} data-attr={`game-score-hole-${hole.holeNumber}`} className="transition-colors hover:bg-gray-800/50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-0.5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{hole.holeNumber}</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500">(SI: {hole.strokeIndex})</span>
                        {useHandicaps && handicapStrokes > 0 && (
                          <span className={`text-xs font-medium ${strokeColor} bg-gray-800/50 px-1.5 py-0.5 rounded-full`}>
                            {teamGettingStrokes} (+{handicapStrokes})
                          </span>
                        )}
                      </div>
                      {!isLoadingDistances && holeDistance && (
                        <span className="text-sm text-gray-400 dark:text-gray-500">{holeDistance}yd</span>
                      )}
                      {isLoadingDistances && (
                        <span className="text-sm text-gray-500 dark:text-gray-600">Loading...</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center w-full">
                      <span className="text-sm text-white font-medium">
                        {useHandicaps ? (usaScores.adjusted ?? '-') : (usaScores.raw ?? '-')}
                      </span>
                      {useHandicaps && usaScores.raw !== null && usaScores.raw !== usaScores.adjusted && (
                        <span className="text-xs text-gray-500">({usaScores.raw})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center w-full">
                      <span className="text-sm text-white font-medium">
                        {useHandicaps ? (europeScores.adjusted ?? '-') : (europeScores.raw ?? '-')}
                      </span>
                      {useHandicaps && europeScores.raw !== null && europeScores.raw !== europeScores.adjusted && (
                        <span className="text-xs text-gray-500">({europeScores.raw})</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Front 9 Total Row */}
            <tr className="bg-gray-800/60 dark:bg-gray-950 border-t-2 border-gray-700/50 dark:border-gray-800/40">
              <td className="px-4 py-2 font-medium text-white">
                Front 9
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex flex-col items-center justify-center w-full">
                  <span className="text-sm font-medium text-white">
                    {totals.front9UsaAdjusted}
                  </span>
                  {useHandicaps && totals.front9UsaAdjusted !== totals.front9UsaRaw && (
                    <span className="text-xs text-gray-500">({totals.front9UsaRaw})</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex flex-col items-center justify-center w-full">
                  <span className="text-sm font-medium text-white">
                    {totals.front9EuropeAdjusted}
                  </span>
                  {useHandicaps && totals.front9EuropeAdjusted !== totals.front9EuropeRaw && (
                    <span className="text-xs text-gray-500">({totals.front9EuropeRaw})</span>
                  )}
                </div>
              </td>
            </tr>
            
            {/* Back 9 Total Row */}
            <tr className="bg-gray-800/60 dark:bg-gray-950">
              <td className="px-4 py-2 font-medium text-white">
                Back 9
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex flex-col items-center justify-center w-full">
                  <span className="text-sm font-medium text-white">
                    {totals.back9UsaAdjusted}
                  </span>
                  {useHandicaps && totals.back9UsaAdjusted !== totals.back9UsaRaw && (
                    <span className="text-xs text-gray-500">({totals.back9UsaRaw})</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 text-center">
                <div className="flex flex-col items-center justify-center w-full">
                  <span className="text-sm font-medium text-white">
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
        <div className="bg-gradient-to-br from-purple-900/80 to-purple-950 dark:from-purple-900/60 dark:to-black rounded-xl shadow-md p-4 border-2 border-purple-600/50 dark:border-purple-700/60 hover:shadow-lg transition-all hover:border-purple-500 dark:hover:border-purple-500/70" data-attr="game-score-stroke-play">
          <h3 className="text-lg font-medium text-white mb-2 flex items-center">
            <span className="text-sm mr-2">🏌️‍♂️</span>
            Stroke Play
          </h3>
          <div className="flex justify-between">
            <span className="text-gray-300 dark:text-gray-400">USA:</span>
            <span className="font-medium text-white">
              {totals.usaAdjusted}
              {useHandicaps && totals.usaAdjusted !== totals.usaRaw && (
                <span className="text-gray-400 dark:text-gray-500 ml-2">({totals.usaRaw})</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 dark:text-gray-400">EUROPE:</span>
            <span className="font-medium text-white">
              {totals.europeAdjusted}
              {useHandicaps && totals.europeAdjusted !== totals.europeRaw && (
                <span className="text-gray-400 dark:text-gray-500 ml-2">({totals.europeRaw})</span>
              )}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-purple-700/30 dark:border-purple-800/30">
            <div className="flex justify-between">
              <span className="text-gray-300 dark:text-gray-400">Front 9:</span>
              <div className="flex gap-4">
                <span className="text-xs text-usa-400 font-medium">{totals.front9UsaAdjusted}</span>
                <span className="text-xs text-europe-400 font-medium">{totals.front9EuropeAdjusted}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300 dark:text-gray-400">Back 9:</span>
              <div className="flex gap-4">
                <span className="text-xs text-usa-400 font-medium">{totals.back9UsaAdjusted}</span>
                <span className="text-xs text-europe-400 font-medium">{totals.back9EuropeAdjusted}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-900/80 to-indigo-950 dark:from-indigo-900/60 dark:to-black rounded-xl shadow-md p-4 border-2 border-indigo-600/50 dark:border-indigo-700/60 hover:shadow-lg transition-all hover:border-indigo-500 dark:hover:border-indigo-500/70" data-attr="game-score-match-play">
          <h3 className="text-lg font-medium text-white mb-2 flex items-center">
            <span className="text-sm mr-2">🏆</span>
            Match Play
          </h3>
          <div className="flex justify-between">
            <span className="text-gray-300 dark:text-gray-400">USA:</span>
            <span className="font-medium text-white">
              {totals.usaMatchPlayAdjusted}
              {useHandicaps && totals.usaMatchPlayAdjusted !== totals.usaMatchPlayRaw && (
                <span className="text-gray-400 dark:text-gray-500 ml-2">({totals.usaMatchPlayRaw})</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 dark:text-gray-400">EUROPE:</span>
            <span className="font-medium text-white">
              {totals.europeMatchPlayAdjusted}
              {useHandicaps && totals.europeMatchPlayAdjusted !== totals.europeMatchPlayRaw && (
                <span className="text-gray-400 dark:text-gray-500 ml-2">({totals.europeMatchPlayRaw})</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {distancesError && (
        <div className="text-sm text-red-500 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          Error loading hole distances: {distancesError}
        </div>
      )}
    </div>
  );
} 