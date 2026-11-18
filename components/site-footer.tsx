import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <div className="brand-mark">EFCC</div>
          <h2 className="footer-title mt-4 text-lg">EFCC FOOTBALL CLUB</h2>
          <p className="footer-note mt-3">The official digital home of EFCC Football Club, Garki Area 3, Abuja, Nigeria. Club news, matches, players and official merchandise.</p>
        </div>
        <div className="footer-links">
          <Link href="/club">The Club</Link><Link href="/team">First Team</Link><Link href="/matches">Matches</Link><Link href="/news">News</Link><Link href="/media">Media</Link><Link href="/shop">Store</Link><Link href="/contact">Contact</Link>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} EFCC Football Club · All rights reserved</div>
    </footer>
  );
}
