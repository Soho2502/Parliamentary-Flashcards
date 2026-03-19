import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Member, Filters } from '../types';

const STORAGE_KEY = 'parliament-quiz-known';
const REINSERTION_WINDOW = 7; // re-insert wrong cards within next 7 cards

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadKnown(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {}
  return new Set();
}

function saveKnown(known: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...known]));
}

function getPartyClass(party: string): string {
  const p = party.toLowerCase();
  if (p.includes('labour')) return 'party-labour';
  if (p.includes('conservative')) return 'party-conservative';
  if (p.includes('liberal') || p.includes('lib dem')) return 'party-libdem';
  if (p.includes('snp') || p.includes('scottish national')) return 'party-snp';
  if (p.includes('green')) return 'party-green';
  if (p.includes('dup') || p.includes('democratic unionist')) return 'party-dup';
  if (p.includes('sinn féin') || p.includes('sinn fein')) return 'party-sinn-fein';
  if (p.includes('plaid')) return 'party-plaid';
  if (p.includes('reform')) return 'party-reform';
  return 'party-other';
}

export { getPartyClass };

export function useDeck(allMembers: Member[], filters: Filters) {
  const [knownIds, setKnownIds] = useState<Set<number>>(loadKnown);
  const [queue, setQueue] = useState<Member[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionKnown, setSessionKnown] = useState<Set<number>>(new Set());
  const [sessionUnknown, setSessionUnknown] = useState<Set<number>>(new Set());

  const filteredMembers = useMemo(() => {
    return allMembers.filter(m => {
      if (filters.house !== 'all' && m.house !== filters.house) return false;
      if (filters.party !== 'all' && !m.party.toLowerCase().includes(filters.party.toLowerCase())) return false;
      if (filters.ministersOnly && !m.isMinister) return false;
      return true;
    });
  }, [allMembers, filters]);

  const initDeck = useCallback((members: Member[]) => {
    setQueue(shuffle(members));
    setCurrentIndex(0);
    setSessionKnown(new Set());
    setSessionUnknown(new Set());
  }, []);

  useEffect(() => {
    initDeck(filteredMembers);
  }, [filteredMembers, initDeck]);

  const currentCard = queue[currentIndex] ?? null;
  const nextCard = queue[currentIndex + 1] ?? null;
  const remaining = queue.length - currentIndex;

  const markKnown = useCallback(() => {
    if (!currentCard) return;
    const newKnown = new Set(knownIds);
    newKnown.add(currentCard.id);
    setKnownIds(newKnown);
    saveKnown(newKnown);
    setSessionKnown(prev => new Set([...prev, currentCard.id]));
    setCurrentIndex(i => i + 1);
  }, [currentCard, knownIds]);

  const markUnknown = useCallback(() => {
    if (!currentCard) return;
    setSessionUnknown(prev => new Set([...prev, currentCard.id]));
    // Reinsert the card within the next REINSERTION_WINDOW cards
    setQueue(prev => {
      const next = [...prev];
      const insertAt = Math.min(currentIndex + 1 + Math.floor(Math.random() * REINSERTION_WINDOW), next.length);
      next.splice(insertAt, 0, currentCard);
      return next;
    });
    setCurrentIndex(i => i + 1);
  }, [currentCard, currentIndex]);

  const reshuffle = useCallback(() => {
    initDeck(filteredMembers);
  }, [filteredMembers, initDeck]);

  const resetProgress = useCallback(() => {
    const empty = new Set<number>();
    setKnownIds(empty);
    saveKnown(empty);
    initDeck(filteredMembers);
  }, [filteredMembers, initDeck]);

  return {
    currentCard,
    nextCard,
    remaining,
    total: filteredMembers.length,
    knownCount: knownIds.size,
    sessionKnown: sessionKnown.size,
    sessionUnknown: sessionUnknown.size,
    markKnown,
    markUnknown,
    reshuffle,
    resetProgress,
    isFinished: remaining === 0,
  };
}
