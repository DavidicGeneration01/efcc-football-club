import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  hrefLabel,
  href
}: {
  eyebrow: string;
  title: string;
  hrefLabel?: string;
  href?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <div className="section-kicker">{eyebrow}</div>
        <h2 className="section-title">{title}</h2>
      </div>
      {hrefLabel && href ? <Link className="text-link" href={href}>{hrefLabel} ↗</Link> : null}
      {hrefLabel && !href ? <span className="text-link">{hrefLabel} ↗</span> : null}
    </div>
  );
}
