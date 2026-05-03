import employerImage from "@assets/christina-wocintechchat-com-m-fjza4oBV8ic-unsplash_1777758998149.jpg";
import employeeImage from "@assets/the-jopwell-collection-4WTb4tR45JQ-unsplash_1777761038392.jpg";

export default function TwoProducts() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 flex flex-col px-[6vw] py-[7vh] gap-[5vh]">
        <div className="flex flex-col gap-[2vh]">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[3vw] h-px bg-accent" />
            <span className="text-[1vw] font-semibold text-accent uppercase tracking-[0.2em]">The Platform</span>
          </div>
          <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] tracking-tight text-balance">
            Two Products. One Verified Record.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-[2.5vw] flex-1">
          <div className="relative rounded-[1.4vw] overflow-hidden border border-white/10 bg-surface flex flex-col">
            <div className="relative h-[26vh] overflow-hidden">
              <img
                src={employerImage}
                crossOrigin="anonymous"
                alt="HR leaders collaborating"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
              <div className="absolute top-[2vh] left-[1.5vw] flex items-center gap-[0.6vw] px-[1vw] py-[0.6vh] rounded-full bg-primary/90 text-white">
                <span className="text-[0.95vw] font-semibold uppercase tracking-wider">For Employers</span>
              </div>
            </div>
            <div className="flex-1 p-[2.5vh_2vw] flex flex-col gap-[2vh]">
              <h3 className="font-display font-bold text-[2.4vw] tracking-tight">Proven Path</h3>
              <p className="text-[1.3vw] text-muted leading-snug text-pretty">
                Run interviews, reviews, and competency scoring across teams.
              </p>
              <div className="flex flex-col gap-[1vh] mt-auto">
                <div className="flex items-center gap-[0.8vw]">
                  <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-accent" />
                  <span className="text-[1.1vw] text-text/90">Structured interview rubrics</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-accent" />
                  <span className="text-[1.1vw] text-text/90">Team-wide competency dashboards</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-accent" />
                  <span className="text-[1.1vw] text-text/90">Promotion readiness signals</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative rounded-[1.4vw] overflow-hidden border border-white/10 bg-surface flex flex-col">
            <div className="relative h-[26vh] overflow-hidden">
              <img
                src={employeeImage}
                crossOrigin="anonymous"
                alt="Professional building career record"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
              <div className="absolute top-[2vh] left-[1.5vw] flex items-center gap-[0.6vw] px-[1vw] py-[0.6vh] rounded-full bg-accent/90 text-bg">
                <span className="text-[0.95vw] font-semibold uppercase tracking-wider">For Individuals</span>
              </div>
            </div>
            <div className="flex-1 p-[2.5vh_2vw] flex flex-col gap-[2vh]">
              <h3 className="font-display font-bold text-[2.4vw] tracking-tight">Career progression</h3>
              <p className="text-[1.3vw] text-muted leading-snug text-pretty">
                Own your verified, portable performance record.
              </p>
              <div className="flex flex-col gap-[1vh] mt-auto">
                <div className="flex items-center gap-[0.8vw]">
                  <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
                  <span className="text-[1.1vw] text-text/90">Verified skills + reviews</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
                  <span className="text-[1.1vw] text-text/90">Portable references</span>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <span className="w-[0.5vw] h-[0.5vw] rounded-full bg-primary" />
                  <span className="text-[1.1vw] text-text/90">AI-personalized growth path</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[1.25vw] text-muted">
          Same data layer — <span className="text-text font-semibold">employers get insights</span>, <span className="text-text font-semibold">employees get equity</span>.
        </p>
      </div>
    </div>
  );
}
