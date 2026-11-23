import Image from "next/image";
import Link from "next/link";

type Btn = { href: string; label: string };

// Default art for dark heroes with no image of their own: the Labb Station reader stand, background removed.
// LabbPO, LabbMD and corrections heroes (tone) keep their own look. Pass art={false} to leave a hero text-only.
const READER = { src: "/img/labb-station-reader-stand-phone-cup.webp", alt: "Labb Station reader stand with a phone running Labb Station and a Labb drug screen cup", w: 1400, h: 1000, bare: true };

// Dark page header band from the Labb Redesign (Draft) theme, used on inner pages.
export function PageHero({
  eyebrow,
  title,
  lede,
  primary,
  secondary,
  image,
  aside,
  tone,
  art = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  primary?: Btn;
  secondary?: Btn;
  image?: { src: string; alt: string; w: number; h: number; bare?: boolean };
  aside?: React.ReactNode;
  tone?: "po" | "md";
  art?: boolean;
}) {
  if (!image && !aside && !tone && art) image = READER;
  const side = aside || image;
  return (
    <section className={`page-hero${tone ? ` tone-${tone}` : ""}`}>
      <div className={`wrap${side ? " with-side" : ""}`}>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {lede && <p className="lede">{lede}</p>}
          {(primary || secondary) && (
            <div className="btn-row">
              {primary && <Link href={primary.href} className="btn btn-light">{primary.label}</Link>}
              {secondary && <Link href={secondary.href} className="btn btn-ghost">{secondary.label}</Link>}
            </div>
          )}
        </div>
        {aside ? (
          <div>{aside}</div>
        ) : image ? (
          <div className={`page-hero-media${image.bare ? " bare" : ""}`}>
            <Image src={image.src} alt={image.alt} width={image.w} height={image.h} priority sizes="(max-width: 900px) 90vw, 520px" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

// Same band with a single CTA button on the right (used on the test kits page).
export function PageHeroBar({ eyebrow, title, lede, cta }: { eyebrow: string; title: React.ReactNode; lede?: React.ReactNode; cta?: Btn }) {
  return (
    <section className="page-hero">
      <div className="wrap bar">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {lede && <p className="lede">{lede}</p>}
        </div>
        {cta && <Link href={cta.href} className="btn btn-primary btn-lg">{cta.label}</Link>}
      </div>
    </section>
  );
}
