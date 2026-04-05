import { useEffect, useState } from "react";

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // --- HELPERS ---
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "HIGH": return "text-red-600 font-bold";
      case "MEDIUM": return "text-yellow-500 font-bold";
      case "LOW": return "text-green-600 font-bold";
      default: return "text-gray-500 font-bold";
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

  // --- API FETCH FUNCTIONS ---
  useEffect(() => {
    fetch("http://127.0.0.1:8000/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch((err) => console.error("Error fetching projects:", err));
  }, []);

  const fetchScans = (projectId) => {
    fetch(`http://127.0.0.1:8000/projects/${projectId}/scans`)
      .then((res) => res.json())
      .then((data) => {
        setScans(data);
        setSelectedScan(null);
        setIssues([]);
        setSelectedIssue(null);
      })
      .catch((err) => console.error("Error fetching scans:", err));
  };

  const fetchIssues = (scanId) => {
    fetch(`http://127.0.0.1:8000/scans/${scanId}/issues`)
      .then((res) => res.json())
      .then((data) => {
        setIssues(data);
        setSelectedIssue(null);
      })
      .catch((err) => console.error("Error fetching issues:", err));
  };

  const fetchIssueDetail = (issueId) => {
    fetch(`http://127.0.0.1:8000/issues/${issueId}`)
      .then((res) => res.json())
      .then((data) => setSelectedIssue(data))
      .catch((err) => console.error("Error fetching detail:", err));
  };

  const updateIssueStatus = (id, status) => {
    fetch(`http://127.0.0.1:8000/issues/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => res.json())
      .then(() => {
        fetchIssueDetail(id);
        if (selectedScan) fetchIssues(selectedScan.id);
      })
      .catch((err) => console.error("Error updating status:", err));
  };

  return (
    // 🧠 Step 1 — Layout Structure (Flex Row)
    <div className="flex min-h-screen bg-gray-100 font-sans">
      
      {/* 🧠 Step 2 — Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-2xl font-black text-blue-600 tracking-tighter">BuildWise</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">Security Suite</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold transition-all">
            <span className="mr-3">📊</span> Dashboard
          </button>
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">
            <span className="mr-3">📁</span> Projects
          </button>
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">
            <span className="mr-3">📝</span> Reports
          </button>
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">
            <span className="mr-3">⚙️</span> Settings
          </button>
        </nav>

        <div className="p-4 border-t">
            <div className="bg-slate-900 rounded-xl p-4 text-white">
                <p className="text-[10px] font-bold opacity-50 uppercase">Current Plan</p>
                <p className="text-sm font-bold">Developer Pro</p>
            </div>
        </div>
      </aside>

      {/* 🧠 Step 3 — Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* 🧠 Step 4 — Header */}
        <header className="flex justify-between items-center bg-white px-8 py-4 shadow-sm border-b sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">Atul Sunil Jamdar</p>
              <p className="text-[10px] text-green-500 font-bold uppercase">Administrator</p>
            </div>
            <button className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-500 hover:text-white transition-all text-sm border border-red-100">
              Logout
            </button>
          </div>
        </header>

        {/* --- Actual Dashboard Content --- */}
        <div className="p-8 space-y-10">
          
          {/* Projects Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Select Project</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project);
                    fetchScans(project.id);
                  }}
                  className={`p-6 rounded-2xl shadow-sm transition-all cursor-pointer border-2 ${
                    selectedProject?.id === project.id 
                    ? "bg-white border-blue-600 ring-4 ring-blue-50" 
                    : "bg-white border-transparent hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  <h2 className="text-lg font-bold text-gray-800">{project.name}</h2>
                  <p className="text-gray-500 mt-1 text-xs">Scan Count: {project.total_scans}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Scans History Section */}
          {selectedProject && (
            <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                Scan History: {selectedProject.name}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => {
                      setSelectedScan(scan);
                      fetchIssues(scan.id);
                    }}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedScan?.id === scan.id 
                      ? "bg-gray-900 text-white border-gray-900 shadow-xl" 
                      : "bg-white text-gray-700 border-gray-100 hover:border-gray-300 shadow-sm"
                    }`}
                  >
                    <p className="text-xs font-mono opacity-50 uppercase">Scan #{scan.id}</p>
                    <p className="text-2xl font-black mt-2">{scan.score}%</p>
                    <p className="text-[10px] mt-3 uppercase opacity-40">{new Date(scan.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Issues & Details Section */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            
            {/* Issue List */}
            {selectedScan && (
              <section className="space-y-4">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Detected Issues</h2>
                <div className="space-y-3">
                  {issues.length === 0 ? (
                    <div className="p-8 bg-white rounded-2xl text-center border-2 border-dashed">
                      <p className="text-green-500 font-bold italic">No security vulnerabilities found.</p>
                    </div>
                  ) : (
                    issues.map((issue) => (
                      <div
                        key={issue.id}
                        onClick={() => fetchIssueDetail(issue.id)}
                        className={`p-5 bg-white rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all border-2 ${
                          selectedIssue?.id === issue.id ? "border-blue-500 ring-2 ring-blue-50" : "border-transparent"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className={`text-sm font-bold ${getSeverityColor(issue.severity)}`}>
                            [{issue.severity}] {issue.title}
                          </h3>
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase ${getStatusBadge(issue.status)}`}>
                            {issue.status}
                          </span>
                        </div>
                        <p className="text-gray-400 mt-2 text-[10px] font-mono truncate bg-gray-50 p-2 rounded-lg">{issue.file}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Issue Detail Box */}
            {selectedIssue && (
              <section className="sticky top-24 animate-in zoom-in-95 duration-200">
                <div className="p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 ring-1 ring-black/5">
                  <div className="flex justify-between items-start mb-8">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Issue Report</h2>
                    <button onClick={() => setSelectedIssue(null)} className="text-gray-300 hover:text-gray-900 transition-colors">✕</button>
                  </div>

                  <div className="space-y-6 text-sm">
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Location & Priority</p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-mono font-bold text-gray-600 truncate mr-4">{selectedIssue.file}</p>
                        <p className={`text-xs font-black px-2 py-1 rounded bg-white shadow-sm ${getSeverityColor(selectedIssue.severity)}`}>
                            {selectedIssue.severity}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Analysis</p>
                      <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                        <p className="text-red-900 leading-relaxed font-medium">{selectedIssue.why}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Resolution Guide</p>
                      <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                        <p className="text-green-900 leading-relaxed font-medium">{selectedIssue.fix}</p>
                      </div>
                    </div>

                    <div className="pt-8 flex gap-4">
                      <button
                        onClick={() => updateIssueStatus(selectedIssue.id, "FIXED")}
                        className="flex-1 px-4 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-200 uppercase text-xs tracking-widest"
                      >
                        Mark as Fixed
                      </button>
                      <button
                        onClick={() => updateIssueStatus(selectedIssue.id, "IGNORED")}
                        className="flex-1 px-4 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black rounded-2xl transition-all uppercase text-xs tracking-widest"
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;