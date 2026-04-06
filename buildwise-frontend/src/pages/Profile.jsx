import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role_type: "",
    experience_level: "",
    tech_stack: "",
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  // Fetch profile on load
  useEffect(() => {
    console.log("📋 Fetching user profile...");
    setLoading(true);
    
    fetch("http://127.0.0.1:8000/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        console.log("📡 Profile API status:", res.status);
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      })
      .then((data) => {
        console.log("✅ Profile data:", data);
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching profile:", err);
        setMessage("Failed to load profile");
        setLoading(false);
      });
  }, [token]);

  const handleUpdate = async () => {
    console.log("💾 Updating profile with:", profile);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      console.log("📡 Update API status:", response.status);
      const data = await response.json();

      if (response.ok) {
        console.log("✅ Profile updated:", data);
        setMessage("Profile updated successfully!");
        setIsEditing(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        console.error("❌ Update failed:", data);
        setMessage("Failed to update profile");
      }
    } catch (err) {
      console.error("❌ Error updating profile:", err);
      setMessage("Error updating profile");
    }
  };

  const handleChange = (field, value) => {
    setProfile({
      ...profile,
      [field]: value,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-xl flex flex-col border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-2xl font-black text-blue-600 tracking-tighter">BuildWise</h2>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">AI Security Suite</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50"
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => navigate("/profile")}
            className="flex items-center w-full text-left px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-bold"
          >
            👤 Profile
          </button>
          <button className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50">
            ⚙️ Settings
          </button>
        </nav>
        <div className="p-4 border-t">
          <button 
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/");
            }}
            className="w-full px-4 py-3 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-all text-sm border border-red-100"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="flex justify-between items-center bg-white px-8 py-4 shadow-sm border-b sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">Profile Settings</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">👤 {profile.name}</span>
            <button 
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-all text-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-xl font-bold ${message.includes("successfully") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {message}
            </div>
          )}

          <div className="max-w-2xl bg-white rounded-3xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-800 mb-2">Your Profile</h2>
              <p className="text-gray-600">Manage your account and preferences</p>
            </div>

            <div className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={profile.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
                    isEditing
                      ? "border-blue-300 bg-white focus:border-blue-500 focus:outline-none"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field (Read-only) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email || ""}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="Your email"
                />
                <p className="text-xs text-gray-500 mt-1">✓ Email cannot be changed</p>
              </div>

              {/* Role Type */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Role Type</label>
                <select
                  value={profile.role_type || ""}
                  onChange={(e) => handleChange("role_type", e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
                    isEditing
                      ? "border-blue-300 bg-white focus:border-blue-500 focus:outline-none"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <option value="">Select a role</option>
                  <option value="student">Student</option>
                  <option value="professional">Professional</option>
                  <option value="developer">Developer</option>
                  <option value="architect">Architect</option>
                  <option value="security">Security Specialist</option>
                </select>
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Experience Level</label>
                <select
                  value={profile.experience_level || ""}
                  onChange={(e) => handleChange("experience_level", e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
                    isEditing
                      ? "border-blue-300 bg-white focus:border-blue-500 focus:outline-none"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <option value="">Select experience level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {/* Tech Stack */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tech Stack</label>
                <input
                  type="text"
                  value={profile.tech_stack || ""}
                  onChange={(e) => handleChange("tech_stack", e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
                    isEditing
                      ? "border-blue-300 bg-white focus:border-blue-500 focus:outline-none"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  placeholder="e.g., React, Node.js, Python, MongoDB"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated technologies you work with</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                >
                  ✏️ Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleUpdate}
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setMessage("");
                    }}
                    className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-400 transition-all"
                  >
                    ✕ Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
