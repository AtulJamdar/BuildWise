export default function Features() {
  const features = [
    "Code Quality Analysis",
    "Security Issue Detection",
    "AI Suggestions",
    "Project Insights Dashboard",
  ];

  return (
    <div className="py-16 px-6">
      <h2 className="text-3xl font-bold text-center mb-10">
        Features
      </h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {features.map((f, i) => (
          <div key={i} className="p-6 bg-white rounded-xl shadow">
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}