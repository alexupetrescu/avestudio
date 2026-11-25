'use client';

import { use, useCallback, useMemo, useState } from 'react';
import PinGate from '@/components/PinGate';
import PackageQuantity from '@/components/PackageQuantity';
import {
    addChild, classListPdfUrl, deleteChild, fetchSchoolClass, updateChild, verifyClassPin,
    type ChildOrder, type SchoolClassOrder,
} from '@/lib/api';

import { formatMoney, hasBasePackage, packagePatch, quantityPatch, packageQuantity, samePackages, packageTotal, selectedPackages, type PackageSelection } from '@/lib/crm-packages';

export default function TeacherOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const storageKey = `class_pin_${id}`;

    const [pin, setPin] = useState('');
    const [data, setData] = useState<SchoolClassOrder | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [lastName, setLastName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [newPackages, setNewPackages] = useState<PackageSelection>({ package_ids: [] });

    const PACKAGES = data?.offers ?? [];
    const MAIN_PACKAGES = PACKAGES.filter(offer => offer.kind === 'base');
    const ADDONS = PACKAGES.filter(offer => offer.kind === 'extra');

    const load = useCallback(async (p: string) => {
        try {
            const result = await fetchSchoolClass(id, p);
            setData(result);
            setNewPackages(selectedPackages(undefined, result.offers));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Eroare la încărcare');
        }
    }, [id]);

    const onUnlocked = (p: string) => {
        setPin(p);
        load(p);
    };

    const totals = useMemo(() => {
        if (!data) return null;
        const counts: Record<string, number> = Object.fromEntries(data.offers.map(offer => [offer.id, 0]));
        let lei = 0;
        data.children.forEach((c) => {
            PACKAGES.forEach((p) => {
                counts[p.id] += packageQuantity(c, p.id);
            });
            lei += Math.round(c.total_lei * 100);
        });
        return { counts, lei: lei / 100 };
    }, [data]);

    const replaceChild = (child: ChildOrder) =>
        setData((d) => d && { ...d, children: d.children.map((c) => (c.id === child.id ? child : c)) });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data) return;
        setError('');
        setBusy('add');
        try {
            const child = await addChild(id, pin, { last_name: lastName, first_name: firstName, ...newPackages });
            setData({ ...data, children: [...data.children, child].sort((x, y) => `${x.last_name} ${x.first_name}`.localeCompare(`${y.last_name} ${y.first_name}`, 'ro')) });
            setLastName('');
            setFirstName('');
            setNewPackages(selectedPackages(undefined, PACKAGES));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Eroare');
        } finally {
            setBusy(null);
        }
    };

    const changePackages = async (child: ChildOrder, key: string, quantity?: number) => {
        const patch = quantity === undefined ? packagePatch(child, key, PACKAGES) : quantityPatch(child, key, quantity, PACKAGES);
        if (samePackages(child, patch)) return;
        setError('');
        setBusy(child.id);
        replaceChild({ ...child, ...patch, total_lei: packageTotal(patch, PACKAGES) });
        try {
            replaceChild(await updateChild(id, pin, child.id, patch));
        } catch (err) {
            replaceChild(child);
            setError(err instanceof Error ? err.message : 'Eroare');
        } finally {
            setBusy(null);
        }
    };

    const remove = async (child: ChildOrder) => {
        if (!window.confirm(`Ștergeți ${child.last_name} ${child.first_name} din listă?`)) return;
        setError('');
        setBusy(child.id);
        try {
            await deleteChild(id, pin, child.id);
            setData((d) => d && { ...d, children: d.children.filter((c) => c.id !== child.id) });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Eroare');
        } finally {
            setBusy(null);
        }
    };

    return (
        <PinGate
            storageKey={storageKey}
            verify={(p) => verifyClassPin(id, p)}
            onUnlocked={onUnlocked}
            theme="xmas"
            eyebrow={`Lista de comenzi${data?.session_label ? ` · ${data.session_label}` : ''}`}
            title="Pagina clasei"
            hint="Introduceți PIN-ul primit de la fotograf pentru a completa lista copiilor și pachetele dorite."
        >
            <div className="xmas min-h-screen">
                <section className="pt-32 pb-10 px-6">
                    <div className="max-w-5xl mx-auto">
                        <p className="text-[11px] font-semibold tracking-[0.25em] uppercase mb-3" style={{ color: 'var(--xmas-burgundy)' }}>
                            Lista de comenzi{data?.session_label ? ` · ${data.session_label}` : ''}
                        </p>
                        {data ? (
                            <>
                                <h1 className="text-3xl md:text-5xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--xmas-green)' }}>
                                    {data.school_name}
                                </h1>
                                <p className="text-lg" style={{ color: 'var(--ave-secondary)' }}>
                                    {data.name} · {data.session_label}{data.teacher_name ? ` · ${data.teacher_name}` : ''}
                                </p>
                                <div className="xmas-rule max-w-[160px] my-6" />
                                {data.shoot_display && (
                                    <div className="xmas-card inline-flex items-center gap-3 px-5 py-3 mb-5">
                                        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--xmas-burgundy)' }}>Ședința foto</span>
                                        <span className="text-lg font-semibold" style={{ color: 'var(--xmas-green)', fontFamily: 'var(--font-heading)' }}>{data.shoot_display}</span>
                                    </div>
                                )}
                                <p className="text-sm max-w-2xl" style={{ color: 'var(--ave-muted)' }}>
                                    Adăugați fiecare copil (nume și prenume), bifați pachetele dorite și completați cantitatea pentru fiecare. Modificările se salvează automat.
                                    {!data.shoot_display && data.period && <> Perioadă pentru fotografiere: <strong style={{ color: 'var(--xmas-green)' }}>{data.period}</strong>.</>}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-black/40">Se încarcă...</p>
                        )}
                    </div>
                </section>

                {data && (
                    <section className="pb-24 px-6">
                        <div className="max-w-5xl mx-auto space-y-8">
                            {/* Price legend */}
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {MAIN_PACKAGES.map((p) => (
                                        <div key={p.id} className="xmas-card p-5 flex items-start gap-4">
                                            <span className="xmas-letter">{p.code}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                                    <p className="text-lg font-semibold" style={{ color: 'var(--xmas-green)', fontFamily: 'var(--font-heading)' }}>
                                                        Pachet {p.name}
                                                    </p>
                                                    <p className="text-xl font-semibold" style={{ color: 'var(--xmas-burgundy)', fontFamily: 'var(--font-heading)' }}>
                                                        {p.list_price !== null && p.list_price > p.price && (
                                                            <span className="xmas-strike mr-2 text-sm font-normal" style={{ color: 'var(--ave-muted)' }}>{formatMoney(p.list_price!)} lei</span>
                                                        )}
                                                        {formatMoney(p.price)} lei
                                                    </p>
                                                </div>
                                                <p className="text-xs leading-snug mt-1" style={{ color: 'var(--ave-muted)' }}>{p.description}</p>
                                                {p.digital_included && <span className="xmas-tag mt-2">+ format digital inclus</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs" style={{ color: 'var(--ave-muted)' }}>
                                    Alegeți <strong>un singur tip de pachet de bază</strong> și opționalele dorite. Puteți comanda mai multe exemplare din fiecare pachet: A ×2, C ×3.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {ADDONS.map((p) => (
                                        <div key={p.id} className="xmas-card px-4 py-3 flex items-center gap-3">
                                            <span className="xmas-letter !text-base">{p.code}</span>
                                            <p className="text-sm flex-1 min-w-0" style={{ color: 'var(--xmas-ink)' }}>{p.description}</p>
                                            <p className="text-lg font-semibold whitespace-nowrap" style={{ color: 'var(--xmas-burgundy)', fontFamily: 'var(--font-heading)' }}>
                                                {formatMoney(p.price)} lei
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-600 text-sm bg-red-50 py-3 px-4 rounded-xl border border-red-100">{error}</div>
                            )}

                            {/* Add child */}
                            <form onSubmit={handleAdd} className="xmas-card p-5 md:p-6">
                                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--xmas-green)' }}>
                                    Adaugă copil
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                    <label className="block">
                                        <span className="block text-xs mb-1.5" style={{ color: 'var(--ave-muted)' }}>Nume (de familie)</span>
                                        <input className="xmas-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="off" placeholder="Popescu" />
                                    </label>
                                    <label className="block">
                                        <span className="block text-xs mb-1.5" style={{ color: 'var(--ave-muted)' }}>Prenume</span>
                                        <input className="xmas-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="off" placeholder="Ana" />
                                    </label>
                                    <button type="submit" className="xmas-btn" disabled={busy === 'add' || !lastName.trim() || !firstName.trim() || !hasBasePackage(newPackages, PACKAGES)}>
                                        {busy === 'add' ? 'Se adaugă...' : 'Adaugă'}
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-3 mt-5">
                                    {PACKAGES.map((p) => (
                                        <div key={p.id} className="package-choice"><label className="inline-flex items-center gap-2.5 text-sm cursor-pointer select-none min-h-11">
                                            <input
                                                type={p.kind === 'base' ? 'radio' : 'checkbox'}
                                                className="xmas-check"
                                                name={p.kind === 'base' ? 'new-base-package' : undefined}
                                                disabled={!p.available || (p.kind === 'extra' && !hasBasePackage(newPackages, PACKAGES))}
                                                checked={newPackages.package_ids.includes(p.id)}
                                                onChange={() => setNewPackages(current => packagePatch(current, p.id, PACKAGES))}
                                            />
                                            <span>
                                                <strong>{p.code}</strong> {p.name} · {formatMoney(p.price)} lei/buc.
                                            </span>
                                        </label><PackageQuantity quantity={packageQuantity(newPackages, p.id)} label={`Cantitate ${p.code}`} disabled={busy === 'add'} onChange={quantity => setNewPackages(current => quantityPatch(current, p.id, quantity, PACKAGES))} /></div>
                                    ))}
                                </div>
                            </form>

                            {/* List actions */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--xmas-green)' }}>
                                    Lista clasei · {data.children.length} copii
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <a
                                        href={classListPdfUrl(id, pin, true)}
                                        target="_blank"
                                        rel="noopener"
                                        className="xmas-btn xmas-btn-outline !py-2.5 !px-5 text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                                        </svg>
                                        Printează lista
                                    </a>
                                    <a
                                        href={classListPdfUrl(id, pin, false)}
                                        className="xmas-btn !py-2.5 !px-5 text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                        Descarcă PDF
                                    </a>
                                </div>
                            </div>

                            {/* Children table */}
                            <div className="xmas-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="teacher-order-table w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th className="text-left px-4 py-3 font-medium">#</th>
                                                <th className="text-left px-4 py-3 font-medium">Copil</th>
                                                {PACKAGES.map((p) => (
                                                    <th key={p.id} className="text-center px-2 py-3 font-semibold leading-tight" title={p.description}>
                                                        {p.code}
                                                        <span className="block text-[10px] font-normal">{p.name}</span>
                                                    </th>
                                                ))}
                                                <th className="text-right px-4 py-3 font-medium">Total</th>
                                                <th className="px-2 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.children.map((c, i) => (
                                                <tr key={c.id} className={busy === c.id ? 'opacity-50' : ''} style={{ borderTop: '1px solid var(--xmas-gold-soft)' }}>
                                                    <td className="px-4 py-3" style={{ color: 'var(--ave-muted)' }}>{i + 1}</td>
                                                    <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: 'var(--xmas-ink)' }}>
                                                        {c.last_name} {c.first_name}
                                                    </td>
                                                    {PACKAGES.map((p) => (
                                                        <td key={p.id} className="text-center px-2 py-3">
                                                            <label className="teacher-package-toggle">
                                                                <input
                                                                    type={p.kind === 'base' ? 'radio' : 'checkbox'}
                                                                    className="xmas-check"
                                                                    name={p.kind === 'base' ? `base-${c.id}` : undefined}
                                                                    checked={c.package_ids.includes(p.id)}
                                                                    disabled={busy === c.id || (!p.available && !c.package_ids.includes(p.id)) || (p.kind === 'extra' && !hasBasePackage(c, PACKAGES))}
                                                                    onChange={() => changePackages(c, p.id)}
                                                                    aria-label={`${p.code} pentru ${c.last_name} ${c.first_name}`}
                                                                />
                                                            </label>
                                                            <PackageQuantity quantity={packageQuantity(c, p.id)} label={`Cantitate ${p.code} pentru ${c.last_name} ${c.first_name}`} disabled={busy === c.id} max={p.available ? 99 : packageQuantity(c, p.id)} onChange={quantity => changePackages(c, p.id, quantity)} />
                                                        </td>
                                                    ))}
                                                    <td className="text-right px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--xmas-burgundy)' }}>
                                                        {formatMoney(c.total_lei)} lei
                                                    </td>
                                                    <td className="px-2 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => remove(c)}
                                                            className="teacher-remove"
                                                            aria-label="Șterge"
                                                            title="Șterge din listă"
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {data.children.length === 0 && (
                                                <tr>
                                                    <td colSpan={PACKAGES.length + 4} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--ave-muted)' }}>
                                                        Niciun copil încă. Adăugați primul copil din formularul de mai sus.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {totals && data.children.length > 0 && (
                                            <tfoot>
                                                <tr style={{ background: 'var(--xmas-green)', color: 'var(--xmas-cream)' }}>
                                                    <td className="px-4 py-3" />
                                                    <td className="px-4 py-3 font-medium">{data.children.length} copii</td>
                                                    {PACKAGES.map((p) => (
                                                        <td key={p.id} className="text-center px-2 py-3">{totals.counts[p.id]}</td>
                                                    ))}
                                                    <td className="text-right px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--xmas-gold)' }}>{formatMoney(totals.lei)} lei</td>
                                                    <td />
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            <p className="text-xs text-center" style={{ color: 'var(--ave-muted)' }}>
                                Pentru întrebări: Alexandru 0756 538 455 · Adina 0746 986 415
                            </p>
                        </div>
                    </section>
                )}
            </div>
        </PinGate>
    );
}
