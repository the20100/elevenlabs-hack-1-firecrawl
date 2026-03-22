export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      {/* Spotlight glow effect */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-gold/5 blur-[120px]" />

      <header className="relative z-10 flex flex-col items-center gap-4 text-center">
        <h1 className="font-serif text-6xl font-bold tracking-tight text-gold sm:text-7xl">
          Joute Verbale
        </h1>
        <p className="max-w-md text-lg text-foreground/60">
          Argue with the internet.
        </p>
      </header>

      <nav className="relative z-10 mt-12 flex flex-col gap-4 w-full max-w-xs">
        <ModeButton
          title="Champion"
          description="Pick your topic & side"
          href="/debate?mode=champion"
        />
        <ModeButton
          title="Roulette"
          description="Random topic, random side"
          href="/debate?mode=roulette"
        />
        <ModeButton
          title="Switcheroo"
          description="Sides swap mid-debate"
          href="/debate?mode=switcheroo"
        />
      </nav>

      <footer className="relative z-10 mt-16 text-sm text-foreground/30">
        Built for ElevenHacks 2026
      </footer>
    </div>
  );
}

function ModeButton({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center gap-1 rounded-xl border border-gold/20 bg-gold/5 px-6 py-4 text-center transition-all hover:border-gold/50 hover:bg-gold/10"
    >
      <span className="text-lg font-semibold text-gold group-hover:text-gold-light">
        {title}
      </span>
      <span className="text-sm text-foreground/50">{description}</span>
    </a>
  );
}
