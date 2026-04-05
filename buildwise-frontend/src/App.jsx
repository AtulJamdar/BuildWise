import { useEffect, useState } from "react";

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [issues, setIssues] = useState([]);
  
  // Step 1: Add State for Issue Details
  const [selectedIssue, setSelectedIssue] = useState(null);

  // --- API FETCH FUNCTIONS ---

  // Fetch all projects
  useEffect(() => {
    fetch("http://127.0.0.1:8000/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch((err) => console.error("Error fetching projects:", err));
  }, []);

  // Fetch scans for a project
  const fetchScans = (projectId) => {
    fetch(`http://127.0.0.1:8000/projects/${projectId}/scans`)
      .then((res) => res.json())
      .then((data) => {
        setScans(data);
        setSelectedScan(null);
        setIssues([]);
        setSelectedIssue(null); // Clear issue detail when changing project
      })
      .catch((err) => console.error("Error fetching scans:", err));
  };

  // Fetch issues for a scan
  const fetchIssues = (scanId) => {
    fetch(`http://127.0.0.1:8000/scans/${scanId}/issues`)
      .then((res) => res.json())
      .then((data) => {
        setIssues(data);
        setSelectedIssue(null); // Clear previous detail view
      })
      .catch((err) => console.error("Error fetching issues:", err));
  };

  // Step 3: Fetch Full Issue Detail
  const fetchIssueDetail = (issueId) => {
    fetch(`http://127.0.0.1:8000/issues/${issueId}`)
      .then((res) => res.json())
      .then((data) => setSelectedIssue(data))
      .catch((err) => console.error("Error fetching issue detail:", err));
  };

  // Step 4: Update Issue Status (Backend Connection)
  const updateIssueStatus = (id, status) => {
    fetch(`http://127.0.0.1:8000/issues/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => res.json())
      .then(() => {
        // Refresh the detail and the main list to show new status
        fetchIssueDetail(id);
        if (selectedScan) fetchIssues(selectedScan.id);
      })
      .catch((err) => console.error("Error updating status:", err));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-slate-800">BuildWise Dashboard</h1>
        <span className="text-sm font-mono bg-slate-100 px-3 py-1 rounded">Backend: Online</span>
      </header>

      {/* --- Projects Section --- */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-slate-600">Active Projects</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => {
                setSelectedProject(project);
                fetchScans(project.id);
              }}
              className={`p-4 border rounded-xl shadow-sm cursor-pointer transition-all ${
                selectedProject?.id === project.id 
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" 
                : "border-gray-200 hover:border-blue-300 bg-white"
              }`}
            >
              <h2 className="text-lg font-bold text-slate-700">{project.name}</h2>
              <p className="text-slate-500 text-sm">Scan Count: {project.total_scans}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- Scans Section --- */}
      {selectedProject && (
        <section className="animate-in slide-in-from-left-4 duration-300">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">
            Scanning History: <span className="text-blue-600">{selectedProject.name}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scans.map((scan) => (
              <div
                key={scan.id}
                onClick={() => {
                  setSelectedScan(scan);
                  fetchIssues(scan.id);
                }}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedScan?.id === scan.id ? "bg-slate-800 text-white border-slate-800" : "bg-white hover:bg-slate-50 border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm font-mono">#{scan.id}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${scan.score > 80 ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {scan.score}/100
                  </span>
                </div>
                <p className="text-xs mt-2 opacity-70">{new Date(scan.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- Issues & Details Layout --- */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Step 2: Make Issues Clickable */}
        {selectedScan && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">Detected Issues</h2>
            {issues.length === 0 ? (
              <p className="text-green-600 font-medium">✅ No issues found!</p>
            ) : (
              issues.map((issue) => (
                <div
                  key={issue.id}
                  onClick={() => fetchIssueDetail(issue.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedIssue?.id === issue.id 
                    ? "border-blue-500 bg-blue-50 shadow-inner" 
                    : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                      issue.severity === 'HIGH' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}>
                      {issue.severity}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{issue.status}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800">{issue.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{issue.file}</p>
                </div>
              ))
            )}
          </section>
        )}

        {/* Step 5: Show Issue Detail UI */}
        {selectedIssue ? (
          <section className="sticky top-6 h-fit animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 border-2 border-slate-800 rounded-2xl bg-white shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Issue Analysis</h2>
                <button onClick={() => setSelectedIssue(null)} className="text-slate-400 hover:text-slate-900 text-xl">✕</button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Title</label>
                  <p className="text-lg font-semibold text-slate-800">{selectedIssue.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">File</label>
                    <p className="font-mono text-xs truncate bg-slate-50 p-2 rounded">{selectedIssue.file}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Severity</label>
                    <p className={`font-bold ${selectedIssue.severity === 'HIGH' ? 'text-red-500' : 'text-yellow-600'}`}>
                      {selectedIssue.severity}
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <label className="text-xs font-bold text-red-400 uppercase">The Problem</label>
                  <p className="text-red-900 leading-relaxed mt-1">{selectedIssue.why}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <label className="text-xs font-bold text-green-400 uppercase">Suggested Fix</label>
                  <p className="text-green-900 leading-relaxed mt-1">{selectedIssue.fix}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex flex-col gap-3">
                <p className="text-center text-xs font-bold text-slate-400">UPDATE STATUS</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateIssueStatus(selectedIssue.id, "FIXED")}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-200"
                  >
                    Mark Fixed
                  </button>
                  <button
                    onClick={() => updateIssueStatus(selectedIssue.id, "IGNORED")}
                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : selectedScan && (
          <div className="hidden lg:flex items-center justify-center border-2 border-dashed rounded-2xl border-slate-200 text-slate-300">
            <p>Select an issue on the left to see full details</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;