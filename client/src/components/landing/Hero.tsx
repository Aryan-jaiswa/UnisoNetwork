"use client";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";


export default function Hero() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      fetch(`/api/users/${payload.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setUser(data));
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <section className="relative pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden bg-gradient-to-br from-[#A066F5] via-[#649DF5] to-[#35D6F5] text-white">
      <div className="absolute top-20 right-0 w-72 h-72 bg-white/10 rounded-full filter blur-3xl mix-blend-soft-light pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-white/10 rounded-full filter blur-3xl mix-blend-soft-light pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-7 lg:text-left">
            <div className="inline-flex items-center px-4 py-2 rounded-full backdrop-blur-md bg-white/20 text-white border border-white/30 shadow-sm mb-6">
              <Sparkles className="h-4 w-4 mr-2 text-yellow-300 animate-pulse" />
              <span className="text-sm font-medium">Where college life happens</span>
            </div>

            <h1 className="text-5xl tracking-tight font-bold text-white sm:text-6xl md:text-7xl lg:text-6xl xl:text-7xl font-poppins">
              <span className="block mb-2">One Stop</span>
              <span className="block mb-2">All things College.</span>
            </h1>

            <p className="mt-6 text-xl text-white/80 sm:mt-5 sm:text-xl md:mt-5 md:text-2xl font-light">
              {user ? (
                <span>
                  Welcome back, <span className="font-bold text-white">{user.name}</span>!<br />
                  Explore new opportunities and connect with your campus community.
                </span>
              ) : (
                <>Join Communities, explore Opportunities, and Stay Connected with your Campus.</>
              )}
            </p>

            {!user && (
              <div className="mt-10 flex flex-wrap gap-4 sm:justify-center lg:justify-start">
                <Link href="/signup">
                  <Button variant="outline" className="bg-white text-purple-600 hover:bg-black transition-colors">
                    Get Started
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="bg-white text-purple-600 hover:bg-black transition-colors">
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="mt-16 sm:mt-24 lg:mt-0 lg:col-span-5 relative animate-float">
            <div className="relative mx-auto w-full max-w-md transition-transform duration-500 hover:scale-[1.02]">
              <div className="rounded-3xl overflow-hidden shadow-xl rotate-0 hover:rotate-1 transition-all duration-300">
                <img
                  className="w-full object-cover"
                  src="/images/front.png"
                  alt="Students collaborating on campus"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/5 mix-blend-overlay pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
