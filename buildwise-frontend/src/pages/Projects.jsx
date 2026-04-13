import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:8000/projects", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load projects");
        return res.json();
      })
      .then((data) => {
        setProjects(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("❌ Projects load failed:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Projects</h1>
              <p className="mt-2 text-gray-600">Browse your scanned projects and results.</p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
            >
              Go to Dashboard
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center text-gray-600 shadow-sm">Loading projects...</div>
          ) : error ? (
            <div className="rounded-3xl bg-red-50 p-8 text-red-700 shadow-sm">{error}</div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center text-gray-500 shadow-sm">No projects found yet.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <div key={project.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
                  <p className="mt-2 text-gray-500">Scans: {project.total_scans ?? 0}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
  );
}
