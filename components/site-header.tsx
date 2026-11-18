import Link from "next/link";

const links = [
  ["THE CLUB", "/club"],
  ["FIRST TEAM", "/team"],
  ["MATCH CENTRE", "/matches"],
  ["NEWS", "/news"],
  ["MEDIA", "/media"],
  ["HONOURS", "/honours"],
  ["STORE", "/shop"]
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="topline"><div className="mx-auto max-w-[1440px] px-7 py-2">OFFICIAL WEBSITE · GARKI AREA 3, ABUJA, NIGERIA</div></div>
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="EFCC Football Club home">
          <span className="brand-mark">EFCC</span>
          <span><span className="brand-name block">EFCC FOOTBALL CLUB</span><span className="brand-location block">Abuja · Nigeria</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <Link href="/shop" className="header-cta">Official Store ↗</Link>
        <details className="mobile-menu">
          <summary aria-label="Open navigation menu">MENU +</summary>
          <nav className="mobile-menu-panel" aria-label="Mobile navigation">
            {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
        </details>
      </div>
    </header>
  );
}
