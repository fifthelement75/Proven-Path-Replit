import problemImage from "@assets/daria-pimkina-tYaccl19A3Q-unsplash_1777758998150.jpg";

export default function Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 grid grid-cols-12">
        <div className="col-span-7 flex flex-col justify-center px-[6vw] py-[8vh] gap-[4vh]">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[3vw] h-px bg-accent" />
            <span className="text-[1vw] font-semibold text-accent uppercase tracking-[0.2em]">The Problem</span>
          </div>
          <h2 className="font-display font-bold text-[5vw] leading-[1.04] tracking-tight text-balance">
            HR Teams Are Flying Blind
          </h2>

          <div className="flex flex-col gap-[2.4vh] max-w-[40vw]">
            <div className="flex items-start gap-[1.2vw]">
              <span className="mt-[1vh] w-[0.8vw] h-[0.8vw] rounded-full bg-primary shrink-0" />
              <p className="text-[1.55vw] text-text/90 leading-snug text-pretty">Decisions made on resumes, gut feel, and disconnected tools</p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <span className="mt-[1vh] w-[0.8vw] h-[0.8vw] rounded-full bg-primary shrink-0" />
              <p className="text-[1.55vw] text-text/90 leading-snug text-pretty">Performance data scattered across spreadsheets, ATS, and reviews</p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <span className="mt-[1vh] w-[0.8vw] h-[0.8vw] rounded-full bg-primary shrink-0" />
              <p className="text-[1.55vw] text-text/90 leading-snug text-pretty">70% of bad hires trace back to incomplete candidate insights</p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <span className="mt-[1vh] w-[0.8vw] h-[0.8vw] rounded-full bg-primary shrink-0" />
              <p className="text-[1.55vw] text-text/90 leading-snug text-pretty">Top performers leave when growth feels invisible</p>
            </div>
          </div>
        </div>

        <div className="col-span-5 relative">
          <img
            src={problemImage}
            crossOrigin="anonymous"
            alt="HR team reviewing data"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-bg/40 to-bg" />
          <div className="absolute bottom-[6vh] right-[3vw] left-[3vw] p-[2vh] rounded-[1vw] bg-bg/85 backdrop-blur border border-white/10">
            <p className="font-display font-bold text-[1.6vw] text-accent leading-tight">$15K</p>
            <p className="text-[1vw] text-muted leading-snug mt-[0.5vh]">average cost of a single bad hire (US Department of Labor)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
