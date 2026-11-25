import type { SessionPackageOffer } from './api';

export type PackageKey = string;
export type PackageSelection = { package_ids: string[]; package_quantities?: Record<string, number> };

export function packageQuantity(selection: PackageSelection, key: string) {
  return selection.package_ids.includes(key) ? selection.package_quantities?.[key] ?? 1 : 0;
}

export function selectedPackages(child?: PackageSelection, offers: SessionPackageOffer[] = []): PackageSelection {
  const ids = child ? [...child.package_ids] : offers.filter(offer => offer.kind === 'base' && offer.available).slice(0, 1).map(offer => offer.id);
  return { package_ids: ids, package_quantities: Object.fromEntries(ids.map(id => [id, child ? packageQuantity(child, id) : 1])) };
}

export function hasBasePackage(selection: PackageSelection, offers: SessionPackageOffer[]) {
  return offers.some(offer => offer.kind === 'base' && selection.package_ids.includes(offer.id));
}

export function packagePatch(current: PackageSelection, key: PackageKey, offers: SessionPackageOffer[]): PackageSelection {
  const selected = current.package_ids.includes(key);
  const target = offers.find(offer => offer.id === key);
  if (!target || (!target.available && !selected)) return selectedPackages(current);
  if (target.kind === 'base') {
    const ids = [...current.package_ids.filter(id => !offers.some(offer => offer.id === id && offer.kind === 'base')), key];
    return selectedPackages({ package_ids: ids, package_quantities: { ...current.package_quantities, [key]: packageQuantity(current, key) || 1 } });
  }
  if (!hasBasePackage(current, offers) && !selected) return selectedPackages(current);
  return selectedPackages({ package_ids: selected ? current.package_ids.filter(id => id !== key) : [...current.package_ids, key], package_quantities: { ...current.package_quantities, [key]: 1 } });
}

export function quantityPatch(current: PackageSelection, key: PackageKey, quantity: number, offers: SessionPackageOffer[]): PackageSelection {
  const offer = offers.find(item => item.id === key);
  if (!offer || !current.package_ids.includes(key) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || (!offer.available && quantity > packageQuantity(current, key))) return selectedPackages(current);
  return selectedPackages({ ...current, package_quantities: { ...selectedPackages(current).package_quantities, [key]: quantity } });
}

export function samePackages(left: PackageSelection, right: PackageSelection) {
  return left.package_ids.length === right.package_ids.length && left.package_ids.every(id => packageQuantity(left, id) === packageQuantity(right, id));
}

export function packageTotal(selection: PackageSelection, offers: SessionPackageOffer[]) {
  return offers.reduce((sum, offer) => sum + packageQuantity(selection, offer.id) * Math.round(offer.price * 100), 0) / 100;
}

const moneyFormat = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 });
export const formatMoney = (amount: number) => moneyFormat.format(amount);
