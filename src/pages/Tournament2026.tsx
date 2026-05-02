import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { CreateProfilePanel, SignInPanel } from '../features/tournament2026/components/AuthPanels';
import { AdminSetupSection } from '../features/tournament2026/components/AdminSetupSection';
import { HistorySection } from '../features/tournament2026/components/HistorySection';
import { LeaderboardSection } from '../features/tournament2026/components/LeaderboardSection';
import { PageShell, StatusCard, type AppNavItem } from '../features/tournament2026/components/Layout';
import { ProfileSection } from '../features/tournament2026/components/ProfileSection';
import { ScoreEntrySection } from '../features/tournament2026/components/ScoreEntrySection';
import { filterFixturesForScoreEntry, getErrorMessage } from '../features/tournament2026/viewUtils';
import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase';
import {
  fetchTournament2026Data,
  subscribeToTournament2026Changes,
} from '../services/tournament2026Queries';
import type { Tournament2026Data } from '../services/tournament2026Queries';

type Tournament2026Tab = 'score' | 'leaderboard' | 'setup' | 'history' | 'profile';

const APP_NAV_ITEMS: AppNavItem<Tournament2026Tab>[] = [
  { id: 'score', label: 'Score' },
  { id: 'leaderboard', label: 'Leaderboard', shortLabel: 'Board' },
  { id: 'setup', label: 'Setup' },
  { id: 'history', label: 'History' },
  { id: 'profile', label: 'Profile', shortLabel: 'Me' },
];

export default function Tournament2026() {
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
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
      void refreshData();
    });

    const { data: authListener } = client.auth.onAuthStateChange(() => {
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
      const { error: signInError } = await getSupabaseClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/2026`,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setNotice('Check your email for the Supabase sign-in link.');
    } catch (err) {
      setError(getSignInErrorMessage(err));
    } finally {
      setIsSignInSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    setData(null);
    setUser(null);
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
        <StatusCard>Loading the 2026 tournament console...</StatusCard>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <SignInPanel
          email={email}
          notice={notice}
          error={error}
          onEmailChange={setEmail}
          onSubmit={handleSignIn}
          isSubmitting={isSignInSubmitting}
          cooldownSeconds={signInCooldownSeconds}
        />
      </PageShell>
    );
  }

  if (!data?.profile) {
    return (
      <PageShell userEmail={user.email} onSignOut={handleSignOut}>
        <CreateProfilePanel onSaved={refreshData} />
        {error && <StatusCard tone="error">{error}</StatusCard>}
      </PageShell>
    );
  }

  const scoreEntryFixtures = filterFixturesForScoreEntry(data.fixtures, data.profile);

  return (
    <PageShell
      userEmail={user.email}
      onSignOut={handleSignOut}
      activeTab={activeTab}
      navItems={APP_NAV_ITEMS}
      onTabChange={setActiveTab}
    >
      {error && <StatusCard tone="error">{error}</StatusCard>}
      {activeTab === 'score' && (
        <ScoreEntrySection
          tournament={data.activeTournament}
          fixtures={scoreEntryFixtures}
          players={data.players}
          profile={data.profile}
          onSaved={refreshData}
        />
      )}
      {activeTab === 'leaderboard' && <LeaderboardSection fixtures={data.fixtures} />}
      {activeTab === 'setup' &&
        (data.profile.is_admin ? (
          <AdminSetupSection data={data} onSaved={refreshData} />
        ) : (
          <StatusCard tone="warning">Setup is admin-only. Use Score during tournament play.</StatusCard>
        ))}
      {activeTab === 'history' && <HistorySection history={data.history} />}
      {activeTab === 'profile' && (
        <ProfileSection
          tournament={data.activeTournament}
          profile={data.profile}
          profiles={data.profiles}
          players={data.players}
          onSaved={refreshData}
        />
      )}
    </PageShell>
  );
}

function getSignInErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);

  if (message.toLowerCase().includes('rate limit')) {
    return 'Email rate limit exceeded. Wait a minute or use the most recent sign-in email Supabase already sent.';
  }

  return message;
}
