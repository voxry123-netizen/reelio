import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        404 — Page not found
      </h1>
      <p style={{ opacity: 0.75, marginBottom: 16 }}>
        The page you’re looking for doesn’t exist.
      </p>
      <Link href="/" style={{ textDecoration: "underline" }}>
        Go back home
      </Link>
    </div>
  );
}