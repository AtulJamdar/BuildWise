import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────
   THEME: Matches BuildWise dashboard exactly
   Sidebar dark navy + white content + blue CTAs
───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&display=swap');

  :root {
    /* ── Dashboard exact colors ── */
    --sidebar:      #1a2233;
    --sidebar-2:    #141c2e;
    --bg:           #f4f6f9;
    --surface:      #ffffff;
    --surface-2:    #f8fafc;
    --border:       #e2e8f0;
    --border-2:     #cbd5e1;
    --text:         #0f172a;
    --text-2:       #334155;
    --muted:        #64748b;
    --muted-2:      #94a3b8;

    /* ── Accent (dashboard blue) ── */
    --blue:         #2563eb;
    --blue-dark:    #1d4ed8;
    --blue-light:   #dbeafe;
    --blue-mid:     #3b82f6;

    /* ── Status colors from dashboard ── */
    --green:        #16a34a;
    --green-light:  #dcfce7;
    --red:          #dc2626;
    --red-light:    #fee2e2;
    --yellow:       #d97706;
    --yellow-light: #fef3c7;
    --purple:       #7c3aed;
    --purple-light: #ede9fe;

    --font:         'Geist', sans-serif;
    --mono:         'Geist Mono', monospace;

    --shadow-sm:    0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md:    0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
    --shadow-lg:    0 20px 48px rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.06);
    --shadow-blue:  0 8px 32px rgba(37,99,235,0.25);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  /* ── Scroll reveal ── */
  .reveal {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1);
  }
  .reveal.in { opacity: 1; transform: none; }
  .d1 { transition-delay: 0.05s; }
  .d2 { transition-delay: 0.12s; }
  .d3 { transition-delay: 0.19s; }
  .d4 { transition-delay: 0.26s; }
  .d5 { transition-delay: 0.33s; }
  .d6 { transition-delay: 0.40s; }

  /* ── Nav ── */
  .nav-glass {
    position: fixed; top: 0; left: 0; right: 0; z-index: 200;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    transition: box-shadow 0.3s;
  }
  .nav-glass.scrolled {
    box-shadow: 0 2px 20px rgba(0,0,0,0.06);
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 22px; border-radius: 8px;
    font-family: var(--font); font-size: 14px; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.18s ease;
    text-decoration: none; white-space: nowrap;
  }
  .btn-blue {
    background: var(--blue); color: #fff;
    box-shadow: var(--shadow-blue);
  }
  .btn-blue:hover {
    background: var(--blue-dark);
    box-shadow: 0 12px 40px rgba(37,99,235,0.35);
    transform: translateY(-1px);
  }
  .btn-blue:active { transform: translateY(0); }

  .btn-outline {
    background: transparent; color: var(--text-2);
    border: 1.5px solid var(--border-2);
  }
  .btn-outline:hover {
    border-color: var(--blue); color: var(--blue);
    background: var(--blue-light);
    transform: translateY(-1px);
  }

  .btn-white {
    background: #fff; color: var(--blue);
    box-shadow: var(--shadow-md);
  }
  .btn-white:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-1px);
  }

  /* ── Cards ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.22s, transform 0.22s, border-color 0.22s;
  }
  .card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    border-color: var(--border-2);
  }

  /* ── Badge ── */
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 100px;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
  }
  .badge-blue { background: var(--blue-light); color: var(--blue); }
  .badge-green { background: var(--green-light); color: var(--green); }
  .badge-yellow { background: var(--yellow-light); color: var(--yellow); }
  .badge-red { background: var(--red-light); color: var(--red); }
  .badge-purple { background: var(--purple-light); color: var(--purple); }

  /* ── Sidebar style block ── */
  .sidebar-card {
    background: var(--sidebar);
    color: #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
  }

  /* ── Section divider ── */
  .divider {
    height: 1px;
    background: var(--border);
  }

  /* ── Stat number ── */
  .stat-num {
    font-size: 40px; font-weight: 800;
    letter-spacing: -0.04em; color: var(--text);
    line-height: 1;
  }

  /* ── Gradient hero background ── */
  .hero-bg {
    background:
      radial-gradient(ellipse 70% 60% at 20% -10%, rgba(37,99,235,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 80% 10%, rgba(124,58,237,0.05) 0%, transparent 55%),
      var(--bg);
  }

  /* ── Ticker ── */
  @keyframes ticker {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  .ticker-track { animation: ticker 30s linear infinite; }

  /* ── Float ── */
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-10px) rotate(0.5deg); }
    66% { transform: translateY(-5px) rotate(-0.5deg); }
  }
  .float { animation: float 6s ease-in-out infinite; }

  /* ── Shimmer on hover ── */
  .shimmer {
    position: relative; overflow: hidden;
  }
  .shimmer::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%);
    transform: translateX(-100%);
    transition: transform 0s;
  }
  .shimmer:hover::after {
    transform: translateX(100%);
    transition: transform 0.5s ease;
  }

  /* ── Typing cursor ── */
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  .cursor { animation: blink 1s step-end infinite; color: var(--blue); }

  /* ── Pulse dot ── */
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
    70% { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
    100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
  }
  .pulse { animation: pulse 2s infinite; }

  /* ── Issue severity ── */
  .sev-high { background: var(--red-light); color: var(--red); }
  .sev-medium { background: var(--yellow-light); color: var(--yellow); }
  .sev-low { background: #f1f5f9; color: var(--muted); }

  /* ── Diff lines ── */
  .diff-add { background: #f0fdf4; color: #16a34a; border-left: 3px solid #16a34a; }
  .diff-remove { background: #fef2f2; color: #dc2626; border-left: 3px solid #dc2626; }
  .diff-ctx { background: var(--surface-2); color: var(--muted); border-left: 3px solid var(--border); }

  /* ── Steps connector ── */
  .step-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, var(--blue), #818cf8);
    opacity: 0.3;
  }

  /* ── Hover lift ── */
  .lift { transition: transform 0.2s, box-shadow 0.2s; }
  .lift:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }

  /* ── Nav link ── */
  .nav-link {
    font-size: 13.5px; font-weight: 500; color: var(--text-2);
    text-decoration: none; padding: 6px 10px; border-radius: 6px;
    transition: background 0.15s, color 0.15s;
  }
  .nav-link:hover { background: var(--bg); color: var(--text); }

  /* ── Comparison table row ── */
  .cmp-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    font-size: 14px; align-items: center;
  }
  .cmp-row:last-child { border-bottom: none; }

  /* ── Feature icon box ── */
  .icon-box {
    width: 44px; height: 44px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }

  /* ── Pricing card ── */
  .pricing-popular {
    border: 2px solid var(--blue) !important;
    position: relative;
  }
  .pricing-popular::before {
    content: 'Most Popular';
    position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
    background: var(--blue); color: #fff;
    font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
    padding: 3px 14px; border-radius: 100px;
  }

  /* ── FAQ ── */
  .faq-q {
    width: 100%; background: none; border: none;
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 0; cursor: pointer; text-align: left; gap: 16px;
    font-family: var(--font);
  }

  /* ── Scroll progress ── */
  #progress-bar {
    position: fixed; top: 0; left: 0; height: 3px; z-index: 300;
    background: var(--blue); width: 0%;
    transition: width 0.1s linear;
  }

  /* ── Grid pattern ── */
  .grid-pattern {
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 48px 48px;
    opacity: 0.5;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
    .stack-mobile { flex-direction: column !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .text-center-mobile { text-align: center !important; }
  }
`;

/* ── useScrollReveal ── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── Nav scroll ── */
function useNavScroll() {
  useEffect(() => {
    const nav = document.querySelector(".nav-glass");
    const bar = document.getElementById("progress-bar");
    const onScroll = () => {
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 20);
      if (bar) {
        const total = document.body.scrollHeight - window.innerHeight;
        bar.style.width = (window.scrollY / total * 100) + "%";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

/* ── Animated counter ── */
function Counter({ to, suffix = "", prefix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const duration = 1400;
        const step = to / (duration / 16);
        const t = setInterval(() => {
          start = Math.min(start + step, to);
          setVal(Math.floor(start));
          if (start >= to) clearInterval(t);
        }, 16);
        io.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ── Typing effect ── */
function TypeWriter({ words, speed = 80, pause = 1800 }) {
  const [text, setText] = useState("");
  const [wi, setWi] = useState(0);
  const [ci, setCi] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wi];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.substring(0, ci + 1));
        if (ci + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCi(ci + 1);
        }
      } else {
        setText(word.substring(0, ci - 1));
        if (ci - 1 === 0) {
          setDeleting(false);
          setWi((wi + 1) % words.length);
          setCi(0);
        } else {
          setCi(ci - 1);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [text, ci, deleting, wi, words, speed, pause]);

  return <span>{text}<span className="cursor">|</span></span>;
}

/* ── Dashboard mockup (matches real dashboard) ── */
function DashboardMockup() {
  const issues = [
    { sev: "HIGH", title: "Exposed API key detected", file: "src/config.js", line: 12 },
    { sev: "HIGH", title: "High entropy string detected", file: "api/main.py", line: 637 },
    { sev: "MEDIUM", title: "Hardcoded localhost URL", file: "api/main_old.py", line: 51 },
    { sev: "MEDIUM", title: "Duplicate logic detected", file: "utils/helpers.py", line: 88 },
    { sev: "LOW", title: "Possibly unused file", file: "components/OldNav.jsx", line: null },
  ];
  const sevCls = { HIGH: "sev-high", MEDIUM: "sev-medium", LOW: "sev-low" };

  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)" }}>
      {/* Titlebar */}
      <div style={{ background: "var(--sidebar)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#FF5F56", "#FFBD2E", "#27C93F"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </div>
        <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8", fontFamily: "var(--mono)" }}>BuildWise — Dashboard</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#4a5568", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, background: "#27C93F", borderRadius: "50%", display: "inline-block" }} />
          main · live
        </span>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ display: "flex" }}>
        {/* Mini sidebar */}
        <div style={{ width: 160, background: "#1a2233", padding: "16px 0", flexShrink: 0 }}>
          <div style={{ padding: "0 16px 12px", fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Main</div>
          {["Dashboard", "Projects", "Teams"].map((item, i) => (
            <div key={item} style={{ padding: "8px 16px", fontSize: 12, color: i === 0 ? "#fff" : "#94a3b8", background: i === 0 ? "rgba(37,99,235,0.2)" : "transparent", borderLeft: i === 0 ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer" }}>
              {item}
            </div>
          ))}
          <div style={{ padding: "12px 16px 6px", marginTop: 8, fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Account</div>
          {["Profile", "Plans"].map(item => (
            <div key={item} style={{ padding: "8px 16px", fontSize: 12, color: "#94a3b8" }}>{item}</div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, background: "#f4f6f9", padding: "20px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Dashboard Overview</div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 16 }}>Monitor your security scans, plans, and teams in one place.</div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Score", value: "72", unit: "/100", color: "#d97706", bg: "#fef3c7" },
              { label: "Issues", value: "14", unit: " found", color: "#dc2626", bg: "#fee2e2" },
              { label: "Fixed", value: "3", unit: " today", color: "#16a34a", bg: "#dcfce7" },
              { label: "Files", value: "47", unit: " scanned", color: "#2563eb", bg: "#dbeafe" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}<span style={{ fontSize: 10, fontWeight: 400, color: "#94a3b8" }}>{s.unit}</span></div>
              </div>
            ))}
          </div>

          {/* Issues */}
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Issues Detected</div>
            {issues.map((iss, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: i < issues.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background 0.12s" }}>
                <span className={`badge ${sevCls[iss.sev]}`} style={{ fontSize: 9, padding: "2px 7px" }}>{iss.sev}</span>
                <span style={{ flex: 1, fontSize: 11, color: "#334155" }}>{iss.title}</span>
                <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "var(--mono)" }}>{iss.file}{iss.line ? `:${iss.line}` : ""}</span>
                <span style={{ fontSize: 10, color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>Fix →</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Issue detail mockup ── */
function IssueMockup() {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
      <div style={{ background: "var(--sidebar)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#FF5F56", "#FFBD2E", "#27C93F"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8, fontFamily: "var(--mono)" }}>Issue Detail · api/main.py:637</span>
        <span className="badge badge-red" style={{ marginLeft: "auto", fontSize: 9 }}>HIGH</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>High entropy string detected</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16, fontFamily: "var(--mono)" }}>Issue ID: 1766 · Status: OPEN</div>

        {/* Code snippet */}
        <div style={{ background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", padding: "14px", marginBottom: 14, fontFamily: "var(--mono)", fontSize: 11 }}>
          <div style={{ color: "#94a3b8", marginBottom: 8 }}>return {"{"}"message": "If that email exists..."{"}"}</div>
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "6px 10px", borderRadius: 6, borderLeft: "3px solid #dc2626" }}>
            reset_link = f"{"{FRONTEND_URL}"}/reset-password/{"{token}"}
          </div>
        </div>

        {/* Why it's a problem */}
        <div style={{ background: "#fef3c7", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Why this is a problem</div>
          <div style={{ fontSize: 12, color: "#92400e" }}>This quoted string has high randomness and may be a secret or API key.</div>
        </div>

        {/* Suggested fix */}
        <div style={{ background: "#dcfce7", borderRadius: 8, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Suggested Fix</div>
          <div style={{ fontSize: 12, color: "#14532d", fontFamily: "var(--mono)" }}>Move secrets into environment variables and rotate any exposed keys.</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 16px", borderRadius: 7, background: "#7c3aed", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>Preview fix</button>
          <button style={{ padding: "8px 16px", borderRadius: 7, background: "#16a34a", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>Mark Fixed</button>
          <button style={{ padding: "8px 16px", borderRadius: 7, background: "#e2e8f0", color: "#334155", border: "none", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font)" }}>Ignore</button>
        </div>
      </div>
    </div>
  );
}

/* ── Fix preview mockup ── */
function FixPreviewMockup() {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
      <div style={{ background: "var(--sidebar)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#FF5F56", "#FFBD2E", "#27C93F"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8, fontFamily: "var(--mono)" }}>Fix Preview · Line 51</span>
        <button style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 6, background: "#16a34a", color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>Apply fix via PR</button>
      </div>
      <div style={{ padding: "18px" }}>
        <div style={{ background: "#fef3c7", borderRadius: 8, padding: "12px 14px", marginBottom: 14, border: "1px solid #fde68a" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>💡 Suggested change:</div>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "#92400e" }}>Replace the original line with this:</div>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "#0f172a", marginTop: 6, background: "#fff", padding: "6px 10px", borderRadius: 5 }}>
            GITHUB_REDIRECT_URI = get_env("GITHUB_REDIRECT_URI", f"{"{BACKEND_URL}"}/auth/github/callback")
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Diff</div>
          {[
            { type: "ctx", text: "  SECRET_KEY = get_env('SECRET_KEY', 'supersecret')" },
            { type: "ctx", text: "  razorpay_client = razorpay.Client(...)" },
            { type: "remove", text: "- GITHUB_REDIRECT_URI = get_env('GITHUB_REDIRECT_URI', f'{BACKEND_URL}/auth/github/callback')" },
            { type: "add", text: "+ GITHUB_REDIRECT_URI = get_env('GITHUB_REDIRECT_URI', f'{BACKEND_URL}/auth/github/callback')" },
            { type: "ctx", text: "  FRONTEND_URL = get_env('FRONTEND_URL', 'http://localhost:5173')" },
          ].map((line, i) => (
            <div key={i} className={`diff-${line.type}`} style={{ padding: "4px 10px", borderRadius: 4, marginBottom: 2, fontFamily: "var(--mono)", fontSize: 10.5, lineHeight: 1.6 }}>
              {line.text}
            </div>
          ))}
        </div>
        {/* PR created */}
        <div style={{ background: "#dcfce7", borderRadius: 8, padding: "10px 14px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 2 }}>Pull request created!</div>
          <div style={{ fontSize: 11, color: "#14532d" }}>Branch: fix/issue-1808-1776984883 · <span style={{ textDecoration: "underline", cursor: "pointer" }}>View PR #4</span></div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  useScrollReveal();
  useNavScroll();

  const [faqOpen, setFaqOpen] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const faqs = [
    { q: "How does BuildWise scan my repository?", a: "BuildWise connects to GitHub via OAuth, clones your repository into a secure temporary environment, runs our multi-layer analysis engine, and cleans up after. Your code never leaves the secure scan context." },
    { q: "Does it work on private repositories?", a: "Yes. When you connect via GitHub OAuth with the 'repo' scope, BuildWise can scan both public and private repositories. Your GitHub token is used only for the scan and is not stored." },
    { q: "What languages and file types are supported?", a: "Currently BuildWise supports JavaScript, TypeScript, JSX, TSX, Python, and Java files for deep analysis. Secret detection and structural checks run across all file types." },
    { q: "What happens when I click Fix?", a: "BuildWise finds the exact line of code, generates a patch, validates the syntax, and shows you a diff preview. You review it. If you approve, it creates a new branch and opens a pull request — no code changes happen without your approval." },
    { q: "Is my code stored or used for training?", a: "No. Your repository is cloned into an ephemeral temporary folder for the duration of the scan and permanently deleted afterward. We store only the structured issue data, never raw source code." },
  ];

  const features = [
    { icon: "🔍", title: "Deep Scan Engine", desc: "Multi-layer analysis covering secrets, unused files, duplicate logic, bad practices, and structural issues — all in one pass.", tag: "Scanner", color: "#2563eb", bg: "#dbeafe" },
    { icon: "⚡", title: "One-Click PR Fix", desc: "Generate a code fix, preview the diff, approve it, and get a pull request opened on GitHub — without touching a terminal.", tag: "Fix Engine", color: "#7c3aed", bg: "#ede9fe" },
    { icon: "🛡️", title: "Secret Detection", desc: "Catches exposed API keys, tokens, MongoDB strings, and high-entropy strings using pattern matching and Shannon entropy analysis.", tag: "Security", color: "#dc2626", bg: "#fee2e2" },
    { icon: "🧠", title: "AI Suggestions", desc: "After every scan, get personalized improvement suggestions powered by Llama 3.3 70B — adapted to your role and experience level.", tag: "AI Layer", color: "#16a34a", bg: "#dcfce7" },
    { icon: "🕸️", title: "Dependency Graph", desc: "Builds an accurate import graph to find truly unused files — not just filename guesses. Eliminates false positives.", tag: "Architecture", color: "#d97706", bg: "#fef3c7" },
    { icon: "👥", title: "Team Collaboration", desc: "Assign issues to teammates, track who fixed what, and view full activity logs per issue — built for real teams.", tag: "Teams", color: "#0891b2", bg: "#cffafe" },
  ];

  const detections = [
    { icon: "🔑", label: "API Keys & Secrets", badge: "badge-red" },
    { icon: "🗑️", label: "Unused Files", badge: "badge-yellow" },
    { icon: "📋", label: "Duplicate Code Blocks", badge: "badge-blue" },
    { icon: "📁", label: "Empty Folders", badge: "badge-purple" },
    { icon: "🔗", label: "Hardcoded URLs", badge: "badge-yellow" },
    { icon: "📄", label: "Missing README", badge: "badge-green" },
    { icon: "📦", label: "Oversized Files", badge: "badge-red" },
    { icon: "🔀", label: "AST-level Secrets", badge: "badge-purple" },
  ];

  const steps = [
    { n: "01", label: "Connect GitHub", desc: "OAuth in one click. Grant repo access — public or private." },
    { n: "02", label: "Select Repo", desc: "Pick from your full list. We clone it securely." },
    { n: "03", label: "Run Scan", desc: "Our engine runs all checks in seconds." },
    { n: "04", label: "Review Issues", desc: "File, line, and plain-English explanation for every issue." },
    { n: "05", label: "Fix & PR", desc: "Approve a diff preview and watch the PR appear on GitHub." },
  ];

  const ticker = ["Secret Detection", "Unused File Analysis", "One-Click PR Fix", "AST Analysis", "AI Suggestions", "Team Collaboration", "Dependency Graph", "Fingerprint Dedup", "Shannon Entropy", "Activity Logs"];

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div id="progress-bar" />

      <div style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font)", overflowX: "hidden" }}>

        {/* ─── NAV ─── */}
        <nav className="nav-glass">
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 58, display: "flex", alignItems: "center", gap: 32, justifyContent: "space-between" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--sidebar)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 14, color: "#3b82f6" }}>⬡</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>
                Build<span style={{ color: "var(--blue)" }}>Wise</span>
              </span>
            </div>

            {/* Center links */}
            <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([label, href]) => (
                <a key={label} href={href} className="nav-link">{label}</a>
              ))}
            </div>

            {/* CTA */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => navigate("/login")} className="btn btn-outline" style={{ padding: "8px 16px" }}>
                {t("nav.login")}
              </button>
              <button onClick={() => navigate("/login")} className="btn btn-blue shimmer" style={{ padding: "8px 18px" }}>
                {t("nav.getStarted")} →
              </button>
            </div>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section className="hero-bg" style={{ paddingTop: 120, paddingBottom: 0, position: "relative", overflow: "hidden" }}>
          {/* Subtle grid */}
          <div className="grid-pattern" style={{ position: "absolute", inset: 0, zIndex: 0 }} />

          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto" }}>

              {/* Live badge */}
              <div className="reveal" style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
                <span className="badge badge-green" style={{ gap: 8 }}>
                  <span style={{ width: 7, height: 7, background: "#16a34a", borderRadius: "50%", display: "inline-block" }} className="pulse" />
                  AI-Powered Code Security · Now Live
                </span>
              </div>

              {/* Headline */}
              <h1 className="reveal d1" style={{ fontSize: "clamp(38px, 6.5vw, 72px)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.04em", color: "var(--text)", margin: "0 0 12px" }}>
                Your code has hidden problems.
              </h1>
              <h1 className="reveal d2" style={{ fontSize: "clamp(38px, 6.5vw, 72px)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.04em", margin: "0 0 28px", color: "var(--blue)" }}>
                <TypeWriter words={["We find them.", "We fix them.", "We PR them.", "We secure them."]} />
              </h1>

              <p className="reveal d3" style={{ fontSize: 18, color: "var(--muted)", lineHeight: 1.75, maxWidth: 560, margin: "0 auto 40px" }}>
                BuildWise scans your GitHub repository, explains every issue in plain English, generates the fix, and opens a pull request — all in under a minute.
              </p>

              {/* CTAs */}
              <div className="reveal d4" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
                <button onClick={() => navigate("/login")} className="btn btn-blue shimmer" style={{ padding: "13px 30px", fontSize: 15 }}>
                  🚀 Start Free Scan
                </button>
                <button onClick={() => navigate("/plans")} className="btn btn-outline" style={{ padding: "13px 28px", fontSize: 15 }}>
                  View Plans
                </button>
              </div>

              <p className="reveal d5" style={{ fontSize: 12, color: "var(--muted-2)" }}>
                No credit card required · 10 free scans/month · Setup in 30 seconds
              </p>

              {/* Stats */}
              <div className="reveal d5" style={{ display: "flex", gap: 0, justifyContent: "center", marginTop: 56, flexWrap: "wrap", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--shadow-sm)", overflow: "hidden", maxWidth: 600, margin: "56px auto 0" }}>
                {[
                  { label: "Issues detected / scan avg", val: 14 },
                  { label: "Time to first PR fix", val: 60, suffix: "s" },
                  { label: "Detection accuracy", val: 94, suffix: "%" },
                ].map((s, i) => (
                  <div key={s.label} style={{ flex: 1, padding: "28px 20px", textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
                    <div className="stat-num"><Counter to={s.val} suffix={s.suffix || ""} /></div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard floating preview */}
            <div className="reveal float" style={{ marginTop: 56, maxWidth: 1000, margin: "56px auto 0" }}>
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ─── TICKER ─── */}
        <div style={{ background: "var(--sidebar)", padding: "14px 0", overflow: "hidden" }}>
          <div className="ticker-track" style={{ display: "flex", gap: 48, whiteSpace: "nowrap", width: "max-content" }}>
            {[...ticker, ...ticker].map((item, i) => (
              <span key={i} style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#3b82f6", fontSize: 8 }}>◆</span>
                <span style={{ color: "#94a3b8", fontWeight: 500 }}>{item}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 28px" }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: 72 }}>
            <div className="badge badge-blue" style={{ marginBottom: 16 }}>Workflow</div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 14px" }}>
              From repo to PR in five steps
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 460, margin: "0 auto" }}>
              No setup. No configuration files. Just connect and go.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto" }}>
            {steps.map((step, i) => (
              <div key={step.n} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 170 }}>
                <div className="reveal" style={{ transitionDelay: `${i * 0.1}s`, textAlign: "center", flex: 1, padding: "0 8px" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--sidebar)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "#3b82f6", boxShadow: "0 4px 20px rgba(37,99,235,0.2)" }}>
                    {step.n}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "var(--text)" }}>{step.label}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>{step.desc}</div>
                </div>
                {i < steps.length - 1 && (
                  <div className="step-line" style={{ marginTop: 26, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="divider" style={{ maxWidth: 1200, margin: "0 auto" }} />

        {/* ─── FEATURES ─── */}
        <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 28px" }}>
          <div className="reveal" style={{ marginBottom: 64, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="badge badge-blue" style={{ marginBottom: 16 }}>Features</div>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
                Everything you need to ship clean code
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
                No config files. No 200-page docs. Connect GitHub and scan in 30 seconds.
              </p>
            </div>
            <button onClick={() => navigate("/login")} className="btn btn-blue hide-mobile shimmer" style={{ flexShrink: 0 }}>
              Try it free →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {features.map((f, i) => (
              <div
                key={f.title}
                className="reveal card"
                style={{ transitionDelay: `${(i % 3) * 0.08}s`, padding: "28px", cursor: "default", borderColor: hoveredFeature === i ? f.color + "44" : undefined }}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div className="icon-box" style={{ background: f.bg }}>
                    <span>{f.icon}</span>
                  </div>
                  <span className="badge" style={{ background: f.bg, color: f.color, fontSize: 10 }}>{f.tag}</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 10, letterSpacing: "-0.02em", color: "var(--text)" }}>{f.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── DETECTION GRID ─── */}
        <div style={{ background: "var(--sidebar)", padding: "72px 0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 48 }}>
              <div className="badge" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", marginBottom: 16 }}>Detection</div>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#f1f5f9" }}>
                8 types of issues caught automatically
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {detections.map((d, i) => (
                <div key={d.label} className="reveal lift" style={{ transitionDelay: `${(i % 4) * 0.07}s`, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{d.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── FIX ENGINE SPOTLIGHT ─── */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 28px" }}>
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
            <div>
              <div className="badge badge-purple reveal" style={{ marginBottom: 20 }}>Fix Engine</div>
              <h2 className="reveal d1" style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 20px" }}>
                Don't just find problems.<br />
                <span style={{ color: "var(--blue)" }}>Fix them in one click.</span>
              </h2>
              <p className="reveal d2" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
                Our fix engine locates the exact line, generates syntactically valid improved code, shows you a diff, and opens a pull request on GitHub. No terminal. No manual edits. Every fix goes through a PR — never a direct commit.
              </p>
              <div className="reveal d3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Fuzzy + exact code matching across file changes",
                  "Syntax validation before any fix is applied",
                  "One branch per fix, automatically named",
                  "Works on Python, JS, JSX, TypeScript files"
                ].map(pt => (
                  <div key={pt} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--text-2)" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--blue-light)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {pt}
                  </div>
                ))}
              </div>
            </div>
            <div className="reveal d2">
              <IssueMockup />
              <div style={{ marginTop: 16 }}>
                <FixPreviewMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ─── COMPARISON ─── */}
        <div style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "80px 0" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 52 }}>
              <div className="badge badge-blue" style={{ marginBottom: 16 }}>Comparison</div>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
                Built differently from existing tools
              </h2>
            </div>
            <div className="reveal" style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "14px 20px", background: "var(--sidebar)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>FEATURE</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", letterSpacing: "0.05em", textAlign: "center" }}>❌ Old way (SonarQube)</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", letterSpacing: "0.05em", textAlign: "center" }}>✅ BuildWise</div>
              </div>
              {[
                ["Setup time", "Weeks to configure", "30 seconds"],
                ["Explains issues", "Cryptic error codes", "Plain English"],
                ["Fixes code", "Reports only", "Generates patch + PR"],
                ["Beginner-friendly", "Heavy infrastructure", "No config files"],
                ["Pricing", "Expensive", "Free tier available"],
              ].map(([feat, old, bw], i) => (
                <div key={feat} className="cmp-row" style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>{feat}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>{old}</div>
                  <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, textAlign: "center" }}>{bw}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── AI SUGGESTIONS ─── */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 28px" }}>
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
            <div className="reveal">
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
                <div style={{ background: "var(--sidebar)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#FF5F56", "#FFBD2E", "#27C93F"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>AI Suggestions · after scan</span>
                  <span className="badge" style={{ marginLeft: "auto", background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontSize: 9 }}>Llama 3.3 70B</span>
                </div>
                <div style={{ padding: "20px" }}>
                  {[
                    { text: "→ Implement a stricter Content Security Policy (CSP) for your Express config.", active: true },
                    { text: "→ The flagged MongoDB string should be in .env — rotate it immediately.", active: false },
                    { text: "→ Consider extracting the duplicated fetch logic into a shared utility module.", active: false },
                    { text: "→ Your unused components add ~18KB to your bundle — safe to remove.", active: false },
                    { text: "→ Add input sanitization before the database write in user_service.py:47.", active: false },
                  ].map((s, i) => (
                    <div key={i} style={{
                      padding: "10px 14px", borderRadius: 8, marginBottom: 6, fontSize: 13, lineHeight: 1.6,
                      background: s.active ? "var(--blue-light)" : "var(--surface-2)",
                      borderLeft: `3px solid ${s.active ? "var(--blue)" : "var(--border)"}`,
                      color: s.active ? "var(--blue-dark)" : "var(--muted)",
                      fontWeight: s.active ? 600 : 400,
                    }}>
                      {s.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="badge badge-green reveal" style={{ marginBottom: 20 }}>AI Layer</div>
              <h2 className="reveal d1" style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 20px" }}>
                Suggestions that know who you are
              </h2>
              <p className="reveal d2" style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.8, marginBottom: 28 }}>
                Powered by Llama 3.3 70B. BuildWise personalizes every suggestion based on your role, experience level, and tech stack. Students get learning-focused guidance. Professionals get architecture insights.
              </p>
              <div className="reveal d3" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["🇺🇸 English", "🇮🇳 हिंदी", "🇮🇳 मराठी"].map(lang => (
                  <span key={lang} className="lift" style={{ padding: "8px 16px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 13, color: "var(--text-2)", cursor: "default", fontWeight: 500 }}>{lang}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="divider" style={{ maxWidth: 1200, margin: "0 auto" }} />

        {/* ─── PRICING ─── */}
        <section id="pricing" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 28px" }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="badge badge-blue" style={{ marginBottom: 16 }}>Pricing</div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px" }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 16 }}>Free for individuals. Powerful for teams.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, maxWidth: 960, margin: "0 auto" }}>
            {[
              {
                name: "Free", price: "₹0", period: "/month", desc: "For students and side projects",
                features: ["10 scans / month", "All detection rules", "Dashboard & scan history", "Basic AI suggestions"],
                cta: "Get Started Free", primary: false, badgeClass: "badge-blue",
              },
              {
                name: "Pro", price: "₹999", period: "/month", desc: "For developers who ship fast",
                features: ["100 scans / month", "One-click PR fixes", "Full personalized AI suggestions", "Multi-language support", "Priority support"],
                cta: "Start Free Trial", primary: true, badgeClass: "badge-blue",
              },
              {
                name: "Business", price: "Custom", period: "pricing", desc: "For engineering teams",
                features: ["Unlimited scans", "Team invite & management", "Issue assignment & tracking", "Activity logs per issue", "Shared reports & dashboards"],
                cta: "Request Quote", primary: false, badgeClass: "badge-purple",
              },
            ].map((plan, i) => (
              <div key={plan.name} className={`reveal card ${plan.primary ? "pricing-popular" : ""}`} style={{ transitionDelay: `${i * 0.1}s`, padding: "32px 28px", marginTop: plan.primary ? 0 : 0 }}>
                <div className={`badge ${plan.badgeClass}`} style={{ marginBottom: 16, fontSize: 10 }}>{plan.name}</div>
                <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.05em", color: plan.primary ? "var(--blue)" : "var(--text)", lineHeight: 1, marginBottom: 4 }}>
                  {plan.price}<span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}> {plan.period}</span>
                </div>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>{plan.desc}</div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--text-2)", marginBottom: 12, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--green)", fontWeight: 700, marginTop: 1 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate("/login")} className={`btn ${plan.primary ? "btn-blue shimmer" : "btn-outline"}`} style={{ width: "100%", justifyContent: "center", fontSize: 14 }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <div id="faq" style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)", padding: "80px 0" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 28px" }}>
            <div className="reveal" style={{ textAlign: "center", marginBottom: 52 }}>
              <div className="badge badge-blue" style={{ marginBottom: 16 }}>FAQ</div>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 38px)", fontWeight: 800, letterSpacing: "-0.03em" }}>Common questions</h2>
            </div>
            {faqs.map((faq, i) => (
              <div key={i} className="reveal" style={{ transitionDelay: `${i * 0.06}s`, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <button className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ padding: "18px 20px" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{faq.q}</span>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: faqOpen === i ? "var(--blue)" : "var(--bg)", color: faqOpen === i ? "#fff" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, transition: "all 0.2s", fontWeight: 700 }}>
                    {faqOpen === i ? "−" : "+"}
                  </span>
                </button>
                <div style={{ maxHeight: faqOpen === i ? 200 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
                  <div style={{ padding: "0 20px 18px", fontSize: 14, color: "var(--muted)", lineHeight: 1.8 }}>{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── FINAL CTA ─── */}
        <section style={{ background: "var(--sidebar)", padding: "100px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 80% at 50% 100%, rgba(37,99,235,0.15), transparent 70%)" }} />
          <div className="grid-pattern" style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.15 }} />

          <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
            <div className="badge reveal" style={{ marginBottom: 24, background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Get Started Free</div>
            <h2 className="reveal d1" style={{ fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 16px", color: "#f1f5f9" }}>
              Your code is ready to be reviewed.
            </h2>
            <p className="reveal d2" style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.75, marginBottom: 40 }}>
              Start scanning for free. No credit card. No configuration. Just connect GitHub and go.
            </p>
            <div className="reveal d3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/login")} className="btn btn-blue shimmer" style={{ padding: "14px 34px", fontSize: 15 }}>
                🚀 Start Free Scan
              </button>
              <button onClick={() => navigate("/plans")} className="btn btn-white" style={{ padding: "14px 28px", fontSize: 15 }}>
                View Pricing
              </button>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer style={{ background: "var(--sidebar-2)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 28px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
              Build<span style={{ color: "#3b82f6" }}>Wise</span>
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {["GitHub", "LinkedIn", "Contact", "Privacy"].map(link => (
                <a key={link} href="#" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => e.target.style.color = "#94a3b8"}
                  onMouseLeave={e => e.target.style.color = "#64748b"}
                >
                  {link}
                </a>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>© 2026 BuildWise. All rights reserved.</div>
          </div>
        </footer>

      </div>
    </>
  );
}