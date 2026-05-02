import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { CreateProfilePanel, SignInPanel } from '../features/tournament2026/components/AuthPanels';
import { AdminSetupSection } from '../features/tournament2026/components/AdminSetupSection';
import { Hero } from '../features/tournament2026/components/Hero';
import { HistorySection } from '../features/tournament2026/components/HistorySection';
import { LeaderboardSection } from '../features/tournament2026/components/LeaderboardSection';
import { PageShell, StatusCard } from '../features/tournament2026/components/Layout';
import { ScoreEntrySection } from '../features/tournament2026/components/ScoreEntrySection';
import { getErrorMessage } from '../features/tournament2026/viewUtils';
import { getSupabaseClient, getSupabaseConfigStatus } from '../lib/supabase';
import {
  fetchTournament2026Data,
  subscribeToTournament2026Changes,
} from '../services/tournament2026Queries';
import type { Tournament2026Data } from '../services/tournament2026Queries';

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

  return (
    <PageShell userEmail={user.email} onSignOut={handleSignOut}>
      {error && <StatusCard tone="error">{error}</StatusCard>}
      <Hero tournament={data.activeTournament} profile={data.profile} />
      <LeaderboardSection fixtures={data.fixtures} />
      <ScoreEntrySection
        tournament={data.activeTournament}
        fixtures={data.fixtures}
        players={data.players}
        profile={data.profile}
        onSaved={refreshData}
      />
      <AdminSetupSection data={data} onSaved={refreshData} />
      <HistorySection history={data.history} />
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
