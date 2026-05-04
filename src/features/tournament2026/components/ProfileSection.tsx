import { useEffect, useMemo, useRef, useState } from 'react';
import { updateAdminUserAccess2026, type AdminUserAccessAction } from '../../../services/adminUserService';
import {
  updateOwnProfile2026,
  updateProfileAdmin2026,
  type AiPlayerOverviewRow,
  type PlayerRow,
  type PlayerTournamentStatsRow,
  type ProfileRow,
  type TournamentRow,
} from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
import { getErrorMessage } from '../viewUtils';
import { AvatarEmojiPicker } from './AvatarEmojiPicker';
import { PlayerSelect } from './FormControls';
import { StatusCard, TerminalPageSection } from './Layout';
import { PlayerAiOverview } from './PlayerAiOverview';
import { PlayerHistoryTrigger, PlayerIdentity } from './PlayerHistory';

type AvatarSaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ProfileSection({
  tournament,
  profile,
  players,
  playerStats,
  aiPlayerOverviews,
  onSignOut,
  onSaved,
}: {
  tournament: TournamentRow | null;
  profile: ProfileRow;
  players: PlayerRow[];
  playerStats: PlayerTournamentStatsRow[];
  aiPlayerOverviews: AiPlayerOverviewRow[];
  onSignOut: () => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const linkedPlayer = players.find((player) => player.id === profile.linked_player_id) ?? null;
  const linkedPlayerOverview = linkedPlayer
    ? aiPlayerOverviews.find((overview) => overview.player_id === linkedPlayer.id) ?? null
    : null;

  return (
    <TerminalPageSection
      title="Profile"
      eyebrow="Account"
      description={profile.email}
      actions={
        <span className="border border-[#27272A] bg-[#09090B] px-3 py-2 text-[10px] tracking-[0.16em] text-[#3FB950]">
          {profile.is_admin ? 'Admin access' : 'Player access'}
        </span>
      }
    >
      <div className="px-3 py-3 sm:px-4">
        <h3 className="text-xl font-bold tracking-[-0.05em] text-[#FAFAFA]">
          {profile.display_name}
        </h3>
        <div className="mt-4 grid gap-2 text-sm text-[#E6EDF3]">
          <p>
            Access: <span className="text-[#3FB950]">{profile.is_admin ? 'Admin' : 'Player'}</span>
          </p>
          <p>
            Linked player:{' '}
            {linkedPlayer ? (
              <PlayerHistoryTrigger player={linkedPlayer} className="text-[#FAFAFA]">
                <PlayerIdentity player={linkedPlayer} />
              </PlayerHistoryTrigger>
            ) : (
              <span className="text-[#FAFAFA]">Not linked yet</span>
            )}
          </p>
          <p>
            Tournament:{' '}
            <span className="text-[#FAFAFA]">{tournament?.name ?? 'No active tournament'}</span>
          </p>
        </div>
      </div>
      {linkedPlayer && (
        <div className="border-t border-[#27272A] px-3 py-3 sm:px-4">
          <PlayerAiOverview
            player={linkedPlayer}
            playerStats={playerStats}
            overview={linkedPlayerOverview}
            canRegenerate
            source="profile"
            onSaved={onSaved}
          />
        </div>
      )}
      <OwnProfileForm profile={profile} onSaved={onSaved} />
      <AccountActions onSignOut={onSignOut} />
    </TerminalPageSection>
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
    <div className="border-t border-[#27272A] px-3 py-3 sm:px-4">
      <p className="text-xs font-bold tracking-[0.18em] text-[#3FB950]">Account</p>
      <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
        Sign out of this device. You can return with a fresh email link.
      </p>
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
        disabled={isSigningOut}
        className="mt-3 min-h-11 rounded-md border border-[#F85149] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#F85149] disabled:border-[#27272A] disabled:text-[#484F58]"
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
  const [avatarSaveState, setAvatarSaveState] = useState<AvatarSaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const savedFeedbackTimerRef = useRef<number | null>(null);
  const hasChanged =
    displayName !== profile.display_name || customEmoji !== (profile.custom_emoji ?? '');

  useEffect(() => {
    setDisplayName(profile.display_name);
    setCustomEmoji(profile.custom_emoji ?? '');
  }, [profile]);

  useEffect(() => {
    return () => {
      if (savedFeedbackTimerRef.current !== null) {
        window.clearTimeout(savedFeedbackTimerRef.current);
      }
    };
  }, []);

  const showSavedAvatarFeedback = () => {
    if (savedFeedbackTimerRef.current !== null) {
      window.clearTimeout(savedFeedbackTimerRef.current);
    }

    setAvatarSaveState('saved');
    savedFeedbackTimerRef.current = window.setTimeout(() => {
      setAvatarSaveState('idle');
      savedFeedbackTimerRef.current = null;
    }, 2200);
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateOwnProfile2026({
        displayName,
        customEmoji: customEmoji.trim() || null,
      });
      track2026('profile_updated', {
        self_service: true,
        display_name_changed: displayName !== profile.display_name,
        avatar_changed: customEmoji !== (profile.custom_emoji ?? ''),
      });
      if (displayName !== profile.display_name) {
        track2026('profile_display_name_updated', { self_service: true });
      }
      if (customEmoji !== (profile.custom_emoji ?? '')) {
        track2026('profile_avatar_updated', {
          self_service: true,
          has_custom_emoji: Boolean(customEmoji.trim()),
        });
      }
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const saveAvatar = async (nextEmoji: string) => {
    setCustomEmoji(nextEmoji);
    setAvatarSaveState('saving');
    setError(null);

    try {
      await updateOwnProfile2026({
        displayName,
        customEmoji: nextEmoji.trim() || null,
      });
      track2026('profile_avatar_updated', { self_service: true });
      await onSaved();
      showSavedAvatarFeedback();
    } catch (err) {
      setCustomEmoji(profile.custom_emoji ?? '');
      setAvatarSaveState('error');
      setError(getErrorMessage(err));
    }
  };

  const avatarFeedback =
    avatarSaveState === 'saving'
      ? 'Saving…'
      : avatarSaveState === 'saved'
        ? 'Saved'
        : avatarSaveState === 'error'
          ? 'Save failed'
          : null;
  const avatarFeedbackTone =
    avatarSaveState === 'saved' ? 'success' : avatarSaveState === 'error' ? 'error' : 'muted';

  return (
    <div className="border-t border-[#27272A] px-3 py-3 sm:px-4">
      <p className="text-xs font-bold tracking-[0.18em] text-[#3FB950]">Profile settings</p>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block font-data text-xs tracking-[0.14em] text-[#8B949E]">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
            />
          </label>
          <button
            type="button"
            onClick={saveProfile}
            disabled={!hasChanged || isSaving}
            className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
          >
            {isSaving ? 'Saving' : 'Save'}
          </button>
        </div>
        <AvatarEmojiPicker
          value={customEmoji}
          onChange={(nextEmoji) => {
            void saveAvatar(nextEmoji);
          }}
          disabled={isSaving || avatarSaveState === 'saving'}
          feedback={avatarFeedback}
          feedbackTone={avatarFeedbackTone}
        />
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
        <p className="text-xs font-bold tracking-[0.18em] text-[#3FB950]">Profile admin</p>
        <p className="mt-1 text-sm leading-6 text-[#A1A1AA]">
          Edit signed-in profiles, roles, avatars, and player links. Player links control fixture score access.
        </p>
      </div>
      <div>
        {profiles.length === 0 ? (
          <StatusCard>No access profiles have been created yet.</StatusCard>
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
  const [accessAction, setAccessAction] = useState<AdminUserAccessAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === playerId) ?? null,
    [playerId, players]
  );
  const isDisabled = Boolean(profile.access_disabled_at);
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
      track2026('profile_admin_updated', {
        profile_id: profile.id,
        is_admin: isAdmin,
        display_name_changed: displayName !== profile.display_name,
        avatar_changed: customEmoji !== (profile.custom_emoji ?? ''),
        role_changed: isAdmin !== profile.is_admin,
        linked_player_changed: playerId !== (profile.linked_player_id ?? ''),
      });
      if (playerId !== (profile.linked_player_id ?? '')) {
        track2026('profile_player_link_updated', {
          profile_id: profile.id,
          previous_player_id: profile.linked_player_id,
          next_player_id: playerId || null,
        });
      }
      if (isAdmin !== profile.is_admin) {
        track2026('profile_role_updated', {
          profile_id: profile.id,
          is_admin: isAdmin,
        });
      }
      if (customEmoji !== (profile.custom_emoji ?? '')) {
        track2026('profile_avatar_updated', {
          profile_id: profile.id,
          self_service: false,
          has_custom_emoji: Boolean(customEmoji.trim()),
        });
      }
      if (displayName !== profile.display_name) {
        track2026('profile_display_name_updated', {
          profile_id: profile.id,
          self_service: false,
        });
      }
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const updateAccess = async (action: AdminUserAccessAction) => {
    const reason =
      action === 'deactivate'
        ? window.prompt(`Reason for deactivating ${profile.display_name}?`, 'No longer needs access') ?? ''
        : '';

    if (action === 'delete') {
      const confirmation = window.prompt(
        `Type DELETE to permanently remove ${profile.display_name}'s Supabase auth account.`
      );

      if (confirmation !== 'DELETE') {
        return;
      }
    } else {
      const confirmed = window.confirm(
        action === 'reactivate'
          ? `Reactivate ${profile.display_name}'s sign-in access?`
          : `Deactivate ${profile.display_name}'s sign-in access and remove fixture permissions?`
      );

      if (!confirmed) {
        return;
      }
    }

    setAccessAction(action);
    setError(null);

    try {
      await updateAdminUserAccess2026({
        profileId: profile.id,
        action,
        reason,
      });
      track2026('profile_access_updated', {
        profile_id: profile.id,
        action,
      });
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAccessAction(null);
    }
  };

  return (
    <div className="border-t border-[#27272A] px-3 py-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,0.9fr)_auto_auto] lg:items-end">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-bold tracking-[-0.04em] text-[#FAFAFA]">{profile.display_name}</p>
            {isDisabled ? (
              <span className="rounded border border-[#F85149] px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#F85149]">
                Disabled
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-[#8B949E]">{profile.email}</p>
          {profile.access_disabled_reason ? (
            <p className="mt-1 text-xs text-[#F59E0B]">{profile.access_disabled_reason}</p>
          ) : null}
          {selectedPlayer && (
            <p className="mt-1 text-xs tracking-[0.14em] text-[#A1A1AA]">
              {selectedPlayer.team}
            </p>
          )}
        </div>
        <label className="block font-data text-xs tracking-[0.14em] text-[#8B949E]">
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#27272A] bg-[#0C0C0E] px-3 py-2 text-sm normal-case tracking-normal text-[#E6EDF3] outline-none focus:border-[#3FB950]"
          />
        </label>
        <AvatarEmojiPicker
          value={customEmoji}
          onChange={setCustomEmoji}
          disabled={isSaving}
          compact
          collapsible
        />
        <div className="flex-1">
          <PlayerSelect label="Linked player" value={playerId} players={players} onChange={setPlayerId} />
        </div>
        <button
          type="button"
          onClick={() => setIsAdmin((current) => !current)}
          className={`min-h-11 rounded-md border px-4 py-2 text-xs font-bold tracking-[0.14em] ${
            isAdmin ? 'border-[#F59E0B] text-[#F59E0B]' : 'border-[#27272A] text-[#8B949E]'
          }`}
        >
          {isAdmin ? 'Admin' : 'Player'}
        </button>
        <button
          type="button"
          onClick={saveProfile}
          disabled={!hasChanged || isSaving || Boolean(accessAction)}
          className="min-h-11 rounded-md border border-[#3FB950] px-4 py-2 text-xs font-bold tracking-[0.14em] text-[#3FB950] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {isSaving ? 'Saving' : hasChanged ? 'Save' : 'Linked'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#27272A] pt-3">
        <button
          type="button"
          onClick={() => {
            void updateAccess(isDisabled ? 'reactivate' : 'deactivate');
          }}
          disabled={isSaving || Boolean(accessAction)}
          className={`min-h-11 rounded-md border px-3 py-2 text-xs font-bold tracking-[0.14em] ${
            isDisabled ? 'border-[#3FB950] text-[#3FB950]' : 'border-[#F59E0B] text-[#F59E0B]'
          } disabled:border-[#27272A] disabled:text-[#484F58]`}
        >
          {accessAction === 'deactivate'
            ? 'Deactivating'
            : accessAction === 'reactivate'
              ? 'Reactivating'
              : isDisabled
                ? 'Reactivate access'
                : 'Deactivate access'}
        </button>
        <button
          type="button"
          onClick={() => {
            void updateAccess('delete');
          }}
          disabled={isSaving || Boolean(accessAction)}
          className="min-h-11 rounded-md border border-[#F85149] px-3 py-2 text-xs font-bold tracking-[0.14em] text-[#F85149] disabled:border-[#27272A] disabled:text-[#484F58]"
        >
          {accessAction === 'delete' ? 'Deleting' : 'Delete auth user'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F85149]">{error}</p>}
    </div>
  );
}

