import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { forwardRef } from 'react';

// Mock Chart.js and react-chartjs-2 before importing TournamentProgress
vi.mock('chart.js', () => {
  const ChartMock = vi.fn() as any;
  ChartMock.register = vi.fn();
  ChartMock.prototype.destroy = vi.fn();
  return {
    Chart: ChartMock,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn()
  };
});

vi.mock('react-chartjs-2', () => ({
  Line: forwardRef(({ data, options }: any, ref: any) => {
    // Create a mock chart instance that matches the Chart.js interface
    const mockChart = {
      destroy: vi.fn(),
      update: vi.fn()
    };

    // Assign the mock chart instance to the ref if provided
    if (ref) {
      if (typeof ref === 'function') {
        ref(mockChart);
      } else {
        ref.current = mockChart;
      }
    }

    return (
      <div data-testid="mocked-chart">
        <div data-testid="chart-data">{JSON.stringify(data)}</div>
        <div data-testid="chart-options">{JSON.stringify(options)}</div>
      </div>
    );
  })
}));

// Import TournamentProgress after mocks
import TournamentProgress from '../components/TournamentProgress';

describe('TournamentProgress', () => {
  const mockProgress = [
    {
      timestamp: new Date('2024-04-07T12:30:00'),
      score: { USA: 0, EUROPE: 0 },
      projectedScore: { USA: 0, EUROPE: 0 },
      completedGames: 0
    },
    {
      timestamp: new Date('2024-04-07T14:45:00'),
      score: { USA: 1, EUROPE: 0 },
      projectedScore: { USA: 1, EUROPE: 0 },
      completedGames: 1
    },
    {
      timestamp: new Date('2024-04-08T09:15:00'), // Next day
      score: { USA: 1, EUROPE: 2 },
      projectedScore: { USA: 1, EUROPE: 2 },
      completedGames: 2
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
  });

  it('renders nothing when progress is empty', () => {
    const { container } = render(<TournamentProgress progress={[]} totalGames={6} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays correct game completion status', async () => {
    const { container } = render(<TournamentProgress progress={mockProgress} totalGames={6} />);
    
    // Wait for any state updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const mockedChart = container.querySelector('[data-testid="mocked-chart"]');
    expect(mockedChart).toBeInTheDocument();

    const chartData = container.querySelector('[data-testid="chart-data"]');
    if (!chartData) {
      throw new Error('Chart data element not found');
    }
    const chartDataObj = JSON.parse(chartData.textContent || '{}');
    expect(chartDataObj.datasets).toHaveLength(2);
    expect(chartDataObj.datasets[0].label).toBe('USA');
    expect(chartDataObj.datasets[1].label).toBe('EUROPE');
  });

  it('shows correct number of data points', async () => {
    const { container } = render(<TournamentProgress progress={mockProgress} totalGames={6} />);

    // Wait for any state updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const mockedChart = container.querySelector('[data-testid="mocked-chart"]');
    expect(mockedChart).toBeInTheDocument();

    const chartData = container.querySelector('[data-testid="chart-data"]');
    if (!chartData) {
      throw new Error('Chart data element not found');
    }
    const chartDataObj = JSON.parse(chartData.textContent || '{}');
    expect(chartDataObj.labels).toHaveLength(mockProgress.length);
  });

  it('adjusts for mobile view', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });

    const { container } = render(<TournamentProgress progress={mockProgress} totalGames={6} />);

    // Wait for any state updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const mockedChart = container.querySelector('[data-testid="mocked-chart"]');
    expect(mockedChart).toBeInTheDocument();

    const chartOptions = container.querySelector('[data-testid="chart-options"]');
    if (!chartOptions) {
      throw new Error('Chart options element not found');
    }
    const optionsObj = JSON.parse(chartOptions.textContent || '{}');
    expect(optionsObj.scales.x.ticks).toBeDefined();
    expect(optionsObj.scales.x.ticks.color).toBe('#9CA3AF');
    expect(optionsObj.scales.x.ticks.font.size).toBe(10);
  });

  it('includes correct data series configuration', async () => {
    const { container } = render(<TournamentProgress progress={mockProgress} totalGames={6} />);

    // Wait for any state updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const mockedChart = container.querySelector('[data-testid="mocked-chart"]');
    expect(mockedChart).toBeInTheDocument();

    const chartData = container.querySelector('[data-testid="chart-data"]');
    if (!chartData) {
      throw new Error('Chart data element not found');
    }
    const chartDataObj = JSON.parse(chartData.textContent || '{}');
    expect(chartDataObj.datasets[0]).toMatchObject({
      label: 'USA',
      borderColor: expect.any(String),
      backgroundColor: expect.any(String)
    });

    expect(chartDataObj.datasets[1]).toMatchObject({
      label: 'EUROPE',
      borderColor: expect.any(String),
      backgroundColor: expect.any(String)
    });
  });

  it('cleans up chart on unmount', async () => {
    let unmount!: () => void;
    const { container, unmount: unmountFn } = render(<TournamentProgress progress={mockProgress} totalGames={6} />);
    unmount = unmountFn;

    // Wait for any state updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const mockedChart = container.querySelector('[data-testid="mocked-chart"]');
    expect(mockedChart).toBeInTheDocument();

    unmount();
  });

  it('handles empty progress data correctly', async () => {
    const { container } = render(<TournamentProgress progress={[]} totalGames={6} />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // The component should not render anything when progress is empty
    expect(container.firstChild).toBeNull();
  });

  it('validates chart options structure', async () => {
    const { container } = render(<TournamentProgress progress={mockProgress} totalGames={6} />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const chartOptions = container.querySelector('[data-testid="chart-options"]');
    if (!chartOptions) {
      throw new Error('Chart options element not found');
    }
    const optionsObj = JSON.parse(chartOptions.textContent || '{}');
    
    // Check responsive settings
    expect(optionsObj.responsive).toBe(true);
    expect(optionsObj.maintainAspectRatio).toBe(false);
    
    // Check layout padding
    expect(optionsObj.layout.padding).toEqual({
      top: 5,
      right: 5,
      bottom: 5,
      left: 5,
    });
    
    // Check legend configuration
    expect(optionsObj.plugins.legend.position).toBe('top');
    expect(optionsObj.plugins.legend.align).toBe('center');
    
    // Check tooltip configuration
    expect(optionsObj.plugins.tooltip.mode).toBe('index');
    expect(optionsObj.plugins.tooltip.intersect).toBe(false);
  });

  it('handles different screen sizes correctly', async () => {
    // Test desktop view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });

    const { container } = render(<TournamentProgress progress={mockProgress} totalGames={6} />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    let chartOptions = container.querySelector('[data-testid="chart-options"]');
    if (!chartOptions) {
      throw new Error('Chart options element not found');
    }
    let optionsObj = JSON.parse(chartOptions.textContent || '{}');
    expect(optionsObj.scales.x.ticks.font.size).toBe(10);

    // Test mobile view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    chartOptions = container.querySelector('[data-testid="chart-options"]');
    if (!chartOptions) {
      throw new Error('Chart options element not found');
    }
    optionsObj = JSON.parse(chartOptions.textContent || '{}');
    expect(optionsObj.scales.x.ticks.font.size).toBe(10);
  });

  it('validates data series configuration', async () => {
    const { container } = render(<TournamentProgress progress={mockProgress} totalGames={6} />);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const chartData = container.querySelector('[data-testid="chart-data"]');
    if (!chartData) {
      throw new Error('Chart data element not found');
    }
    const chartDataObj = JSON.parse(chartData.textContent || '{}');
    
    // Check USA dataset
    const usaDataset = chartDataObj.datasets[0];
    expect(usaDataset).toMatchObject({
      label: 'USA',
      borderColor: expect.stringMatching(/^rgba\(\d+, \d+, \d+, 0.9\)$/),
      borderWidth: 2,
      fill: true,
      pointHoverRadius: 4,
      pointRadius: 1,
      pointStyle: "circle",
      tension: 0.4,
    });
    
    // Check EUROPE dataset
    const europeDataset = chartDataObj.datasets[1];
    expect(europeDataset).toMatchObject({
      label: 'EUROPE',
      borderColor: expect.stringMatching(/^rgba\(\d+, \d+, \d+, 0.9\)$/),
      borderWidth: 2,
      fill: true,
      pointHoverRadius: 4,
      pointRadius: 1,
      pointStyle: "circle",
      tension: 0.4,
    });
  });
}); 