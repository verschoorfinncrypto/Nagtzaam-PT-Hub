import Link from "next/link";
import type { User } from "@/db";
import { logout } from "@/app/login/actions";
import { stopViewAs } from "@/lib/actions";
import { NavLinks } from "./NavLinks";

const CLIENT_NAV = [
  { href: "/dashboard", label: "Overzicht" },
  { href: "/workouts", label: "Trainingen" },
  { href: "/schema", label: "Mijn schema" },
  { href: "/weight", label: "Gewicht" },
  { href: "/progress", label: "Voortgang" },
  { href: "/exercises", label: "Oefeningen" },
];

const TRAINER_NAV = [
  { href: "/trainer", label: "Cliënten" },
  { href: "/trainer/schemas", label: "Schema's" },
  { href: "/trainer/data", label: "Data" },
  { href: "/exercises", label: "Oefeningen" },
  { href: "/trainer/team", label: "Team" },
];

export function Shell({ user, viewer, children }: { user: User; viewer?: User | null; children: React.ReactNode }) {
  const nav = user.role === "trainer" ? TRAINER_NAV : CLIENT_NAV;
  return (
    <>
      {viewer && (
        <div className="viewas" role="status">
          <span>
            Je bekijkt de hub als <b>{user.name}</b>. Wat je hier doet, wordt opgeslagen bij deze cliënt.
          </span>
          <form action={stopViewAs}>
            <button type="submit" className="btn btn-sm">Terug naar trainer</button>
          </form>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand" aria-label="Fysiotherapie Nagtzaam PT Hub, naar overzicht">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white.png" alt="" width={150} height={30} />
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
