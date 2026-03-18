import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import Cta from "@/components/landing/Cta";
import AppPreview from "@/components/landing/AppPreview";
import MainLayout from "@/components/layout/MainLayout";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function LandingPage() {
  useEffect(() => {
    document.title = "UNiSO - Your Campus. Your People. Your Space.";
  }, []);

  return (
    <MainLayout>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <Hero />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
        <Features />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
        <Testimonials />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
        <Cta />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}>
        <AppPreview />
      </motion.div>
    </MainLayout>
  );
}
