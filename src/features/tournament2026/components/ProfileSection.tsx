import { useMemo, useState } from 'react';
import {
  updateProfilePlayerLink2026,
  type PlayerRow,
  type ProfileRow,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
import { getErrorMessage } from '../viewUtils';
import { PlayerSelect } from './FormControls';
import { Panel, StatusCard } from './Layout';

export function ProfileSection({
  tournament,
  profile,
  profiles,
  players,
  onSaved,
}: {
  tournament: TournamentRow | null;
  profile: ProfileRow;
  profiles: ProfileRow[];
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  const linkedPlayer = players.find((player) => player.id === profile.linked_player_id) ?? null;

  return (
    <Panel title="Profile" eyebrow={profile.is_admin ? 'Admin access' : 'Player access'}>
      <div className="-mx-4 border-t border-[#27272A] px-4 py-4 sm:mx-0">
        <h3 className="text-2xl font-bold tracking-[-0.06em] text-[#FAFAFA]">
          {profile.display_name}
        </h3>
        <p className="mt-1 text-sm text-[#A1A1AA]">{profile.email}</p>
        <div className="mt-4 grid gap-2 text-sm text-[#E6EDF3]">
          <p>
            Access: <span className="text-[#3FB950]">{profile.is_admin ? 'Admin' : 'Player'}</span>
          </p>
          <p>
            Linked player:{' '}
            <span className="text-[#FAFAFA]">{linkedPlayer?.name ?? 'Not linked yet'}</span>
          </p>
          <p>
            Tournament:{' '}
            <span className="text-[#FAFAFA]">{tournament?.name ?? 'No active tournament'}</span>
          </p>
        </div>
      </div>
      {profile.is_admin && (
        <ProfileLinkingPanel profiles={profiles} players={players} onSaved={onSaved} />
      )}
    </Panel>
  );
}

function ProfileLinkingPanel({
  profiles,
  players,
  onSaved,
}: {
  profiles: ProfileRow[];
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  return (
    <div className="-mx-4 border-t border-[#27272A] sm:mx-0">
      <div className="px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3FB950]">Player links</p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Link each signed-in person to their player profile. This controls who can enter scores for
          their fixture.
        </p>
      </div>
      <div>
        {profiles.length === 0 ? (
          <StatusCard>No Supabase profiles have been created yet.</StatusCard>
        ) : (
          profiles.map((profile) => (
            <ProfileLinkRow
              key={profile.id}
              profile={profile}
              players={players}
              onSaved={onSaved}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProfileLinkRow({
  profile,
  players,
  onSaved,
}: {
  profile: ProfileRow;
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  const [playerId, setPlayerId] = useState(profile.linked_player_id ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === playerId) ?? null,
    [playerId, players]
  );
  const hasChanged = playerId !== (profile.linked_player_id ?? '');

  const saveLink = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateProfilePlayerLink2026({
        profileId: profile.id,
        playerId: playerId || null,
        players,
      });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">
            {profile.display_name}
          </p>
          <p className="truncate text-xs text-[#8B949E]">{profile.email}</p>
          {selectedPlayer && (
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#A1A1AA]">
              {selectedPlayer.team}
            </p>
          )}
        </div>
        <div className="flex-1">
          <PlayerSelect label="Linked player" value={playerId} players={players} onChange={setPlayerId} />
        </div>
        <button
          type="button"
          onClick={saveLink}
          disabled={!hasChanged || isSaving}
          className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isSaving ? 'Saving' : hasChanged ? 'Save' : 'Linked'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

