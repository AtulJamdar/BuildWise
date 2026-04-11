import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white font-semibold text-xl tracking-tight">BuildWise</div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/login")}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Get Started
            </button>
          </div>
        </nav>

        <main>
          <section className="mt-20 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">AI-powered code review for teams</p>
            <h1 className="mt-6 text-5xl font-semibold leading-tight text-white sm:text-6xl">
              Review code faster. Ship better.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-400">
              BuildWise scans your repo, exposes security risk, and delivers precise fixes so engineering teams move with confidence.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate("/login")}
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
              >
                Start Scanning →
              </button>
              <button
                onClick={() => navigate("/plans")}
                className="rounded-full border border-white/20 px-8 py-3 text-sm font-semibold text-gray-300 transition hover:border-white hover:text-white"
              >
                View plans
              </button>
            </div>

            <div className="mt-16 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(255,255,255,0.04)] backdrop-blur-sm">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-3xl bg-slate-950 p-5 text-left shadow-xl transition duration-500 hover:-translate-y-1">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Dashboard</p>
                  <div className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-[#020617] p-4">
                    <div className="h-3 w-1/2 rounded-full bg-white/20" />
                    <div className="h-3 w-3/4 rounded-full bg-white/10" />
                    <div className="mt-4 grid gap-3">
                      <div className="h-3 w-full rounded-full bg-white/10" />
                      <div className="h-3 w-5/6 rounded-full bg-white/10" />
                      <div className="h-3 w-2/3 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-950 p-5 text-left shadow-xl transition duration-500 hover:-translate-y-1">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Issue page</p>
                  <div className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-[#020617] p-4">
                    <div className="h-3 w-3/4 rounded-full bg-white/20" />
                    <div className="h-3 w-1/4 rounded-full bg-white/10" />
                    <div className="mt-4 space-y-2">
                      <div className="h-2.5 w-full rounded-full bg-white/10" />
                      <div className="h-2.5 w-5/6 rounded-full bg-white/10" />
                      <div className="h-2.5 w-2/3 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-950 p-5 text-left shadow-xl transition duration-500 hover:-translate-y-1">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Scan results</p>
                  <div className="mt-5 space-y-3 rounded-3xl border border-white/10 bg-[#020617] p-4">
                    <div className="h-3 w-1/2 rounded-full bg-white/20" />
                    <div className="mt-4 grid gap-2">
                      <div className="h-2.5 w-full rounded-full bg-white/10" />
                      <div className="h-2.5 w-5/6 rounded-full bg-white/10" />
                      <div className="h-2.5 w-2/3 rounded-full bg-white/10" />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-sm text-cyan-300">92</span>
                      <span className="text-sm text-gray-400">Quality score</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-32 text-center">
            <h2 className="text-3xl font-semibold text-white">See everything in one place</h2>
            <p className="mx-auto mt-4 max-w-3xl text-gray-400">
              Track issues, security risks, and suggestions across your projects in a clean dashboard.
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl">
                <div className="mb-4 h-2.5 w-24 rounded-full bg-cyan-400/20" />
                <h3 className="text-xl font-semibold text-white">Project overview</h3>
                <p className="mt-3 text-gray-400">A single view for all scans, issues and team activity.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl">
                <div className="mb-4 h-2.5 w-24 rounded-full bg-cyan-400/20" />
                <h3 className="text-xl font-semibold text-white">Issue tracking</h3>
                <p className="mt-3 text-gray-400">See priority, status, and fix guidance instantly.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl">
                <div className="mb-4 h-2.5 w-24 rounded-full bg-cyan-400/20" />
                <h3 className="text-xl font-semibold text-white">Security insights</h3>
                <p className="mt-3 text-gray-400">Spot exposed secrets and vulnerable code before release.</p>
              </div>
            </div>
          </section>

          <section className="mt-32 text-center">
            <h2 className="text-3xl font-semibold text-white">How BuildWise works</h2>
            <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-left shadow-xl sm:flex-row sm:justify-between">
              {[
                "GitHub",
                "Scanner",
                "AI",
                "Report",
                "Dashboard",
              ].map((step, index) => (
                <div key={step} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-cyan-300">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold text-white">{step}</p>
                  {index < 4 && <div className="h-0.5 w-16 bg-white/20 sm:block" />}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-32 text-center">
            <h2 className="text-3xl font-semibold text-white">Problem → Solution</h2>
            <div className="mx-auto mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
                <p className="text-lg font-semibold text-red-300">Code reviews are inconsistent and expensive.</p>
                <p className="mt-4 text-gray-400">
                  Teams spend hours on repetitive reviews and still miss security gaps, hidden bugs, or bad architecture.
                </p>
              </div>
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8">
                <p className="text-lg font-semibold text-cyan-200">BuildWise automates discovery and remediation.</p>
                <p className="mt-4 text-gray-400">
                  AI-powered scans surface issues, explain fixes, and make every review faster, safer, and aligned.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-32 text-center">
            <h2 className="text-3xl font-semibold text-white">Built with security in mind</h2>
            <p className="mx-auto mt-4 max-w-3xl text-gray-400">
              Detect exposed API keys, insecure configuration, and vulnerabilities before attackers do.
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl">
                <h3 className="font-semibold text-white">Secret scanning</h3>
                <p className="mt-3 text-gray-400">Find credentials and tokens accidentally committed to code.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl">
                <h3 className="font-semibold text-white">Vulnerability checks</h3>
                <p className="mt-3 text-gray-400">Flag common security issues in dependencies and config.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl">
                <h3 className="font-semibold text-white">Audit-ready reports</h3>
                <p className="mt-3 text-gray-400">Share secure findings with engineers and leadership.</p>
              </div>
            </div>
          </section>

          <section className="mt-32 text-center">
            <h2 className="text-3xl font-semibold text-white">Simple pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-gray-400">
              Free for individuals. Powerful for teams. Transparent pricing that scales with usage.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-xl">
                <p className="text-sm uppercase tracking-[0.35em] text-gray-400">Free</p>
                <p className="mt-4 text-3xl font-semibold text-white">0</p>
                <p className="mt-3 text-gray-400">10 scans / month · Basic insights</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-cyan-500/10 p-6 text-left shadow-xl">
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Pro</p>
                <p className="mt-4 text-3xl font-semibold text-white">₹999</p>
                <p className="mt-3 text-gray-400">100 scans / month · Team features</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/plans")}
              className="mt-8 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
            >
              View Plans →
            </button>
          </section>

          <section className="mt-32 text-center mb-20 border-t border-white/10 pt-10 text-gray-400">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <p>© 2026 BuildWise</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <a href="#" className="transition hover:text-white">GitHub</a>
                <a href="#" className="transition hover:text-white">LinkedIn</a>
                <a href="#" className="transition hover:text-white">Contact</a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
