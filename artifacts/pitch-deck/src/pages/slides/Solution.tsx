const base = import.meta.env.BASE_URL;

export default function Solution() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 flex flex-col justify-between px-[6vw] py-[7vh]">
        <div className="flex items-center gap-[0.8vw]">
          <span className="w-[3vw] h-px bg-accent" />
          <span className="text-[1vw] font-semibold text-accent uppercase tracking-[0.2em]">The Solution</span>
        </div>

        <div className="grid grid-cols-12 gap-[3vw] items-center">
          <div className="col-span-6 flex flex-col gap-[3vh]">
            <h2 className="font-display font-bold text-[4.6vw] leading-[1.05] tracking-tight text-balance">
              One Platform.<br />
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Verified</span> Performance Intelligence.
            </h2>
            <p className="text-[1.5vw] text-muted leading-relaxed text-pretty max-w-[36vw]">
              Proven Path unifies assessments, structured interviews, 360° reviews, and skill scoring into a single source of truth — so every hiring, promotion, and retention decision is backed by data.
            </p>
          </div>

          <div className="col-span-6 relative">
            <div className="absolute -inset-[3%] rounded-[2vw] bg-gradient-to-br from-accent/25 to-primary/25 blur-2xl" />
            <div className="relative rounded-[1.2vw] overflow-hidden border border-white/10 shadow-2xl bg-surface">
              <img
                src={`${base}competency-overview.png`}
                crossOrigin="anonymous"
                alt="Competency overview"
                className="w-full h-auto block"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-[1.5vw] border-t border-white/10 pt-[3vh]">
          <div className="flex flex-col gap-[0.5vh]">
            <span className="font-display font-bold text-[2vw] text-text">Assessments</span>
            <span className="text-[1vw] text-muted">Skill scoring with rubrics</span>
          </div>
          <div className="flex flex-col gap-[0.5vh]">
            <span className="font-display font-bold text-[2vw] text-text">Interviews</span>
            <span className="text-[1vw] text-muted">Structured scorecards</span>
          </div>
          <div className="flex flex-col gap-[0.5vh]">
            <span className="font-display font-bold text-[2vw] text-text">Reviews</span>
            <span className="text-[1vw] text-muted">360° peer feedback</span>
          </div>
          <div className="flex flex-col gap-[0.5vh]">
            <span className="font-display font-bold text-[2vw] text-text">Growth</span>
            <span className="text-[1vw] text-muted">AI development plans</span>
          </div>
        </div>
      </div>
    </div>
  );
}
