"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const staffRoles = new Set(["super_admin", "admin", "editor", "media_manager", "shop_manager"]);

export async function signInAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!hasSupabaseEnv()) redirect("/admin/login?error=configuration");
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    redirect("/admin/login?error=credentials");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) redirect("/admin/login?error=credentials");

  const { data: roleRecord, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (roleError) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    redirect("/admin/login?error=role-check");
  }

  if (!roleRecord || !staffRoles.has(roleRecord.role)) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    redirect("/admin/login?error=unauthorized");
  }

  redirect("/admin");
}
