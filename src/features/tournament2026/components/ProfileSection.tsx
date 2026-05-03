import { useEffect, useMemo, useState } from 'react';
import {
  updateOwnProfile2026,
  updateProfileAdmin2026,
  type PlayerRow,
  type ProfileRow,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
import { getErrorMessage } from '../viewUtils';
import { PlayerSelect } from './FormControls';
import { Panel, StatusCard } from './Layout';

export function ProfileSection({
  tournament,
  profile,
  players,
  onSignOut,
  onSaved,
}: {
  tournament: TournamentRow | null;
  profile: ProfileRow;
  players: PlayerRow[];
  onSignOut: () => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const linkedPlayer = players.find((player) => player.id === profile.linked_player_id) ?? null;

  return (
    <Panel title="Profile" eyebrow="Account">
      <div className="-mx-3 border-t border-[#27272A] px-3 py-3 sm:mx-0">
        <h3 className="text-xl font-bold tracking-[-0.05em] text-[#FAFAFA]">
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
      <OwnProfileForm profile={profile} onSaved={onSaved} />
      <AccountActions onSignOut={onSignOut} />
    </Panel>
  );
}

function AccountActions({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);

    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="-mx-3 border-t border-[#27272A] px-3 py-3 sm:mx-0">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3FB950]">Account</p>
      <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
        Sign out of this device. You can return with a fresh email link.
      </p>
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
        disabled={isSigningOut}
        className="mt-3 min-h-11 rounded-md border border-[#F85149] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#F85149] disabled:border-[#27272A] disabled:text-[#484F58]"
      >
        {isSigningOut ? 'Signing out' : 'Sign out'}
      </button>
    </div>
  );
}

function OwnProfileForm({
  profile,
  onSaved,
}: {
  profile: ProfileRow;
  onSaved: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [customEmoji, setCustomEmoji] = useState(profile.custom_emoji ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanged =
    displayName !== profile.display_name || customEmoji !== (profile.custom_emoji ?? '');

  useEffect(() => {
    setDisplayName(profile.display_name);
    setCustomEmoji(profile.custom_emoji ?? '');
  }, [profile]);

  const saveProfile = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateOwnProfile2026({
        displayName,
        customEmoji: customEmoji.trim() || null,
      });
      track2026('profile_updated', { self_service: true });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="-mx-3 border-t border-[#27272A] px-3 py-3 sm:mx-0">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3FB950]">Profile settings</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <label className="block font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
          />
        </label>
        <label className="block font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
          Avatar
          <input
            value={customEmoji}
            onChange={(event) => setCustomEmoji(event.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
          />
        </label>
        <button
          type="button"
          onClick={saveProfile}
          disabled={!hasChanged || isSaving}
          className="min-h-10 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

export function ProfileLinkingPanel({
  profiles,
  players,
  onSaved,
}: {
  profiles: ProfileRow[];
  players: PlayerRow[];
  onSaved: () => Promise<void>;
}) {
  return (
    <div className="-mx-3 border-t border-[#27272A] sm:mx-0">
      <div className="px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3FB950]">Profile admin</p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Edit signed-in profiles, roles, avatars, and player links. Player links control fixture score access.
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
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [customEmoji, setCustomEmoji] = useState(profile.custom_emoji ?? '');
  const [isAdmin, setIsAdmin] = useState(profile.is_admin);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === playerId) ?? null,
    [playerId, players]
  );
  const hasChanged =
    playerId !== (profile.linked_player_id ?? '') ||
    displayName !== profile.display_name ||
    customEmoji !== (profile.custom_emoji ?? '') ||
    isAdmin !== profile.is_admin;

  useEffect(() => {
    setPlayerId(profile.linked_player_id ?? '');
    setDisplayName(profile.display_name);
    setCustomEmoji(profile.custom_emoji ?? '');
    setIsAdmin(profile.is_admin);
  }, [profile]);

  const saveProfile = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateProfileAdmin2026({
        profileId: profile.id,
        displayName,
        isAdmin,
        customEmoji: customEmoji.trim() || null,
        playerId: playerId || null,
        players,
      });
      track2026('profile_admin_updated', { profile_id: profile.id, is_admin: isAdmin });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-3 py-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_auto_auto] lg:items-end">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">{profile.display_name}</p>
          <p className="truncate text-xs text-[#8B949E]">{profile.email}</p>
          {selectedPlayer && (
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#A1A1AA]">
              {selectedPlayer.team}
            </p>
          )}
        </div>
        <label className="block font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
          />
        </label>
        <label className="block font-data text-xs uppercase tracking-[0.14em] text-[#8B949E]">
          Avatar
          <input
            value={customEmoji}
            onChange={(event) => setCustomEmoji(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
          />
        </label>
        <div className="flex-1">
          <PlayerSelect label="Linked player" value={playerId} players={players} onChange={setPlayerId} />
        </div>
        <button
          type="button"
          onClick={() => setIsAdmin((current) => !current)}
          className={`min-h-11 rounded-md border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
            isAdmin ? 'border-[#F59E0B] text-[#F59E0B]' : 'border-[#27272A] text-[#8B949E]'
          }`}
        >
          {isAdmin ? 'Admin' : 'Player'}
        </button>
        <button
          type="button"
          onClick={saveProfile}
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

