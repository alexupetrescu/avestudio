import type { CrmChild, CrmPrices } from './crm-api';

export type PackageKey = 'package_a' | 'package_b' | 'package_c' | 'package_d' | 'package_e';
export type PackageSelection = Record<PackageKey, boolean>;

export const CRM_PACKAGES: { key: PackageKey; letter: string; name: string; description: string; priceKey: keyof CrmPrices }[] = [
  { key: 'package_a', letter: 'A', name: 'Standard', description: 'Calendar 20×30, 2× foto 15×20, 1× retro 10×12', priceKey: 'a' },
  { key: 'package_b', letter: 'B', name: 'Extra', description: 'Calendar 20×30, 2 felicitări, foto 20×30, 2× foto 15×20, 2× retro 10×12', priceKey: 'b' },
  { key: 'package_c', letter: 'C', name: 'Breloc', description: 'Breloc 7×5 cm', priceKey: 'c' },
  { key: 'package_d', letter: 'D', name: 'Magnet', description: 'Magnet frigider 6,5×6,5 cm', priceKey: 'd' },
  { key: 'package_e', letter: 'E', name: 'Puzzle', description: 'Puzzle 45 piese', priceKey: 'e' },
];

export function packagePatch(current: PackageSelection, key: PackageKey): Partial<PackageSelection> {
  const value = !current[key];
  return { [key]: value, ...(value && key === 'package_a' ? { package_b: false } : {}), ...(value && key === 'package_b' ? { package_a: false } : {}) };
}

export function packageTotal(child: PackageSelection, prices: CrmPrices) {
  return CRM_PACKAGES.reduce((sum, item) => sum + (child[item.key] ? prices[item.priceKey] : 0), 0);
}

export function selectedPackages(child?: CrmChild): PackageSelection {
  return { package_a: child?.package_a ?? true, package_b: child?.package_b ?? false,
    package_c: child?.package_c ?? false, package_d: child?.package_d ?? false, package_e: child?.package_e ?? false };
}
