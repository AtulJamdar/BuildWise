    import Navbar from "../components/Navbar";
    import Hero from "../components/Hero";
    import Features from "../components/Features";
    import CTA from "../components/CTA";

    export default function Landing() {
    return (
        <div className="min-h-screen bg-gray-100">
        <Navbar />
        <Hero />
        <Features />
        <CTA />
        </div>
    );
    }