import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!password) {
      setError("Please enter a new password.");
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
        setMessage(data.message || "Password updated successfully.");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(data.detail || "Unable to reset password. Please try again.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Server unavailable. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-xl shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Reset Password</h2>

        {message && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded">{message}</div>
        )}
        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded">{error}</div>
        )}

        <form onSubmit={handleReset}>
          <input
            type="password"
            placeholder="New password"
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
            {isLoading ? "Updating..." : "Reset Password"}
          </button>
        </form>

        <p className="mt-4 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => navigate("/login")}>Back to Login</p>
      </div>
    </div>
  );
}
