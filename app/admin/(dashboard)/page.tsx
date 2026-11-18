import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Administration</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Dashboard</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
        Manage club media here. Other content modules will be added when their data and permission workflows are ready.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/media" className="border border-neutral-200 bg-white p-6 transition hover:border-[#da291c]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#da291c]">Media library</p>
          <h2 className="mt-3 text-xl font-bold tracking-tight">Upload club images</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Add approved public images to the EFCC media bucket.
          </p>
          <span className="mt-5 inline-block text-xs font-bold uppercase tracking-wider">Open uploads ↗</span>
        </Link>
        <div className="border border-dashed border-neutral-300 bg-white/70 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Next modules</p>
          <h2 className="mt-3 text-xl font-bold tracking-tight">Editorial and squad tools</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            News, players, fixtures, and store management are not connected yet.
          </p>
        </div>
      </section>
    </div>
  );
}
