export default function TeamAdminLoading() {
  return (
    <div aria-live="polite">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">First Team</p>
      <p className="mt-4 text-sm text-neutral-600">Loading player records…</p>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map(item => <div key={item} className="h-24 animate-pulse border border-neutral-200 bg-white" />)}
      </div>
    </div>
  );
}
