import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Cta() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background gradient & dot pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90"></div>
      <div className="absolute inset-0">
        {/* White orbs for fun glow */}
        <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/10"></div>
        <div className="absolute bottom-10 right-1/4 w-12 h-12 rounded-full bg-white/10"></div>
        <div className="absolute top-1/3 right-10 w-16 h-16 rounded-full bg-white/10"></div>
        <div className="absolute bottom-1/3 left-1/4 w-8 h-8 rounded-full bg-white/10"></div>

        {/* Dot pattern SVG */}
        <svg className="absolute left-0 top-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dotPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.15)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotPattern)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="md:flex md:items-center md:justify-between md:space-x-10">
          {/* Left content */}
          <div className="text-center md:text-left md:max-w-xl mb-10 md:mb-0">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6 text-white border border-white/20">
              <Sparkles className="h-4 w-4 mr-2 text-yellow-300" />
              <span className="text-sm font-medium">Join 50+ campuses nationwide</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-poppins leading-tight">
              Ready to level up your <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-400 py-2">
                campus experience?
              </span>
            </h2>

            <p className="mt-6 text-xl text-white/80">
              No FOMO. Get connected, stay updated, and make the most of your college years.
            </p>
          </div>

          {/* Right card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 text-white text-center max-w-md mx-auto md:mx-0">
            <h3 className="text-2xl font-bold mb-4">Create your space</h3>
            <p className="mb-6 text-white/80">
              Sign up in seconds with your student email. No credit card needed, it's 100% free.
            </p>

            <div className="flex flex-col space-y-3">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 rounded-full font-medium text-lg py-7"
              >
                Join UNiSO Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <div className="flex items-center justify-center">
                <span className="text-white/70 text-sm">Or</span>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white/10 rounded-full font-medium py-7"
              >
                See a demo
              </Button>
            </div>

            <div className="mt-6 text-sm text-white/60">
              Already on UNiSO?{" "}
              <a href="#" className="text-white underline">
                Sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
