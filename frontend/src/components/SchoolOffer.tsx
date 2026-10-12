import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/offer/Reveal';
import CountUp from '@/components/offer/CountUp';
import HeroVisual from '@/components/offer/HeroVisual';
import SlideNav from '@/components/offer/SlideNav';
import DigitalPopup from '@/components/offer/DigitalPopup';
import { offerPdfUrl } from '@/lib/api';
import '@/components/offer/offer.css';

export type OfferVariant = 'new' | 'returning';

// Keep in sync with schools/pricing.py
export const SEASON = 2026;
export const PERIOD = '9 noiembrie - 5 decembrie 2026';

type PackageKey = 'a' | 'b';

interface PackageItem {
  qty: number;
  title: string;
  sub: string;
  src: string;
}

interface PackageDef {
  letter: string;
  name: string;
  list: number;
  prices: Record<OfferVariant, number>;
  tagline: string;
  items: PackageItem[];
}

const IMG = {
  calendar: '/oferta/calendar.webp',
  p2030: '/oferta/poza-20x30.webp',
  p1520: '/oferta/poza-15x20.webp',
  f1521: '/oferta/felicitare-15x21.webp',
  f2115: '/oferta/felicitare-21x15.webp',
  retro: '/oferta/poza-retro-10x12.webp',
};

export const PACKAGES: Record<PackageKey, PackageDef> = {
  a: {
    letter: 'A',
    name: 'Standard',
    list: 65,
    prices: { new: 50, returning: 45 },
    tagline: 'Esențialul, frumos tipărit',
    items: [
      { qty: 1, title: 'Calendar 20x30 cm', sub: `Design ${SEASON + 1}, 12 luni`, src: IMG.calendar },
      { qty: 2, title: 'Fotografie 15x20 cm', sub: 'Print simplu, fără grafică', src: IMG.p1520 },
      { qty: 1, title: 'Fotografie retro 10x12 cm', sub: 'Stil polaroid', src: IMG.retro },
    ],
  },
  b: {
    letter: 'B',
    name: 'Extra',
    list: 85,
    prices: { new: 75, returning: 65 },
    tagline: 'Toată colecția de Crăciun',
    items: [
      { qty: 1, title: 'Calendar 20x30 cm', sub: `Design ${SEASON + 1}, 12 luni`, src: IMG.calendar },
      { qty: 1, title: 'Felicitare 15x21 cm', sub: 'Design de Crăciun', src: IMG.f1521 },
      { qty: 1, title: 'Felicitare 21x15 cm', sub: 'Design de Crăciun', src: IMG.f2115 },
      { qty: 1, title: 'Fotografie 20x30 cm', sub: 'Tablou mare', src: IMG.p2030 },
      { qty: 2, title: 'Fotografie 15x20 cm', sub: 'Print premium', src: IMG.p1520 },
      { qty: 2, title: 'Fotografie retro 10x12 cm', sub: 'Stil polaroid', src: IMG.retro },
    ],
  },
};

/** Every product mockup, with how many of each come in A and in B. */
const GALLERY = [
  { src: IMG.calendar, w: 933, h: 1400, title: 'Calendar 20x30 cm', sub: `Design ${SEASON + 1}, 12 luni`, a: 1, b: 1 },
  { src: IMG.p1520, w: 425, h: 595, title: 'Fotografie 15x20 cm', sub: 'În A fără grafică, în B print premium', a: 2, b: 2 },
  { src: IMG.retro, w: 1167, h: 1400, title: 'Fotografie retro 10x12 cm', sub: 'Stil polaroid', a: 1, b: 2 },
  { src: IMG.p2030, w: 567, h: 850, title: 'Fotografie 20x30 cm', sub: 'Tablou mare', a: 0, b: 1 },
  { src: IMG.f1521, w: 1000, h: 1400, title: 'Felicitare 15x21 cm', sub: 'Design de Crăciun', a: 0, b: 1 },
  { src: IMG.f2115, w: 1400, h: 1000, title: 'Felicitare 21x15 cm', sub: 'Design de Crăciun', a: 0, b: 1 },
];

export const EXTRA_PRICES = { c: 40, d: 20, e: 105 };

const EXTRAS = [
  { letter: 'C', src: '/oferta/breloc.webp', w: 431, h: 229, title: 'Breloc 7x5 cm', sub: 'Cu fotografia copilului, pe metal', price: EXTRA_PRICES.c },
  { letter: 'D', src: '/oferta/magnet.webp', w: 1024, h: 1024, title: 'Magnet frigider 6.5x6.5 cm', sub: 'Amintirea de zi cu zi', price: EXTRA_PRICES.d },
  { letter: 'E', src: '/oferta/puzzle.webp', w: 435, h: 435, title: 'Puzzle 45 piese', sub: 'Joc și fotografie, în cutie', price: EXTRA_PRICES.e },
];

const SLIDES = [
  { id: 'start', label: 'Oferta' },
  { id: 'pachete', label: 'Pachete A · B' },
  { id: 'extra', label: 'Extra C · D · E' },
  { id: 'contact', label: 'Programare' },
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

function Eyebrow({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'burgundy' }) {
  return (
    <p className={`offer-eyebrow offer-eyebrow--${tone}`}>
      <Star className="!w-2.5 !h-2.5" />
      <span>{children}</span>
    </p>
  );
}

function qtyTag(a: number, b: number) {
  return a ? `A ×${a} · B ×${b}` : `Doar în Extra · ×${b}`;
}

export default function SchoolOffer({ variant }: { variant: OfferVariant }) {
  const isReturning = variant === 'returning';
  const plans = (['a', 'b'] as PackageKey[]).map((k) => {
    const p = PACKAGES[k];
    const price = p.prices[variant];
    return { key: k, ...p, price, saving: p.list - price };
  });

  const alexName = process.env.NEXT_PUBLIC_CONTACT_ALEX_NAME || 'Alexandru';
  const alexPhone = process.env.NEXT_PUBLIC_CONTACT_ALEX_PHONE || '0756538455';
  const adinaName = process.env.NEXT_PUBLIC_CONTACT_ADINA_NAME || 'Adina';
  const adinaPhone = process.env.NEXT_PUBLIC_CONTACT_ADINA_PHONE || '0746986415';

  return (
    <div className="xmas offer">
      <SlideNav slides={SLIDES} />
      <DigitalPopup triggerId="pachete" targetId="pachete" />

      {/* ───────────────────────── 01 · Hero ───────────────────────── */}
      <section id="start" className="offer-hero xmas-hero">
        <div className="offer-hero-bg" aria-hidden="true">
          <span className="offer-hero-grain" />
          <span className="offer-hero-aurora" />
        </div>

        <div className="offer-container relative">
          <div className="offer-hero-grid">
            <div className="offer-hero-copy">
              <div className="h-in" style={{ '--d': '100ms' } as React.CSSProperties}>
                <Eyebrow>
                  Ofertă foto Crăciun {SEASON} · Școli &amp; Grădinițe
                </Eyebrow>
              </div>

              {isReturning && (
                <div className="h-in mt-5" style={{ '--d': '250ms' } as React.CSSProperties}>
                  <span className="xmas-ribbon offer-ribbon">
                    <Star className="!w-3 !h-3 !text-white" />
                    Preț special pentru clasele care revin
                  </span>
                </div>
              )}

              <h1 className="offer-h1">
                <span className="offer-mask">
                  <span className="offer-mask-line" style={{ '--d': '350ms' } as React.CSSProperties}>
                    {isReturning ? 'Ne revedem' : 'Amintiri de'}
                  </span>
                </span>
                <span className="offer-mask">
                  <span className="offer-mask-line" style={{ '--d': '470ms' } as React.CSSProperties}>
                    {isReturning ? 'de Crăciun,' : 'sărbătoare,'}
                  </span>
                </span>
                <span className="offer-mask">
                  <em className="offer-mask-line offer-h1-accent" style={{ '--d': '590ms' } as React.CSSProperties}>
                    pentru fiecare copil
                  </em>
                </span>
              </h1>

              <p className="offer-lead h-in" style={{ '--d': '760ms' } as React.CSSProperties}>
                {isReturning
                  ? 'Vă mulțumim pentru încrederea de anul trecut. Revenim cu același studio mobil, aceeași grijă pentru fiecare copil și prețuri mai bune.'
                  : 'Studio mobil în școală sau grădiniță, fotografie profesională și două pachete de produse personalizate, gata de pus sub brad.'}
              </p>

              <div className="offer-price offer-price--dual h-in" style={{ '--d': '900ms' } as React.CSSProperties}>
                {plans.map((p, i) => (
                  <a key={p.key} href="#pachete" className="offer-price-col">
                    <span className="offer-price-label">
                      <b>{p.letter}</b> Pachet {p.name}
                    </span>
                    <span className="offer-price-value">
                      <CountUp to={p.price} from={p.list} duration={1500} delay={1100 + i * 180} />
                      <span className="offer-price-unit">lei</span>
                    </span>
                    <span className="offer-price-was">
                      <span className="offer-strike">{p.list} lei</span>
                      <span className="offer-price-save">−{p.saving} lei</span>
                    </span>
                  </a>
                ))}
              </div>
              <p className="offer-price-note h-in" style={{ '--d': '980ms' } as React.CSSProperties}>
                Per copil · <strong>obligatoriu unul dintre pachete</strong> · format digital inclus în ambele
              </p>

              <div className="offer-cta h-in no-print" style={{ '--d': '1050ms' } as React.CSSProperties}>
                <a href={`tel:${alexPhone}`} className="offer-btn offer-btn--gold">
                  <PhoneIcon />
                  Sunați pentru programare
                </a>
                <a href="#pachete" className="offer-btn offer-btn--ghost">
                  Comparați pachetele
                  <ArrowIcon />
                </a>
              </div>
            </div>

            <div className="offer-hero-side">
              <HeroVisual />
            </div>
          </div>

          <div className="offer-hero-meta h-in" style={{ '--d': '1300ms' } as React.CSSProperties}>
            <div className="offer-hero-meta-item">
              <span className="offer-hero-meta-k">Perioada</span>
              <span className="offer-hero-meta-v">{PERIOD}</span>
            </div>
            <div className="offer-hero-meta-item">
              <span className="offer-hero-meta-k">Oferta</span>
              <span className="offer-hero-meta-v">Pachet A sau B + extra opționale C, D, E</span>
            </div>
            <div className="offer-hero-meta-item">
              <span className="offer-hero-meta-k">Unde</span>
              <span className="offer-hero-meta-v">Studio mobil, la școală sau grădiniță</span>
            </div>
            <a href="#pachete" className="offer-scroll-cue no-print" aria-label="Derulați">
              <span />
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────── 02 · Pachetele A și B ───────────────────────── */}
      <section id="pachete" className="offer-slide offer-slide--cream">
        <div className="offer-container">
          <div className="offer-slide-head offer-slide-head--center">
            <Reveal effect="up">
              <span className="offer-index">01</span>
              <Eyebrow tone="burgundy">Obligatoriu · alegeți pachetul A sau B</Eyebrow>
            </Reveal>
            <Reveal effect="up" delay={80}>
              <h2 className="offer-h2">
                Două pachete, <em>o singură alegere</em>
              </h2>
            </Reveal>
            <Reveal effect="up" delay={160}>
              <p className="offer-text">
                Fiecare produs este personalizat cu fotografia copilului, realizată în studio mobil, cu fundal și lumină de studio, direct la
                școală sau grădiniță.
              </p>
            </Reveal>
          </div>

          <div className="offer-plans">
            {plans.map((p, i) => (
              <Reveal
                key={p.key}
                effect="up"
                delay={i * 140}
                className={`offer-plan ${p.key === 'b' ? 'offer-plan--featured' : ''}`}
              >
                {p.key === 'b' && <span className="offer-plan-ribbon">Cel mai complet</span>}

                <div className="offer-plan-head">
                  <span className="xmas-letter">{p.letter}</span>
                  <div>
                    <p className="offer-plan-kicker">Pachet</p>
                    <h3 className="offer-plan-name">{p.name}</h3>
                    <p className="offer-plan-tagline">{p.tagline}</p>
                  </div>
                </div>

                <div className="offer-plan-price">
                  <span className="offer-strike offer-plan-old">{p.list} lei</span>
                  <span className="offer-plan-value">
                    {p.price}
                    <small>lei</small>
                  </span>
                  <span className="offer-plan-save">Economisiți {p.saving} lei</span>
                </div>

                <div className="offer-plan-thumbs" aria-hidden="true">
                  {p.items.map((it, j) => (
                    <span key={`${it.src}-${j}`} className="offer-plan-thumb" style={{ '--i': j } as React.CSSProperties}>
                      <Image src={it.src} alt="" width={120} height={150} sizes="64px" loading="eager" />
                    </span>
                  ))}
                </div>

                <ul className="offer-plan-items">
                  {p.items.map((it, j) => (
                    <li key={`${it.title}-${j}`}>
                      <span className="offer-plan-qty">×{it.qty}</span>
                      <span>
                        <span className="offer-plan-item">{it.title}</span>
                        <span className="offer-plan-sub">{it.sub}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="offer-plan-digital">
                  <CloudIcon />
                  <span>
                    <b>+ Format digital inclus</b>
                    <small>Toate fotografiile, în albumul online al copilului</small>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal effect="fade" delay={100} className="offer-plans-note">
            <GoldRule>
              <span>Fiecare copil primește obligatoriu unul dintre pachete: A sau B</span>
            </GoldRule>
          </Reveal>

          <div className="offer-gallery-head">
            <Reveal effect="up">
              <p className="offer-gallery-title">Produsele, în detaliu</p>
            </Reveal>
          </div>

          <div className="offer-products">
            {GALLERY.map((p, i) => (
              <Reveal key={p.src} effect="up" delay={(i % 3) * 90} as="figure" className="offer-product">
                <div className="offer-product-media">
                  <span className={`offer-product-tag ${p.a ? '' : 'offer-product-tag--b'}`}>{qtyTag(p.a, p.b)}</span>
                  <Image
                    src={p.src}
                    alt={p.title}
                    width={p.w}
                    height={p.h}
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
                    loading="eager"
                  />
                </div>
                <figcaption className="offer-product-caption">
                  <span className="offer-product-num">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="offer-product-title">{p.title}</span>
                    <span className="offer-product-sub">{p.sub}</span>
                  </span>
                </figcaption>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── 03 · Extra C D E ───────────────────────── */}
      <section id="extra" className="offer-slide offer-slide--deep">
        <div className="offer-container">
          <div className="offer-slide-head">
            <Reveal effect="up">
              <span className="offer-index">02</span>
              <Eyebrow tone="burgundy">Opțional · Extra C, D și E</Eyebrow>
            </Reveal>
            <Reveal effect="up" delay={80}>
              <h2 className="offer-h2">
                Mici bucurii, <em>în plus față de pachet</em>
              </h2>
            </Reveal>
            <Reveal effect="up" delay={160}>
              <p className="offer-text">
                Opționale: se pot adăuga oricâte doriți, numai împreună cu pachetul ales (A sau B), fiecare cu fotografia copilului.
              </p>
            </Reveal>
          </div>

          <div className="offer-extras">
            {EXTRAS.map((e, i) => (
              <Reveal key={e.letter} effect="up" delay={i * 120} className="offer-extra">
                <span className="offer-extra-ghost" aria-hidden="true">
                  {e.letter}
                </span>
                <div className="offer-extra-top">
                  <span className="xmas-letter">{e.letter}</span>
                  <span className="offer-extra-price">
                    {e.price} <small>lei</small>
                  </span>
                </div>
                <div className="offer-extra-media">
                  <Image src={e.src} alt={e.title} width={e.w} height={e.h} sizes="(max-width: 768px) 80vw, 28vw" loading="eager" />
                </div>
                <p className="offer-extra-title">{e.title}</p>
                <p className="offer-extra-sub">{e.sub}</p>
              </Reveal>
            ))}
          </div>

          <Reveal effect="fade" delay={200} className="offer-extras-note">
            <GoldRule>
              <span>Exemple: A, A + C, B + D + E</span>
            </GoldRule>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── 04 · Perioada & contact ───────────────────────── */}
      <section id="contact" className="offer-slide offer-slide--green">
        <div className="offer-container">
          <div className="offer-contact-head">
            <Reveal effect="up">
              <span className="offer-index offer-index--light">03</span>
              <Eyebrow>Perioada pentru fotografiere</Eyebrow>
            </Reveal>
            <Reveal effect="mask" delay={80}>
              <p className="offer-date">{PERIOD}</p>
            </Reveal>
            <Reveal effect="line" delay={300} className="offer-date-rule" />
            <Reveal effect="up" delay={380}>
              <p className="offer-text offer-text--light">
                Stabilim împreună ziua și intervalul potrivit clasei. Venim cu studioul mobil, fotografiem fiecare copil în câteva minute și
                livrăm produsele înainte de vacanța de iarnă.
              </p>
            </Reveal>
          </div>

          <div className="offer-contacts">
            {[
              { name: alexName, phone: alexPhone },
              { name: adinaName, phone: adinaPhone },
            ].map((c, i) => (
              <Reveal key={c.phone} effect="scale" delay={i * 120} as="a" className="offer-contact" href={`tel:${c.phone}`}>
                <span className="offer-contact-name">{c.name}</span>
                <span className="offer-contact-phone">{formatPhone(c.phone)}</span>
                <span className="offer-contact-hint">
                  <PhoneIcon />
                  Apelați
                </span>
              </Reveal>
            ))}
          </div>

          <Reveal effect="up" delay={120} className="offer-teacher">
            <p>
              <strong>Pentru cadrele didactice:</strong> Completați lista de comenzi bifând pachetul A sau B pentru fiecare copil, precum
              și eventualele produse suplimentare dorite.
            </p>
            <p className="mt-3">
              După fotografiere, fiecare copil primește, pe lângă fotografiile tipărite din pachetul ales, și propriul album digital,
              fiecare separat cu PIN.
            </p>
          </Reveal>

          <Reveal effect="fade" delay={200} className="offer-foot no-print">
            <a href={offerPdfUrl(variant)} download className="offer-btn offer-btn--ghost-light">
              <DownloadIcon />
              Salvați ca PDF
            </a>
            {isReturning && (
              <Link href="/oferta-scoli" className="offer-switch">
                Oferta pentru clienți noi
                <ArrowIcon />
              </Link>
            )}
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8a4 4 0 0 1 .8 7.9" />
      <path d="M12 12v9M8.5 16.5 12 13l3.5 3.5" />
    </svg>
  );
}
