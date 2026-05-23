import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Member, Filters } from '../types';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'parliament-quiz-known';
const REINSERTION_MIN = 10;
const REINSERTION_MAX = 20;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadKnownLocal(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {}
  return new Set();
}

function saveKnownLocal(known: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...known]));
}

async function loadKnownRemote(userId: string): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('member_id')
    .eq('user_id', userId);
  if (error || !data) return new Set();
  return new Set(data.map((r: { member_id: number }) => r.member_id));
}

async function addKnownRemote(userId: string, memberId: number) {
  await supabase
    .from('user_progress')
    .upsert({ user_id: userId, member_id: memberId });
}

async function removeKnownRemote(userId: string, memberId: number) {
  await supabase
    .from('user_progress')
    .delete()
    .eq('user_id', userId)
    .eq('member_id', memberId);
}

async function saveSession(userId: string, score: number, total: number, filters: Filters) {
  await supabase.from('sessions').insert({
    user_id: userId,
    score,
    total,
    filters_json: filters,
  });
}

export function getPartyClass(party: string): string {
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

export function useDeck(allMembers: Member[], filters: Filters, user: User | null) {
  const [knownIds, setKnownIds] = useState<Set<number>>(loadKnownLocal);
  const [queue, setQueue] = useState<Member[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionKnown, setSessionKnown] = useState<Set<number>>(new Set());
  const [sessionUnknown, setSessionUnknown] = useState<Set<number>>(new Set());
  const [sessionSaved, setSessionSaved] = useState(false);

  // Load known IDs from Supabase when user logs in
  useEffect(() => {
    if (!user) {
      setKnownIds(loadKnownLocal());
      return;
    }
    loadKnownRemote(user.id).then(ids => setKnownIds(ids));
  }, [user]);

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
    setSessionSaved(false);
  }, []);

  useEffect(() => {
    initDeck(filteredMembers);
  }, [filteredMembers, initDeck]);

  const currentCard = queue[currentIndex] ?? null;
  const nextCard = queue[currentIndex + 1] ?? null;
  const remaining = queue.length - currentIndex;

  // Save session when finished
  useEffect(() => {
    if (remaining === 0 && sessionKnown.size + sessionUnknown.size > 0 && !sessionSaved && user) {
      saveSession(user.id, sessionKnown.size, filteredMembers.length, filters);
      setSessionSaved(true);
    }
  }, [remaining, sessionKnown.size, sessionUnknown.size, sessionSaved, user, filteredMembers.length, filters]);

  const markKnown = useCallback(() => {
    if (!currentCard) return;
    const newKnown = new Set(knownIds);
    newKnown.add(currentCard.id);
    setKnownIds(newKnown);
    if (user) {
      addKnownRemote(user.id, currentCard.id);
    } else {
      saveKnownLocal(newKnown);
    }
    setSessionKnown(prev => new Set([...prev, currentCard.id]));
    setCurrentIndex(i => i + 1);
  }, [currentCard, knownIds, user]);

  const markUnknown = useCallback(() => {
    if (!currentCard) return;
    setSessionUnknown(prev => new Set([...prev, currentCard.id]));
    setQueue(prev => {
      const next = [...prev];
      const gap = REINSERTION_MIN + Math.floor(Math.random() * (REINSERTION_MAX - REINSERTION_MIN));
      const insertAt = Math.min(currentIndex + gap, next.length);
      next.splice(insertAt, 0, currentCard);
      return next;
    });
    setCurrentIndex(i => i + 1);
  }, [currentCard, currentIndex]);

  const reshuffle = useCallback(() => {
    initDeck(filteredMembers);
  }, [filteredMembers, initDeck]);

  const resetProgress = useCallback(async () => {
    const empty = new Set<number>();
    setKnownIds(empty);
    if (user) {
      await supabase.from('user_progress').delete().eq('user_id', user.id);
    } else {
      saveKnownLocal(empty);
    }
    initDeck(filteredMembers);
  }, [filteredMembers, initDeck, user]);

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
