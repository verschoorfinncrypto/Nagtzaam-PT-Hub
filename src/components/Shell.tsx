import Link from "next/link";
import type { User } from "@/db";
import { logout } from "@/app/login/actions";
import { NavLinks } from "./NavLinks";

const CLIENT_NAV = [
  { href: "/dashboard", label: "Overzicht" },
  { href: "/workouts", label: "Trainingen" },
  { href: "/schema", label: "Mijn schema" },
  { href: "/weight", label: "Gewicht" },
  { href: "/progress", label: "Voortgang" },
];

const TRAINER_NAV = [
  { href: "/trainer", label: "Cliënten" },
  { href: "/trainer/exercises", label: "Oefeningen" },
  { href: "/trainer/team", label: "Team" },
];

export function Shell({ user, children }: { user: User; children: React.ReactNode }) {
  const nav = user.role === "trainer" ? TRAINER_NAV : CLIENT_NAV;
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <b>Fysiotherapie Nagtzaam</b>
            <span>PT Hub</span>
          </Link>
          <NavLinks items={nav} />
          <div className="who">
            <Link href="/account" style={{ textDecoration: "none" }}>{user.name.split(" ")[0]}</Link>
            <form action={logout}>
              <button type="submit">Uitloggen</button>
            </form>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
