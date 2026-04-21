import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function IssueDetails() {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [githubMatch, setGithubMatch] = useState(null);
  const [matchError, setMatchError] = useState("");
  const [fixPreview, setFixPreview] = useState(null);
  const [fixPreviewError, setFixPreviewError] = useState("");
  const [matchCandidates, setMatchCandidates] = useState([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [prResult, setPrResult] = useState(null);
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
          let data;
try {
  data = await res.json();
} catch {
  data = {};
}
          throw new Error(data.detail || "Issue not found");
        }

        let data;
try {
  data = await res.json();
} catch {
  data = {};
}
        setIssue(data);
      } catch (err) {
        setError(err.message || "Unable to load issue details.");
      }
    };

    const loadIssue = async () => {
      await fetchIssue();
    };

    loadIssue();
  }, [id, navigate]);

  useEffect(() => {
    if (issue) {
      setMatchError("");
      setGithubMatch(null);

      const fetchMatch = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            return;
          }

          const res = await fetch(`http://localhost:8000/issues/${issue.id}/github-match`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            let data;
try {
  data = await res.json();
} catch {
  data = {};
}
            throw new Error(data.detail || "GitHub match not available");
          }

          let data;
try {
  data = await res.json();
} catch {
  data = {};
}
          setGithubMatch(data);
        } catch (err) {
          setMatchError(err.message || "Unable to fetch GitHub match.");
        }
      };

      fetchMatch();
    }
  }, [issue]);

  const previewFix = async () => {
    if (!issue) return;
    setFixPreview(null);
    setFixPreviewError("");
    setMatchCandidates([]);
    setPrResult(null);
    setIsPreviewing(true);

    try {
      const token = localStorage.getItem("token");
      const ghToken = localStorage.getItem("gh_token");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`http://localhost:8000/issues/${issue.id}/fix-preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gh_token: ghToken }),
      });

      let data;
try {
  data = await res.json();
} catch {
  data = {};
}
      console.log("fix-preview response", data);
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to preview fix.");
      }

      if (data.candidates && data.candidates.length > 1) {
        setMatchCandidates(data.candidates);
        setFixPreviewError("Multiple candidate matches found. Please rescan or choose the correct match.");
      } else {
        setFixPreview(data);
      }
    } catch (err) {
      setFixPreviewError(err.message || "Unable to generate fix preview.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const applyFix = async () => {
    if (!issue) return;
    setIsApplyingFix(true);
    setPrResult(null);
    setFixPreviewError("");

    try {
      const token = localStorage.getItem("token");
      const ghToken = localStorage.getItem("gh_token");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`http://localhost:8000/issues/${issue.id}/apply-fix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gh_token: ghToken }),
      });
      let data;
try {
  data = await res.json();
} catch {
  data = {};
}
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Unable to create PR.");
      }
      setPrResult(data);
    } catch (err) {
      setFixPreviewError(err.message || "Unable to apply fix.");
    } finally {
      setIsApplyingFix(false);
    }
  };

  const updateStatus = async (newStatus) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsUpdating(true);
    setStatusMessage("");

    try {
      const res = await fetch(`http://localhost:8000/issues/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        let data;
try {
  data = await res.json();
} catch {
  data = {};
}
        throw new Error(data.detail || "Failed to update issue status.");
      }

      setIssue((prev) => ({ ...prev, status: newStatus }));
      setStatusMessage(`Status updated to ${newStatus}.`);
    } catch (err) {
      setStatusMessage(err.message || "Unable to update status.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
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
    );
  }

  if (!issue) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading issue details…</p>
        </div>
      </main>
    );
  }

  return (
      <main className="min-h-screen bg-gray-100 p-6">
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
            <p className="text-sm text-gray-500 mt-1">Status: <span className="font-semibold">{issue.status}</span></p>
            {issue.note && (
              <p className="text-sm text-orange-600 mt-1">{
                issue.note === "reopened"
                  ? "This issue was previously fixed and has reappeared."
                  : issue.note === "previously_ignored"
                    ? "This issue was previously ignored and appeared again."
                    : issue.note
              }</p>
            )}
            {issue.assigned_to_name && (
              <p className="text-sm text-gray-600 mt-1">Assigned to: {issue.assigned_to_name}</p>
            )}
            {issue.updated_by_name && (
              <p className="text-sm text-gray-600 mt-1">Last updated by: {issue.updated_by_name}</p>
            )}
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold uppercase tracking-widest">
              {issue.severity || "UNKNOWN"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1">
          <div className="space-y-2 p-5 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">File</p>
            <p className="text-sm font-semibold text-gray-900 break-words overflow-hidden whitespace-normal">{issue.repo_path || issue.file || "Unknown"}</p>
          </div>
          <div className="space-y-2 p-5 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Location</p>
            <p className="text-sm font-semibold text-gray-900">
              Line {issue.line || "N/A"}
              {githubMatch?.exact_line ? ` • branch ${githubMatch.branch}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-base font-bold text-gray-800">Code snippet</h2>
          {issue.context_before && (
  <pre className="mt-3 bg-slate-50 rounded-3xl p-4 text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
    {Array.isArray(issue.context_before)
      ? issue.context_before.join("\n")
      : issue.context_before}
  </pre>
)}
          <pre className="mt-3 bg-red-50 rounded-3xl p-4 text-sm text-red-800 overflow-x-auto whitespace-pre-wrap break-words">
  {(() => {
    // 1. Identify raw data
    const rawData = issue.code || issue.code_snippet || githubMatch?.matched_snippet || "";
    
    // 2. FIXED: Handle Array + Force String conversion (+ "") to prevent .split crash
    const codeString = (Array.isArray(rawData) ? rawData.join("\n") : rawData || "") + "";

    // 3. Safe to split and map
    return codeString.split("\n").map((line, index) => {
      const lineNumber = index + 1;
      const isHighlighted = lineNumber === issue.line;

      return (
        <div
          key={index}
          className={isHighlighted ? "bg-yellow-200 font-bold px-2 rounded" : ""}
        >
          {line}
        </div>
      );
    });
  })()}
</pre>
        </div>

        <div className="mt-6">
          <h2 className="text-base font-bold text-gray-800">Suggested fix</h2>
          <pre className="mt-3 bg-green-50 rounded-3xl p-4 text-sm text-green-900 overflow-x-auto whitespace-pre-wrap break-words">
            {issue.fix || "No suggested fix available."}
          </pre>
          <p className="mt-2 text-xs text-gray-500">
            This is guidance from the scanner. Click "Preview fix" to generate a concrete patch and review the diff before creating a PR.
          </p>
        </div>

        <div className="mt-6">
          <h2 className="text-base font-bold text-gray-800">GitHub match</h2>
          {githubMatch ? (
            githubMatch.exact_line ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Exact GitHub line found at line {githubMatch.exact_line} on branch {githubMatch.branch || "unknown"}.
                </p>
                <pre className="mt-3 bg-slate-100 rounded-3xl p-4 text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
  {Array.isArray(githubMatch.matched_snippet)
    ? githubMatch.matched_snippet.join("\n")
    : githubMatch.matched_snippet || (Array.isArray(issue.code) 
        ? issue.code.join("\n") 
        : issue.code || "")}
</pre>
              </div>
            ) : (
              <p className="text-sm text-orange-600">Code changed since the scan. Unable to locate the exact line in GitHub.</p>
            )
          ) : matchError ? (
            <p className="text-sm text-orange-600">{matchError}</p>
          ) : (
            <p className="text-sm text-gray-600">Checking GitHub for exact line match…</p>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <button
            onClick={previewFix}
            disabled={isPreviewing || !issue}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition"
          >
            {isPreviewing ? "Generating fix preview..." : "Preview fix"}
          </button>

          {fixPreviewError && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {fixPreviewError}
            </div>
          )}

          {matchCandidates.length > 0 && (
            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
              <p className="font-semibold">Multiple candidate matches found.</p>
              <p className="mt-2">Please rescan or inspect the candidate lines:</p>
              <ul className="mt-3 space-y-2">
                {Array.isArray(matchCandidates) && matchCandidates.length > 0 && ((candidate) => (
                  <li key={candidate.line} className="rounded-2xl bg-white p-3 border border-orange-200">
                    <p className="font-semibold">Line {candidate.line} — score {candidate.score}</p>
                    <p className="text-xs text-gray-600">{candidate.snippet}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fixPreview && (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="text-sm font-bold text-gray-800">Fix preview</h3>
        <p className="text-xs text-gray-500">Line {fixPreview.line}</p>
      </div>
      <button
        onClick={applyFix}
        disabled={isApplyingFix}
        className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
      >
        {isApplyingFix ? "Applying fix..." : "Apply fix via PR"}
      </button>
    </div>

    {/* --- THE VISUAL HACK START --- */}
    {fixPreview.fixed_code && (
      <div className="mt-4 p-4 bg-yellow-100 rounded-2xl text-sm border border-yellow-200">
        <strong className="text-yellow-900 font-bold block mb-1">💡 Suggested change:</strong>
        <p className="text-xs text-yellow-700 mb-2 italic">Replace the original line with this:</p>
        <pre className="p-3 bg-white/50 rounded-xl font-mono text-yellow-900 overflow-x-auto border border-yellow-200">
          {(Array.isArray(fixPreview.fixed_code) 
            ? fixPreview.fixed_code.join("\n") 
            : fixPreview.fixed_code || "") + ""}
        </pre>
      </div>
    )}
    {/* --- THE VISUAL HACK END --- */}

    <div className="mt-4 grid gap-4 grid-cols-1">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Original snippet</p>
        <pre className="mt-2 bg-white rounded-3xl p-4 text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
          {(Array.isArray(fixPreview.originalSnippet) 
            ? fixPreview.originalSnippet.join("\n") 
            : fixPreview.originalSnippet || "No original snippet available.") + ""}
        </pre>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Fixed snippet</p>
        <pre className="mt-2 bg-white rounded-3xl p-4 text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
          {(() => {
            const rawData = fixPreview.diff 
              ? fixPreview.fixedSnippet 
              : (fixPreview.fixed_code || fixPreview.fixedSnippet || "No fixed snippet available.");
            return (Array.isArray(rawData) ? rawData.join("\n") : rawData) + "";
          })()}
        </pre>
      </div>
    </div>
    
    <div className="mt-4">
      <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Diff</p>
      <pre className="mt-2 bg-black text-green-400 rounded-3xl p-4 text-sm overflow-x-auto whitespace-pre-wrap break-words">
        {fixPreview.diff}
      </pre>
    </div>
  </div>
)}

          {prResult && (
            <div className="rounded-3xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <p className="font-semibold">Pull request created!</p>
              <p className="mt-2">Branch: {prResult.branch}</p>
              <p className="mt-2">
                <a
                  href={prResult.pr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-700 underline"
                >
                  View PR #{prResult.pr_number}
                </a>
              </p>
            </div>
          )}
        </div>


        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => updateStatus("FIXED")}
              disabled={isUpdating}
              className="px-5 py-3 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700 transition"
            >
              Mark Fixed
            </button>
            <button
              onClick={() => updateStatus("IGNORED")}
              disabled={isUpdating}
              className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition"
            >
              Ignore
            </button>
            <button
              onClick={() => updateStatus("OPEN")}
              disabled={isUpdating}
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
            >
              Reopen
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Actions update issue status and record activity for audit.
          </div>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1">
          <div className="p-6 rounded-3xl bg-yellow-50 border border-yellow-200">
            <p className="text-xs uppercase tracking-widest text-yellow-700 font-bold">Why this is a problem</p>
            <p className="mt-3 text-sm text-yellow-900">{issue.why || "No explanation provided."}</p>
          </div>
          <div className="p-6 rounded-3xl bg-green-50 border border-green-200">
            <p className="text-xs uppercase tracking-widest text-green-700 font-bold">Suggested fix</p>
            <p className="mt-3 text-sm text-green-900">{issue.fix || "No fix guidance provided."}</p>
          </div>
        </div>

        {issue.activity && issue.activity.length > 0 && (
          <div className="mt-8 p-6 rounded-3xl bg-slate-50 border border-slate-200">
            <h2 className="text-base font-bold text-gray-800">Activity log</h2>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              {Array.isArray(issue.activity) && issue.activity.length > 0 && 
  issue.activity.map((entry, index) => (
    <li key={index} className="rounded-2xl bg-white p-4 border border-gray-200">
      <p className="font-semibold text-gray-900">{entry.action.replace(/_/g, " ")}</p>
      {entry.details && <p className="text-xs text-gray-500 mt-1">{entry.details}</p>}
      <p className="text-xs text-gray-500 mt-2">
        {entry.user ? `By ${entry.user}` : "System"} · {entry.created_at}
      </p>
    </li>
  ))
}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
