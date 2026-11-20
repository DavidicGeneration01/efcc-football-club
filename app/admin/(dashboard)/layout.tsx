import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { createClient } from "@/lib/supabase/server";
import { allStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const role = await requireStaffRole(allStaffRoles);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) redirect("/admin/login");

  return (
    <AdminWorkspace email={data.user.email ?? "EFCC staff"} role={role}>
      {children}
    </AdminWorkspace>
  );
}
