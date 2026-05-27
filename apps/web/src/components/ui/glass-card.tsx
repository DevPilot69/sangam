import { cn } from "@/lib/utils";

const levelClass: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "glass-1 rounded-xl",
  2: "glass-2",
  3: "glass-3",
  4: "glass-4",
  5: "glass-5",
};

export interface GlassCardProps {
  level?: 1 | 2 | 3 | 4 | 5;
  hoverable?: boolean;
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function GlassCard({
  level = 2,
  hoverable,
  selected,
  className,
  children,
  header,
  footer,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        levelClass[level],
        "flex flex-col overflow-hidden text-foreground transition-[transform,box-shadow] duration-[var(--dur-default)]",
        hoverable && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-brand)]",
        selected && "ring-2 ring-primary/50 ring-offset-2 ring-offset-[var(--bg-base)]",
        className
      )}
    >
      {header ? (
        <>
          <div className="border-b border-border-subtle px-6 py-4">{header}</div>
          <div className="flex-1 px-6 py-4">{children}</div>
        </>
      ) : (
        <div className="flex-1 px-6 py-4">{children}</div>
      )}
      {footer ? (
        <div className="border-t border-border-subtle px-6 py-4">{footer}</div>
      ) : null}
    </div>
  );
}
