// RevenueCat purchases bridge with graceful web fallback.
import { TIERS, getActiveTier } from './entitlements.js';

let isInitialized = false;
let mockPro = false;

// Fallback offerings for web and development preview
export const DEFAULT_OFFERINGS = {
  current: {
    monthly: {
      identifier: '$rc_monthly',
      product: {
        identifier: 'muscletrack_monthly_sub',
        title: 'MuscleTrack Pro Monthly',
        description: 'Unlimited access to AI Coach, recovery map, and adaptive nutrition.',
        priceString: '$9.99',
        price: 9.99,
        currencyCode: 'USD'
      }
    },
    annual: {
      identifier: '$rc_annual',
      product: {
        identifier: 'muscletrack_annual_sub',
        title: 'MuscleTrack Pro Annual',
        description: 'Save 50% on MuscleTrack Pro for a full year of peak performance.',
        priceString: '$59.99',
        price: 59.99,
        currencyCode: 'USD'
      }
    }
  }
};

async function getNativePurchases() {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    try {
      const plugin = window.Capacitor?.Plugins?.Purchases;
      if (plugin) return plugin;
      const mod = '@revenuecat/purchases-capacitor';
      const imp = await import(/* @vite-ignore */ mod);
      return imp?.Purchases;
    } catch {
      return null;
    }
  }
  return null;
}

export async function initPurchases(apiKey) {
  if (isInitialized) return true;
  try {
    const Purchases = await getNativePurchases();
    if (Purchases && apiKey) {
      await Purchases.configure({ apiKey });
      isInitialized = true;
      return true;
    }
  } catch (err) {
    console.warn('[Purchases] Native RevenueCat not available, using fallback:', err.message);
  }
  isInitialized = true;
  return false;
}

export async function getOfferings() {
  try {
    const Purchases = await getNativePurchases();
    if (Purchases) {
      const offerings = await Purchases.getOfferings();
      if (offerings?.current) return offerings;
    }
  } catch (err) {
    // Fallback to defaults
  }
  return DEFAULT_OFFERINGS;
}

export async function purchasePackage(pkgIdentifier = '$rc_annual') {
  try {
    const Purchases = await getNativePurchases();
    if (Purchases) {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: { identifier: pkgIdentifier } });
      return {
        success: true,
        customerInfo,
        tier: getActiveTier(customerInfo?.entitlements?.active?.pro)
      };
    }
  } catch (err) {
    if (err.userCancelled) return { success: false, cancelled: true };
    console.warn('[Purchases] Purchase failed:', err);
  }

  // Web/Demo mode toggle
  mockPro = true;
  return {
    success: true,
    tier: TIERS.PRO,
    customerInfo: {
      entitlements: {
        active: {
          pro: {
            isActive: true,
            expiresDate: new Date(Date.now() + 365 * 86400000).toISOString()
          }
        }
      }
    }
  };
}

export async function restorePurchases() {
  try {
    const Purchases = await getNativePurchases();
    if (Purchases) {
      const { customerInfo } = await Purchases.restorePurchases();
      return {
        success: true,
        customerInfo,
        tier: getActiveTier(customerInfo?.entitlements?.active?.pro)
      };
    }
  } catch (err) {
    console.warn('[Purchases] Restore failed:', err);
  }

  return {
    success: true,
    tier: mockPro ? TIERS.PRO : TIERS.FREE,
    restored: mockPro
  };
}

export function setMockPro(val) {
  mockPro = !!val;
}

export function isMockPro() {
  return mockPro;
}
