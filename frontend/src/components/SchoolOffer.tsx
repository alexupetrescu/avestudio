import Image from 'next/image';
import Link from 'next/link';

export type OfferVariant = 'new' | 'returning';

export const LIST_PRICE = 85;
export const PRICES: Record<OfferVariant, number> = { new: 75, returning: 70 };
export const EXTRA_PRICES = { b: 40, c: 25, d: 105 };
export const PERIOD = '9 noiembrie - 5 decembrie 2026';
export const SEASON = 2026;

const BASE_PRODUCTS = [
  { src: '/oferta/calendar.webp', w: 933, h: 1400, title: 'Calendar 20x30 cm', sub: `cu design ${SEASON + 1}` },
  { src: '/oferta/poza-20x30.webp', w: 567, h: 850, title: 'Fotografie 20x30 cm', sub: 'tablou mare' },
  { src: '/oferta/poza-15x20.webp', w: 425, h: 595, title: 'Fotografie 15x20 cm', sub: 'print premium' },
  { src: '/oferta/felicitare-15x21.webp', w: 1000, h: 1400, title: 'Felicitare 15x21 cm', sub: 'cu design de Crăciun' },
  { src: '/oferta/felicitare-21x15.webp', w: 1400, h: 1000, title: 'Felicitare 21x15 cm', sub: 'cu design de Crăciun' },
  { src: '/oferta/poza-retro-10x12.webp', w: 1167, h: 1400, title: 'Fotografie retro 10x12 cm', sub: 'stil polaroid' },
];

const EXTRAS = [
  { letter: 'B', src: '/oferta/breloc.webp', w: 431, h: 229, title: 'Breloc 7x5 cm', price: EXTRA_PRICES.b },
  { letter: 'C', src: '/oferta/magnet.webp', w: 1024, h: 1024, title: 'Magnet frigider 6.5x6.5 cm', price: EXTRA_PRICES.c },
  { letter: 'D', src: '/oferta/puzzle.webp', w: 435, h: 435, title: 'Puzzle 45 piese', price: EXTRA_PRICES.d },
];

export function Star({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`xmas-star ${className}`} aria-hidden="true">
      <path d="M12 0c.6 7.2 4.8 11.4 12 12-7.2.6-11.4 4.8-12 12-.6-7.2-4.8-11.4-12-12 7.2-.6 11.4-4.8 12-12z" />
    </svg>
  );
}

export function GoldRule({ children }: { children?: React.ReactNode }) {
  return (
    <div className="xmas-rule">
      <Star />
      {children}
      <Star />
    </div>
  );
}

export function formatPhone(p: string) {
  return p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
}

export default function SchoolOffer({ variant }: { variant: OfferVariant }) {
  const price = PRICES[variant];
  const saving = LIST_PRICE - price;
  const isReturning = variant === 'returning';

  const alexName = process.env.NEXT_PUBLIC_CONTACT_ALEX_NAME || 'Alexandru';
  const alexPhone = process.env.NEXT_PUBLIC_CONTACT_ALEX_PHONE || '0756538455';
  const adinaName = process.env.NEXT_PUBLIC_CONTACT_ADINA_NAME || 'Adina';
  const adinaPhone = process.env.NEXT_PUBLIC_CONTACT_ADINA_PHONE || '0746986415';

  return (
    <div className="xmas min-h-screen">
      {/* Hero */}
      <section
        className="xmas-hero relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28 px-6"
        style={{ background: 'var(--xmas-green)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 0.6px, transparent 0)', backgroundSize: '32px 32px' }}
        />
        <div className="relative max-w-5xl mx-auto">
          <div className="xmas-frame p-8 md:p-14 text-center" style={{ borderColor: 'var(--xmas-gold)' }}>
            <p className="text-[11px] md:text-xs font-semibold tracking-[0.3em] uppercase mb-6" style={{ color: 'var(--xmas-gold)' }}>
              Ofertă foto Crăciun {SEASON} · Școli &amp; Grădinițe
            </p>

            {isReturning && (
              <div className="mb-6 flex justify-center">
                <span className="xmas-ribbon">
                  <Star className="!w-3 !h-3 !text-white" />
                  Preț redus pentru clienții fideli
                </span>
              </div>
            )}

            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight mb-8"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--xmas-cream)' }}
            >
              Amintiri de sărbătoare,
              <br />
              <em className="font-normal italic" style={{ color: 'var(--xmas-gold)' }}>
                pentru fiecare copil
              </em>
            </h1>

            <div className="max-w-xs mx-auto mb-8">
              <GoldRule>
                <span className="text-sm tracking-[0.25em] uppercase" style={{ color: 'var(--xmas-gold)' }}>
                  Standard
                </span>
              </GoldRule>
            </div>

            <div className="flex items-end justify-center gap-5 md:gap-8">
              <div className="text-right">
                <p className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(247,243,234,0.5)' }}>
                  Preț de listă
                </p>
                <p
                  className="xmas-strike text-3xl md:text-4xl font-light"
                  style={{ color: 'var(--xmas-gold)', fontFamily: 'var(--font-heading)' }}
                >
                  {LIST_PRICE} lei
                </p>
              </div>
              <div className="text-left">
                <p className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(247,243,234,0.5)' }}>
                  {isReturning ? 'Prețul dumneavoastră' : 'Preț ofertă'}
                </p>
                <p
                  className="text-6xl md:text-8xl font-semibold leading-none"
                  style={{ color: 'var(--xmas-cream)', fontFamily: 'var(--font-heading)' }}
                >
                  {price}
                  <span className="text-2xl md:text-4xl font-normal ml-2" style={{ color: 'var(--xmas-gold)' }}>
                    lei
                  </span>
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm md:text-base" style={{ color: 'rgba(247,243,234,0.7)' }}>
              Economisiți <strong style={{ color: 'var(--xmas-gold)' }}>{saving} lei</strong> față de prețul de listă
              {isReturning ? ', ca mulțumire pentru încrederea acordată și anul trecut.' : '.'}
            </p>
          </div>
        </div>
      </section>

      {/* Section A */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-5 mb-4">
            <span className="xmas-letter">A</span>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: 'var(--xmas-burgundy)' }}>
                Secțiunea A
              </p>
              <h2
                className="text-3xl md:text-5xl font-semibold tracking-tight"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--xmas-green)' }}
              >
                Pachetul de bază · {price} lei
              </h2>
            </div>
          </div>
          <p className="text-base md:text-lg max-w-2xl mb-12" style={{ color: 'rgba(43,36,32,0.65)' }}>
            Toate produsele sunt personalizate cu fotografia copilului dumneavoastră, realizată în studio mobil, la școală sau grădiniță.
          </p>

          <div className="xmas-card p-6 md:p-10">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {BASE_PRODUCTS.map((p) => (
                <figure key={p.src} className="text-center">
                  <div
                    className="relative aspect-[3/4] flex items-center justify-center rounded-xl overflow-hidden"
                    style={{ background: 'var(--xmas-cream)' }}
                  >
                    <Image
                      src={p.src}
                      alt={p.title}
                      width={p.w}
                      height={p.h}
                      className="max-h-full w-auto object-contain p-3 drop-shadow-[0_12px_24px_rgba(31,58,46,0.18)]"
                      sizes="(max-width: 768px) 45vw, 30vw"
                    />
                  </div>
                  <figcaption className="mt-4">
                    <p className="font-medium text-sm md:text-base" style={{ color: 'var(--xmas-green)' }}>
                      {p.title}
                    </p>
                    <p className="text-xs md:text-sm" style={{ color: 'rgba(43,36,32,0.55)' }}>
                      {p.sub}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div
              className="mt-10 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              style={{ borderTop: '1px solid var(--xmas-gold-soft)' }}
            >
              <p
                className="text-lg md:text-xl font-medium"
                style={{ color: 'var(--xmas-burgundy)', fontFamily: 'var(--font-heading)' }}
              >
                + format digital
                <span
                  className="block text-sm font-normal mt-1"
                  style={{ color: 'rgba(43,36,32,0.55)', fontFamily: 'var(--font-body)' }}
                >
                  Fotografiile în format digital, descărcabile din albumul online al copilului (link + PIN).
                </span>
              </p>
              <p className="md:text-right">
                <span className="block text-[11px] tracking-[0.2em] uppercase" style={{ color: 'rgba(43,36,32,0.5)' }}>
                  Total pachet A
                </span>
                <span
                  className="text-4xl font-semibold"
                  style={{ color: 'var(--xmas-green)', fontFamily: 'var(--font-heading)' }}
                >
                  {price} lei
                </span>
                <span className="xmas-strike ml-3 text-lg" style={{ color: 'rgba(43,36,32,0.4)' }}>
                  {LIST_PRICE} lei
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Extras B C D */}
      <section className="py-20 md:py-28 px-6" style={{ background: 'var(--xmas-cream-deep)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-md mb-4">
            <GoldRule>
              <span className="text-[11px] font-semibold tracking-[0.25em] uppercase" style={{ color: 'var(--xmas-burgundy)' }}>
                Extra opțional
              </span>
            </GoldRule>
          </div>
          <h2
            className="text-3xl md:text-5xl font-semibold tracking-tight mb-3"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--xmas-green)' }}
          >
            Secțiunile B, C și D
          </h2>
          <p className="text-base md:text-lg max-w-2xl mb-12" style={{ color: 'rgba(43,36,32,0.65)' }}>
            Se pot comanda separat sau toate trei, în plus față de pachetul de bază. Fiecare cu fotografia copilului.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {EXTRAS.map((e) => (
              <div key={e.letter} className="xmas-card p-6 md:p-8 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <span className="xmas-letter">{e.letter}</span>
                  <span
                    className="text-2xl font-semibold"
                    style={{ color: 'var(--xmas-burgundy)', fontFamily: 'var(--font-heading)' }}
                  >
                    {e.price} lei
                  </span>
                </div>
                <div
                  className="relative aspect-square flex items-center justify-center rounded-xl overflow-hidden mb-6"
                  style={{ background: 'var(--xmas-cream)' }}
                >
                  <Image
                    src={e.src}
                    alt={e.title}
                    width={e.w}
                    height={e.h}
                    className="max-h-full w-auto object-contain p-4"
                    sizes="(max-width: 768px) 90vw, 30vw"
                  />
                </div>
                <p className="font-medium text-base md:text-lg" style={{ color: 'var(--xmas-green)' }}>
                  {e.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Period + contact */}
      <section className="py-20 md:py-28 px-6" style={{ background: 'var(--xmas-green-deep)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-[0.3em] uppercase mb-6" style={{ color: 'var(--xmas-gold)' }}>
            Perioadă pentru fotografiere
          </p>
          <p
            className="text-3xl md:text-5xl font-semibold tracking-tight mb-10"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--xmas-cream)' }}
          >
            {PERIOD}
          </p>
          <div className="max-w-xs mx-auto mb-10">
            <GoldRule />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-lg mx-auto">
            <div>
              <p className="text-sm tracking-wide mb-1" style={{ color: 'rgba(247,243,234,0.6)' }}>
                {alexName}
              </p>
              <a
                href={`tel:${alexPhone}`}
                className="text-2xl md:text-3xl font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--xmas-cream)', fontFamily: 'var(--font-heading)' }}
              >
                {formatPhone(alexPhone)}
              </a>
            </div>
            <div>
              <p className="text-sm tracking-wide mb-1" style={{ color: 'rgba(247,243,234,0.6)' }}>
                {adinaName}
              </p>
              <a
                href={`tel:${adinaPhone}`}
                className="text-2xl md:text-3xl font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--xmas-cream)', fontFamily: 'var(--font-heading)' }}
              >
                {formatPhone(adinaPhone)}
              </a>
            </div>
          </div>

          <div className="mt-14 pt-10 max-w-2xl mx-auto" style={{ borderTop: '1px solid rgba(200,164,93,0.3)' }}>
            <p className="text-sm md:text-base leading-relaxed" style={{ color: 'rgba(247,243,234,0.65)' }}>
              <strong style={{ color: 'var(--xmas-gold)' }}>Pentru cadre didactice:</strong> lista de comenzi se completează
              online, pe pagina clasei dumneavoastră (link + PIN primite de la fotograf). Fiecare copil primește apoi
              propriul album digital.
            </p>
            <div className="no-print mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href={isReturning ? '/oferta-scoli' : '/oferta-scoli/clienti-fideli'}
                className="text-xs tracking-[0.15em] uppercase hover:opacity-80 transition-opacity"
                style={{ color: 'rgba(247,243,234,0.45)' }}
              >
                {isReturning ? 'Oferta pentru clienți noi' : 'Oferta pentru clienți fideli'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
