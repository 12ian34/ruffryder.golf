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
  import type { TournamentProgress } from '../types/tournament';
  
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
    progress: TournamentProgress[];
    totalGames: number;
  }
  
  export default function TournamentProgress({ progress, totalGames }: TournamentProgressProps) {
    if (!progress || progress.length === 0) {
      return null;
    }
  
    // Use only the latest progress entry
    const latestProgress = progress[progress.length - 1];
  
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
            title: () => format(latestProgress.timestamp.toDate(), 'MMM d, yyyy h:mm a'),
            label: (context: any) => {
              const team = context.dataset.label;
              const score = context.raw;
              return `${team}: ${score} points`;
            },
            afterBody: () => [`Games completed: ${latestProgress.completedGames} of ${totalGames}`]
          }
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(107, 114, 128, 0.1)',
          },
          ticks: {
            color: '#6B7280',
            font: {
              size: 11
            },
            stepSize: 1
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
      labels: ['Current Score'],
      datasets: [
        {
          label: 'USA',
          data: [latestProgress.score.USA],
          borderColor: '#EF4444',
          backgroundColor: '#EF4444',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        },
        {
          label: 'EUROPE',
          data: [latestProgress.score.EUROPE],
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
        <div className="max-w-md mx-auto h-[200px]">
          <Line options={options} data={data} />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Games completed: {latestProgress.completedGames} of {totalGames}
        </div>
      </div>
    );
  }