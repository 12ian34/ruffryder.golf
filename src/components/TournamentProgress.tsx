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
import { format } from 'date-fns';
import type { TournamentProgress as TournamentProgressType } from '../types/tournament';

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
  progress: TournamentProgressType[];
  totalGames: number;
}

export default function TournamentProgress({ progress, totalGames }: TournamentProgressProps) {
  if (!progress || progress.length === 0) {
    return null;
  }

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
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            return format(progress[index].timestamp.toDate(), 'MMM d, yyyy h:mm a');
          },
          label: (context: any) => {
            const team = context.dataset.label;
            const score = context.raw;
            return `${team}: ${score} points`;
          },
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            return [`Games completed: ${progress[index].completedGames} of ${totalGames}`];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        grid: {
          display: false
        },
        ticks: {
          callback: (value: any, index: number) => {
            if (index === 0 || index === progress.length - 1) {
              return format(progress[index].timestamp.toDate(), 'MMM d');
            }
            return '';
          },
          color: '#6B7280',
          font: {
            size: 11
          }
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
    labels: progress.map((p, i) => i),
    datasets: [
      {
        label: 'USA',
        data: progress.map(p => p.score.USA),
        borderColor: '#EF4444',
        backgroundColor: '#EF4444',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      },
      {
        label: 'EUROPE',
        data: progress.map(p => p.score.EUROPE),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F6',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      }
    ]
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
        Tournament Progress
      </h3>
      <div className="h-[200px]">
        <Line options={options} data={data} />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Games completed: {progress[progress.length - 1].completedGames} of {totalGames}
      </div>
    </div>
  );
}