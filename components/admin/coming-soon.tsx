import Link from "next/link";

export function AdminComingSoon({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <section aria-labelledby="admin-section-title">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Administration</p>
      <h1 id="admin-section-title" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h1>

      <div className="mt-8 border border-neutral-200 border-l-4 border-l-[#da291c] bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#da291c]">Coming soon</p>
        <h2 className="mt-3 text-xl font-bold tracking-tight">This section is being prepared</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">{description}</p>
        <Link
          href="/admin"
          className="mt-6 inline-flex bg-[#da291c] px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#da291c]"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
