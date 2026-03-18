"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Zap,
  Heart,
  ArrowRight,
} from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import { motion } from "framer-motion";

type LinkItem = { name: string; href: string };
type SocialItem = { name: string; icon: React.ReactNode; href: string; hoverColor: string };

type FooterProps = {
  quickLinks?: LinkItem[];
  aboutLinks?: LinkItem[];
  legalLinks?: LinkItem[];
  socialLinks?: SocialItem[];
  showNewsletter?: boolean;
  showAppDownload?: boolean;
  brandName?: string;
  brandSlogan?: string;
};

export default function Footer({
  quickLinks = [],
  aboutLinks = [],
  legalLinks = [],
  socialLinks = [],
  showNewsletter = true,
  showAppDownload = true,
  brandName = "UNiSO",
  brandSlogan = "Your campus. Your people. Your space. The ultimate social hub for college life.",
}: FooterProps) {
  // Define the linkSections as a tuple array using the props
  const linkSections: [string, LinkItem[]][] = [
    ["Explore", quickLinks],
    ["About", aboutLinks],
    ["Legal", legalLinks],
  ];

  return (
    <motion.footer
      id="contact"
      className="bg-gradient-hero text-white pt-16 pb-8 relative overflow-hidden"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-secondary/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full filter blur-3xl" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
        {showNewsletter && (
          <div className="mb-16 bg-white/10 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/20 shadow-lg">
            <div className="md:flex md:items-center md:justify-between">
              <div className="max-w-2xl mb-8 md:mb-0 md:mr-8">
                <h3 className="text-2xl font-bold text-white mb-2 font-poppins">
                  Get exclusive invites & opportunities
                </h3>
                <p className="text-white/80">
                  Be the first to know about exclusive events, new features,
                  and opportunities curated for your campus. No spam, just the
                  good stuff!
                </p>
              </div>
              <div className="w-full md:w-auto flex-grow max-w-md">
                <form className="flex flex-col sm:flex-row">
                  <div className="relative flex-grow">
                    <Input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      className="w-full bg-white/20 placeholder-white/60 text-white border-0 focus:ring-2 focus:ring-white rounded-full py-6 px-5"
                      placeholder="Your .edu email"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="mt-3 sm:mt-0 sm:ml-3 bg-white text-primary hover:bg-white/90 rounded-full font-medium py-6 px-6"
                  >
                    <span>Sign me up</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-12 gap-8">
          <div className="col-span-2 md:col-span-4">
            <div className="flex items-center mb-5">
              <Zap className="h-7 w-7 text-white mr-2" />
              <span className="text-2xl font-bold text-white font-poppins">
                {brandName}
              </span>
            </div>
            <p className="text-white/70 text-base mb-8">{brandSlogan}</p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className={`flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:text-white transition-all duration-300 ${social.hoverColor}`}
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Render the link sections from the tuple array */}
          {linkSections.map(([title, links], idx) => (
            <div key={idx} className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-bold mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {showAppDownload && (
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-bold mb-4">Get The App</h3>
              <div className="flex flex-col space-y-3">
                <a
                  href="#"
                  className="bg-black inline-flex items-center px-3 py-2 rounded-xl hover:bg-gray-900 transition-colors"
                >
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="white">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.52 1.49-1.14 2.95-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.66 4.22-3.74 4.25z" />
                  </svg>
                  <div className="ml-2">
                    <div className="text-xs text-white/70">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </a>
                <a
                  href="#"
                  className="bg-black inline-flex items-center px-3 py-2 rounded-xl hover:bg-gray-900 transition-colors"
                >
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="white">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 5.26l2.3 4.208-2.29 4.18 3.21 3.171 6.32-7.35-6.31-7.37-3.23 3.161z" />
                  </svg>
                  <div className="ml-2">
                    <div className="text-xs text-white/70">GET IT ON</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-16 pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-white/60 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <p className="text-sm text-white/60 flex items-center">
            Made with <Heart className="h-3 w-3 mx-1 text-red-400" /> by
            students, for students
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
