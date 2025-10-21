interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 gradient-hero px-4 py-4 border-b border-card-border/50">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-xl font-semibold text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-foreground/70 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
