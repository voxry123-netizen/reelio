import React from "react";
import { cx } from "./utils";

type BaseDivProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title">;

export type CardProps = BaseDivProps & {
  /** Optional header title (NOT the HTML title attribute). */
  title?: React.ReactNode;
  /** Optional subtitle under title. */
  subtitle?: React.ReactNode;
  /** Optional right-side header content (buttons, badges, etc). */
  right?: React.ReactNode;
};

/**
 * Card
 * - Works in 2 modes:
 *   A) "Shell mode": <Card title="..." right={...}>...</Card>
 *   B) "Compose mode": <Card><CardHeader>...</CardHeader><CardBody>...</CardBody></Card>
 */
export function Card({
  className,
  title,
  subtitle,
  right,
  children,
  ...props
}: CardProps) {
  const hasShellHeader = title !== undefined || subtitle !== undefined || right !== undefined;

  return (
    <div
      className={cx(
        "rounded-2xl border border-border/70 bg-card/80 backdrop-blur " +
          "shadow-[0_30px_90px_-70px_rgba(0,0,0,0.9)]",
        className
      )}
      {...props}
    >
      {hasShellHeader ? (
        <>
          <div className={cx("p-5 pb-3")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title !== undefined ? <CardTitle>{title}</CardTitle> : null}
                {subtitle !== undefined ? <CardSubTitle>{subtitle}</CardSubTitle> : null}
              </div>
              {right ? <div className="shrink-0">{right}</div> : null}
            </div>
          </div>
          <div className={cx("p-5 pt-2")}>{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
}

/** Default export for compatibility with: import Card from ".../Card" */
export default Card;

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("p-5 pb-3", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function CardSubTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("text-sm text-muted", className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("p-5 pt-2", className)} {...props} />;
}