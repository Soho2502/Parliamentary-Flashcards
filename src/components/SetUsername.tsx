import { useState } from 'react';

type Props = {
  onSubmit: (username: string) => Promise<{ error: string | null }>;
};

export function SetUsername({ onSubmit }: Props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('Only letters, numbers and underscores allowed'); return; }
    setLoading(true);
    const { error } = await onSubmit(username.trim());
    if (error) setError(error.includes('unique') ? 'Username already taken' : error);
    setLoading(false);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--bg)',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>👤</span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 12 }}>
          Choose a username
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          This is how others will find and follow you
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 360, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              placeholder="e.g. politicsgeek42"
              maxLength={30}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 12px',
                color: 'var(--text)',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--red-light)', background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.2)', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            style={{
              background: 'linear-gradient(135deg, var(--green), var(--green-light))',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 0',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !username.trim() ? 0.6 : 1,
              boxShadow: '0 4px 20px rgba(0,107,60,0.4)',
            }}
          >
            {loading ? 'Saving...' : 'Set Username'}
          </button>
        </form>
      </div>
    </div>
  );
}
