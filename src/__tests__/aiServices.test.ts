import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiRecapSnapshot } from '../features/tournament2026/aiRecap';
import {
  generateAiNewsroomArtifacts,
  generatePlayerAiOverview,
  generateTournamentAiOverview,
} from '../services/aiOverviewService';
import { generateAiRecap } from '../services/aiRecapService';

const supabaseMock = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: supabaseMock.getSupabaseClient,
}));

describe('AI service wrappers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts an authenticated recap request and returns the saved recap copy', async () => {
    mockSessionToken('token-1');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ recap: 'USA are flying.' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateAiRecap(snapshot)).resolves.toEqual({ recap: 'USA are flying.' });
    expect(fetchMock).toHaveBeenCalledWith('/.netlify/functions/ai-recap', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ snapshot }),
    });
  });

  it('blocks recap generation when there is no Supabase session token', async () => {
    mockSessionToken(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateAiRecap(snapshot)).rejects.toThrow('Sign in before generating an AI recap.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces recap function errors and malformed success payloads', async () => {
    mockSessionToken('token-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ error: 'Model offline' }, 500)));

    await expect(generateAiRecap(snapshot)).rejects.toThrow('Model offline');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ nope: true })));

    await expect(generateAiRecap(snapshot)).rejects.toThrow('AI recap returned an unexpected response.');
  });

  it('posts authenticated player, tournament, and newsroom overview requests', async () => {
    mockSessionToken('token-2');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ overview: { id: 'player-overview' } }))
      .mockResolvedValueOnce(jsonResponse({ overview: { id: 'tournament-overview' } }))
      .mockResolvedValueOnce(jsonResponse({ artifacts: [{ id: 'artifact-1' }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      generatePlayerAiOverview({
        playerId: 'player-1',
        context: {} as Parameters<typeof generatePlayerAiOverview>[0]['context'],
        customPrompt: 'focus on putting',
      })
    ).resolves.toEqual({ id: 'player-overview' });
    await expect(
      generateTournamentAiOverview({
        tournamentId: 'tournament-1',
        snapshot,
        sourceHoleScoreCount: 12,
      })
    ).resolves.toEqual({ id: 'tournament-overview' });
    await expect(
      generateAiNewsroomArtifacts({
        tournamentId: 'tournament-1',
        context: {} as Parameters<typeof generateAiNewsroomArtifacts>[0]['context'],
      })
    ).resolves.toEqual([{ id: 'artifact-1' }]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/.netlify/functions/ai-player-overview',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-2',
          'Content-Type': 'application/json',
        },
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/.netlify/functions/ai-tournament-overview',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/.netlify/functions/ai-newsroom-artifacts',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('validates AI overview response shapes', async () => {
    mockSessionToken('token-2');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ overview: null })));

    await expect(
      generatePlayerAiOverview({
        playerId: 'player-1',
        context: {} as Parameters<typeof generatePlayerAiOverview>[0]['context'],
        customPrompt: '',
      })
    ).rejects.toThrow('AI player overview returned an unexpected response.');
  });

  it('uses the overview fallback error when a function returns non-JSON failure content', async () => {
    mockSessionToken('token-2');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(nonJsonResponse(500)));

    await expect(
      generateTournamentAiOverview({
        tournamentId: 'tournament-1',
        snapshot,
        sourceHoleScoreCount: 1,
      })
    ).rejects.toThrow('AI overview failed.');
  });
});

const snapshot = {
  version: 1,
  generatedAt: '2026-05-04T12:00:00.000Z',
  tournament: {
    name: 'Ruff Ryders Cup',
    year: 2026,
    isComplete: false,
    cpiThreshold: 7,
  },
  totals: {
    overall: { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 },
    foursomes: { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 },
    singles: { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 },
  },
  scoreboard: {
    pointsOnTable: {
      overall: { USA: 0, EUROPE: 0 },
      foursomes: { USA: 0, EUROPE: 0 },
      singles: { USA: 0, EUROPE: 0 },
      strokePlay: { USA: 0, EUROPE: 0 },
    },
    provisionalPoints: {
      overall: { USA: 0, EUROPE: 0 },
      foursomes: { USA: 0, EUROPE: 0 },
      singles: { USA: 0, EUROPE: 0 },
      strokePlay: { USA: 0, EUROPE: 0 },
    },
    hasOneVOne: false,
  },
  momentum: {
    holesWon: {
      overall: { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 },
      foursomes: { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 },
      singles: { USA: 0, EUROPE: 0, halved: 0, unplayed: 0 },
    },
  },
  fixtures: [],
  highlights: [],
  recentMovement: [],
} as AiRecapSnapshot;

function mockSessionToken(token: string | null): void {
  supabaseMock.getSupabaseClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: token ? { access_token: token } : null,
        },
      }),
    },
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function nonJsonResponse(status = 200): Response {
  return new Response('not json', { status });
}
