import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900 tracking-tight">{t("brand")}</div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/login")}
                className="text-sm text-gray-600 transition hover:text-gray-900"
              >
                {t("nav.login")}
              </button>
              <button
                onClick={() => navigate("/login")}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {t("nav.getStarted")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">{t("hero.tagline")}</p>
          <h1 className="mt-4 text-6xl font-bold leading-tight text-gray-900 sm:text-7xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            {t("hero.description")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/login")}
              className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {t("hero.startScanning")}
            </button>
            <button
              onClick={() => navigate("/plans")}
              className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-400 hover:bg-gray-50"
            >
              {t("hero.viewPlans")}
            </button>
          </div>

          {/* Preview Cards */}
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm hover:shadow-md transition">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Dashboard</p>
              <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                <div className="h-2.5 w-1/2 rounded bg-gray-300" />
                <div className="h-2.5 w-3/4 rounded bg-gray-200" />
                <div className="mt-3 grid gap-2">
                  <div className="h-2 w-full rounded bg-gray-200" />
                  <div className="h-2 w-5/6 rounded bg-gray-200" />
                  <div className="h-2 w-2/3 rounded bg-gray-200" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm hover:shadow-md transition">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Issue Tracking</p>
              <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                <div className="h-2.5 w-3/4 rounded bg-gray-300" />
                <div className="h-2.5 w-1/4 rounded bg-gray-200" />
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-full rounded bg-gray-200" />
                  <div className="h-2 w-5/6 rounded bg-gray-200" />
                  <div className="h-2 w-2/3 rounded bg-gray-200" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm hover:shadow-md transition">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Scan Results</p>
              <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                <div className="h-2.5 w-1/2 rounded bg-gray-300" />
                <div className="mt-3 grid gap-2">
                  <div className="h-2 w-full rounded bg-gray-200" />
                  <div className="h-2 w-5/6 rounded bg-gray-200" />
                  <div className="h-2 w-2/3 rounded bg-gray-200" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">92</span>
                  <span className="text-xs text-gray-600">Quality score</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900">Everything you need in one place</h2>
            <p className="mt-4 text-lg text-gray-600">Track issues, security risks, and improvements across all your projects.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <h3 className="text-lg font-semibold text-gray-900">Project Overview</h3>
              <p className="mt-2 text-gray-600">A unified view of all scans, issues, and team activity in one dashboard.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <h3 className="text-lg font-semibold text-gray-900">Issue Tracking</h3>
              <p className="mt-2 text-gray-600">View priority, status, and fix guidance instantly for every issue.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <h3 className="text-lg font-semibold text-gray-900">Security Insights</h3>
              <p className="mt-2 text-gray-600">Detect exposed secrets and vulnerable code before they reach production.</p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 border-t border-gray-200">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900">How BuildWise works</h2>
          </div>

          <div className="flex flex-col items-center gap-8 rounded-xl border border-gray-200 bg-white p-8 sm:flex-row sm:justify-between sm:gap-4">
            {["GitHub", "Scanner", "AI", "Report", "Dashboard"].map((step, index) => (
              <div key={step} className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-600">
                  {index + 1}
                </div>
                <p className="text-sm font-semibold text-gray-900 text-center">{step}</p>
                {index < 4 && <div className="hidden h-1 w-12 bg-gray-300 sm:block" />}
              </div>
            ))}
          </div>
        </section>

        {/* Problem Solution Section */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900">The Challenge</h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-red-200 bg-red-50 p-8">
              <p className="text-lg font-semibold text-red-700">Code reviews are inconsistent and expensive</p>
              <p className="mt-3 text-gray-700">
                Teams spend hours on repetitive reviews, often missing security gaps, hidden bugs, and architectural issues.
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-8">
              <p className="text-lg font-semibold text-blue-700">BuildWise automates discovery</p>
              <p className="mt-3 text-gray-700">
                AI-powered scans surface issues instantly, explain fixes, and make every review faster, safer, and aligned with best practices.
              </p>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 border-t border-gray-200">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900">Built for security</h2>
            <p className="mt-4 text-lg text-gray-600">Detect exposed secrets and vulnerabilities before attackers do.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <h3 className="font-semibold text-gray-900">Secret Scanning</h3>
              <p className="mt-2 text-gray-600">Find credentials and tokens accidentally committed to your code.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <h3 className="font-semibold text-gray-900">Vulnerability Detection</h3>
              <p className="mt-2 text-gray-600">Flag common security issues in dependencies and configuration files.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <h3 className="font-semibold text-gray-900">Audit-Ready Reports</h3>
              <p className="mt-2 text-gray-600">Share secure findings with engineers and leadership easily.</p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 border-t border-gray-200">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-gray-600">Free for individuals. Powerful for teams.</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 lg:flex-row">
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm w-full lg:w-80">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-600">Free</p>
              <p className="mt-4 text-3xl font-bold text-gray-900">$0</p>
              <p className="mt-2 text-gray-600">Perfect to get started</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                <li>✓ 10 scans/month</li>
                <li>✓ Basic insights</li>
                <li>✓ 1 project</li>
              </ul>
              <button
                onClick={() => navigate("/login")}
                className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Get Started Free
              </button>
            </div>

            <div className="rounded-xl border-2 border-blue-600 bg-blue-50 p-8 shadow-md w-full lg:w-80 relative">
              <div className="absolute -top-4 left-6 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Most Popular
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Pro</p>
              <p className="mt-4 text-3xl font-bold text-gray-900">₹999<span className="text-lg text-gray-600">/month</span></p>
              <p className="mt-2 text-gray-700">For growing teams</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                <li>✓ 100 scans/month</li>
                <li>✓ Team features</li>
                <li>✓ Unlimited projects</li>
                <li>✓ Priority support</li>
              </ul>
              <button
                onClick={() => navigate("/login")}
                className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 text-center border-t border-gray-200">
          <h2 className="text-4xl font-bold text-gray-900">Ready to improve your code quality?</h2>
          <p className="mt-4 text-lg text-gray-600">Start scanning your code today. No credit card required.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/login")}
              className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Start Free Scan
            </button>
            <button
              onClick={() => navigate("/plans")}
              className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-400 hover:bg-gray-50"
            >
              View Pricing
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">© 2026 BuildWise. All rights reserved.</p>
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <a href="#" className="transition hover:text-gray-900">GitHub</a>
                <a href="#" className="transition hover:text-gray-900">LinkedIn</a>
                <a href="#" className="transition hover:text-gray-900">Contact</a>
                <a href="#" className="transition hover:text-gray-900">Privacy</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
