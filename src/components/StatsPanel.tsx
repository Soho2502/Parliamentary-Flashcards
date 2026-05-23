import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Session = {
  id: string;
  score: number;
  total: number;
  filters_json: { house: string; party: string; ministersOnly: boolean } | null;
  completed_at: string;
};

type Props = {
  user: User;
  knownCount: number;
};

export function StatsPanel({ user, knownCount }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setSessions(data ?? []);
        setLoading(false);
      });
  }, [user.id]);

  const totalSessions = sessions.length;
  const avgScore = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / totalSessions)
    : 0;
  const bestScore = totalSessions > 0
    ? Math.max(...sessions.map(s => Math.round((s.score / s.total) * 100)))
    : 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 16 }}>
        Your Stats
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Members Known', value: knownCount },
          { label: 'Sessions Played', value: totalSessions },
          { label: 'Avg Score', value: `${avgScore}%` },
          { label: 'Best Score', value: `${bestScore}%` },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green-light)' }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Recent Sessions
      </h3>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
      ) : sessions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No sessions yet — complete a round to see your history.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map(s => {
            const pct = Math.round((s.score / s.total) * 100);
            const date = new Date(s.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const filterLabel = s.filters_json
              ? [s.filters_json.house !== 'all' && s.filters_json.house, s.filters_json.party !== 'all' && s.filters_json.party, s.filters_json.ministersOnly && 'Ministers only'].filter(Boolean).join(', ') || 'All members'
              : 'All members';

            return (
              <div key={s.id} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {s.score} / {s.total} correct
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{filterLabel} · {date}</div>
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: pct >= 80 ? 'var(--green-light)' : pct >= 50 ? 'var(--gold-light)' : 'var(--red-light)',
                }}>
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
