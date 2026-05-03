import { render, within } from '@testing-library/react';
import { forwardRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressPoint } from '../features/tournament2026/insights';

const chartState = vi.hoisted(() => ({
  props: [] as Array<{ data: any; options: any; rest: any }>,
}));

vi.mock('chart.js', () => {
  const ChartMock = vi.fn() as any;
  ChartMock.register = vi.fn();

  return {
    CategoryScale: vi.fn(),
    Chart: ChartMock,
    Filler: vi.fn(),
    Legend: vi.fn(),
    LinearScale: vi.fn(),
    LineElement: vi.fn(),
    PointElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
  };
});

vi.mock('react-chartjs-2', () => ({
  Line: forwardRef(({ data, options, ...rest }: any, ref: any) => {
    chartState.props.push({ data, options, rest });

    if (ref && typeof ref !== 'function') {
      ref.current = { destroy: vi.fn(), update: vi.fn() };
    }

    return <div data-testid="progress-chart" />;
  }),
}));

import { LiveTournamentProgressChart } from '../features/tournament2026/components/LiveTournamentProgressChart';

describe('LiveTournamentProgressChart', () => {
  beforeEach(() => {
    chartState.props = [];
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('shows an empty state before any scores are saved', () => {
    const { container } = render(<LiveTournamentProgressChart points={[]} totalHoles={45} />);
    const view = within(container);

    expect(view.queryByTestId('progress-chart')).not.toBeInTheDocument();
    expect(view.getByText('No saved scores yet. The curve wakes up after the first hole.')).toBeInTheDocument();
    expect(view.getByText('0/45 holes')).toBeInTheDocument();
  });

  it('renders USA and Europe score curves from cumulative progress points', () => {
    const { container } = render(
      <LiveTournamentProgressChart points={progressPoints.slice(0, 3)} totalHoles={9} />
    );
    const view = within(container);

    expect(view.getByTestId('progress-chart')).toBeInTheDocument();
    expect(view.getByText('USA')).toBeInTheDocument();
    expect(view.getByText('Europe')).toBeInTheDocument();
    expect(view.getByText('All square')).toBeInTheDocument();
    expect(view.getByText('3/9 holes scored')).toBeInTheDocument();

    const [{ data }] = chartState.props;

    expect(data.datasets).toHaveLength(2);
    expect(data.datasets[0]).toMatchObject({
      label: 'USA',
      data: [1, 1, 1],
      borderColor: 'rgba(242, 184, 75, 0.98)',
    });
    expect(data.datasets[1]).toMatchObject({
      label: 'Europe',
      data: [0, 0, 1],
      borderColor: 'rgba(88, 166, 255, 0.98)',
    });
  });

  it('keeps the legacy sparse x-axis date labeling behavior', () => {
    render(<LiveTournamentProgressChart points={progressPoints} totalHoles={18} />);

    const [{ options }] = chartState.props;
    const tickCallback = options.scales.x.ticks.callback;

    expect(tickCallback('', 0)).toEqual(['May 3rd', '07:00']);
    expect(tickCallback('', 1)).toBe('');
    expect(tickCallback('', 2)).toBe('07:10');
    expect(tickCallback('', 4)).toEqual(['May 4th', '07:20']);
    expect(tickCallback('', 6)).toBe('07:30');
  });

  it('reports completed and halved holes in the tooltip footer', () => {
    render(<LiveTournamentProgressChart points={progressPoints.slice(0, 3)} totalHoles={9} />);

    const [{ options }] = chartState.props;
    const afterBody = options.plugins.tooltip.callbacks.afterBody;

    expect(afterBody([{ dataIndex: 2 }])).toEqual(['3 of 9 holes scored', '1 halved holes']);
  });
});

const progressPoints: ProgressPoint[] = [
  createPoint('score-1', 1, 0, 0, '2026-05-03T07:00:00'),
  createPoint('score-2', 1, 0, 1, '2026-05-03T07:05:00'),
  createPoint('score-3', 1, 1, 1, '2026-05-03T07:10:00'),
  createPoint('score-4', 2, 1, 1, '2026-05-03T07:15:00'),
  createPoint('score-5', 2, 2, 1, '2026-05-04T07:20:00'),
  createPoint('score-6', 3, 2, 1, '2026-05-04T07:25:00'),
  createPoint('score-7', 3, 3, 1, '2026-05-04T07:30:00'),
];

function createPoint(
  id: string,
  usa: number,
  europe: number,
  halved: number,
  updatedAt: string
): ProgressPoint {
  return {
    id,
    label: `Fixture H${id.replace('score-', '')}`,
    usa,
    europe,
    halved,
    updatedAt,
  };
}
