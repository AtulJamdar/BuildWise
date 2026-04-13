import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Plans() {
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  const fetchUsage = async () => {
    try {
      const res = await fetch("http://localhost:8000/user/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Unable to load usage");
      }

      const data = await res.json();
      setUsage(data);
    } catch (err) {
      console.error("❌ Usage Fetch Error:", err);
      setMessage("Failed to load usage data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchUsage();
  }, [navigate, token]);

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (document.querySelector("#razorpay-script")) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Razorpay script failed to load"));
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    setIsProcessing(true);

    try {
      await loadRazorpayScript();

      const orderRes = await fetch("http://localhost:8000/create-order", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.detail || orderData.error || "Failed to create Razorpay order");
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "BuildWise",
        description: "BuildWise Pro Plan",
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            const verifyRes = await fetch("http://localhost:8000/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                order_id: orderData.order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.detail || verifyData.error || "Payment verification failed");
            }

            setMessage("Payment successful! Your plan has been upgraded.");
            await fetchUsage();
          } catch (verifyErr) {
            console.error("❌ Verify Payment Error:", verifyErr);
            setMessage(`Payment verification failed: ${verifyErr.message}`);
          }
        },
        theme: {
          color: "#000000",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("❌ Upgrade Error:", err);
      setMessage(`Upgrade failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900">Plans & Usage</h1>
              <p className="mt-2 text-gray-600">Choose the best plan for your security workflow.</p>
            </div>
            {/* 🔥 STEP 2 — BACK BUTTON BUG (Very Important)
                ⚠️ Problem: “Back goes to dashboard”
                👉 Fix: Use navigate(-1) to restore natural navigation */}
            <button
              onClick={() => navigate(-1)}
              className="rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>

          {message && (
            <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
              {message}
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Free Plan */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Free</h2>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>✔ 10 scans/month</li>
                <li>✔ Basic analysis</li>
                <li>✖ No team features</li>
              </ul>
              {usage && (
                <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                  <div className="font-semibold">Current usage</div>
                  <p className="mt-2">{usage.used} / {usage.limit} scans</p>
                </div>
              )}
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
              <h2 className="text-xl font-bold">Pro</h2>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>✔ 100 scans/month</li>
                <li>✔ Private repo scanning</li>
                <li>✔ Advanced AI suggestions</li>
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={isProcessing}
                className="mt-6 w-full rounded-xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-500"
              >
                {isProcessing ? "Processing…" : "Upgrade"}
              </button>
            </div>

            {/* Team Plan */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Team</h2>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>✔ Unlimited scans</li>
                <li>✔ Team collaboration</li>
                <li>✔ Shared reports</li>
              </ul>
            </div>
          </div>
        </div> {/* Close max-w-6xl */}
      </main> {/* Close flex-1 */}
    </div> 
  );
}