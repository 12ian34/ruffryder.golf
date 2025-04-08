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
import { useEffect, useRef, useState } from 'react';
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
      setIsReady(false);
    };
  }, []);

  if (!progress || progress.length === 0 || !isReady) {
    return null;
  }

  const formatDate = (dateStr: string | Date, showDateOnly = false) => {
    if (typeof dateStr === 'string') {
      const date = parseISO(dateStr);
      if (!isValid(date)) return '';
      if (showDateOnly) {
        return format(date, 'MMM do');
      }
      return format(date, 'HH:mm');
    }
    if (!isValid(dateStr)) return '';
    return showDateOnly ? format(dateStr, 'MMM do') : format(dateStr, 'HH:mm');
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500
    },
    layout: {
      padding: {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          padding: 20,
          color: '#9CA3AF',
          font: {
            size: 11,
            family: 'system-ui'
          },
          usePointStyle: true,
          pointStyle: 'line',
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(5, 5, 5, 0.75)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 10,
        cornerRadius: 15,
        titleFont: {
          size: 13,
          weight: 'bold' as const,
          family: 'system-ui'
        },
        bodyFont: {
          size: 12,
          family: 'system-ui'
        },
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            const date = progress[index].timestamp;
            return format(date, 'MMM d, HH:mm');
          },
          label: (context: any) => {
            const team = context.dataset.label.split(' ')[0];
            const score = context.raw;
            return `${team}: ${score}`;
          },
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const currentProgress = progress[index];
            return [`${currentProgress.completedGames} of ${totalGames} games completed`];
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          callback: (_value: any, index: number) => {
            const currentDate = progress[index].timestamp;
            const interval = window.innerWidth <= 768 ? 
              Math.ceil(progress.length / 3) : 
              Math.ceil(progress.length / 6);
            
            // Determine if this tick should be visible
            const isVisible = index === 0 || 
                            index === progress.length - 1 || 
                            index % interval === 0;
            
            if (!isVisible) return '';

            // Find the previous visible label's index
            let prevVisibleIndex = index - 1;
            while (prevVisibleIndex > 0) {
              if (prevVisibleIndex === 0 || 
                  prevVisibleIndex === progress.length - 1 || 
                  prevVisibleIndex % interval === 0) {
                break;
              }
              prevVisibleIndex--;
            }

            // Check if date has changed since last visible label
            const showDate = prevVisibleIndex < 0 || (
              currentDate.getDate() !== progress[prevVisibleIndex].timestamp.getDate() || 
              currentDate.getMonth() !== progress[prevVisibleIndex].timestamp.getMonth() || 
              currentDate.getFullYear() !== progress[prevVisibleIndex].timestamp.getFullYear()
            );

            return showDate ? 
              [formatDate(currentDate, true), formatDate(currentDate)] : 
              formatDate(currentDate);
          },
          color: '#9CA3AF',
          font: {
            size: 10,
            family: 'system-ui'
          },
          maxRotation: 0,
          minRotation: 0,
          padding: 8,
          autoSkip: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(243, 244, 246, 0.06)',
          drawBorder: false
        },
        ticks: {
          stepSize: 1,
          color: '#9CA3AF',
          font: {
            size: 10,
            family: 'system-ui'
          },
          padding: 8,
          maxTicksLimit: 5
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
        label: 'USA',
        data: progress.map(p => p.projectedScore?.USA || p.score.USA),
        borderColor: 'rgba(251, 191, 36, 0.9)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        tension: 0.1,
        pointRadius: 1,
        pointHoverRadius: 4,
        pointStyle: 'circle',
        pointBackgroundColor: 'rgba(251, 191, 36, 0.9)',
        pointBorderColor: 'rgba(251, 191, 36, 0.9)',
        pointBorderWidth: 1,
        borderWidth: 2,
        fill: true,
        order: 1
      },
      {
        label: 'EUROPE',
        data: progress.map(p => p.projectedScore?.EUROPE || p.score.EUROPE),
        borderColor: 'rgba(167, 139, 250, 0.9)',
        backgroundColor: 'rgba(167, 139, 250, 0.1)',
        tension: 0.1,
        pointRadius: 1,
        pointHoverRadius: 4,
        pointStyle: 'circle',
        pointBackgroundColor: 'rgba(167, 139, 250, 0.9)',
        pointBorderColor: 'rgba(167, 139, 250, 0.9)',
        pointBorderWidth: 1,
        borderWidth: 2,
        fill: true,
        order: 0
      }
    ]
  };

  const completedGames = progress[progress.length - 1]?.completedGames || 0;

  return (
    <div>
      <div className="h-[300px] relative">
        {isReady && (
          <Line 
            options={options} 
            data={data}
            ref={(ref) => {
              if (ref) {
                chartRef.current = ref;
              }
            }}
          />
        )}
      </div>
      <div className="px-4 py-2 border-t border-gray-700/50 flex items-center justify-between mt-4">
        <div className="text-xs font-medium text-gray-400">
          Live score
        </div>
        <div className="text-xs font-medium text-gray-400">
          {completedGames}/{totalGames} Games
        </div>
      </div>
    </div>
  );
}