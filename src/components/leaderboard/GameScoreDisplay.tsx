interface GameScoreDisplayProps {
  label: string;
  usaScore: number;
  europeScore: number;
  isComplete: boolean;
  isProjected?: boolean;
}

export default function GameScoreDisplay({ 
  label, 
  usaScore, 
  europeScore, 
  isComplete,
  isProjected = false 
}: GameScoreDisplayProps) {
  return (
    <div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        {label} {isProjected && '(Projected)'}
      </div>
      <div className={`flex justify-center items-center space-x-2 ${isProjected && !isComplete ? 'opacity-60' : ''}`}>
        <span className={`font-medium ${
          isComplete
            ? usaScore > europeScore
              ? 'text-green-500'
              : 'text-gray-500'
            : 'text-gray-400'
        }`}>
          {usaScore}
        </span>
        <span className="text-gray-400">-</span>
        <span className={`font-medium ${
          isComplete
            ? europeScore > usaScore
              ? 'text-green-500'
              : 'text-gray-500'
            : 'text-gray-400'
        }`}>
          {europeScore}
        </span>
      </div>
    </div>
  );
}