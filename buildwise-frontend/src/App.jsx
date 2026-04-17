import { useEffect, useState } from "react";
import { Navigate, Routes, Route, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Plans from "./pages/Plans";
import OAuthSuccess from "./pages/OAuthSuccess";
import AcceptInvite from "./pages/AcceptInvite";
import IssueDetails from "./pages/IssueDetails";
import Projects from "./pages/Projects";
import Teams from "./pages/Teams";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// --- DASHBOARD COMPONENT ---
// This contains all your logic for projects, scans, and AI
const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
  const [planInfo, setPlanInfo] = useState(null);
  const [planError, setPlanError] = useState("");
  const [usage, setUsage] = useState(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

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
    const res = await fetch(`http://localhost:8000/github/repos?token=${ghToken}`);
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
    fetch("http://localhost:8000/auth/status", {
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
          fetchPlan();
          fetchUsage();
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
      const res = await fetch("http://localhost:8000/teams", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Team Fetch Error:", err);
    }
  };

  const fetchPlan = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("http://localhost:8000/plan", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Unable to load plan");
      }
      const data = await res.json();
      setPlanInfo(data);
    } catch (err) {
      console.error("❌ Plan Fetch Error:", err);
      setPlanError(err.message);
    }
  };

  const fetchUsage = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("http://localhost:8000/user/usage", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Unable to load usage");
      }
      const data = await res.json();
      setUsage(data);
    } catch (err) {
      console.error("❌ Usage Fetch Error:", err);
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
      const res = await fetch("http://localhost:8000/teams/invite", {
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
      await fetchTeams();
    } catch (err) {
      console.error("❌ Invite Error:", err);
      setInviteError(err.message);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (document.querySelector("#razorpay-script")) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Razorpay script failed to load"));
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to upgrade.");
      return;
    }

    setIsUpgrading(true);

    try {
      await loadRazorpayScript();

      const orderRes = await fetch("http://localhost:8000/create-order", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.detail || orderData.error || "Failed to create Razorpay order");
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "BuildWise",
        description: "BuildWise Pro Plan",
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch("http://localhost:8000/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                order_id: orderData.order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.detail || verifyData.error || "Payment verification failed");
            }

            alert("Payment successful! Your plan has been upgraded.");
            fetchPlan();
          } catch (verifyErr) {
            console.error("❌ Verify Payment Error:", verifyErr);
            alert(`Payment verification failed: ${verifyErr.message}`);
          }
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("❌ Upgrade Error:", err);
      alert(`Upgrade failed: ${err.message}`);
    } finally {
      setIsUpgrading(false);
    }
  };
;

  const fetchProjects = async (autoSelectProjectName = null) => {
    const token = localStorage.getItem("token");
    console.log("🔄 Fetching projects for user...");

    try {
      const res = await fetch("http://localhost:8000/projects", {
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

    fetch(`http://localhost:8000/projects/${projectId}/scans`, {
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

    fetch("http://localhost:8000/ai/suggestions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({
        project_name: selectedProject.name,
        issues: currentIssues,
        language: i18n.language || "en",
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

    fetch(`http://localhost:8000/scans/${scanId}/issues`, {
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

    fetch(`http://localhost:8000/issues/${issueId}`, {
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

    fetch(`http://localhost:8000/issues/${id}`, {
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
      const response = await fetch("http://localhost:8000/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repo_url: scanPath,
          project_name: projectName,
          gh_token: localStorage.getItem("gh_token"),
          team_id: selectedTeam ? Number(selectedTeam) : null,
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
      <main className="h-screen flex flex-col overflow-y-auto">
        <header className="flex flex-wrap justify-between items-center bg-white px-8 py-4 shadow-sm border-b sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{t("dashboard.overview")}</h1>
            <p className="text-sm text-gray-500">{t("dashboard.description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t("dashboard.selectLanguage")}</span>
              <select
                value={i18n.language}
                onChange={(e) => {
                  i18n.changeLanguage(e.target.value);
                  localStorage.setItem("lang", e.target.value);
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="mr">MR</option>
              </select>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{username}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase">{t("dashboard.administrator")}</p>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                localStorage.removeItem("gh_token");
                navigate("/login");
              }} 
              className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-500 hover:text-white transition-all text-sm border border-red-100"
            >
              {t("dashboard.logout")}
            </button>
          </div>
        </header>

        <section className="p-8 bg-white rounded-3xl shadow-sm border border-blue-100 mb-10 grid gap-6 md:grid-cols-3">
          <div className="p-6 rounded-3xl bg-slate-50 border border-gray-100">
            <p className="text-sm uppercase tracking-widest text-gray-500 font-bold">{t("dashboard.currentPlan")}</p>
            <h2 className="mt-3 text-2xl font-black text-gray-900">{planInfo?.plan?.toUpperCase() || "FREE"}</h2>
            <p className="text-sm text-gray-500 mt-2">{planInfo?.trial_active ? t("dashboard.trialActive") : t("dashboard.standardPlan")}</p>
            <div className="mt-5">
              <p className="text-xs uppercase tracking-widest text-gray-400">{t("dashboard.usage")}</p>
              <div className="mt-2 bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${Math.min(100, planInfo?.scan_count / Math.max(planInfo?.scan_limit, 1) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">{planInfo?.scan_count ?? 0}/{planInfo?.scan_limit ?? 10} {t("dashboard.usage")}</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-gray-100">
            <p className="text-sm uppercase tracking-widest text-gray-500 font-bold">{t("dashboard.teamMembership")}</p>
            <h2 className="mt-3 text-2xl font-black text-gray-900">{teams.length}</h2>
            <p className="text-sm text-gray-500 mt-2">{t("dashboard.teamDescription")}</p>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              {teams.slice(0, 3).map((team) => (
                <li key={team.id} className="flex items-center justify-between gap-2">
                  <span>{team.name}</span>
                  <span className="text-xs uppercase tracking-widest text-blue-600 font-bold">{team.role}</span>
                </li>
              ))}
              {teams.length === 0 && <li className="text-gray-500">{t("dashboard.noTeams")}</li>}
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-gray-100">
            <p className="text-sm uppercase tracking-widest text-gray-500 font-bold">{t("dashboard.quickActions")}</p>
            <div className="mt-4 space-y-4">
              <div>
                <button
                  onClick={handleUpgrade}
                  disabled={planInfo?.plan === "pro" || isUpgrading}
                  className={`w-full rounded-xl text-sm font-bold px-4 py-3 transition-all ${planInfo?.plan === "pro" ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                >
                  {planInfo?.plan === "pro" ? t("dashboard.proPlanActive") : isUpgrading ? t("dashboard.scanning") : t("dashboard.upgradeToPro")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- 🚀 SCAN NEW PROJECT SECTION --- */}
<section className="p-8 bg-white rounded-3xl shadow-sm border border-blue-100 mb-10">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div>
      <h2 className="text-xl font-black text-gray-800">{t("dashboard.newScanTitle")}</h2>
      <p className="text-sm text-gray-500">{t("dashboard.newScanDescription")}</p>
    </div>
    
    <div className="flex flex-1 max-w-2xl gap-3">
      <input
        type="text"
        value={scanPath}
        onChange={(e) => {
          setScanPath(e.target.value);
          setSelectedRepo(null);
        }}
        placeholder={t("dashboard.repoPlaceholder")}
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
        {isScanning ? t("dashboard.scanning") : t("dashboard.startScan")}
      </button>
      <button 
        onClick={handleFetchRepos}
        disabled={isScanning}
        className="self-end bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 font-bold transition-all"
      >
        {isFetchingRepos ? "⏳..." : t("dashboard.importing")}
      </button>
    </div>
    {selectedRepo?.private && (
      <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-semibold">
        <span>{t("dashboard.privateScanMode")}</span>
      </div>
    )}

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <label className="text-sm font-bold text-gray-700">{t("dashboard.scanAsTeam")}</label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
        >
          <option value="">{t("dashboard.personalProject")}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-bold text-gray-700">{t("dashboard.inviteMember")}</label>
        <div className="mt-2 flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("dashboard.enterUserEmail")}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm"
          />
          <button
            onClick={inviteMember}
            className="bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-blue-700"
          >
            {t("dashboard.invite")}
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
          <span className="text-xs font-bold text-gray-500 uppercase">{t("dashboard.yourRepositories")}</span>
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
    {t("dashboard.selectProject")}
  </h2>

  {/* ✅ THE FIX: Check if projects exist */}
  {projects.length === 0 ? (
    // --- EMPTY STATE UI ---
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-200">
      <div className="text-4xl mb-4">📂</div>
      <h2 className="text-xl font-bold text-gray-800">{t("dashboard.emptyTitle")}</h2>
      <p className="text-gray-500 mt-2 text-center max-w-xs">
        {t("dashboard.emptyDescription")}
      </p>
      <button 
        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all"
        onClick={() => navigate("/scan")} // Or wherever your scan page is
      >
        {t("dashboard.emptyAction")}
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
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">{t("dashboard.scanHistory", { project: selectedProject.name })}</h2>
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
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">{t("dashboard.detectedIssues")}</h2>
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
                                  onClick={() => {
                                    setSelectedIssue(null);
                                    navigate(`/issue/${issue.id}`);
                                  }}
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
                  <h2 className="text-xl font-black mb-4">{t("dashboard.aiInsights")}</h2>
                  {isAiLoading ? <p className="animate-pulse">{t("dashboard.consultingAI")}</p> : (
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
  );
};

// --- MAIN APP ROUTER ---
function ProtectedLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-950">
      <div className="w-64 h-screen fixed left-0 top-0">
        <Sidebar />
      </div>
      <div className="ml-64 w-full min-h-screen overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

function App() {
  const [dark, setDark] = useState(true);
  const location = useLocation();
  const protectedRoutes = [
    "/dashboard",
    "/projects",
    "/teams",
    "/issue",
    "/plans",
    "/profile",
    "/oauth-success",
    "/onboarding",
  ];
  const showNavbar = location.pathname !== "/" && !protectedRoutes.some((route) => location.pathname.startsWith(route));

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
        <div className="fixed right-4 top-4 z-50">
          <button
            onClick={() => setDark((prev) => !prev)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-md transition hover:bg-gray-100 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            {dark ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
        {showNavbar && <Navbar dark={dark} />}
        <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        {/* We keep your dashboard on authenticated routes only */}
        <Route element={<RequireAuth><ProtectedLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/issue/:id" element={<IssueDetails />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      </Routes>
      </div>
    </div>
  );
}

export default App;