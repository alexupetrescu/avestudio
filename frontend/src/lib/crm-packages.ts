import type { SessionPackageOffer } from './api';

export type PackageKey = string;
export type PackageSelection = { package_ids: string[] };

export function selectedPackages(child?: PackageSelection, offers: SessionPackageOffer[] = []): PackageSelection {
  return { package_ids: child ? [...child.package_ids] : offers.filter(offer => offer.kind === 'base' && offer.available).slice(0, 1).map(offer => offer.id) };
}

export function hasBasePackage(selection: PackageSelection, offers: SessionPackageOffer[]) {
  return offers.some(offer => offer.kind === 'base' && selection.package_ids.includes(offer.id));
}

export function packagePatch(current: PackageSelection, key: PackageKey, offers: SessionPackageOffer[]): PackageSelection {
  const selected = current.package_ids.includes(key);
  const target = offers.find(offer => offer.id === key);
  if (!target || (!target.available && !selected)) return selectedPackages(current);
  if (target.kind === 'base') {
    return { package_ids: [...current.package_ids.filter(id => !offers.some(offer => offer.id === id && offer.kind === 'base')), key] };
  }
  if (!hasBasePackage(current, offers) && !selected) return selectedPackages(current);
  return { package_ids: selected ? current.package_ids.filter(id => id !== key) : [...current.package_ids, key] };
}

export function packageTotal(selection: PackageSelection, offers: SessionPackageOffer[]) {
  return offers.reduce((sum, offer) => sum + (selection.package_ids.includes(offer.id) ? Math.round(offer.price * 100) : 0), 0) / 100;
}

const moneyFormat = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 });
export const formatMoney = (amount: number) => moneyFormat.format(amount);
