import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Filters } from './types';
import { useDeck } from './hooks/useDeck';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { Filters as FiltersPanel } from './components/Filters';
import { SwipeContainer } from './components/SwipeContainer';
import { AuthScreen } from './components/AuthScreen';
import { SetUsername } from './components/SetUsername';
import { StatsPanel } from './components/StatsPanel';
import { SocialPanel } from './components/SocialPanel';
import membersData from './data/members.json';
import type { Member } from './types';
import './styles/globals.css';

const allMembers = membersData as Member[];
type Tab = 'play' | 'stats' | 'social';

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { profile, loading: profileLoading, createProfile } = useProfile(user);
  const [tab, setTab] = useState<Tab>('play');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [user]);

  const [filters, setFilters] = useState<Filters>({
    house: 'all',
    party: 'all',
    ministersOnly: false,
    shadowMinistersOnly: false,
  });

  const {
    currentCard,
    nextCard,
    remaining,
    total,
    knownCount,
    sessionKnown,
    sessionUnknown,
    markKnown,
    markUnknown,
    reshuffle,
    resetProgress,
    isFinished,
  } = useDeck(allMembers, filters, user);

  const handleFilterChange = (partial: Partial<Filters>) => {
    setFilters(f => ({ ...f, ...partial }));
  };

  const cardKey = currentCard ? currentCard.id : -1;

  if (authLoading || profileLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</span>
      </div>
    );
  }

  if (!user) return <AuthScreen onSignIn={signIn} onSignUp={signUp} />;
  if (!profile) return <SetUsername onSubmit={createProfile} />;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Header onResetProgress={resetProgress} onReshuffle={reshuffle} user={user} onSignOut={signOut} />

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        {(['play', 'stats', 'social'] as Tab[]).map(t => {
          const icons: Record<Tab, string> = { play: '🃏', stats: '📊', social: '👥' };
          const labels: Record<Tab, string> = { play: 'Play', stats: 'Stats', social: 'Friends' };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '16px 0',
                border: 'none',
                borderBottom: `3px solid ${tab === t ? 'var(--green-light)' : 'transparent'}`,
                background: 'transparent',
                color: 'var(--text)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1, position: 'relative' }}>
                {icons[t]}
                {t === 'social' && unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -10,
                    background: 'var(--red-light)', color: '#fff',
                    borderRadius: '50%', width: 16, height: 16,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{unreadCount}</span>
                )}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{labels[t]}</span>
            </button>
          );
        })}
      </div>

      {tab === 'play' && (
        <>
          <ProgressBar
            known={knownCount}
            total={total}
            remaining={remaining}
            sessionKnown={sessionKnown}
            sessionUnknown={sessionUnknown}
          />
          <FiltersPanel filters={filters} onChange={handleFilterChange} total={total} />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', minHeight: 0, overflow: 'hidden' }}>
            {total === 0 ? (
              <EmptyState onReset={() => handleFilterChange({ house: 'all', party: 'all', ministersOnly: false, shadowMinistersOnly: false })} />
            ) : isFinished ? (
              <FinishedState total={total} sessionKnown={sessionKnown} onReshuffle={reshuffle} onReset={resetProgress} />
            ) : currentCard ? (
              <SwipeContainer member={currentCard} nextMember={nextCard} onKnown={markKnown} onUnknown={markUnknown} cardKey={cardKey} />
            ) : null}
          </main>
        </>
      )}

      {tab === 'stats' && (
        <StatsPanel user={user} knownCount={knownCount} />
      )}

      {tab === 'social' && (
        <SocialPanel user={user} profile={profile} onNotificationsRead={() => setUnreadCount(0)} />
      )}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-muted)' }}>
      <span style={{ fontSize: 48 }}>🔍</span>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>No matches found</p>
      <p style={{ fontSize: 14 }}>Try adjusting your filters</p>
      <button
        onClick={onReset}
        style={{ marginTop: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        Clear Filters
      </button>
    </div>
  );
}

function FinishedState({ total, sessionKnown, onReshuffle, onReset }: {
  total: number; sessionKnown: number; onReshuffle: () => void; onReset: () => void;
}) {
  const pct = total > 0 ? Math.round((sessionKnown / total) * 100) : 0;
  const emoji = pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, animation: 'fadeIn 0.5s ease' }}>
      <span style={{ fontSize: 64 }}>{emoji}</span>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--text)', marginBottom: 8 }}>Round Complete!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
          You knew <span style={{ color: 'var(--green-light)', fontWeight: 700 }}>{sessionKnown}</span> of <span style={{ fontWeight: 700, color: 'var(--text)' }}>{total}</span> in this session
        </p>
        {pct >= 80 && <p style={{ color: 'var(--gold-light)', fontSize: 13, marginTop: 8 }}>Excellent political knowledge!</p>}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onReshuffle} style={{ background: 'linear-gradient(135deg, var(--green), var(--green-light))', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,107,60,0.4)' }}>
          Play Again
        </button>
        <button onClick={onReset} style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Reset Progress
        </button>
      </div>
    </div>
  );
}
