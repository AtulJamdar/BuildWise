import { useLocation, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

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

          <p className="text-xs text-gray-400 mt-4">COLLABORATION</p>
          <button className={navClass("/teams")} onClick={() => navigate("/teams")}>Teams</button>

          <p className="text-xs text-gray-400 mt-4">ACCOUNT</p>
          <button className={navClass("/profile")} onClick={() => navigate("/profile")}>Profile</button>
          <button className={navClass("/plans")} onClick={() => navigate("/plans")}>Plans</button>
        </div>
      </div>

      <div>
        <div
          onClick={() => navigate("/plans")}
          className="p-3 bg-gray-800 rounded cursor-pointer mb-3"
        >
          <p className="text-sm">View Plan</p>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          className="text-red-400"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
