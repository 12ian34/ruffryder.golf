import type { AuditLogRow } from '../../services/tournament2026Queries';

const AUDIT_LOG_EXPORT_COLUMNS = [
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
] as const satisfies ReadonlyArray<keyof AuditLogRow>;

export function buildAuditLogCsv(rows: AuditLogRow[]): string {
  const header = AUDIT_LOG_EXPORT_COLUMNS.join(',');
  const body = rows.map((row) => AUDIT_LOG_EXPORT_COLUMNS.map((column) => escapeCsvValue(row[column])).join(','));

  return [header, ...body].join('\n');
}

export function createAuditLogExportFilename(date = new Date()): string {
  return `ruff-ryders-audit-log-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadAuditLogCsv(rows: AuditLogRow[]): void {
  const csv = buildAuditLogCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = createAuditLogExportFilename();
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: AuditLogRow[keyof AuditLogRow]): string {
  if (value === null || value === undefined) {
    return '';
  }

  const serialized = Array.isArray(value)
    ? value.join('|')
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);

  if (/[",\n\r]/.test(serialized)) {
    return `"${serialized.replace(/"/g, '""')}"`;
  }

  return serialized;
}
