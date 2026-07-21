import { useState, useCallback, useEffect } from 'react';
import type { Member } from '../types';
import { FlashCard } from './FlashCard';
import { useSwipe } from '../hooks/useSwipe';

interface Props {
  member: Member;
  nextMember: Member | null;
  onKnown: () => void;
  onUnknown: () => void;
  cardKey: number;
}

export function SwipeContainer({ member, nextMember, onKnown, onUnknown, cardKey }: Props) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleSwipeLeft = useCallback(() => {
    setIsFlipped(false);
    onUnknown();
  }, [onUnknown]);

  const handleSwipeRight = useCallback(() => {
    setIsFlipped(false);
    onKnown();
  }, [onKnown]);

  const { state, onPointerDown, onPointerMove, onPointerUp, triggerSwipe } = useSwipe(handleSwipeLeft, handleSwipeRight);

  // Reset flip when card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [cardKey]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
      if (e.code === 'Space') { e.preventDefault(); setIsFlipped(f => !f); }
      if (e.code === 'ArrowRight' && isFlipped) triggerSwipe('right');
      if (e.code === 'ArrowLeft' && isFlipped) triggerSwipe('left');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFlipped, triggerSwipe]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
      {/* Card area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          maxWidth: 400,
          maxHeight: 520,
          width: '100%',
          margin: '0 auto',
          minHeight: 0,
        }}
        onPointerDown={!isFlipped ? onPointerDown : undefined}
        onPointerMove={!isFlipped ? onPointerMove : undefined}
        onPointerUp={!isFlipped ? onPointerUp : undefined}
        onPointerLeave={!isFlipped ? onPointerUp : undefined}
      >
        {/* Ghost card underneath */}
        {nextMember && (
          <div style={{
            position: 'absolute',
            inset: 8,
            background: 'var(--surface2)',
            borderRadius: 20,
            transform: 'scale(0.95)',
            zIndex: 0,
            border: '1px solid var(--border)',
          }} />
        )}

        {/* Main card */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <FlashCard
            key={cardKey}
            member={member}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(f => !f)}
            dragX={state.dx}
            dragY={state.dy}
            isDragging={state.swiping}
            swipeResult={state.result}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        flexShrink: 0,
        marginTop: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '12px 24px',
      }}>
      <div style={{
        display: 'flex',
        gap: 24,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <ActionButton
          onClick={() => triggerSwipe('left')}
          disabled={!isFlipped}
          variant="wrong"
          label="Didn't know"
          icon="✕"
        />

        {!isFlipped ? (
          <button
            onClick={() => setIsFlipped(true)}
            style={{
              background: 'linear-gradient(135deg, var(--navy), #1a2f5e)',
              color: 'var(--text)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 50,
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 0.5,
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
            }}
          >
            Reveal Answer
          </button>
        ) : (
          <div style={{ width: 120, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            Did you know them?
          </div>
        )}

        <ActionButton
          onClick={() => triggerSwipe('right')}
          disabled={!isFlipped}
          variant="correct"
          label="Knew it!"
          icon="✓"
        />
      </div>
      </div>

      {/* Keyboard hint */}
      <div style={{
        textAlign: 'center',
        fontSize: 11,
        color: 'rgba(139,148,158,0.5)',
        paddingBottom: 4,
        flexShrink: 0,
      }}>
        {isFlipped ? '← Didn\'t know  ·  Knew it →  ·  Swipe card' : 'Space to reveal  ·  Swipe card to skip'}
      </div>
    </div>
  );
}

function ActionButton({ onClick, disabled, variant, label, icon }: {
  onClick: () => void;
  disabled: boolean;
  variant: 'correct' | 'wrong';
  label: string;
  icon: string;
}) {
  const isCorrect = variant === 'correct';
  const colour = isCorrect ? 'var(--green-light)' : 'var(--red-light)';
  const bg = isCorrect ? 'rgba(0,107,60,0.15)' : 'rgba(185,28,28,0.15)';
  const bgHover = isCorrect ? 'rgba(0,107,60,0.3)' : 'rgba(185,28,28,0.3)';
  const border = isCorrect ? 'rgba(46,160,67,0.4)' : 'rgba(185,28,28,0.4)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: disabled ? 'rgba(255,255,255,0.04)' : bg,
        border: `2px solid ${disabled ? 'var(--border)' : border}`,
        color: disabled ? 'var(--text-muted)' : colour,
        fontSize: 22,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        boxShadow: disabled ? 'none' : `0 4px 15px ${isCorrect ? 'rgba(0,107,60,0.2)' : 'rgba(185,28,28,0.2)'}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = bgHover;
      }}
      onMouseLeave={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = bg;
      }}
    >
      {icon}
    </button>
  );
}
