'use client';

export default function PackageQuantity({ quantity, onChange, label, disabled = false, max = 99 }: {
  quantity: number; onChange: (quantity: number) => void; label: string; disabled?: boolean; max?: number;
}) {
  if (!quantity) return null;
  return <span className="package-quantity"><span aria-hidden="true">×</span><input type="number" min={1} max={max} step={1} value={quantity}
    disabled={disabled} aria-label={label} onChange={event => {
      const value = event.target.valueAsNumber;
      if (Number.isInteger(value) && value >= 1 && value <= max) onChange(value);
    }} /></span>;
}
