import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { CreateProfilePanel, SignInPanel } from '../features/tournament2026/components/AuthPanels';
import { AdminSetupSection } from '../features/tournament2026/components/AdminSetupSection';
import { ArchiveSection } from '../features/tournament2026/components/HistorySection';
import { LeaderboardSection } from '../features/tournament2026/components/LeaderboardSection';
import { PageShell, StatusCard, type AppNavItem } from '../features/tournament2026/components/Layout';
import { PlayerHistoryProvider } from '../features/tournament2026/components/PlayerHistory';
import { ProfileSection } from '../features/tournament2026/components/ProfileSection';
import { ScoreEntrySection } from '../features/tournament2026/components/ScoreEntrySection';
import { TournamentActivitySection } from '../features/tournament2026/components/TournamentActivitySection';
import { filterFixturesForScoreEntry, getErrorMessage } from '../features/tournament2026/viewUtils';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase';
import {
  fetchTournament2026Data,
  subscribeToTournament2026Changes,
} from '../services/tournament2026Queries';
import type { Tournament2026Data } from '../services/tournament2026Queries';
import { identifySupabaseUser, track2026 } from '../utils/analytics';

type Tournament2026Tab = 'score' | 'leaderboard' | 'archive' | 'setup' | 'profile';

const PLAYER_NAV_ITEMS: AppNavItem<Tournament2026Tab>[] = [
  { id: 'score', label: 'My Game' },
  { id: 'leaderboard', label: 'Scores' },
  { id: 'archive', label: 'Archive' },
  { id: 'profile', label: 'Profile' },
];

const ADMIN_NAV_ITEMS: AppNavItem<Tournament2026Tab>[] = [
  { id: 'score', label: 'My Game' },
  { id: 'leaderboard', label: 'Scores' },
  { id: 'archive', label: 'Archive' },
  { id: 'setup', label: 'Admin' },
  { id: 'profile', label: 'Profile' },
];

export function getSupabaseEmailRedirectTo() {
  return window.location.origin;
}

export default function Tournament2026() {
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
  const isOnline = useOnlineStatus();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Tournament2026Data | null>(null);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSignInSubmitting, setIsSignInSubmitting] = useState(false);
  const [signInCooldownSeconds, setSignInCooldownSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(configStatus.isConfigured);
  const [activeTab, setActiveTab] = useState<Tournament2026Tab>('score');

  const refreshData = useCallback(async () => {
    if (!configStatus.isConfigured) return;

    try {
      setError(null);
      const nextData = await fetchTournament2026Data();
      setData(nextData);
      setUser(nextData.user);
      identifySupabaseUser(nextData.user, nextData.profile);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [configStatus.isConfigured]);

  useEffect(() => {
    if (!configStatus.isConfigured) {
      setIsLoading(false);
      return;
    }

    const client = getSupabaseClient();

    client.auth.getUser().then(({ data: userData }) => {
      setUser(userData.user);
      identifySupabaseUser(userData.user);
      void refreshData();
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      identifySupabaseUser(session?.user ?? null);
      void refreshData();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [configStatus.isConfigured, refreshData]);

  useEffect(() => {
    if (!configStatus.isConfigured || !user) return undefined;

    return subscribeToTournament2026Changes(() => {
      void refreshData();
    });
  }, [configStatus.isConfigured, refreshData, user]);

  useEffect(() => {
    track2026(isOnline ? 'connection_restored' : 'connection_lost');
  }, [isOnline]);

  useEffect(() => {
    if (signInCooldownSeconds <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setSignInCooldownSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [signInCooldownSeconds]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSignInSubmitting || signInCooldownSeconds > 0) {
      return;
    }

    setNotice(null);
    setError(null);
    setIsSignInSubmitting(true);
    setSignInCooldownSeconds(60);

    try {
      track2026('signin_link_requested', { email_domain: email.split('@')[1] ?? 'unknown' });
      const { error: signInError } = await getSupabaseClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getSupabaseEmailRedirectTo(),
        },
      });

      if (signInError) {
        throw signInError;
      }

      setNotice('Check your email for the Supabase sign-in link.');
      track2026('signin_link_sent');
    } catch (err) {
      setError(getSignInErrorMessage(err));
      track2026('signin_link_failed', { error: getErrorMessage(err) });
    } finally {
      setIsSignInSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (!window.confirm('Sign out of Ruff Ryders Cup 2026?')) {
      return;
    }

    await getSupabaseClient().auth.signOut();
    track2026('signed_out');
    setData(null);
    setUser(null);
  };

  const handleTabChange = (tab: Tournament2026Tab) => {
    setActiveTab(tab);
    track2026('tab_viewed', { tab_name: tab });
  };

  if (!configStatus.isConfigured) {
    return (
      <PageShell>
        <StatusCard tone="warning">
          Missing Supabase environment variables: {configStatus.missingKeys.join(', ')}.
        </StatusCard>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <StatusCard>Loading Ruff Ryders Cup 2026...</StatusCard>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <SignInPanel
        email={email}
        notice={notice}
        error={error}
        onEmailChange={setEmail}
        onSubmit={handleSignIn}
        isSubmitting={isSignInSubmitting}
        cooldownSeconds={signInCooldownSeconds}
      />
    );
  }

  if (!data?.profile) {
    return (
      <PageShell userEmail={user.email} isOnline={isOnline} onSignOut={handleSignOut}>
        <CreateProfilePanel onSaved={refreshData} />
        {error && <StatusCard tone="error">{error}</StatusCard>}
      </PageShell>
    );
  }

  const scoreEntryFixtures = filterFixturesForScoreEntry(data.fixtures, data.profile);
  const navItems = data.profile.is_admin ? ADMIN_NAV_ITEMS : PLAYER_NAV_ITEMS;

  return (
    <PlayerHistoryProvider
      players={data.players}
      playerStats={data.playerStats}
      aiPlayerOverviews={data.aiPlayerOverviews}
      profile={data.profile}
      onSaved={refreshData}
    >
      <PageShell
        userEmail={user.email}
        isOnline={isOnline}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        navItems={navItems}
        onTabChange={handleTabChange}
      >
        {!isOnline && (
          <StatusCard tone="warning">
            Offline mode: saved data may be stale and score writes can fail until connection returns.
          </StatusCard>
        )}
        {error && <StatusCard tone="error">{error}</StatusCard>}
        {activeTab === 'score' && (
          <ScoreEntrySection
            tournament={data.activeTournament}
            fixtures={scoreEntryFixtures}
            players={data.players}
            courseHoles={data.courseHoles}
            profile={data.profile}
            onSaved={refreshData}
          />
        )}
        {activeTab === 'leaderboard' && (
          <>
            <LeaderboardSection
              tournament={data.activeTournament}
              fixtures={data.fixtures}
              players={data.players}
              courseHoles={data.courseHoles}
              aiTournamentOverview={data.aiTournamentOverview}
              aiNewsroomArtifacts={data.aiNewsroomArtifacts}
              onSaved={refreshData}
            />
            <TournamentActivitySection activity={data.activity} fixtures={data.fixtures} />
          </>
        )}
        {activeTab === 'setup' &&
          (data.profile.is_admin ? (
            <AdminSetupSection data={data} onSaved={refreshData} />
          ) : (
            <StatusCard tone="warning">Setup is admin-only. Use Score during tournament play.</StatusCard>
          ))}
        {activeTab === 'archive' && (
          <ArchiveSection
            history={data.history}
            players={data.players}
            playerStats={data.playerStats}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileSection
            tournament={data.activeTournament}
            profile={data.profile}
            players={data.players}
            playerStats={data.playerStats}
            aiPlayerOverviews={data.aiPlayerOverviews}
            onSignOut={handleSignOut}
            onSaved={refreshData}
          />
        )}
      </PageShell>
    </PlayerHistoryProvider>
  );
}

function getSignInErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);

  if (message.toLowerCase().includes('rate limit')) {
    return 'Email rate limit exceeded. Wait a minute or use the most recent sign-in email Supabase already sent.';
  }

  return message;
}
