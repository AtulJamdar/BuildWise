import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";

export default function Plans() {
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    company_name: "",
    team_size: "",
    requirements: "",
  });

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
      setMessageType("error");
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

            setMessageType("success");
            await fetchUsage();
          } catch (verifyErr) {
            console.error("❌ Verify Payment Error:", verifyErr);
            setMessage(`Payment verification failed: ${verifyErr.message}`);
            setMessageType("error");
          }
        },
        theme: {
          color: "#000000",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setMessageType("error");
      console.error("❌ Upgrade Error:", err);
      setMessage(`Upgrade failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBusinessInquiry = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const res = await fetch("http://localhost:8000/business-inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(businessForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to submit inquiry");
      }

      setMessage(data.message || "Thank you! We will contact you soon.");
      setMessageType("success");
      setShowBusinessForm(false);
      setBusinessForm({ company_name: "", team_size: "", requirements: "" });
    } catch (err) {
      console.error("❌ Business Inquiry Error:", err);
      setMessage(`Error: ${err.message}`);
      setMessageType("error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
      <main className="min-h-screen bg-gray-100 p-6">
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
            <Toast 
              message={message} 
              type={messageType}
              onClose={() => setMessage("")}
              duration={5000}
            />
          )}

          {/* Pricing Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Free Plan */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Free</h2>
              <p className="mt-2 text-sm text-gray-500">₹0/month</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>✔ 10 scans/month</li>
                <li>✔ Basic analysis</li>
                <li>✔ Basic AI suggestions</li>
                
              </ul>
              {usage && (
                <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                  <div className="font-semibold">Current usage</div>
                  <p className="mt-2">{usage.used} / {usage.limit} scans</p>
                </div>
              )}
            </div>

            {/* Pro Plan */}
            <div className="rounded-3xl border-2 border-blue-500 bg-white p-6 shadow-lg">
              <h2 className="text-xl font-bold text-blue-600">Pro</h2>
              <p className="mt-2 text-sm text-gray-500">₹999/month</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>✔ 100 scans/month</li>
                <li>✔ Private repo scanning</li>
                <li>✔ Advanced AI suggestions</li>
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={isProcessing}
                className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-500"
              >
                {isProcessing ? "Processing…" : "Upgrade to Pro"}
              </button>
            </div>

            {/* Business Plan */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
              <h2 className="text-xl font-bold">Business</h2>
              <p className="mt-2 text-sm text-red-600 font-semibold">Custom Pricing</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>✔ Unlimited scans/month</li>
                <li>✔ Full team collaboration</li>
                <li>✔ Advanced AI suggestions</li>
                <li>✔ Shared reports & dashboards</li>
                <li>✔ Priority support</li>
              </ul>
              <button
                onClick={() => setShowBusinessForm(true)}
                className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Request Quote
              </button>
            </div>
          </div>

          {/* Business Inquiry Form Modal */}
          {showBusinessForm && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-2xl">
                <h3 className="text-2xl font-bold mb-4">Business Plan Inquiry</h3>
                <form onSubmit={handleBusinessInquiry} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Company Name</label>
                    <input
                      type="text"
                      required
                      value={businessForm.company_name}
                      onChange={(e) => setBusinessForm({ ...businessForm, company_name: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Team Size</label>
                    <input
                      type="text"
                      required
                      value={businessForm.team_size}
                      onChange={(e) => setBusinessForm({ ...businessForm, team_size: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                      placeholder="e.g., 10-50 people"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Requirements</label>
                    <textarea
                      required
                      value={businessForm.requirements}
                      onChange={(e) => setBusinessForm({ ...businessForm, requirements: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                      placeholder="Tell us about your security needs"
                      rows="4"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBusinessForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                    >
                      {isProcessing ? "Sending..." : "Submit"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div> {/* Close max-w-6xl */}
        {/* Close flex-1 */}
      </main> 
  );
}