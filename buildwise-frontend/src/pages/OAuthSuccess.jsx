import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OAuthSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 1. Extract parameters from the URL redirect
    const params = new URLSearchParams(location.search);
    const appToken = params.get("token");    // Our Backend JWT
    const ghToken = params.get("gh_token"); // GitHub's Access Token

    if (appToken) {
      // 2. Save our internal app token (Required for all API calls)
      localStorage.setItem("token", appToken);

      if (ghToken) {
        // 3. Save GitHub token if available (Required for Repo Import)
        localStorage.setItem("gh_token", ghToken);
        console.log("✅ OAuth Success: Both tokens saved.");
        navigate("/dashboard");
      } else {
        // 4. Fallback: If no GitHub token, go to onboarding first
        console.log("ℹ️ OAuth Success: App token saved, moving to onboarding.");
        navigate("/onboarding");
      }
    } else {
      // 5. If no token is found, something went wrong—back to login
      console.log("❌ OAuth Failed: No tokens found in URL.");
      navigate("/login");
    }
  }, [location, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      {/* 🔄 Smooth Loading Spinner */}
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
      </div>
      
      <h2 className="mt-6 text-xl font-black text-gray-800">Finalizing Secure Login</h2>
      <p className="mt-2 text-gray-500 animate-pulse">Syncing your GitHub profile...</p>
      
      <div className="mt-8 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 flex items-center gap-2">
        <i className="fab fa-github text-gray-900"></i>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">BuildWise Security Suite</span>
      </div>
    </div>
  );
}