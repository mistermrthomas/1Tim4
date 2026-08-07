import { hasGeneratedBiblicalTraining } from '../sermon/fromWeeklyPlan';
import type { WeeklyPlan } from './types';

/** True when a plan should sync / must not be overwritten by an empty cloud draft. */
export function hasMeaningfulWeeklyPlan(plan: WeeklyPlan | null | undefined): boolean {
  if (!plan) return false;
  if (plan.church.sermonNotes.trim().length >= 20) return true;
  if (plan.church.sermonTitle.trim().length > 0) return true;
  if (plan.church.primaryScripture.trim().length > 0) return true;
  if (hasGeneratedBiblicalTraining(plan)) return true;
  if (plan.status === 'active' || plan.status === 'completed') return true;
  return false;
}
