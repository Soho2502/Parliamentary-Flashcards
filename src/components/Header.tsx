interface Props {
  onResetProgress: () => void;
  onReshuffle: () => void;
}

export function Header({ onResetProgress, onReshuffle }: Props) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(13,17,23,0.8)',
      backdropFilter: 'blur(10px)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>🏛️</span>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 900,
            color: 'var(--text)',
            lineHeight: 1,
          }}>Parliament Quiz</h1>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5, marginTop: 2 }}>
            UK MPs &amp; Lords Flashcards
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <HeaderBtn onClick={onReshuffle} title="Shuffle deck">
          🔀
        </HeaderBtn>
        <HeaderBtn onClick={onResetProgress} title="Reset all progress" danger>
          Reset
        </HeaderBtn>
      </div>
    </header>
  );
}

function HeaderBtn({ onClick, title, children, danger }: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: danger ? 'rgba(185,28,28,0.1)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${danger ? 'rgba(185,28,28,0.3)' : 'var(--border)'}`,
        color: danger ? 'var(--red-light)' : 'var(--text-muted)',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = danger ? 'rgba(185,28,28,0.2)' : 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = danger ? 'rgba(185,28,28,0.1)' : 'rgba(255,255,255,0.06)';
      }}
    >
      {children}
    </button>
  );
}
