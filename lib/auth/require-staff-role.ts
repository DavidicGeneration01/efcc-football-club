import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const staffRoles = ["super_admin", "admin", "editor", "media_manager", "shop_manager"] as const;
export type StaffRole = (typeof staffRoles)[number];

function isStaffRole(role: string): role is StaffRole {
  return staffRoles.some(staffRole => staffRole === role);
}

export async function requireStaffRole(
  allowedRoles: readonly StaffRole[],
  unauthorizedDestination = "/admin/login?error=unauthorized"
) {
  if (!hasSupabaseEnv()) redirect("/admin/login?error=configuration");

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") throw authError;
  if (!authData.user) redirect("/admin/login");

  const { data: roleRecord, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (roleError) throw roleError;
  if (!roleRecord || !isStaffRole(roleRecord.role) || !allowedRoles.includes(roleRecord.role)) {
    redirect(unauthorizedDestination);
  }

  return roleRecord.role;
}

export const allStaffRoles: readonly StaffRole[] = staffRoles;
export const mediaStaffRoles: readonly StaffRole[] = ["super_admin", "admin", "media_manager"];
export const newsStaffRoles: readonly StaffRole[] = ["super_admin", "admin", "editor"];
