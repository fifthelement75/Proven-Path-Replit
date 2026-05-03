export default function Pricing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden deck-bg font-body text-text">
      <div className="absolute inset-0 flex flex-col px-[6vw] py-[7vh] gap-[4vh]">
        <div className="flex flex-col gap-[1.5vh]">
          <div className="flex items-center gap-[0.8vw]">
            <span className="w-[3vw] h-px bg-accent" />
            <span className="text-[1vw] font-semibold text-accent uppercase tracking-[0.2em]">Pricing</span>
          </div>
          <h2 className="font-display font-bold text-[4.4vw] leading-[1.05] tracking-tight text-balance">
            Simple, Transparent Pricing
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.8vw] flex-1">
          <div className="rounded-[1.4vw] border border-white/10 bg-surface/70 p-[3vh_2vw] flex flex-col gap-[2vh]">
            <div className="flex flex-col gap-[1vh]">
              <span className="text-[1vw] font-semibold text-muted uppercase tracking-[0.18em]">Free</span>
              <div className="flex items-baseline gap-[0.6vw]">
                <span className="font-display font-bold text-[3.6vw] tracking-tight text-text">$0</span>
                <span className="text-[1.1vw] text-muted">/month</span>
              </div>
              <p className="text-[1.1vw] text-muted leading-snug text-pretty">Personal Career Passport, basic profile.</p>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex flex-col gap-[1.4vh]">
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-muted shrink-0" />
                <span className="text-[1.1vw] text-text/85">Personal performance profile</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-muted shrink-0" />
                <span className="text-[1.1vw] text-text/85">Self-assessments</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-muted shrink-0" />
                <span className="text-[1.1vw] text-text/85">Up to 3 verified reviews</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-muted shrink-0" />
                <span className="text-[1.1vw] text-text/85">Read-only career ladder view</span>
              </div>
            </div>
          </div>

          <div className="relative rounded-[1.4vw] border border-accent/40 bg-gradient-to-b from-primary/15 to-accent/10 p-[3vh_2vw] flex flex-col gap-[2vh] shadow-[0_25px_60px_-25px_rgba(34,211,238,0.5)]">
            <div className="absolute -top-[1.6vh] left-[2vw] px-[1vw] py-[0.5vh] rounded-full bg-accent text-bg text-[0.9vw] font-semibold uppercase tracking-wider">Most Popular</div>
            <div className="flex flex-col gap-[1vh]">
              <span className="text-[1vw] font-semibold text-accent uppercase tracking-[0.18em]">Pro</span>
              <div className="flex items-baseline gap-[0.6vw]">
                <span className="font-display font-bold text-[3.6vw] tracking-tight text-text">$9.99</span>
                <span className="text-[1.1vw] text-muted">/month</span>
              </div>
              <p className="text-[1.1vw] text-muted leading-snug text-pretty">Full employer suite. 7-day free trial, no card required.</p>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex flex-col gap-[1.4vh]">
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-accent shrink-0" />
                <span className="text-[1.1vw] text-text">Everything in Free</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-accent shrink-0" />
                <span className="text-[1.1vw] text-text">Structured interviews + scorecards</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-accent shrink-0" />
                <span className="text-[1.1vw] text-text">Team-wide 360° reviews</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-accent shrink-0" />
                <span className="text-[1.1vw] text-text">AI-generated development plans</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-accent shrink-0" />
                <span className="text-[1.1vw] text-text">Promotion readiness dashboards</span>
              </div>
            </div>
          </div>

          <div className="rounded-[1.4vw] border border-white/10 bg-surface/70 p-[3vh_2vw] flex flex-col gap-[2vh]">
            <div className="flex flex-col gap-[1vh]">
              <span className="text-[1vw] font-semibold text-muted uppercase tracking-[0.18em]">Enterprise</span>
              <div className="flex items-baseline gap-[0.6vw]">
                <span className="font-display font-bold text-[3.6vw] tracking-tight text-text">Custom</span>
              </div>
              <p className="text-[1.1vw] text-muted leading-snug text-pretty">For HR organizations with advanced needs.</p>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex flex-col gap-[1.4vh]">
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-primary shrink-0" />
                <span className="text-[1.1vw] text-text/85">Everything in Pro</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-primary shrink-0" />
                <span className="text-[1.1vw] text-text/85">SSO + SCIM provisioning</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-primary shrink-0" />
                <span className="text-[1.1vw] text-text/85">Custom rubrics + competencies</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-primary shrink-0" />
                <span className="text-[1.1vw] text-text/85">Dedicated success manager</span>
              </div>
              <div className="flex items-start gap-[0.8vw]">
                <span className="mt-[0.7vh] w-[0.5vw] h-[0.5vw] rounded-full bg-primary shrink-0" />
                <span className="text-[1.1vw] text-text/85">Custom integrations + API access</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
