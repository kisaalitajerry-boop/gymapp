import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_OFFERINGS,
  getOfferings,
  purchasePackage,
  restorePurchases,
  setMockPro,
  isMockPro
} from './purchases.js';
import { TIERS } from './entitlements.js';

describe('purchases.js (RevenueCat bridge)', () => {
  beforeEach(() => {
    setMockPro(false);
  });

  it('exposes default offerings on web fallback', async () => {
    const offerings = await getOfferings();
    expect(offerings.current).toBeDefined();
    expect(offerings.current.monthly.product.priceString).toBe('$9.99');
    expect(offerings.current.annual.product.priceString).toBe('$59.99');
  });

  it('allows web simulated purchase unlocking Pro', async () => {
    expect(isMockPro()).toBe(false);
    const res = await purchasePackage('$rc_annual');
    expect(res.success).toBe(true);
    expect(res.tier).toBe(TIERS.PRO);
    expect(isMockPro()).toBe(true);
  });

  it('restores purchases correctly in web fallback', async () => {
    const pre = await restorePurchases();
    expect(pre.tier).toBe(TIERS.FREE);

    setMockPro(true);
    const post = await restorePurchases();
    expect(post.tier).toBe(TIERS.PRO);
  });
});
