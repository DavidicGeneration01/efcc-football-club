export function SectionHeading({ eyebrow, title, hrefLabel }: { eyebrow: string; title: string; hrefLabel?: string }) {
  return <div className="section-heading"><div><div className="section-kicker">{eyebrow}</div><h2 className="section-title">{title}</h2></div>{hrefLabel ? <span className="text-link">{hrefLabel} ↗</span> : null}</div>;
}
