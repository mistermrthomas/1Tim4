import { useQuery } from '@tanstack/react-query';

/** Smoke query proving TanStack Query is wired. */
export function usePhase0HealthQuery() {
  return useQuery({
    queryKey: ['phase0', 'health'],
    queryFn: async () => ({
      ok: true as const,
      checkedAt: new Date().toISOString(),
    }),
  });
}
