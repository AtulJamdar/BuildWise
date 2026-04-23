import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // 1. Setup State to capture inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2. Check for OAuth errors in URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("error");
    
    if (errorCode) {
      const errorMessages = {
        github_timeout: "GitHub API is unreachable. Please check your internet connection and try again.",
        github_connection_error: "Failed to connect to GitHub. Check your network connection.",
        github_request_error: "GitHub authentication request failed. Please try again.",
        token_exchange_failed: "Failed to exchange authorization code with GitHub. Please try again.",
        google_error: "Google authentication failed. Please try again.",
        google_parse_error: "Failed to parse Google user information. Please try again.",
        no_email: "Could not retrieve email from provider. Please try again.",
        auth_failed: "Authentication failed. Please try again.",
        unexpected_error: "An unexpected error occurred. Please try again.",
      };
      
      setError(errorMessages[errorCode] || "Authentication failed. Please try again.");
      
      // Clear the error from URL
      window.history.replaceState({}, document.title, "/login");
    }
  }, []);

  // 2. The Login Logic function
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ Success logic - everything inside this block has access to 'data' and 'response'
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("username", data.username || "User");

        if (data.onboarding_done === true) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      } else {
        setError(data.detail || t("login.invalidError"));
      }
    } catch (err) {
      setError(t("login.serverError") || "Connection to server failed. Please check your internet.");
      console.error("Login Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/auth/github");
      if (!res.ok) {
        throw new Error("Failed to get GitHub authorization URL");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("GitHub authorization URL not available. Please try again.");
      }
    } catch (err) {
      setError("GitHub Login failed to initialize. Please check your connection and try again.");
      setLoading(false);
      console.error("GitHub Login Error:", err);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    try {
      window.location.href = "http://localhost:8000/auth/google";
    } catch (err) {
      setError("Google Login failed to initialize. Please try again.");
      setLoading(false);
      console.error("Google Login Error:", err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-xl shadow w-96">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{t("login.title")}</h2>

        {/* Show error message if login fails */}
        {error && (
          <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder={t("login.emailPlaceholder")}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            placeholder={t("login.passwordPlaceholder")}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded transition-colors font-semibold"
          >
            {loading ? "Logging in..." : t("login.button")}
          </button>

          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl hover:bg-black disabled:bg-gray-400 transition-all mt-4 font-bold"
          >
            <i className="fab fa-github"></i> {loading ? "Initializing..." : t("login.github")}
          </button>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 disabled:bg-red-400 transition-all mt-3 font-bold"
          >
            <i className="fab fa-google"></i> {loading ? "Initializing..." : t("login.google")}
          </button>
        </form>

        <p
          className="mt-4 text-sm text-blue-600 cursor-pointer hover:underline"
          onClick={() => navigate("/register")}
        >
          {t("login.noAccount")}
        </p>

        <p
          className="mt-2 text-xs text-gray-400 cursor-pointer hover:underline"
          onClick={() => navigate("/forgot-password")}
        >
          {t("login.forgotPassword")}
        </p>
      </div>
    </div>
  );
}