import { useState, useEffect } from 'react';
import type { Member } from '../types';
import { getPartyClass } from '../hooks/useDeck';

interface Props {
  member: Member;
  isFlipped: boolean;
  onFlip: () => void;
  dragX: number;
  dragY: number;
  isDragging: boolean;
  swipeResult: 'left' | 'right' | null;
}

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 267' fill='%231a2233'%3E%3Crect width='200' height='267'/%3E%3Ccircle cx='100' cy='90' r='45' fill='%2330363d'/%3E%3Cellipse cx='100' cy='200' rx='70' ry='50' fill='%2330363d'/%3E%3C/svg%3E";

export function FlashCard({ member, isFlipped, onFlip, dragX, dragY, isDragging, swipeResult }: Props) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [member.id]);

  const rotation = isDragging ? dragX / 20 : 0;
  const opacity = swipeResult ? 0 : 1;

  const translateX = swipeResult === 'right' ? 600 : swipeResult === 'left' ? -600 : dragX;
  const translateY = swipeResult ? -50 : dragY * 0.3;

  const cardTransform = `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`;
  const transition = swipeResult || !isDragging ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease' : 'none';

  const partyClass = getPartyClass(member.party);

  const leftIndicatorOpacity = isDragging && dragX < -20 ? Math.min((-dragX - 20) / 80, 1) : 0;
  const rightIndicatorOpacity = isDragging && dragX > 20 ? Math.min((dragX - 20) / 80, 1) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: cardTransform,
        transition,
        opacity,
        cursor: isFlipped ? 'default' : 'pointer',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Swipe indicators */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        zIndex: 10,
        background: 'rgba(185,28,28,0.9)',
        color: '#fff',
        fontWeight: 700,
        fontSize: 22,
        padding: '8px 18px',
        borderRadius: 10,
        border: '3px solid #ef4444',
        opacity: leftIndicatorOpacity,
        transform: 'rotate(-15deg)',
        letterSpacing: 2,
        pointerEvents: 'none',
      }}>NOPE</div>

      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        zIndex: 10,
        background: 'rgba(0,107,60,0.9)',
        color: '#fff',
        fontWeight: 700,
        fontSize: 22,
        padding: '8px 18px',
        borderRadius: 10,
        border: '3px solid #2ea043',
        opacity: rightIndicatorOpacity,
        transform: 'rotate(15deg)',
        letterSpacing: 2,
        pointerEvents: 'none',
      }}>KNEW IT</div>

      <div className="card-scene" style={{ height: '100%' }}>
        <div className={`card-inner${isFlipped ? ' flipped' : ''}`}>
          {/* FRONT */}
          <div className="card-face" style={{ background: 'var(--card-bg)', cursor: 'pointer', position: 'relative' }} onClick={onFlip}>
            {/* Photo — full card */}
            {!imgLoaded && (
              <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
            )}
            <img
              src={imgError ? PLACEHOLDER : member.photoUrl}
              alt={member.name}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(true); }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: imgLoaded ? 'block' : 'none',
              }}
              draggable={false}
            />

            {/* Bottom overlay — sits over the lower portion of the photo */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '32px 16px 14px',
              background: 'linear-gradient(to bottom, transparent, rgba(13,17,23,0.97))',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 20,
                  padding: '5px 13px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} className={partyClass} />
                  {member.party}
                </span>
                <span style={{
                  background: member.house === 'Commons' ? 'rgba(0,107,60,0.35)' : 'rgba(201,162,39,0.25)',
                  color: member.house === 'Commons' ? '#4ade80' : 'var(--gold-light)',
                  borderRadius: 20,
                  padding: '5px 13px',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  {member.house === 'Commons' ? 'Commons' : 'Lords'}
                </span>
                {member.isMinister && (
                  <span style={{
                    background: 'rgba(201,162,39,0.25)',
                    color: 'var(--gold-light)',
                    borderRadius: 20,
                    padding: '5px 13px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}>★ Minister</span>
                )}
              </div>

              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15 }}>👆</span>
                Tap to reveal
              </div>
            </div>
          </div>

          {/* BACK */}
          <div className="card-face card-back" style={{ background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
            {/* Header accent */}
            <div style={{
              height: 6,
              background: member.house === 'Commons'
                ? 'linear-gradient(90deg, var(--green), var(--green-light))'
                : 'linear-gradient(90deg, var(--gold), var(--gold-light))',
            }} />

            {/* Thumbnail + answer */}
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '24px 24px 20px', gap: 20, overflow: 'auto' }}>
              {/* Small portrait */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 80,
                  height: 100,
                  borderRadius: 12,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '2px solid var(--border)',
                  background: '#0d1117',
                }}>
                  <img
                    src={imgError ? PLACEHOLDER : member.photoUrl}
                    alt={member.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                    draggable={false}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(18px, 4vw, 26px)',
                    fontWeight: 900,
                    color: 'var(--text)',
                    lineHeight: 1.15,
                  }}>{member.name}</h2>
                  {member.fullTitle && member.fullTitle !== member.name && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {member.fullTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {member.constituency && (
                  <InfoRow
                    icon={member.house === 'Commons' ? '🗳️' : '👑'}
                    label={member.house === 'Commons' ? 'Constituency' : 'Peerage'}
                    value={member.constituency}
                    highlight={member.house === 'Commons' ? 'green' : 'gold'}
                  />
                )}
                <InfoRow
                  icon="🏛️"
                  label="House"
                  value={member.house === 'Commons' ? 'House of Commons' : 'House of Lords'}
                  highlight={member.house === 'Commons' ? 'green' : 'gold'}
                />
                <InfoRow
                  icon="🎗️"
                  label="Party"
                  value={member.party}
                  partyClass={partyClass}
                />
                {member.isMinister && member.ministerialTitle && (
                  <InfoRow
                    icon="★"
                    label="Ministerial Role"
                    value={member.ministerialTitle}
                    highlight="gold"
                  />
                )}
                {member.department && (
                  <InfoRow
                    icon="🏢"
                    label="Department"
                    value={member.department}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, highlight, partyClass }: {
  icon: string;
  label: string;
  value: string;
  highlight?: 'green' | 'gold';
  partyClass?: string;
}) {
  const colour = highlight === 'green' ? '#4ade80' : highlight === 'gold' ? 'var(--gold-light)' : 'var(--text)';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      padding: '10px 14px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      borderLeft: `3px solid ${colour}`,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>
        {partyClass ? (
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', marginTop: 3 }} className={partyClass} />
        ) : icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: colour, lineHeight: 1.4 }}>{value}</div>
      </div>
    </div>
  );
}
