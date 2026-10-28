import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "./form";

export const metadata = { title: "Inloggen" };

export default async function LoginPage() {
  const u = await currentUser();
  if (u) redirect(u.role === "trainer" ? "/trainer" : "/dashboard");
  return (
    <main className="login">
      <section className="login-side">
        <div>
          <p className="label">Fysiotherapie Nagtzaam</p>
          <p className="h2">PT Hub</p>
        </div>
        <div className="stack">
          <h1 className="display">Herstellen. Opbouwen. Presteren.</h1>
          <div className="bars" aria-hidden="true">
            {[22, 38, 54, 70, 86].map((w) => (
              <div key={w}><span style={{ width: `${w}%` }} /></div>
            ))}
          </div>
        </div>
        <p className="body-sm" style={{ color: "#cfccc5" }}>
          Houd je trainingen, gewicht en PR&apos;s bij, samen met je trainer.
        </p>
      </section>
      <section className="login-main">
        <div className="login-card">
          <div>
            <h2 className="h1">Inloggen</h2>
            <p className="muted">Je account krijg je van je trainer.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
