const base = import.meta.env.BASE_URL;

export default function Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[6vw] py-[8vh] gap-[5vh]">
        <img
          src={`${base}logo.png`}
          crossOrigin="anonymous"
          alt="Proven Path"
          className="w-[7vw] h-[7vw] object-contain bg-white rounded-[1.4vw] p-[1vw]"
        />

        <div className="flex flex-col items-center gap-[2.5vh]">
          <h2 className="font-display font-bold text-[5.6vw] leading-[1.04] tracking-tight text-balance text-center max-w-[70vw]">
            Hire <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Smarter</span>. Develop <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Faster</span>. Retain <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Longer</span>.
          </h2>
          <p className="text-[1.6vw] text-muted text-center text-pretty max-w-[55vw]">
            Start your 7-day free trial at <span className="text-accent font-semibold">provenpath.app</span>
          </p>
        </div>

        <div className="flex items-center gap-[3vw] mt-[2vh] border-t border-white/10 pt-[3vh]">
          <div className="flex flex-col items-center">
            <span className="font-display font-bold text-[2.6vw] text-accent leading-none">7-day</span>
            <span className="text-[0.95vw] text-muted uppercase tracking-[0.18em] mt-[0.5vh]">Free trial</span>
          </div>
          <div className="w-px h-[5vh] bg-white/15" />
          <div className="flex flex-col items-center">
            <span className="font-display font-bold text-[2.6vw] text-text leading-none">$9.99</span>
            <span className="text-[0.95vw] text-muted uppercase tracking-[0.18em] mt-[0.5vh]">Per month</span>
          </div>
          <div className="w-px h-[5vh] bg-white/15" />
          <div className="flex flex-col items-center">
            <span className="font-display font-bold text-[2.6vw] text-[#fbbf24] leading-none">No card</span>
            <span className="text-[0.95vw] text-muted uppercase tracking-[0.18em] mt-[0.5vh]">Required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
