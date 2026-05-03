const base = import.meta.env.BASE_URL;

export default function Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 grid grid-cols-12 gap-[2vw] px-[6vw] py-[7vh]">
        <div className="col-span-7 flex flex-col justify-between">
          <div className="flex items-center gap-[1.2vw]">
            <img
              src={`${base}logo.png`}
              crossOrigin="anonymous"
              alt="Proven Path"
              className="w-[4.5vw] h-[4.5vw] object-contain bg-white rounded-[1vw] p-[0.6vw]"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-[1.7vw] tracking-tight text-text">Proven</span>
              <span className="font-display font-bold text-[1.7vw] tracking-tight text-text -mt-[0.4vw]">Path</span>
            </div>
            <div className="ml-[1.2vw] flex items-center gap-[0.7vw] px-[1.1vw] py-[0.5vw] rounded-full border border-white/10 bg-white/5">
              <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-accent" />
              <span className="text-[1vw] font-medium text-muted tracking-wide uppercase">Performance Intelligence Platform</span>
            </div>
          </div>

          <div className="flex flex-col gap-[2.5vh]">
            <h1 className="font-display font-bold text-[5.4vw] leading-[1.02] tracking-tight text-balance">
              Performance <span className="bg-gradient-to-r from-accent via-primary to-[#a78bfa] bg-clip-text text-transparent">Intelligence</span> That Powers Better Hiring, Retention & Growth
            </h1>
            <p className="text-[1.55vw] text-muted leading-relaxed max-w-[42vw] text-pretty">
              An employer-first platform giving HR teams a verified single source of truth for assessments, reviews, and career growth.
            </p>
          </div>

          <div className="flex items-end gap-[3vw]">
            <div className="flex flex-col">
              <span className="font-display font-bold text-[3.2vw] text-accent leading-none">7-day</span>
              <span className="text-[1vw] text-muted uppercase tracking-[0.18em] mt-[0.5vh]">Free trial</span>
            </div>
            <div className="w-px h-[6vh] bg-white/15" />
            <div className="flex flex-col">
              <span className="font-display font-bold text-[3.2vw] text-text leading-none">$9.99</span>
              <span className="text-[1vw] text-muted uppercase tracking-[0.18em] mt-[0.5vh]">Per month</span>
            </div>
            <div className="w-px h-[6vh] bg-white/15" />
            <div className="flex flex-col">
              <span className="font-display font-bold text-[3.2vw] text-[#fbbf24] leading-none">AI-Powered</span>
              <span className="text-[1vw] text-muted uppercase tracking-[0.18em] mt-[0.5vh]">Insights</span>
            </div>
          </div>
        </div>

        <div className="col-span-5 relative flex items-center justify-center">
          <div className="absolute inset-[6%] rounded-[2vw] bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl" />
          <div className="relative w-full rounded-[1.4vw] overflow-hidden border border-white/10 shadow-[0_30px_80px_-30px_rgba(34,211,238,0.5)] bg-surface">
            <div className="flex items-center gap-[0.6vw] px-[1.2vw] py-[1.1vh] border-b border-white/10 bg-white/[0.04]">
              <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#ef4444]" />
              <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#fbbf24]" />
              <span className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#22c55e]" />
              <span className="ml-[1vw] text-[0.85vw] text-muted">provenpath.app/dashboard</span>
            </div>
            <img
              src={`${base}hero-dashboard.png`}
              crossOrigin="anonymous"
              alt="Proven Path dashboard preview"
              className="w-full h-auto block"
            />
          </div>
          <div className="absolute -bottom-[2vh] -left-[2vw] flex items-center gap-[0.8vw] px-[1.2vw] py-[1.4vh] rounded-[0.9vw] bg-surface border border-white/10 shadow-2xl">
            <div className="w-[2.4vw] h-[2.4vw] rounded-[0.6vw] bg-accent/20 flex items-center justify-center">
              <span className="font-display font-bold text-[1.3vw] text-accent">+24%</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[0.9vw] text-text font-semibold">Retention</span>
              <span className="text-[0.75vw] text-muted uppercase tracking-wider">Year over year</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
