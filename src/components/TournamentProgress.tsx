import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, isValid, parseISO } from 'date-fns';
import { useEffect, useRef } from 'react';
import type { TournamentProgressDisplay } from '../types/tournament';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TournamentProgressProps {
  progress: TournamentProgressDisplay[];
  totalGames: number;
}

export default function TournamentProgress({ progress, totalGames }: TournamentProgressProps) {
  const chartRef = useRef<ChartJS | null>(null);

  // Cleanup chart instance on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  if (!progress || progress.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string | Date) => {
    if (typeof dateStr === 'string') {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, 'MMM d, yyyy h:mm a') : '';
    }
    return isValid(dateStr) ? format(dateStr, 'MMM d, yyyy h:mm a') : '';
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          padding: 15,
          color: '#6B7280',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            return formatDate(progress[index].timestamp);
          },
          label: (context: any) => {
            const team = context.dataset.label;
            const score = context.raw;
            return `${team}: ${score} points`;
          },
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const currentProgress = progress[index];
            const projectedScore = `USA: ${currentProgress.projectedScore?.USA || currentProgress.score.USA} - EUROPE: ${currentProgress.projectedScore?.EUROPE || currentProgress.score.EUROPE}`;
            return [
              `Games completed: ${currentProgress.completedGames} of ${totalGames}`,
              `Projected score: ${projectedScore}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        grid: {
          display: false
        },
        ticks: {
          callback: (_value: any, index: number) => {
            if (index === 0 || index === progress.length - 1) {
              return formatDate(progress[index].timestamp);
            }
            return '';
          },
          color: '#6B7280',
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          stepSize: 1,
          color: '#6B7280',
          font: {
            size: 11
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const data = {
    labels: progress.map((p) => formatDate(p.timestamp)),
    datasets: [
      {
        label: 'USA (Projected)',
        data: progress.map(p => p.projectedScore?.USA || p.score.USA),
        borderColor: 'rgba(239, 68, 68, 0.9)', // More opaque red
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        tension: 0.3,
        pointRadius: 7,
        pointHoverRadius: 9,
        borderWidth: 4,
        borderDash: [],
        order: 1
      },
      {
        label: 'EUROPE (Projected)',
        data: progress.map(p => p.projectedScore?.EUROPE || p.score.EUROPE),
        borderColor: 'rgba(59, 130, 246, 0.9)', // More opaque blue
        backgroundColor: 'rgba(59, 130, 246, 0.9)',
        tension: 0.3,
        pointRadius: 7,
        pointHoverRadius: 9,
        borderWidth: 4,
        borderDash: [],
        order: 0
      }
    ]
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
        Tournament Projected Score
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center -mt-1 mb-2">
        Shows projected final scores as holes are completed
      </p>
      <div className="h-[200px]">
        <Line 
          options={options} 
          data={data}
          ref={(ref) => {
            if (ref) {
              chartRef.current = ref;
            }
          }}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Games completed: {progress[progress.length - 1]?.completedGames || 0} of {totalGames}
      </div>
    </div>
  );
}