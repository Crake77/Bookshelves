import { BookOpen, CheckCircle, Clock, Target } from "lucide-react";

interface Stat {
  label: string;
  value: string | number;
  icon: React.ElementType;
}

export default function ProfileStats() {
  const stats: Stat[] = [
    { label: "Books Read", value: 42, icon: CheckCircle },
    { label: "Currently Reading", value: 3, icon: BookOpen },
    { label: "Reading Hours", value: "124h", icon: Clock },
    { label: "This Year", value: 18, icon: Target },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
            className="rounded-xl bg-card p-4 border border-card-border"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="font-display text-2xl font-semibold text-foreground">
              {stat.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stat.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
