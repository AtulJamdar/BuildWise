import React, { useState, useEffect } from "react"; // ✅ Added useEffect to imports
import { useNavigate } from "react-router-dom";

export default function Onboarding() {
  const navigate = useNavigate();

  // --- 🧠 Step 1 — State Logic ---
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [stack, setStack] = useState("");

  // --- 🛡️ Reverse Gatekeeper ---
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:8000/auth/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.onboarding_done === true) {
          navigate("/dashboard");
        }
      })
      .catch((err) => console.error("Onboarding check failed", err));
  }, [navigate]);

  // --- 🧠 Step 3 — handleSubmit ---
  const handleSubmit = () => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:8000/auth/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role_type: role,
        // We send experience for professionals or the goal for students
        experience_level: role === "professional" ? experience : goal, 
        tech_stack: stack,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        navigate("/dashboard");
      })
      .catch((err) => console.error("Onboarding error:", err));
  };

  // --- 🧠 Step 2 — Step-Based UI ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-2xl shadow-xl w-96 text-center border border-gray-100">
        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 mb-6">
          <div className={`h-1.5 w-8 rounded-full ${step >= 1 ? "bg-blue-600" : "bg-gray-200"}`}></div>
          <div className={`h-1.5 w-8 rounded-full ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}></div>
          <div className={`h-1.5 w-8 rounded-full ${step >= 3 ? "bg-blue-600" : "bg-gray-200"}`}></div>
        </div>

        {step === 1 && (
          <div className="animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black mb-2 text-gray-800">Who are you?</h2>
            <p className="text-gray-500 text-sm mb-8">Tell us your current path</p>
            <button
              onClick={() => { setRole("student"); setStep(2); }}
              className="w-full mb-3 p-4 border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700"
            >
              🎓 Student
            </button>
            <button
              onClick={() => { setRole("professional"); setStep(2); }}
              className="w-full p-4 border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700"
            >
              💼 Working Professional
            </button>
          </div>
        )}

        {step === 2 && role === "student" && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-black mb-6 text-gray-800">What are you learning?</h2>
            <input
              autoFocus
              className="w-full p-3 border-2 border-gray-100 rounded-xl mb-6 focus:border-blue-500 outline-none"
              placeholder="e.g. React, Python, Java"
              onChange={(e) => setGoal(e.target.value)}
            />
            <button
              onClick={() => setStep(3)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && role === "professional" && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Your experience?</h2>
            <input
              autoFocus
              className="w-full p-3 border-2 border-gray-100 rounded-xl mb-6 focus:border-blue-500 outline-none"
              placeholder="e.g. 2 years, Senior Lead"
              onChange={(e) => setExperience(e.target.value)}
            />
            <button
              onClick={() => setStep(3)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-black mb-2 text-gray-800">Final Step</h2>
            <p className="text-gray-500 text-sm mb-6">What tech stack do you use?</p>
            <input
              autoFocus
              className="w-full p-3 border-2 border-gray-100 rounded-xl mb-6 focus:border-blue-500 outline-none"
              placeholder="React, Node, PostgreSQL, etc."
              onChange={(e) => setStack(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 transition-all"
            >
              Finish & Go to Dashboard
            </button>
          </div>
        )}

        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-6 text-gray-400 text-xs font-bold hover:text-gray-600 uppercase tracking-widest"
          >
            ← Go Back
          </button>
        )}
      </div>
    </div>
  );
}