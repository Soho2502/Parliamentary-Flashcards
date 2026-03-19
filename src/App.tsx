import { useState } from 'react';
import type { Filters } from './types';
import { useDeck } from './hooks/useDeck';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { Filters as FiltersPanel } from './components/Filters';
import { SwipeContainer } from './components/SwipeContainer';
import membersData from './data/members.json';
import type { Member } from './types';
import './styles/globals.css';

const allMembers = membersData as Member[];

export default function App() {
  const [filters, setFilters] = useState<Filters>({
    house: 'all',
    party: 'all',
    ministersOnly: false,
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
  } = useDeck(allMembers, filters);

  const handleFilterChange = (partial: Partial<Filters>) => {
    setFilters(f => ({ ...f, ...partial }));
  };

  const cardKey = currentCard ? currentCard.id : -1;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Header onResetProgress={resetProgress} onReshuffle={reshuffle} />
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
          <EmptyState onReset={() => handleFilterChange({ house: 'all', party: 'all', ministersOnly: false })} />
        ) : isFinished ? (
          <FinishedState
            total={total}
            sessionKnown={sessionKnown}
            onReshuffle={reshuffle}
            onReset={resetProgress}
          />
        ) : currentCard ? (
          <SwipeContainer
            member={currentCard}
            nextMember={nextCard}
            onKnown={markKnown}
            onUnknown={markUnknown}
            cardKey={cardKey}
          />
        ) : null}
      </main>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      color: 'var(--text-muted)',
    }}>
      <span style={{ fontSize: 48 }}>🔍</span>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>No matches found</p>
      <p style={{ fontSize: 14 }}>Try adjusting your filters</p>
      <button
        onClick={onReset}
        style={{
          marginTop: 8,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Clear Filters
      </button>
    </div>
  );
}

function FinishedState({ total, sessionKnown, onReshuffle, onReset }: {
  total: number;
  sessionKnown: number;
  onReshuffle: () => void;
  onReset: () => void;
}) {
  const pct = total > 0 ? Math.round((sessionKnown / total) * 100) : 0;
  const emoji = pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪';

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      animation: 'fadeIn 0.5s ease',
    }}>
      <span style={{ fontSize: 64 }}>{emoji}</span>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 900,
          color: 'var(--text)',
          marginBottom: 8,
        }}>Round Complete!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
          You knew{' '}
          <span style={{ color: 'var(--green-light)', fontWeight: 700 }}>{sessionKnown}</span>
          {' '}of{' '}
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{total}</span>
          {' '}in this session
        </p>
        {pct >= 80 && (
          <p style={{ color: 'var(--gold-light)', fontSize: 13, marginTop: 8 }}>Excellent political knowledge!</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onReshuffle}
          style={{
            background: 'linear-gradient(135deg, var(--green), var(--green-light))',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,107,60,0.4)',
          }}
        >
          Play Again
        </button>
        <button
          onClick={onReset}
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reset Progress
        </button>
      </div>
    </div>
  );
}
