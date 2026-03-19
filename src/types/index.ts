export interface Member {
  id: number;
  name: string;
  fullTitle: string;
  party: string;
  house: 'Commons' | 'Lords';
  constituency: string | null;
  photoUrl: string;
  isMinister: boolean;
  ministerialTitle: string | null;
  department: string | null;
  gender: string;
}

export type SwipeDirection = 'left' | 'right';

export interface DeckState {
  known: Set<number>;
  unknown: Set<number>;
  queue: Member[];
}

export interface Filters {
  house: 'all' | 'Commons' | 'Lords';
  party: string;
  ministersOnly: boolean;
}
