"use client";

export default function TeamAdminError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border border-red-200 bg-red-50 p-6" role="alert">
      <h1 className="text-xl font-extrabold">Player management is temporarily unavailable</h1>
      <p className="mt-2 text-sm leading-6 text-neutral-700">No player records were changed. Check the server logs and retry.</p>
      <button type="button" onClick={reset} className="mt-4 bg-[#111] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-700">
        Try again
      </button>
    </div>
  );
}
