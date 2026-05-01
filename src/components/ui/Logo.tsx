export function Logo({ 
  size = "md", 
  layout = "horizontal" 
}: { 
  size?: "sm" | "md" | "lg" | "xl",
  layout?: "horizontal" | "stacked"
}) {
  const sizes = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
    xl: "h-32",
  };
  const s = sizes[size] || sizes.md;

  if (layout === "stacked") {
    return (
      <div className="group flex flex-col items-center justify-center text-center cursor-pointer">
        <img 
          src="/assets/logo-full.png" 
          alt="CYBERBARBERSHOP" 
          className="h-40 md:h-48 w-auto object-contain rounded-3xl border border-primary/20 backdrop-blur-md transition-all duration-500 group-hover:scale-105 group-hover:drop-shadow-[0_0_25px_rgba(var(--primary),0.5)]"
        />
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 cursor-pointer">
      <div className="relative overflow-hidden rounded-xl bg-black/40 p-1 border border-primary/10 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(var(--primary),0.2)]">
        <img 
          src="/assets/logo-icon.png" 
          alt="CyberBarber mascot" 
          className={`${s} w-auto transition-all duration-300 group-hover:scale-110`}
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-black tracking-tighter text-foreground md:text-base italic uppercase">
          CYBER
        </span>
        <span className="text-[10px] font-bold tracking-[0.15em] text-primary uppercase">
          BARBERSHOP
        </span>
      </div>
    </div>
  );
}
