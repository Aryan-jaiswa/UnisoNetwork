"use client";

import { useState, useEffect } from "react";
import {
  Menu,
  X,
  Zap,
  Users,
  Calendar,
  MessageSquare,
  Briefcase,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from '../../hooks/AuthContext';
import { useRef } from 'react';
import { Link, useLocation } from "wouter";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const isHomePage = location === "/";

  const navLinks = [
    {
      name: "Community",
      path: "/groups",
      icon: <Users className="h-4 w-4 md:mr-1.5 text-black" />,
      mobileIcon: <Users className="h-5 w-5 mr-3 text-black" />,
      activeColor: "text-primary",
      hoverBg: "hover:bg-white",
    },
    {
      name: "Events",
      path: "/events",
      icon: <Calendar className="h-4 w-4 md:mr-1.5 text-black" />,
      mobileIcon: <Calendar className="h-5 w-5 mr-3 text-black" />,
      activeColor: "text-primary",
      hoverBg: "hover:bg-white",
    },
    {
      name: "Real Talks",
      path: "/forums",
      icon: <MessageSquare className="h-4 w-4 md:mr-1.5 text-black" />,
      mobileIcon: <MessageSquare className="h-5 w-5 mr-3 text-black" />,
      activeColor: "text-primary",
      hoverBg: "hover:bg-white",
    },
    {
      name: "Jobs",
      path: "/internships",
      icon: <Briefcase className="h-4 w-4 md:mr-1.5 text-black" />,
      mobileIcon: <Briefcase className="h-5 w-5 mr-3 text-black" />,
      activeColor: "text-primary",
      hoverBg: "hover:bg-white",
    },
    {
      name: "Resources",
      path: "/resources",
      icon: <BookOpen className="h-4 w-4 md:mr-1.5 text-black" />,
      mobileIcon: <BookOpen className="h-5 w-5 mr-3 text-black" />,
      activeColor: "text-primary",
      hoverBg: "hover:bg-white",
    },
  ];

  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <nav
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${isScrolled || !isHomePage
          ? "bg-white/10 backdrop-blur-xl shadow-lg border-b border-white/10"
          : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span
              className={`text-2xl font-bold font-poppins ${isHomePage
                  ? "text-black"
                  : "text-black"
                }`}
            >
              UNiSO
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                {/* Navigation Links - Only show when logged in */}
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${location === link.path
                        ? `${link.activeColor} bg-white/10`
                        : `text-black hover:${link.activeColor}`
                      } ${link.hoverBg}`}
                  >
                    {link.icon}
                    <span className="hidden sm:inline ml-1">{link.name}</span>
                  </Link>
                ))}
                
                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors text-black hover:text-primary hover:bg-white focus:outline-none"
                    onClick={() => setDropdownOpen((open) => !open)}
                  >
                    <img
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6C63FF&color=fff&size=64`}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border-2 border-blue-100 shadow"
                    />
                    <span className="hidden sm:inline ml-1 font-semibold">{user.name}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50 border">
                      <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">My Profile</Link>
                      <button
                        className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50"
                        onClick={logout}
                      >Logout</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Only show Login and Sign Up when not logged in */}
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full bg-white text-primary font-semibold hover:bg-white/90 px-6 transition-all duration-300 shadow-md"
                  asChild
                >
                  <Link href="/login">Login</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full font-semibold px-6 transition-all duration-300 shadow-md ml-2"
                  asChild
                >
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Nav Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-full text-white hover:text-primary hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="pt-4 pb-6 bg-white/10 backdrop-blur-xl rounded-b-2xl shadow-lg border-t border-white/10">
            <div className="px-4 mt-4">
              {user ? (
                <>
                  {/* Navigation Links - Mobile */}
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      href={link.path}
                      onClick={handleLinkClick}
                      className={`flex items-center px-5 py-3 rounded-lg mx-3 text-base font-medium transition-colors ${location === link.path ? link.activeColor : "text-black"
                        } ${link.hoverBg} mb-2`}
                    >
                      {link.mobileIcon}
                      {link.name}
                    </Link>
                  ))}
                  
                  {/* User Profile - Mobile */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      className="flex items-center gap-2 w-full px-4 py-2 rounded-full text-base font-medium transition-colors text-black hover:text-primary hover:bg-white focus:outline-none"
                      onClick={() => setDropdownOpen((open) => !open)}
                    >
                      <img
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6C63FF&color=fff&size=64`}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full border-2 border-blue-100 shadow"
                      />
                      <span className="ml-2 font-semibold">{user.name}</span>
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50 border">
                        <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">My Profile</Link>
                        <button
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50"
                          onClick={logout}
                        >Logout</button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Only show Login and Sign Up when not logged in - Mobile */}
                  <Button className="w-full rounded-full py-6 bg-white text-primary font-medium shadow-md hover:bg-white/90 mb-2" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button className="w-full rounded-full py-6 font-medium shadow-md mb-2" variant="outline" asChild>
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
