const base = import.meta.env.BASE_URL;

export default function PortableRecord() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 grid grid-cols-12 gap-[3vw] px-[6vw] py-[7vh]">
        <div className="col-span-6 relative flex items-center justify-center">
          <div className="absolute inset-[8%] rounded-[2vw] bg-gradient-to-br from-accent/25 to-primary/25 blur-3xl" />
          <div className="relative w-full rounded-[1.4vw] overflow-hidden border border-white/10 shadow-[0_30px_80px_-30px_rgba(34,211,238,0.4)] bg-surface">
            <img
              src={`${base}portable-record.png`}
              crossOrigin="anonymous"
              alt="Portable career record"
              className="w-full h-auto block"
            />
          </div>
        </div>

        <div className="col-span-6 flex flex-col justify-center gap-[3vh]">
          <div className="flex items-center gap-[0.8vw]">
            <span className="px-[1vw] py-[0.5vh] rounded-full bg-accent/15 border border-accent/40 text-[0.95vw] font-semibold text-accent uppercase tracking-wider">
              Differentiator 02
            </span>
          </div>
          <h2 className="font-display font-bold text-[4.6vw] leading-[1.04] tracking-tight text-balance">
            The <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Portable</span> Career Record
          </h2>
          <p className="text-[1.4vw] text-muted leading-snug text-pretty max-w-[36vw]">
            Unique to Career progression.
          </p>

          <div className="flex flex-col gap-[2.2vh] mt-[1vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div className="mt-[0.6vh] w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[1.2vw] text-accent">01</span>
              </div>
              <div className="flex flex-col gap-[0.4vh]">
                <p className="font-display font-bold text-[1.5vw] text-text leading-tight">Travels with the employee</p>
                <p className="text-[1.15vw] text-muted leading-snug text-pretty">Every assessment, review, and reference follows them as they continue to grow within the organization</p>
              </div>
            </div>

            <div className="flex items-start gap-[1.2vw]">
              <div className="mt-[0.6vh] w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[1.2vw] text-accent">02</span>
              </div>
              <div className="flex flex-col gap-[0.4vh]">
                <p className="font-display font-bold text-[1.5vw] text-text leading-tight">Verified, employer-attested</p>
                <p className="text-[1.15vw] text-muted leading-snug text-pretty">Skill data signed by the people who actually saw the work</p>
              </div>
            </div>

            <div className="flex items-start gap-[1.2vw]">
              <div className="mt-[0.6vh] w-[2.2vw] h-[2.2vw] rounded-[0.6vw] bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[1.2vw] text-accent">03</span>
              </div>
              <div className="flex flex-col gap-[0.4vh]">
                <p className="font-display font-bold text-[1.5vw] text-text leading-tight">Eliminates the resume</p>
                <p className="text-[1.15vw] text-muted leading-snug text-pretty">Replaces it with proof: real scores, real reviews, real outcomes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
