import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Toast from "../components/Toast";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Joining team...");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    const accept = async () => {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        setMessageType("error");
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
          setMessageType("error");
          return;
        }

        setMessage("Invite accepted! Redirecting to teams...");
        setMessageType("success");
        setTimeout(() => navigate("/teams"), 1200);
      } catch (error) {
        console.error("Accept invite error:", error);
        setMessage("Unable to accept invite. Please try again.");
        setMessageType("error");
      }
    };

    if (token) {
      accept();
    } else {
      setMessage("Invalid invite token.");
    }
  }, [token, navigate]);

  return (
  <div className="bg-white p-6 shadow-lg rounded-lg">
    <Toast 
      message={message} 
      type={messageType}
      onClose={() => setMessage("")}
      duration={5000}
    />
    <p className="text-lg font-semibold">{message}</p>
  </div>
);
}



