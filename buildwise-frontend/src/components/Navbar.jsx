import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center p-6 bg-white shadow">
      <h1 className="text-2xl font-bold">BuildWise</h1>

      <div className="flex gap-4">
        <button onClick={() => navigate("/login")}>
          Login
        </button>

        <button
          onClick={() => navigate("/register")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}