import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import OAuthSuccess from "./pages/OAuthSuccess";

// --- DASHBOARD COMPONENT ---
// This contains all your logic for projects, scans, and AI
const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [groupedIssues, setGroupedIssues] = useState([]);
  const [expandedFile, setExpandedFile] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [scanPath, setScanPath] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ghRepos, setGhRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");

  // Get username from localStorage
  const username = localStorage.getItem("username") || "User";

  // --- HELPERS ---
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "HIGH": return "text-red-600 font-bold";
      case "MEDIUM": return "text-yellow-500 font-bold";
      case "LOW": return "text-green-600 font-bold";
      default: return "text-gray-500 font-bold";
    }
  };

  const handleFetchRepos = async () => {
  // 1. You need to store the GITHUB token during OAuth success
  // Make sure your OAuthSuccess.jsx saves 'gh_token' too!
  const ghToken = localStorage.getItem("gh_token");

  if (!ghToken) {
    alert("Please log in with GitHub to use this feature.");
    return;
  }

  setIsFetchingRepos(true);
  try {
    const res = await fetch(`http://127.0.0.1:8000/github/repos?token=${ghToken}`);
    const data = await res.json();
    setGhRepos(data);
    setShowRepoModal(true);
  } catch (err) {
    console.error("Failed to fetch repositories:", err);
    alert("Failed to fetch repositories.");
  } finally {
    setIsFetchingRepos(false);
  }
};

  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN": return "bg-red-100 text-red-600 border border-red-200";
      case "FIXED": return "bg-green-100 text-green-600 border border-green-200";
      case "IGNORED": return "bg-gray-200 text-gray-600 border border-gray-300";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

  const groupIssuesByFile = (issuesList) => {
    const fileMap = issuesList.reduce((acc, issue) => {
      const fileKey = issue.file || "Unknown file";
      if (!acc[fileKey]) {
        acc[fileKey] = {
          file: fileKey,
          issues: [],
          highestSeverity: issue.severity || "UNKNOWN",
        };
      }
      acc[fileKey].issues.push(issue);
      if (severityRank[issue.severity] > severityRank[acc[fileKey].highestSeverity]) {
        acc[fileKey].highestSeverity = issue.severity;
      }
      return acc;
    }, {});

    return Object.values(fileMap).sort((a, b) => b.issues.length - a.issues.length);
  };

  // --- API FETCH FUNCTIONS ---
 // --- API FETCH FUNCTIONS ---

  // 1. Fetch Projects on Load
 // 1. Fetch Projects on Load (WITH SMART REDIRECT)
  // 🧠 The "Gatekeeper" Check
  useEffect(() => {
    const token = localStorage.getItem("token");

    // 1. If no token exists, they aren't even logged in
    if (!token) {
      navigate("/login");
      return;
    }

    // 2. Check if onboarding is complete
    fetch("http://127.0.0.1:8000/auth/status", {
      headers: { 
        "Authorization": `Bearer ${token}` 
      }
    })
      .then((res) => {
        if (res.status === 401) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data.onboarding_done === false) {
          // 👉 User is logged in but hasn't finished onboarding
          navigate("/onboarding");
        } else {
          // 👉 Everything is good, load the data
          fetchProjects();
          fetchTeams();
        }
      })
      .catch((err) => {
        console.error("Auth Check Failed:", err);
        navigate("/login");
      });
  }, [navigate]);

  // Keep your project fetching in a separate function to stay organized
  const fetchTeams = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/teams", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Team Fetch Error:", err);
    }
  };

  const inviteMember = async () => {
    const token = localStorage.getItem("token");
    setInviteMessage("");
    setInviteError("");

    if (!selectedTeam) {
      setInviteError("Please select a team first.");
      return;
    }

    if (!inviteEmail) {
      setInviteError("Please enter an email to invite.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/teams/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          team_id: selectedTeam,
          email: inviteEmail,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Invite failed");
      }

      setInviteMessage("User invited successfully.");
      setInviteEmail("");
    } catch (err) {
      console.error("❌ Invite Error:", err);
      setInviteError(err.message);
    }
  };

  const fetchProjects = async (autoSelectProjectName = null) => {
    const token = localStorage.getItem("token");
    console.log("🔄 Fetching projects for user...");

    try {
      const res = await fetch("http://127.0.0.1:8000/projects", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      console.log("📡 Projects API response status:", res.status);
      const data = await res.json();
      console.log("📋 Projects data received:", data);

      const projectsList = Array.isArray(data) ? data : [];
      setProjects(projectsList);

      if (autoSelectProjectName) {
        const normalizedName = autoSelectProjectName.replace(/\.git$/i, "");
        const matched = projectsList.find((project) => project.name === normalizedName);
        if (matched) {
          setSelectedProject(matched);
          fetchScans(matched.id);
          return;
        }
      }

      if (projectsList.length === 1 && !selectedProject) {
        setSelectedProject(projectsList[0]);
        fetchScans(projectsList[0].id);
      }
    } catch (err) {
      console.error("❌ Project Fetch Error:", err);
    }
  };

  // 2. Fetch Scans for a Project
  const fetchScans = (projectId) => {
    const token = localStorage.getItem("token");
    console.log(`📂 Fetching scans for project_id: ${projectId}`);

    fetch(`http://127.0.0.1:8000/projects/${projectId}/scans`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => {
        console.log("📡 Scans API status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("📋 Scans data received:", data);
        setScans(Array.isArray(data) ? data : []);
        setSelectedScan(null);
        setGroupedIssues([]);
        setSelectedIssue(null);
        setAiSuggestions([]);
      })
      .catch((err) => console.error("❌ Error fetching scans:", err));
  };

  // 3. Fetch AI Suggestions (POST)
  const fetchAISuggestions = (currentIssues) => {
    if (!selectedProject || currentIssues.length === 0) {
      console.log("⏭️ Skipping AI suggestions: no project or issues");
      return;
    }
    const token = localStorage.getItem("token");
    console.log(`🤖 Fetching AI suggestions for project: ${selectedProject.name}`);
    setIsAiLoading(true);

    fetch("http://127.0.0.1:8000/ai/suggestions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({
        project_name: selectedProject.name,
        issues: currentIssues,
      }),
    })
      .then((res) => {
        console.log("📡 AI suggestions API status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("💡 AI suggestions data:", data);
        setAiSuggestions(data.suggestions || []);
        setIsAiLoading(false);
      })
      .catch((err) => {
        console.error("❌ AI Error:", err);
        setIsAiLoading(false);
      });
  };

  // 4. Fetch Issues for a Scan
  const fetchIssues = (scanId) => {
    const token = localStorage.getItem("token");
    console.log(`📋 Fetching issues for scan_id: ${scanId}`);

    fetch(`http://127.0.0.1:8000/scans/${scanId}/issues`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => {
        console.log("📡 Issues API status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("📋 Issues data received:", data);
        const issuesArray = Array.isArray(data) ? data : [];
        setGroupedIssues(groupIssuesByFile(issuesArray));
        setSelectedIssue(null);
        setExpandedFile(null);
        setTimeout(() => fetchAISuggestions(issuesArray), 300);
      })
      .catch((err) => console.error("❌ Error fetching issues:", err));
  };

  // 5. Fetch Specific Issue Detail
  const fetchIssueDetail = (issueId) => {
    const token = localStorage.getItem("token");
    console.log(`🔍 Fetching issue detail for issue_id: ${issueId}`);

    fetch(`http://127.0.0.1:8000/issues/${issueId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => {
        console.log("📡 Issue detail API status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("📋 Issue detail data:", data);
        setSelectedIssue(data);
      })
      .catch((err) => console.error("❌ Error fetching issue detail:", err));
  };

  // 6. Update Issue Status (PUT)
  const updateIssueStatus = (id, status) => {
    const token = localStorage.getItem("token");

    fetch(`http://127.0.0.1:8000/issues/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ status }),
    })
      .then((res) => res.json())
      .then(() => {
        fetchIssueDetail(id);
        if (selectedScan) fetchIssues(selectedScan.id);
      })
      .catch((err) => console.error("Error updating status:", err));
  };

  const handleStartScan = async () => {
    if (!scanPath) return alert("Please enter a URL or Path");

    const token = localStorage.getItem("token");
    const pathParts = scanPath.split('/').filter(Boolean);
    const projectName = (pathParts[pathParts.length - 1] || "New Project").replace(/\.git$/i, "");

    console.log("🚀 Starting scan for:", scanPath, "projectName:", projectName);

    setIsScanning(true);
    setProgress(10); // Initial kick-off

    const timer1 = setTimeout(() => setProgress(30), 800);  // "Reading Files..."
    const timer2 = setTimeout(() => setProgress(60), 2000); // "Running Security Checks..."
    const timer3 = setTimeout(() => setProgress(90), 3500); // "Finalizing Report..."

    try {
      console.log("📡 Sending scan request to backend...");
      const response = await fetch("http://127.0.0.1:8000/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repo_url: scanPath,
          project_name: projectName,
          gh_token: localStorage.getItem("gh_token"),
          team_id: selectedTeam || null,
        }),
      });

      console.log("📡 Scan API response status:", response.status);
      const responseData = await response.json();
      console.log("📋 Scan response data:", responseData);

      if (response.ok) {
        setProgress(100); // 🎯 Jump to finish
        setTimeout(async () => {
          setScanPath("");
          console.log("🔄 Refreshing projects after scan...");
          await fetchProjects(projectName);
          alert("Scan Completed Successfully!");
          setIsScanning(false);
          setProgress(0); // Reset for next time
        }, 500);
      } else {
        throw new Error(`Scan failed: ${responseData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("❌ Scan Error:", err);
      alert(`Scan failed: ${err.message}`);
      setIsScanning(false);
      setProgress(0);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-white shadow-xl flex flex-col border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-2xl font-black text-blue-600 tracking-tighter">BuildWise</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">AI Security Suite</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold">📊 Dashboard</button>
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50">📁 Projects</button>
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50">📝 Reports</button>
          <button onClick={() => navigate("/profile")} className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50">👤 Profile</button>
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50">⚙️ Settings</button>
        </nav>
        <div className="p-4 border-t">
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <p className="text-[10px] font-bold opacity-50 uppercase">Current Plan</p>
            <p className="text-sm font-bold">Developer Pro</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="flex justify-between items-center bg-white px-8 py-4 shadow-sm border-b sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">Dashboard Overview</h1>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{username}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase">Administrator</p>
            </div>
            <button 
              onClick={() => navigate("/")} 
              className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-500 hover:text-white transition-all text-sm border border-red-100"
            >
              Logout
            </button>
          </div>
        </header>

        {/* --- 🚀 SCAN NEW PROJECT SECTION --- */}
<section className="p-8 bg-white rounded-3xl shadow-sm border border-blue-100 mb-10">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div>
      <h2 className="text-xl font-black text-gray-800">New Security Scan</h2>
      <p className="text-sm text-gray-500">Analyze a repository for vulnerabilities.</p>
    </div>
    
    <div className="flex flex-1 max-w-2xl gap-3">
      <input
        type="text"
        value={scanPath}
        onChange={(e) => {
          setScanPath(e.target.value);
          setSelectedRepo(null);
        }}
        placeholder="Enter GitHub Repo URL"
        className="flex-1 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all text-sm"
        disabled={isScanning}
      />
      <button 
        onClick={handleStartScan}
        disabled={isScanning}
        className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all whitespace-nowrap text-white ${
          isScanning ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
        }`}
      >
        {isScanning ? "⏳ Scanning..." : "🚀 Start Scan"}
      </button>
      <button 
        onClick={handleFetchRepos}
        disabled={isScanning}
        className="self-end bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 font-bold transition-all"
      >
        {isFetchingRepos ? "⏳..." : "🐙 Import"}
      </button>
    </div>
    {selectedRepo?.private && (
      <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-semibold">
        <span>Private Scan Mode</span>
      </div>
    )}

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <label className="text-sm font-bold text-gray-700">Scan as Team</label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
        >
          <option value="">Personal Project</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-bold text-gray-700">Invite Member</label>
        <div className="mt-2 flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter user email"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm"
          />
          <button
            onClick={inviteMember}
            className="bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-blue-700"
          >
            Invite
          </button>
        </div>
        {inviteMessage && <p className="mt-2 text-sm text-green-600">{inviteMessage}</p>}
        {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
      </div>
    </div>

    {/* REPO SELECTOR LIST */}
    {showRepoModal && (
      <div className="mt-4 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
        <div className="sticky top-0 bg-gray-50 p-3 border-b flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500 uppercase">Your Repositories</span>
          <button onClick={() => setShowRepoModal(false)} className="text-gray-400 hover:text-red-500">✕</button>
        </div>
        
        {ghRepos.length === 0 ? (
          <p className="p-4 text-center text-gray-400">No repositories found.</p>
        ) : (
          ghRepos.map((repo, i) => (
            <div
              key={i}
              onClick={() => {
                setScanPath(repo.url);
                setSelectedRepo(repo);
                setShowRepoModal(false);
              }}
              className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex flex-col transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-gray-800">{repo.name}</span>
                {repo.private && (
                  <span className="text-xs text-red-500 uppercase tracking-widest">Private</span>
                )}
              </div>
              <span className="text-xs text-gray-400">{repo.url}</span>
            </div>
          ))
        )}
      </div>
    )}
  </div>
      {isScanning && (
  <div className="mt-6 p-5 bg-blue-50 rounded-2xl border border-blue-100 animate-pulse">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-bold text-blue-700">
        {progress < 40 ? "📂 Reading Repository..." : 
         progress < 80 ? "🔍 Analyzing Security..." : 
         "🤖 Generating AI Suggestions..."}
      </span>
      <span className="text-sm font-black text-blue-700">{progress}%</span>
    </div>
    
    {/* Progress Bar Container */}
    <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden">
      <div
        className="bg-blue-600 h-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
    
    <p className="text-xs text-blue-500 mt-2">
      Please do not refresh the page while the architect is reviewing your code.
    </p>
  </div>
)}
</section>

        <div className="p-8 space-y-10">
          <section className="space-y-4">
  <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
    Select Project
  </h2>

  {/* ✅ THE FIX: Check if projects exist */}
  {projects.length === 0 ? (
    // --- EMPTY STATE UI ---
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-200">
      <div className="text-4xl mb-4">📂</div>
      <h2 className="text-xl font-bold text-gray-800">No projects yet</h2>
      <p className="text-gray-500 mt-2 text-center max-w-xs">
        Your security dashboard is empty. Start by scanning your first repository to see AI insights.
      </p>
      <button 
        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all"
        onClick={() => navigate("/scan")} // Or wherever your scan page is
      >
        + Scan Your First Project
      </button>
    </div>
  ) : (
    // --- EXISTING PROJECTS GRID ---
    <div className="grid gap-6 md:grid-cols-3">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => { setSelectedProject(project); fetchScans(project.id); }}
          className={`p-6 rounded-2xl shadow-sm transition-all cursor-pointer border-2 ${
            selectedProject?.id === project.id 
              ? "bg-white border-blue-600 ring-4 ring-blue-50" 
              : "bg-white border-transparent hover:border-blue-200"
          }`}
        >
          <h2 className="text-lg font-bold text-gray-800">{project.name}</h2>
          <p className="text-gray-500 mt-1 text-xs">Scans: {project.total_scans}</p>
        </div>
      ))}
    </div>
  )}
</section>

          {selectedProject && (
            <section className="space-y-4">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Scan History: {selectedProject.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => { setSelectedScan(scan); fetchIssues(scan.id); }}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedScan?.id === scan.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-100"
                    }`}
                  >
                    <p className="text-xs font-mono opacity-50">Scan #{scan.id}</p>
                    <p className="text-2xl font-black mt-2">{scan.score}% Score</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
              {selectedScan && (
                <section className="space-y-4">
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Detected Issues</h2>
                  <div className="space-y-4">
                    {groupedIssues.length === 0 ? (
                      <div className="p-6 bg-gray-50 rounded-3xl text-center text-gray-500">No issues found for this scan.</div>
                    ) : (
                      groupedIssues.map((group) => (
                        <div key={group.file} className="space-y-3">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedFile(expandedFile === group.file ? null : group.file);
                              setSelectedIssue(null);
                            }}
                            className={`w-full p-5 bg-white rounded-3xl border-2 text-left transition-all ${
                              expandedFile === group.file ? "border-blue-500 shadow-sm" : "border-gray-100 hover:border-blue-200"
                            }`}
                          >
                            <div className="flex justify-between items-center gap-4">
                              <div>
                                <h3 className="text-sm font-bold text-gray-900">{group.file}</h3>
                                <p className="text-xs text-gray-500 mt-1">{group.issues.length} issue{group.issues.length > 1 ? "s" : ""} · {group.highestSeverity} highest severity</p>
                              </div>
                              <span className="text-blue-600 font-black text-xl">{expandedFile === group.file ? "−" : "+"}</span>
                            </div>
                          </button>

                          {expandedFile === group.file && (
                            <div className="space-y-2 pl-4">
                              {group.issues.map((issue) => (
                                <div
                                  key={issue.id}
                                  onClick={() => fetchIssueDetail(issue.id)}
                                  className={`p-4 bg-slate-50 rounded-2xl cursor-pointer transition-all border ${
                                    selectedIssue?.id === issue.id ? "border-blue-400 bg-blue-50" : "border-transparent hover:border-gray-200"
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0">
                                      <h4 className={`text-sm font-bold ${getSeverityColor(issue.severity)}`}>{issue.title}</h4>
                                      <p className="text-[10px] text-gray-500 mt-1">Line {issue.line || "N/A"}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] font-black rounded-lg uppercase ${getStatusBadge(issue.status)}`}>{issue.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {(aiSuggestions.length > 0 || isAiLoading) && (
                <section className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl shadow-2xl">
                  <h2 className="text-xl font-black mb-4">✨ AI Insights</h2>
                  {isAiLoading ? <p className="animate-pulse">Consulting AI...</p> : (
                    <ul className="space-y-3">
                      {aiSuggestions.map((s, i) => <li key={i} className="text-sm bg-white/10 p-3 rounded-xl">● {s}</li>)}
                    </ul>
                  )}
                </section>
              )}
            </div>

            {selectedIssue && (
              <section className="p-8 bg-white rounded-3xl shadow-2xl border border-gray-100">
                <h2 className="text-xl font-black mb-6">Issue Analysis</h2>
                <div className="space-y-6">
                  {/* File Location Banner */}
                  <div className="bg-blue-50 p-5 rounded-2xl border-2 border-blue-300 overflow-hidden">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">📁 Issue Location</p>
                    <div className="bg-white p-3 rounded-lg font-mono text-sm text-gray-900 border border-blue-100">
                      <p className="font-bold text-blue-700 break-all">{selectedIssue.file}</p>
                      {selectedIssue.line && (
                        <p className="text-gray-600 text-xs mt-2">Line: <span className="font-bold text-red-600">{selectedIssue.line}</span></p>
                      )}
                      {selectedIssue.type && (
                        <p className="text-gray-600 text-xs mt-1">Type: <span className="font-bold">{selectedIssue.type}</span></p>
                      )}
                    </div>
                  </div>

                  {/* What is the issue */}
                  <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-200">
                    <p className="text-[10px] font-black text-yellow-600 uppercase">What is the issue?</p>
                    <p className="text-yellow-900 font-bold text-lg mt-2">{selectedIssue.title}</p>
                  </div>

                  {/* Why this happens */}
                  <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-black text-red-400 uppercase">Why this happens</p>
                    <p className="text-red-900 font-medium">{selectedIssue.why}</p>
                  </div>

                  {/* How to fix */}
                  <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                    <p className="text-[10px] font-black text-green-400 uppercase">How to fix</p>
                    <p className="text-green-900 font-medium">{selectedIssue.fix}</p>
                  </div>

                  {/* Severity Badge */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                    <span className={`px-4 py-2 rounded-lg font-bold text-xs ${getSeverityColor(selectedIssue.severity)} ${selectedIssue.severity === 'HIGH' ? 'bg-red-100' : selectedIssue.severity === 'MEDIUM' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                      {selectedIssue.severity} SEVERITY
                    </span>
                    <span className={`px-4 py-2 rounded-lg font-bold text-xs ${getStatusBadge(selectedIssue.status)}`}>
                      {selectedIssue.status}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 flex gap-4">
                    <button onClick={() => updateIssueStatus(selectedIssue.id, "FIXED")} className="flex-1 px-4 py-4 bg-blue-600 text-white font-black rounded-2xl text-xs tracking-widest hover:bg-blue-700">✅ Mark Fixed</button>
                    <button onClick={() => updateIssueStatus(selectedIssue.id, "IGNORED")} className="flex-1 px-4 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl text-xs tracking-widest hover:bg-gray-200">⊗ Ignore</button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// --- MAIN APP ROUTER ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* We keep your dashboard on a specific route */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;