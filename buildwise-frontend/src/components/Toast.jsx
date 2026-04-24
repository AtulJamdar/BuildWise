import { useState, useEffect } from "react";

export default function Toast({ message, type = "success", onClose, duration = 5000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!isVisible || !message) return null;

  const bgColor = type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
  const textColor = type === "success" ? "text-green-800" : "text-red-800";
  const buttonColor = type === "success" ? "text-green-400 hover:text-green-600" : "text-red-400 hover:text-red-600";

  return (
    <div className={`mb-6 rounded-3xl border ${bgColor} px-5 py-4 text-sm font-medium ${textColor} flex items-center justify-between`}>
      <span>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className={`ml-4 ${buttonColor} font-bold text-lg transition hover:scale-110`}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}
