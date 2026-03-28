import Link from "next/link";
import { Card } from "./ui/kit/Card";
import { Button } from "./ui/kit/Button";
import { Badge } from "./ui/kit/Badge";

export default function HomePage() {
  return (
    <div className="rm-stack">
      <Card>
        <div className="rm-card-head">
          <div>
            <div className="rm-card-title">REALM</div>
            <div className="rm-muted">Ultimate UI System enabled</div>
          </div>

          <Badge variant="success">ONLINE</Badge>
        </div>

        <div className="rm-card-body">
          <div className="rm-muted" style={{ marginBottom: 12 }}>
            Use Register/Login, then open Feed and Create a Post. API docs at{" "}
            <span style={{ color: "var(--txt)" }}>/docs</span>.
          </div>

          <div className="rm-row" style={{ flexWrap: "wrap" }}>
            <Link href="/login">
              <Button>Login</Button>
            </Link>

            <Link href="/feed/home">
              <Button variant="ghost">Open Feed</Button>
            </Link>

            <Link href="/create">
              <Button variant="danger">Create Post</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}