import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`jgl-card ${className}`.trim()} {...props} />;
}

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={`jgl-badge jgl-badge--${tone} ${className}`.trim()} {...props} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return <button className={`jgl-button jgl-button--${variant} ${className}`.trim()} {...props} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="jgl-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </Card>
  );
}
