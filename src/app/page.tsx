import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/db/supabase-server";

export default async function HomePage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
