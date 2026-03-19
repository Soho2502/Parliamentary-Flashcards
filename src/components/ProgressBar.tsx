interface Props {
  known: number;
  total: number;
  remaining: number;
  sessionKnown: number;
  sessionUnknown: number;
}

export function ProgressBar({ known, total, remaining, sessionKnown, sessionUnknown }: Props) {
  const pct = total > 0 ? (known / total) * 100 : 0;

  return (
    <div style={{
      padding: '10px 20px',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Bar */}
      <div style={{
        height: 4,
        background: 'var(--surface2)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--green), var(--green-light))',
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 12,
      }}>
        <span style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--green-light)', fontWeight: 700 }}>{known}</span>
          <span> / {total} known</span>
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          {sessionKnown > 0 && (
            <span style={{ color: 'var(--green-light)', fontWeight: 600 }}>+{sessionKnown} ✓</span>
          )}
          {sessionUnknown > 0 && (
            <span style={{ color: 'var(--red-light)', fontWeight: 600 }}>+{sessionUnknown} ✗</span>
          )}
          <span style={{ color: 'var(--text-muted)' }}>
            {remaining} left
          </span>
        </div>
      </div>
    </div>
  );
}
