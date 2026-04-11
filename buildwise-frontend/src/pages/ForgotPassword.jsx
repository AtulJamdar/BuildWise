import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Check your email for the password reset link.");
      } else {
        setError(data.detail || "Unable to send reset link. Please try again.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Server unavailable. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-xl shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Forgot Password</h2>

        {message && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded">{message}</div>
        )}
        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors font-semibold disabled:opacity-60"
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-4 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => navigate("/login")}>Back to Login</p>
      </div>
    </div>
  );
}
