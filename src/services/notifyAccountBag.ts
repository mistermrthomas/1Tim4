import type { AccountBagKey } from './accountBags';

/** Lazy notify to avoid circular imports with domain stores. */
export function notifyAccountBag(bagKey: AccountBagKey): void {
  void import('./cloudAccountStateSync')
    .then((m) => m.notifyAccountBagSaved(bagKey))
    .catch(() => undefined);
}
