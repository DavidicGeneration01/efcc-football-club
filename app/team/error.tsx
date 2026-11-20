"use client";

export default function TeamError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="section">
      <div className="section-content border border-red-200 bg-red-50 p-8" role="alert">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#b51f17]">First Team</p>
        <h1 className="mt-3 text-2xl font-extrabold">Player information is temporarily unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-700">Please retry in a moment. No player information has been changed.</p>
        <button type="button" onClick={reset} className="mt-5 bg-[#111] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-700">
          Try again
        </button>
      </div>
    </main>
  );
}
