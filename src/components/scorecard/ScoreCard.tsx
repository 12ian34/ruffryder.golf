interface ScoreCardProps {
  currentScore: { USA: number, EUROPE: number };
  projectedScore: { USA: number, EUROPE: number };
}

export default function ScoreCard({ currentScore, projectedScore }: ScoreCardProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 dark:from-gray-950 dark:to-black rounded-lg shadow-lg border-2 border-gray-800/50 dark:border-gray-700/50 p-4 sm:p-6 backdrop-blur-sm backdrop-filter">
        <h2 className="text-xl font-semibold mb-4 text-white dark:text-gray-100 text-center">🏆 Score</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-gradient-to-br from-usa-900/80 to-usa-950 dark:from-usa-900/60 dark:to-black rounded-lg p-3 border-2 border-usa-500/50 dark:border-usa-600/40 hover:border-usa-500 transition-all">
            <div className={`text-3xl font-bold ${currentScore.USA > currentScore.EUROPE ? 'text-usa-400' : 'text-gray-400'}`}>
              {currentScore.USA}
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-400">🇺🇸 USA</div>
          </div>
          <div className="bg-gradient-to-br from-europe-900/80 to-europe-950 dark:from-europe-900/60 dark:to-black rounded-lg p-3 border-2 border-europe-500/50 dark:border-europe-600/40 hover:border-europe-500 transition-all">
            <div className={`text-3xl font-bold ${currentScore.EUROPE > currentScore.USA ? 'text-europe-400' : 'text-gray-400'}`}>
              {currentScore.EUROPE}
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-400">🇪🇺 EUROPE</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-800/50 dark:border-gray-700/50">
          <h3 className="text-sm font-medium text-gray-400 dark:text-gray-400 mb-2 text-center">
            📈 Projected score
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gradient-to-br from-usa-900/60 to-usa-950/60 dark:from-usa-900/40 dark:to-black/40 rounded-lg p-2 border border-usa-500/30 dark:border-usa-600/20">
              <div className={`text-2xl font-semibold ${projectedScore.USA > projectedScore.EUROPE ? 'text-usa-400' : 'text-gray-400'}`}>
                {projectedScore.USA}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-400">🇺🇸 USA</div>
            </div>
            <div className="bg-gradient-to-br from-europe-900/60 to-europe-950/60 dark:from-europe-900/40 dark:to-black/40 rounded-lg p-2 border border-europe-500/30 dark:border-europe-600/20">
              <div className={`text-2xl font-semibold ${projectedScore.EUROPE > projectedScore.USA ? 'text-europe-400' : 'text-gray-400'}`}>
                {projectedScore.EUROPE}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-400">🇪🇺 EUROPE</div>
            </div>
          </div>
        </div>

        {/* Strokes hit and Holes won sections removed from here */}
      </div>
    </div>
  );
}