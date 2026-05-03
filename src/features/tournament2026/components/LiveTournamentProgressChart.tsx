import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { format, isValid, parseISO } from 'date-fns';
import { Line } from 'react-chartjs-2';
import type { ProgressPoint } from '../insights';
import { StatusCard } from './Layout';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);

interface LiveTournamentProgressChartProps {
  points: ProgressPoint[];
  totalHoles: number;
}

export function LiveTournamentProgressChart({
  points,
  totalHoles,
}: LiveTournamentProgressChartProps) {
  if (points.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-[#27272A] bg-[#0C0C0E] p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#8B949E]">Live Score Curve</p>
            <p className="mt-1 text-xs text-[#8B949E]">
              Team progress across saved tournament holes.
            </p>
          </div>
          <span className="rounded border border-[#27272A] px-2 py-1 text-[10px] tracking-[0.12em] text-[#8B949E]">
            0/{totalHoles} holes
          </span>
        </div>
        <StatusCard>No saved scores yet. The curve wakes up after the first hole.</StatusCard>
      </div>
    );
  }

  const latestPoint = points[points.length - 1];
  const completedHoles = latestPoint.usa + latestPoint.europe + latestPoint.halved;
  const lead = Math.abs(latestPoint.usa - latestPoint.europe);
  const leader =
    latestPoint.usa === latestPoint.europe
      ? 'All square'
      : `${latestPoint.usa > latestPoint.europe ? 'USA' : 'Europe'} +${lead}`;
  const firstPoint = points[0];

  const data: ChartData<'line', number[], string> = {
    labels: points.map((point) => formatTimestamp(point.updatedAt)),
    datasets: [
      {
        label: 'USA',
        data: points.map((point) => point.usa),
        borderColor: 'rgba(242, 184, 75, 0.98)',
        backgroundColor: 'rgba(242, 184, 75, 0.12)',
        tension: 0.42,
        pointRadius: 1.5,
        pointHoverRadius: 5,
        pointStyle: 'circle',
        pointBackgroundColor: 'rgba(242, 184, 75, 0.98)',
        pointBorderColor: '#050506',
        pointBorderWidth: 1,
        borderWidth: 2,
        fill: true,
        order: 1,
      },
      {
        label: 'Europe',
        data: points.map((point) => point.europe),
        borderColor: 'rgba(88, 166, 255, 0.98)',
        backgroundColor: 'rgba(88, 166, 255, 0.12)',
        tension: 0.42,
        pointRadius: 1.5,
        pointHoverRadius: 5,
        pointStyle: 'circle',
        pointBackgroundColor: 'rgba(88, 166, 255, 0.98)',
        pointBorderColor: '#050506',
        pointBorderWidth: 1,
        borderWidth: 2,
        fill: true,
        order: 0,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
    },
    layout: {
      padding: {
        top: 6,
        right: 8,
        bottom: 4,
        left: 4,
      },
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          padding: 18,
          color: '#A1A1AA',
          font: {
            size: 11,
            family: 'Geist Mono, SF Mono, Menlo, monospace',
          },
          usePointStyle: true,
          pointStyle: 'line',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(5, 5, 6, 0.92)',
        borderColor: 'rgba(63, 63, 70, 0.9)',
        borderWidth: 1,
        titleColor: '#FAFAFA',
        bodyColor: '#E6EDF3',
        padding: 10,
        cornerRadius: 8,
        titleFont: {
          size: 12,
          weight: 'bold',
          family: 'Geist Mono, SF Mono, Menlo, monospace',
        },
        bodyFont: {
          size: 12,
          family: 'Geist Mono, SF Mono, Menlo, monospace',
        },
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => {
            const index = context[0]?.dataIndex ?? 0;
            return formatTooltipTitle(points[index]?.updatedAt);
          },
          label: (context: TooltipItem<'line'>) => {
            const team = context.dataset.label ?? 'Team';
            return `${team}: ${context.parsed.y}`;
          },
          afterBody: (context: TooltipItem<'line'>[]) => {
            const index = context[0]?.dataIndex ?? 0;
            const point = points[index];
            const scoredHoles = point ? point.usa + point.europe + point.halved : 0;

            return [
              `${scoredHoles} of ${totalHoles} holes scored`,
              point && point.halved > 0 ? `${point.halved} halved holes` : '',
            ].filter(Boolean);
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category',
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          callback: (_value, index) => formatAxisTick(points, index),
          color: '#8B949E',
          font: {
            size: 10,
            family: 'Geist Mono, SF Mono, Menlo, monospace',
          },
          maxRotation: 0,
          minRotation: 0,
          padding: 8,
          autoSkip: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(230, 237, 243, 0.07)',
        },
        border: {
          display: false,
        },
        ticks: {
          stepSize: 1,
          color: '#8B949E',
          font: {
            size: 10,
            family: 'Geist Mono, SF Mono, Menlo, monospace',
          },
          padding: 8,
          maxTicksLimit: 6,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-[#27272A] bg-[#050506] p-3 sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,184,75,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(88,166,255,0.12),transparent_30%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#8B949E]">Live Score Curve</p>
          <p className="mt-1 text-xs text-[#8B949E]">
            Same tournament timeline, rebuilt for the 2026 hole-by-hole format.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right tabular-nums">
          <ScoreStat label="USA" value={latestPoint.usa} className="text-[#F2B84B]" />
          <ScoreStat label="Europe" value={latestPoint.europe} className="text-[#58A6FF]" />
          <ScoreStat label="Lead" value={leader} className="text-[#FAFAFA]" />
        </div>
      </div>
      <div className="relative mt-3 h-[260px] sm:h-[320px]">
        <Line
          aria-label="2026 live tournament score progress chart"
          data={data}
          options={options}
          role="img"
        />
      </div>
      <div className="relative mt-4 grid gap-2 border-t border-[#27272A] pt-3 text-[10px] tracking-[0.12em] text-[#8B949E] sm:grid-cols-3">
        <p>First score {formatTimestamp(firstPoint.updatedAt, true)}</p>
        <p className="sm:text-center">
          {completedHoles}/{totalHoles} holes scored
        </p>
        <p className="sm:text-right">{latestPoint.halved} halved holes</p>
      </div>
    </div>
  );
}

function ScoreStat({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className: string;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.16em] text-[#8B949E]">{label}</p>
      <p className={`mt-1 text-lg font-bold tracking-[-0.06em] ${className}`}>{value}</p>
    </div>
  );
}

function formatAxisTick(points: ProgressPoint[], index: number): string | string[] {
  const point = points[index];

  if (!point) {
    return '';
  }

  const interval = getVisibleTickInterval(points.length);
  const isVisible = index === 0 || index === points.length - 1 || index % interval === 0;

  if (!isVisible) {
    return '';
  }

  const previousVisibleIndex = getPreviousVisibleTickIndex(index, points.length, interval);
  const currentDate = parseTimestamp(point.updatedAt);
  const previousDate =
    previousVisibleIndex >= 0 ? parseTimestamp(points[previousVisibleIndex].updatedAt) : null;
  const shouldShowDate =
    !previousDate ||
    currentDate.getDate() !== previousDate.getDate() ||
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getFullYear() !== previousDate.getFullYear();

  return shouldShowDate
    ? [formatTimestamp(point.updatedAt, true), formatTimestamp(point.updatedAt)]
    : formatTimestamp(point.updatedAt);
}

function getVisibleTickInterval(pointCount: number): number {
  const width = typeof window === 'undefined' ? 1024 : window.innerWidth;
  return Math.max(1, Math.ceil(pointCount / (width <= 768 ? 3 : 6)));
}

function getPreviousVisibleTickIndex(index: number, pointCount: number, interval: number): number {
  let previousIndex = index - 1;

  while (previousIndex > 0) {
    if (previousIndex === 0 || previousIndex === pointCount - 1 || previousIndex % interval === 0) {
      break;
    }

    previousIndex -= 1;
  }

  return previousIndex;
}

function formatTimestamp(value: string | Date, showDateOnly = false): string {
  const date = parseTimestamp(value);

  if (!isValid(date)) {
    return '';
  }

  return showDateOnly ? format(date, 'MMM do') : format(date, 'HH:mm');
}

function formatTooltipTitle(value: string | Date): string {
  const date = parseTimestamp(value);

  if (!isValid(date)) {
    return '';
  }

  return format(date, 'MMM d, HH:mm');
}

function parseTimestamp(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}
