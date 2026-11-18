"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  if (!hasSupabaseEnv()) redirect("/admin/login");

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  redirect("/admin/login");
}
