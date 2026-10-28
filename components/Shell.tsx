"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase, Profile, Role } from "@/lib/supabase";
import BrandMark from "@/components/BrandMark";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  site_lead: "Site lead",
  pending: "Pending approval",
};

export default function Shell({
  roles,
  children,
}: {
  roles: Role[];
  children: (profile: Profile) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", session.user.id)
        .single();
      if (active) {
        setProfile((data as Profile) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return <p className="page muted">Loading…</p>;

  if (!profile) {
    return (
      <div className="page">
        <p>Profile not found. Please sign out and sign in again.</p>
        <button onClick={signOut} className="btn btn-sm mt-4">
          Sign out
        </button>
      </div>
    );
  }

  const nav: [string, string][] =
    profile.role === "admin"
      ? [
          ["/admin", "Admin"],
          ["/log", "Daily log"],
          ["/admin/goals", "Weekly goals"],
          ["/admin/report", "Weekly report"],
          ["/admin/invoice", "Invoice"],
        ]
      : profile.role === "site_lead"
      ? [["/log", "Daily log"]]
      : [];

  let body: ReactNode;
  if (profile.role === "pending") {
    body = (
      <div className="card">
        <h1 className="card-title">Waiting for approval</h1>
        <p className="muted">
          Your account has been created. An admin must approve it before you can
          see any data.
        </p>
      </div>
    );
  } else if (!roles.includes(profile.role)) {
    body = (
      <div className="card">
        <p>You do not have access to this page.</p>
      </div>
    );
  } else {
    body = children(profile);
  }

  return (
    <div>
      <header className="site-header print:hidden">
        <div className="site-header-inner">
          <div className="brand">
            <BrandMark />
            <div>
              <p className="brand-name">ILAD Construction</p>
              <p className="brand-sub">Panel Control</p>
            </div>
          </div>
          <nav className="site-nav">
            {nav.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="nav-link"
                aria-current={pathname === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
            <span className="user-chip">
              {profile.full_name} · {ROLE_LABEL[profile.role]}
            </span>
            <button onClick={signOut} className="btn-light">
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <div className="brick-strip print:hidden" aria-hidden="true" />
      <main className="page">{body}</main>
    </div>
  );
}
