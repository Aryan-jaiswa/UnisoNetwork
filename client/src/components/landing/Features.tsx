import {
  Users, MessageSquare, BookOpen,
  CalendarDays, Briefcase, RotateCcw
} from "lucide-react";
import { Link } from "wouter";

export default function Features() {
  const features = [
    {
      icon: <Users className="h-7 w-7 text-white" />,
      emoji: "👥",
      title: "Community Groups",
      description: "Find your people! Join groups that match your vibe, from anime fans to future entrepreneurs.",
      gradientClass: "from-purple-500 to-indigo-500",
      action: "Find your tribe →",
      link: "/groups"
    },
    {
      icon: <CalendarDays className="h-7 w-7 text-white" />,
      emoji: "🎉",
      title: "Campus Events",
      description: "Never miss the fun! Parties, club meetups, workshops, and every cool happening on campus.",
      gradientClass: "from-pink-500 to-rose-500",
      action: "See what's poppin' →",
      link: "/events"
    },
    {
      icon: <MessageSquare className="h-7 w-7 text-white" />,
      emoji: "💬",
      title: "Real Talk Forums",
      description: "Ask anything, talk about everything. No filter conversations about classes, profs, and campus life.",
      gradientClass: "from-yellow-500 to-orange-500",
      action: "Get the tea →",
      link: "/forums"
    },
    {
      icon: <Briefcase className="h-7 w-7 text-white" />,
      emoji: "💼",
      title: "Internship & Job Board",
      description: "Snag that dream internship or side hustle. Exclusive opportunities just for students like you.",
      gradientClass: "from-blue-500 to-sky-500",
      action: "Level up your resume →",
      link: "/internships"
    },
    {
      icon: <BookOpen className="h-7 w-7 text-white" />,
      emoji: "📚",
      title: "Resource Swaps",
      description: "Clutch notes, study guides, and materials shared by fellow students who actually aced the class.",
      gradientClass: "from-green-500 to-emerald-500",
      action: "Study smarter →",
      link: "/resources"
    }
  ];

  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden">
      {/* Decorative Background Elements */}
      {/* <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-br from-primary to-secondary transform -skew-y-3"></div> */}
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full opacity-20 -z-10 blur-2xl"></div>
      <div className="absolute top-1/3 left-0 w-56 h-56 bg-teal-200 rounded-full opacity-20 -z-10 blur-xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-primary/10 px-3 py-1 rounded-full mb-4">
            <RotateCcw className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">The whole campus in one app</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 font-poppins">
            Everything you need to thrive at College
          </h2>

          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            UNiSO has all the tools that make campus life easier, more connected, and way more fun.
          </p>
        </div>

        {/* Custom Grid Layout */}
        <div className="grid grid-cols-3 gap-10 justify-items-center mb-10">
          {features.slice(0, 3).map((feature, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 shadow-xl bg-gradient-to-br ${feature.gradientClass} text-white group transform transition duration-300 hover:-translate-y-2 hover:shadow-2xl w-full max-w-sm`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  {feature.icon}
                </div>
                <span className="text-3xl animate-bounce-slow">{feature.emoji}</span>
              </div>

              <h3 className="text-xl font-bold mb-2 font-poppins">{feature.title}</h3>
              <p className="text-white/80 mb-6">{feature.description}</p>

              <Link
                href={feature.link}
                className="inline-flex items-center text-sm font-medium bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded-full mt-auto"
              >
                {feature.action}
              </Link>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-10 justify-center max-w-3xl mx-auto">
          {features.slice(3).map((feature, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 shadow-xl bg-gradient-to-br ${feature.gradientClass} text-white group transform transition duration-300 hover:-translate-y-2 hover:shadow-2xl w-full max-w-sm`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  {feature.icon}
                </div>
                <span className="text-3xl animate-bounce-slow">{feature.emoji}</span>
              </div>

              <h3 className="text-xl font-bold mb-2 font-poppins">{feature.title}</h3>
              <p className="text-white/80 mb-6">{feature.description}</p>

              <Link
                href={feature.link}
                className="inline-flex items-center text-sm font-medium bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded-full mt-auto"
              >
                {feature.action}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
