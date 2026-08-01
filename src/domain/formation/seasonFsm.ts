import type { SeasonStatus } from './types';

/** Allowed season status transitions (server + local validation). */
const ALLOWED: Record<SeasonStatus, readonly SeasonStatus[]> = {
  active: ['grace', 'completed', 'archived'],
  grace: ['completed', 'archived', 'active'],
  completed: ['archived'],
  archived: [],
};

export function canTransitionSeason(from: SeasonStatus, to: SeasonStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertSeasonTransition(from: SeasonStatus, to: SeasonStatus): void {
  if (!canTransitionSeason(from, to)) {
    throw new Error(`Invalid season transition: ${from} → ${to}`);
  }
}
