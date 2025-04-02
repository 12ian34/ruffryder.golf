interface ScoreCardProps {
  currentScore: { USA: number, EUROPE: number };
  projectedScore: { USA: number, EUROPE: number };
  totalStrokes: { USA: number, EUROPE: number };
  rawStrokes: { USA: number, EUROPE: number };
  totalHoles: { USA: number, EUROPE: number };
  useHandicaps: boolean;
}

export default function ScoreCard({ currentScore, projectedScore, totalStrokes, rawStrokes, totalHoles, useHandicaps }: ScoreCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Current Score</h2>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <div className={`text-3xl font-bold ${currentScore.USA > currentScore.EUROPE ? 'text-green-500' : 'text-gray-500'}`}>
            {currentScore.USA}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">USA</div>
        </div>
        <div>
          <div className={`text-3xl font-bold ${currentScore.EUROPE > currentScore.USA ? 'text-green-500' : 'text-gray-500'}`}>
            {currentScore.EUROPE}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">EUROPE</div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Projected Final Score
        </h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className={`text-2xl font-semibold ${projectedScore.USA > projectedScore.EUROPE ? 'text-green-500' : 'text-gray-500'}`}>
              {projectedScore.USA}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">USA</div>
          </div>
          <div>
            <div className={`text-2xl font-semibold ${projectedScore.EUROPE > projectedScore.USA ? 'text-green-500' : 'text-gray-500'}`}>
              {projectedScore.EUROPE}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">EUROPE</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Total Strokes
        </h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className={`text-2xl font-semibold ${totalStrokes.USA < totalStrokes.EUROPE ? 'text-green-500' : 'text-gray-500'}`}>
              {totalStrokes.USA}
              {useHandicaps && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({rawStrokes.USA})</span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">USA</div>
          </div>
          <div>
            <div className={`text-2xl font-semibold ${totalStrokes.EUROPE < totalStrokes.USA ? 'text-green-500' : 'text-gray-500'}`}>
              {totalStrokes.EUROPE}
              {useHandicaps && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({rawStrokes.EUROPE})</span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">EUROPE</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Holes Won
        </h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className={`text-2xl font-semibold ${totalHoles.USA > totalHoles.EUROPE ? 'text-green-500' : 'text-gray-500'}`}>
              {totalHoles.USA}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">USA</div>
          </div>
          <div>
            <div className={`text-2xl font-semibold ${totalHoles.EUROPE > totalHoles.USA ? 'text-green-500' : 'text-gray-500'}`}>
              {totalHoles.EUROPE}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">EUROPE</div>
          </div>
        </div>
      </div>
    </div>
  );
}