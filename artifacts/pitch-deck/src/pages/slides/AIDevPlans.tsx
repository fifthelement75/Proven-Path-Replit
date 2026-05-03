import devPlanImage from "@assets/Screenshot_2026-05-02_at_2.22.08_PM_1777786013250.png";

export default function AIDevPlans() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 grid grid-cols-12 gap-[3vw] px-[6vw] py-[7vh]">
        <div className="col-span-6 flex flex-col justify-center gap-[3vh]">
          <div className="flex items-center gap-[0.8vw]">
            <span className="px-[1vw] py-[0.5vh] rounded-full bg-[#fbbf24]/15 border border-[#fbbf24]/40 text-[0.95vw] font-semibold text-[#fbbf24] uppercase tracking-wider">
              Differentiator 01
            </span>
          </div>
          <h2 className="font-display font-bold text-[4.6vw] leading-[1.04] tracking-tight text-balance">
            AI-Generated <span className="bg-gradient-to-r from-[#fbbf24] to-accent bg-clip-text text-transparent">Development</span> Plans
          </h2>
          <p className="text-[1.4vw] text-muted leading-snug text-pretty max-w-[36vw]">
            A differentiator no other platform offers well.
          </p>

          <div className="flex flex-col gap-[2vh] mt-[1vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="mt-[0.6vh] w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[1.2vw] text-primary">01</span>
              </div>
              <div className="flex flex-col gap-[0.4vh]">
                <p className="font-display font-bold text-[1.5vw] text-text leading-tight">Personalized 30/60/90 plans</p>
                <p className="text-[1.15vw] text-muted leading-snug text-pretty">Built from real competency data, not templates</p>
              </div>
            </div>

            <div className="flex items-start gap-[1.2vw]">
              <div className="mt-[0.6vh] w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[1.2vw] text-primary">02</span>
              </div>
              <div className="flex flex-col gap-[0.4vh]">
                <p className="font-display font-bold text-[1.5vw] text-text leading-tight">Maps weak areas to action</p>
                <p className="text-[1.15vw] text-muted leading-snug text-pretty">Learning paths and stretch projects matched to gaps</p>
              </div>
            </div>

            <div className="flex items-start gap-[1.2vw]">
              <div className="mt-[0.6vh] w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[1.2vw] text-primary">03</span>
              </div>
              <div className="flex flex-col gap-[0.4vh]">
                <p className="font-display font-bold text-[1.5vw] text-text leading-tight">Updates automatically</p>
                <p className="text-[1.15vw] text-muted leading-snug text-pretty">Plans evolve as scores change — no manual refresh</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-6 relative flex items-center justify-center">
          <div className="absolute inset-[8%] rounded-[2vw] bg-gradient-to-br from-[#fbbf24]/20 to-primary/30 blur-3xl" />
          <div className="relative w-full rounded-[1.4vw] overflow-hidden border border-white/10 shadow-[0_30px_80px_-30px_rgba(251,191,36,0.4)] bg-surface">
            <img
              src={devPlanImage}
              crossOrigin="anonymous"
              alt="AI-generated development plan"
              className="w-full h-auto block"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
