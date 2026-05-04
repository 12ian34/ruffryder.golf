import { describe, expect, it, vi } from 'vitest';
import { buildAuditLogCsv, createAuditLogExportFilename } from '../features/tournament2026/auditExport';
import { fetchAuditLogExport2026, type AuditLogRow } from '../services/tournament2026Queries';

describe('2026 audit log export', () => {
  it('serializes raw audit rows as CSV with actor and before/after fields', () => {
    const csv = buildAuditLogCsv([
      createAuditLogRow({
        actor_display_name: 'Ian "Admin", Esq',
        changed_fields: ['display_name', 'team'],
        row_after: { name: 'Ian, Jr.' },
      }),
    ]);

    expect(csv.split('\n')[0]).toBe(
      [
        'id',
        'created_at',
        'action',
        'table_name',
        'record_id',
        'tournament_id',
        'fixture_id',
        'segment_id',
        'hole_score_id',
        'player_id',
        'actor_profile_id',
        'actor_player_id',
        'actor_display_name',
        'actor_is_admin',
        'changed_fields',
        'row_before',
        'row_after',
      ].join(',')
    );
    expect(csv).toContain('"Ian ""Admin"", Esq"');
    expect(csv).toContain('display_name|team');
    expect(csv).toContain('"{""name"":""Ian, Jr.""}"');
  });

  it('uses a stable dated export filename', () => {
    expect(createAuditLogExportFilename(new Date('2026-05-04T12:00:00.000Z'))).toBe(
      'ruff-ryders-audit-log-2026-05-04.csv'
    );
  });

  it('fetches every audit log page for the export', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => createAuditLogRow({ id: `audit-${index}` }));
    const secondPage = [createAuditLogRow({ id: 'audit-1000' })];
    const { client, ranges } = createAuditClient([firstPage, secondPage]);

    const rows = await fetchAuditLogExport2026(client);

    expect(rows).toHaveLength(1001);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});

function createAuditLogRow(overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  return {
    id: 'audit-1',
    action: 'update',
    table_name: 'players',
    record_id: 'player-1',
    tournament_id: 'tournament-1',
    fixture_id: null,
    segment_id: null,
    hole_score_id: null,
    player_id: 'player-1',
    actor_profile_id: 'profile-admin',
    actor_player_id: 'player-admin',
    actor_display_name: 'Admin',
    actor_is_admin: true,
    changed_fields: ['name'],
    row_before: { name: 'Old name' },
    row_after: { name: 'New name' },
    created_at: '2026-05-04T12:00:00.000Z',
    ...overrides,
  };
}

function createAuditClient(pages: AuditLogRow[][]): {
  client: Parameters<typeof fetchAuditLogExport2026>[0];
  ranges: Array<[number, number]>;
} {
  const ranges: Array<[number, number]> = [];
  const client = {
    from: vi.fn(() => {
      const query = {
        select: vi.fn(() => query),
        order: vi.fn(() => query),
        range: vi.fn((from: number, to: number) => {
          ranges.push([from, to]);

          return Promise.resolve({ data: pages.shift() ?? [], error: null });
        }),
      };

      return query;
    }),
  };

  return { client: client as unknown as Parameters<typeof fetchAuditLogExport2026>[0], ranges };
}
