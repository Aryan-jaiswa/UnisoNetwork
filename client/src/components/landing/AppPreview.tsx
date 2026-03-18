import {
  Check,
  Smartphone,
  Monitor,
  Tablet,
  Bell,
  Shield,
  UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AppPreview() {
  const features = [
    {
      icon: <Bell className="h-5 w-5 text-secondary" />,
      title: "Real-time updates",
      description: "Instant notifications about events and messages from your squad."
    },
    {
      icon: <Shield className="h-5 w-5 text-secondary" />,
      title: "Campus verified",
      description: "Every user is verified with a .edu email for a safe community."
    },
    {
      icon: <UserPlus className="h-5 w-5 text-secondary" />,
      title: "Find your people",
      description: "Our algorithm connects you with students who share your vibe."
    }
  ];

  return (
    <section className="py-20 bg-gray-50 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-100 rounded-full opacity-60 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-purple-100 rounded-full opacity-50 blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="px-3 py-1 text-xs rounded-full mb-6 bg-white border-gray-200"
          >
            Available Everywhere
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 font-poppins">
            UNiSO in your pocket, <span className="text-primary">wherever you go</span>
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Available on all your devices, UNiSO keeps you connected to your campus vibes 24/7
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
          {/* Device Previews */}
          <div className="lg:col-span-7 relative mb-16 lg:mb-0">
            <div className="relative mx-auto max-w-[800px]">

              {/* Floating Mobile Mockup */}
              <div
                className="absolute -left-6 sm:left-1/4 top-10 w-[220px] sm:w-[260px] z-20 animate-float"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="relative">
                  <div className="bg-black rounded-[40px] p-2 overflow-hidden shadow-2xl border-[6px] border-black">
                    <div className="bg-white rounded-[32px] overflow-hidden relative">
                      <img
                        src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=512&h=1024"
                        alt="UNiSO mobile screen"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 p-3 text-white text-xs">
                        <div className="bg-black/30 backdrop-blur-md p-3 rounded-xl">
                          <div className="font-bold">Campus Parties</div>
                          <div className="text-white/80 text-[10px]">
                            3 new events near you this weekend
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-white py-2 px-4 rounded-full shadow-lg">
                    <div className="flex items-center space-x-1">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-xs font-medium">Now online</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Web Dashboard Mockup */}
              <div className="relative z-10 mx-auto">
                <div className="bg-gray-900 rounded-t-xl pt-4 pb-2 px-4 shadow-2xl max-w-3xl mx-auto">
                  <div className="flex space-x-2 mb-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="rounded-t-lg overflow-hidden border-4 border-t-gray-900 border-l-gray-900 border-r-gray-900 border-b-0">
                    <img
                      className="w-full"
                      src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&h=900"
                      alt="UNiSO web dashboard"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 mix-blend-overlay" />
                  </div>
                </div>
                <div className="bg-gray-800 h-4 rounded-b-lg max-w-3xl mx-auto shadow-2xl" />
                <div className="bg-gray-700 h-2 rounded-b-lg max-w-[calc(100%-100px)] mx-auto" />
              </div>

              {/* Tablet Preview */}
              <div className="absolute -right-6 sm:right-10 top-20 w-[200px] sm:w-[240px] z-20 animate-float">
                <div className="bg-black rounded-[20px] p-2 overflow-hidden shadow-2xl rotate-6">
                  <div className="relative bg-white rounded-[12px] overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=512&h=640"
                      alt="UNiSO tablet screen"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <div className="bg-black/30 backdrop-blur-md px-2 py-1 rounded-full">
                        <div className="text-white text-[10px] font-medium">12 new messages</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Feature Details */}
          <div className="lg:col-span-5">
            <div className="flex flex-col space-y-10">

              {/* Platform Icons */}
              <div className="grid grid-cols-3 gap-4 text-center mb-8">
                <div className="flex flex-col items-center p-4">
                  <div className="p-3 bg-purple-100 rounded-full mb-3">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">iOS & Android</span>
                </div>
                <div className="flex flex-col items-center p-4">
                  <div className="p-3 bg-teal-100 rounded-full mb-3">
                    <Monitor className="h-6 w-6 text-secondary" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">Web App</span>
                </div>
                <div className="flex flex-col items-center p-4">
                  <div className="p-3 bg-pink-100 rounded-full mb-3">
                    <Tablet className="h-6 w-6 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">Tablet</span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h3 className="text-2xl font-bold mb-6 font-poppins">
                  Why students love UNiSO
                </h3>
                <div className="space-y-6">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <div className="flex-shrink-0 bg-secondary/10 p-2 rounded-full">
                        {feature.icon}
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {feature.title}
                        </h4>
                        <p className="mt-1 text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social Proof */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <div className="flex -space-x-2">
                      <img
                        className="h-8 w-8 rounded-full ring-2 ring-white"
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt=""
                      />
                      <img
                        className="h-8 w-8 rounded-full ring-2 ring-white"
                        src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt=""
                      />
                      <img
                        className="h-8 w-8 rounded-full ring-2 ring-white"
                        src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt=""
                      />
                      <div className="h-8 w-8 rounded-full ring-2 ring-white bg-primary flex items-center justify-center text-white text-xs font-medium">
                        +2k
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <span className="text-primary">★★★★★</span>
                      <span>4.9/5 from 2,000+ reviews</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* App Store Buttons */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <a
                  href="#"
                  className="inline-flex items-center p-1 border border-transparent rounded-xl shadow-md text-white bg-black hover:bg-gray-800 transition-colors"
                >
                  <img src="/apple-store-badge.svg" alt="Download on the App Store" className="h-10" />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center p-1 border border-transparent rounded-xl shadow-md text-white bg-black hover:bg-gray-800 transition-colors"
                >
                  <img src="/google-play-badge.png" alt="Get it on Google Play" className="h-10" />
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
