import {
  ShieldCheck,
  Brain,
  TrendingUp,
  ClipboardCheck,
  Users,
  BadgeCheck,
} from "lucide-react";
import logoUrl from "@/assets/proven-path-logo.png";

export default function ProvenPathBanner() {
  const features = [
    { icon: Brain, label: "AI Talent Insights" },
    { icon: ShieldCheck, label: "Verified Performance" },
    { icon: ClipboardCheck, label: "360° Reviews" },
    { icon: Users, label: "Career Ladders" },
    { icon: TrendingUp, label: "Promotion Readiness" },
    { icon: BadgeCheck, label: "Portable References" },
  ];

  return (
    <div
      className="relative w-[1600px] h-[900px] overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #4c1d95 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div
        aria-hidden
        className="absolute -top-40 -left-32 w-[36rem] h-[36rem] rounded-full"
        style={{ background: "rgba(37, 99, 235, 0.45)", filter: "blur(140px)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-32 w-[36rem] h-[36rem] rounded-full"
        style={{ background: "rgba(34, 197, 94, 0.35)", filter: "blur(140px)" }}
      />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44rem] h-[44rem] rounded-full"
        style={{ background: "rgba(245, 158, 11, 0.12)", filter: "blur(160px)" }}
      />

      <div className="relative z-10 grid grid-cols-12 h-full px-20 py-16 gap-10">
        <div className="col-span-7 flex flex-col justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-2xl px-5 py-3 shadow-2xl ring-1 ring-white/40 inline-flex items-center">
              <img src={logoUrl} alt="ProvenPath" className="h-14 w-auto" />
            </div>
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(10px)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#22c55e" }}
              />
              Performance Intelligence Platform
            </span>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-7xl font-bold leading-[1.05] tracking-tight mb-6">
                Performance{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #34d399 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Intelligence
                </span>{" "}
                That Powers Better Hiring, Retention & Growth
              </h1>
              <p className="text-2xl text-slate-300 leading-relaxed max-w-2xl">
                The employer-first platform giving HR teams a verified single
                source of truth for assessments, reviews, and career growth.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-10 gap-y-4 max-w-2xl">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      <Icon size={22} className="text-white" />
                    </div>
                    <span className="text-lg font-medium text-slate-100">
                      {f.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-8 text-slate-300">
            <div>
              <div
                className="text-3xl font-bold"
                style={{ color: "#34d399" }}
              >
                7-day
              </div>
              <div className="text-sm uppercase tracking-wider text-slate-400">
                Free trial
              </div>
            </div>
            <div className="h-12 w-px bg-white/15" />
            <div>
              <div
                className="text-3xl font-bold"
                style={{ color: "#60a5fa" }}
              >
                $9.99
              </div>
              <div className="text-sm uppercase tracking-wider text-slate-400">
                Per month
              </div>
            </div>
            <div className="h-12 w-px bg-white/15" />
            <div>
              <div
                className="text-3xl font-bold"
                style={{ color: "#fbbf24" }}
              >
                AI-Powered
              </div>
              <div className="text-sm uppercase tracking-wider text-slate-400">
                Insights
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-5 flex items-center justify-center relative">
          <div
            aria-hidden
            className="absolute inset-0 rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(96,165,250,0.35) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="relative w-full max-w-xl">
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-white ring-1 ring-white/20">
              <div className="flex items-center gap-2 px-5 py-3 bg-slate-100 border-b border-slate-200">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <div className="ml-3 flex-1 max-w-xs">
                  <div className="px-3 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-500 truncate font-mono">
                    provenpath.app/dashboard
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                      Avg Score
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      4.2<span className="text-slate-400 text-sm">/5</span>
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                      ↑ 12% this quarter
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                      Promotion Ready
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      18
                    </div>
                    <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                      Across 4 teams
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      Competency Averages
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Last 30 days
                    </div>
                  </div>
                  {[
                    { label: "Technical", value: 86, color: "#3b82f6" },
                    { label: "Communication", value: 72, color: "#a78bfa" },
                    { label: "Leadership", value: 64, color: "#34d399" },
                    { label: "Problem Solving", value: 78, color: "#fbbf24" },
                  ].map((bar) => (
                    <div key={bar.label} className="mb-2 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-700 font-medium">
                          {bar.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {bar.value}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${bar.value}%`,
                            background: bar.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Verified by ProvenPath · Updated daily
                </div>
              </div>
            </div>

            <div
              className="absolute -top-5 -right-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-2xl"
              style={{ background: "#2563eb" }}
            >
              <span
                className="w-2 h-2 rounded-full bg-white animate-pulse"
              />
              Live performance data
            </div>

            <div className="absolute -bottom-5 -left-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-white shadow-2xl">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg text-white"
                style={{ background: "#22c55e" }}
              >
                <TrendingUp size={18} />
              </div>
              <div className="leading-tight">
                <div className="text-base font-bold text-slate-900">
                  +24%{" "}
                  <span className="text-slate-400 text-xs font-medium">
                    retention
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                  Year over year
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
