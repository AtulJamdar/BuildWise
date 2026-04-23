import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [planInfo, setPlanInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:8000/plan", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setPlanInfo(data))
      .catch((err) => console.error("Plan fetch error:", err));
  }, []);

  const isActive = (path) => location.pathname === path;

  const navClass = (path) =>
    `w-full text-left rounded-xl px-4 py-3 transition ${isActive(path) ? "bg-white text-black" : "text-gray-300 hover:bg-white/10"}`;

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col justify-between p-4">
      <div>
        <h1 className="text-xl font-bold mb-6">BuildWise</h1>

        <div className="space-y-2">
          <p className="text-xs text-gray-400">MAIN</p>
          <button className={navClass("/dashboard")} onClick={() => navigate("/dashboard")}>Dashboard</button>
          <button className={navClass("/projects")} onClick={() => navigate("/projects")}>Projects</button>

          {(planInfo?.plan === "business" || planInfo?.plan === "team") && (
            <>
              <p className="text-xs text-gray-400 mt-4">COLLABORATION</p>
              <button className={navClass("/teams")} onClick={() => navigate("/teams")}>Teams</button>
            </>
          )}

          <p className="text-xs text-gray-400 mt-4">ACCOUNT</p>
          <button className={navClass("/profile")} onClick={() => navigate("/profile")}>Profile</button>
          <button className={navClass("/plans")} onClick={() => navigate("/plans")}>Plans</button>
        </div>
      </div>

      <div>
        {/* Plan Badge */}
        <div className="mb-3 p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Current Plan</p>
          <p className="text-sm font-bold mt-1">
            {planInfo?.plan === "business" ? "🚀 Business" : planInfo?.plan === "team" ? "👥 Team" : planInfo?.plan === "pro" ? "⭐ Pro" : "✨ Free"}
          </p>
          {planInfo?.plan === "free" && (
            <button
              onClick={() => navigate("/plans")}
              className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold"
            >
              Upgrade
            </button>
          )}
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            localStorage.removeItem("gh_token");
            navigate("/login");
          }}
          className="text-red-400 hover:text-red-300 text-sm font-bold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
