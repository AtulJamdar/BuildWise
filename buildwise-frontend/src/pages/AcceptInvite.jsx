import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Joining team...");

  useEffect(() => {
    const accept = async () => {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        setMessage("Please log in to accept the invite.");
        setTimeout(() => navigate("/login"), 1500);
        return;
      }

      try {
        const res = await fetch(`http://localhost:8000/accept-invite/${token}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          setMessage(data.detail || "Failed to accept invite.");
          return;
        }

        setMessage("Invite accepted! Redirecting to teams...");
        setTimeout(() => navigate("/teams"), 1200);
      } catch (error) {
        console.error("Accept invite error:", error);
        setMessage("Unable to accept invite. Please try again.");
      }
    };

    if (token) {
      accept();
    } else {
      setMessage("Invalid invite token.");
    }
  }, [token, navigate]);

  return (
    <div className="mx-auto mt-16 max-w-xl rounded-lg bg-white p-6 shadow-lg">
      <p className="text-lg font-semibold">{message}</p>
    </div>
  );
}
