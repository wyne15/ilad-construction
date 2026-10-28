"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { Profile } from "@/lib/supabase";

function Redirect({ profile }: { profile: Profile }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(profile.role === "admin" ? "/admin" : "/log");
  }, [profile, router]);
  return <p className="muted">Redirecting…</p>;
}

export default function Dashboard() {
  return (
    <Shell roles={["admin", "site_lead"]}>
      {(profile) => <Redirect profile={profile} />}
    </Shell>
  );
}
