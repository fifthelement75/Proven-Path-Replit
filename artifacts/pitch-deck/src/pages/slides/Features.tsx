export default function Features() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 flex flex-col px-[6vw] py-[7vh] gap-[5vh]">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-[1.5vh]">
            <div className="flex items-center gap-[0.8vw]">
              <span className="w-[3vw] h-px bg-accent" />
              <span className="text-[1vw] font-semibold text-accent uppercase tracking-[0.2em]">Capabilities</span>
            </div>
            <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] tracking-tight text-balance">
              Built for Modern HR
            </h2>
          </div>
          <p className="text-[1.2vw] text-muted max-w-[24vw] text-right text-pretty">
            Every workflow your team needs to hire, develop, and retain — in one connected system.
          </p>
        </div>

        <div className="grid grid-cols-3 grid-rows-2 gap-[1.6vw] flex-1">
          <div className="rounded-[1.2vw] border border-white/10 bg-surface/80 p-[2.5vh_1.8vw] flex flex-col gap-[1.5vh] hover:border-primary/40 transition">
            <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-primary/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-[1.6vw] h-[1.6vw]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--slide-primary)" }}>
                <path d="M12 2a4 4 0 0 0-4 4v0a4 4 0 0 0 0 8v0a4 4 0 0 0 8 0v0a4 4 0 0 0 0-8v0a4 4 0 0 0-4-4z" />
                <path d="M12 18v4" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-[1.7vw] tracking-tight">AI Talent Insights</h3>
            <p className="text-[1.1vw] text-muted leading-snug text-pretty">Surface hidden patterns across every candidate and team member.</p>
          </div>

          <div className="rounded-[1.2vw] border border-white/10 bg-surface/80 p-[2.5vh_1.8vw] flex flex-col gap-[1.5vh] hover:border-accent/40 transition">
            <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-accent/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-[1.6vw] h-[1.6vw]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--slide-accent)" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-[1.7vw] tracking-tight">Verified Performance Scoring</h3>
            <p className="text-[1.1vw] text-muted leading-snug text-pretty">Rubric-based scoring you can trust across teams and levels.</p>
          </div>

          <div className="rounded-[1.2vw] border border-white/10 bg-surface/80 p-[2.5vh_1.8vw] flex flex-col gap-[1.5vh] hover:border-primary/40 transition">
            <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-primary/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-[1.6vw] h-[1.6vw]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--slide-primary)" }}>
                <circle cx="9" cy="7" r="4" />
                <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <circle cx="17" cy="7" r="3" />
                <path d="M21 21v-2a3 3 0 0 0-2-2.83" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-[1.7vw] tracking-tight">360° Reviews</h3>
            <p className="text-[1.1vw] text-muted leading-snug text-pretty">Manager, peer, and self-feedback in a single workflow.</p>
          </div>

          <div className="rounded-[1.2vw] border border-white/10 bg-surface/80 p-[2.5vh_1.8vw] flex flex-col gap-[1.5vh] hover:border-accent/40 transition">
            <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-accent/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-[1.6vw] h-[1.6vw]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--slide-accent)" }}>
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 5-5" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-[1.7vw] tracking-tight">Promotion Readiness</h3>
            <p className="text-[1.1vw] text-muted leading-snug text-pretty">See exactly who is ready and what's holding others back.</p>
          </div>

          <div className="rounded-[1.2vw] border border-white/10 bg-surface/80 p-[2.5vh_1.8vw] flex flex-col gap-[1.5vh] hover:border-primary/40 transition">
            <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-primary/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-[1.6vw] h-[1.6vw]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--slide-primary)" }}>
                <path d="M4 20l8-16 8 16" />
                <path d="M8 14h8" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-[1.7vw] tracking-tight">Career Ladders</h3>
            <p className="text-[1.1vw] text-muted leading-snug text-pretty">Transparent levels and competencies for every role.</p>
          </div>

          <div className="rounded-[1.2vw] border border-white/10 bg-surface/80 p-[2.5vh_1.8vw] flex flex-col gap-[1.5vh] hover:border-accent/40 transition">
            <div className="w-[3vw] h-[3vw] rounded-[0.8vw] bg-accent/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-[1.6vw] h-[1.6vw]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--slide-accent)" }}>
                <path d="M14 3h7v7" />
                <path d="M10 21H3v-7" />
                <path d="M21 3l-9 9" />
                <path d="M3 21l9-9" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-[1.7vw] tracking-tight">Portable References</h3>
            <p className="text-[1.1vw] text-muted leading-snug text-pretty">Verified credentials that travel across employers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
