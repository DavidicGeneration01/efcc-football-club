import Link from "next/link";
import { PlayerForm } from "@/components/admin/player-form";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";

export default async function NewPlayerPage() {
  await requireStaffRole(newsStaffRoles, "/admin");

  return (
    <div>
      <Link href="/admin/team" className="text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:underline">
        Back to First Team
      </Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">First Team</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Add player</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
        Create the player record as a draft. After saving, upload the player photograph and preview the profile.
      </p>
      <div className="mt-7 border border-neutral-200 bg-white p-5 sm:p-8">
        <PlayerForm player={null} />
      </div>
    </div>
  );
}
