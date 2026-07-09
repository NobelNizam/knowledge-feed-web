import type { CardUpdate } from './types';

export function updateCardInCache(cardId: number, updates: CardUpdate): void {
  if (typeof window === 'undefined') return;
  const savedStates = sessionStorage.getItem('feed_tab_states');
  if (!savedStates) return;
  try {
    const parsed = JSON.parse(savedStates);
    let changed = false;
    for (const key of Object.keys(parsed)) {
      const tabState = parsed[key];
      if (tabState.cards) {
        for (let i = 0; i < tabState.cards.length; i++) {
          if (tabState.cards[i].id === cardId) {
            tabState.cards[i] = { ...tabState.cards[i], ...updates };
            changed = true;
          }
        }
      }
    }
    if (changed) {
      sessionStorage.setItem('feed_tab_states', JSON.stringify(parsed));
    }
  } catch (e) {
    console.error('Failed to update cache:', e);
  }
}
