import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function IssueDetails() {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIssue = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await fetch(`http://localhost:8000/issues/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "Issue not found");
        }

        const data = await res.json();
        setIssue(data);
      } catch (err) {
        setError(err.message || "Unable to load issue details.");
      }
    };

    fetchIssue();
  }, [id, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-100 font-sans">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="p-6 max-w-3xl mx-auto mt-10 bg-white rounded-3xl shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-red-600">Issue details unavailable</h1>
        <p className="mt-3 text-gray-600">{error}</p>
      </div>
        </main>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex min-h-screen bg-gray-100 font-sans">
        <Sidebar />
        <main className="flex-1 p-6 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading issue details…</p>
        </div>
      </main>
    </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-sm font-semibold text-blue-600 hover:underline"
      >
        ← Back to dashboard
      </button>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">{issue.title}</h1>
            <p className="text-sm text-gray-500 mt-2">Issue ID: {issue.id}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold uppercase tracking-widest">
              {issue.severity || "UNKNOWN"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 p-5 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">File</p>
            <p className="text-sm font-semibold text-gray-900 break-all">{issue.file || "Unknown"}</p>
          </div>
          <div className="space-y-2 p-5 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Location</p>
            <p className="text-sm font-semibold text-gray-900">Line {issue.line || "N/A"}</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-base font-bold text-gray-800">Code snippet</h2>
          <pre className="mt-3 bg-gray-100 rounded-3xl p-4 text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">{issue.code || "No code snippet available."}</pre>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="p-6 rounded-3xl bg-yellow-50 border border-yellow-200">
            <p className="text-xs uppercase tracking-widest text-yellow-700 font-bold">Why this is a problem</p>
            <p className="mt-3 text-sm text-yellow-900">{issue.why || "No explanation provided."}</p>
          </div>
          <div className="p-6 rounded-3xl bg-green-50 border border-green-200">
            <p className="text-xs uppercase tracking-widest text-green-700 font-bold">Suggested fix</p>
            <p className="mt-3 text-sm text-green-900">{issue.fix || "No fix guidance provided."}</p>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
