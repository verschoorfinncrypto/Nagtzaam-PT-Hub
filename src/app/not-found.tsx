import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page" style={{ placeItems: "center", minHeight: "60vh" }}>
      <div className="stack" style={{ textAlign: "center" }}>
        <p className="label">404</p>
        <h1 className="h1">Deze pagina bestaat niet</h1>
        <p><Link href="/" className="btn">Naar overzicht</Link></p>
      </div>
    </main>
  );
}
