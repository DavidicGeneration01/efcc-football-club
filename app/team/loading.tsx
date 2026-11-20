export default function TeamLoading() {
  return (
    <main className="section">
      <div className="section-content" aria-live="polite">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">First Team</p>
        <p className="mt-4 text-sm text-neutral-600">Loading player profiles…</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(item => (
            <div key={item} className="aspect-[4/5] animate-pulse bg-neutral-100" />
          ))}
        </div>
      </div>
    </main>
  );
}
