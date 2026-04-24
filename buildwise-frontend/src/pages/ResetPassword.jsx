import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Toast from "../components/Toast";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!password) {
      setError(t("resetPassword.invalidPassword"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || t("resetPassword.successMessage"));
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(data.detail || t("resetPassword.failureMessage"));
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError(t("resetPassword.serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-xl shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{t("resetPassword.title")}</h2>

        {message && (
          <Toast 
            message={message} 
            type="success"
            onClose={() => setMessage("")}
            duration={5000}
          />
        )}
        {error && (
          <Toast 
            message={error} 
            type="error"
            onClose={() => setError("")}
            duration={5000}
          />
        )}

        <form onSubmit={handleReset}>
          <input
            type="password"
            placeholder={t("resetPassword.placeholder")}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors font-semibold disabled:opacity-60"
          >
            {isLoading ? "Updating..." : t("resetPassword.button")}
          </button>
        </form>

        <p className="mt-4 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => navigate("/login")}>{t("resetPassword.backToLogin")}</p>
      </div>
    </div>
  );
}
