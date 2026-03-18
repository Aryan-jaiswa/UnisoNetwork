import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';

export default function MyGroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const cardGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch('/api/groups/my', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(res => res.json())
      .then(data => setGroups(data))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Framer Motion handles animations declaratively

  return (
    <MainLayout>
      <div className="relative min-h-[90vh] flex flex-col items-center justify-center bg-gradient-to-br from-[#f8f9ff] via-[#e0e7ff] to-[#f0f4ff] py-16 px-2 overflow-hidden">
        {/* Animated gradient background shapes */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-purple-300 via-blue-200 to-transparent rounded-full filter blur-3xl opacity-40 animate-pulse-slow z-0" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-blue-200 via-purple-200 to-transparent rounded-full filter blur-2xl opacity-30 animate-pulse-slow z-0" />
        <div className="relative z-10 w-full max-w-3xl">
          <motion.h1
            className="text-4xl font-extrabold mb-10 flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 drop-shadow-lg justify-center"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          >
            <Users className="h-8 w-8 text-primary" /> My Groups
          </motion.h1>
          {loading ? (
            <div className="text-center py-16 text-lg animate-pulse">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-16 text-gray-500 animate-fade-in-up">You are not a member of any groups yet.</div>
          ) : (
            <motion.div
              ref={cardGridRef}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.12
                  }
                }
              }}
            >
              <AnimatePresence>
                {groups.map(group => (
                  <motion.div
                    key={group.id}
                    className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 transition-transform hover:scale-[1.025] hover:shadow-2xl cursor-pointer"
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-3xl drop-shadow-sm">{group.emoji || '🫂'}</span>
                      <span className="font-bold text-xl text-gray-900">{group.name}</span>
                    </div>
                    <div className="text-gray-600 mb-3 text-base">{group.description}</div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(group.interests || []).map((interest: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{interest}</span>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" disabled>View</Button>
                      <Button variant="destructive" size="sm" disabled>Leave</Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
  );
// Animations
// Add fade-in-up animation
// Add slow pulse for background shapes
// You can add these to your global CSS (e.g., index.css or tailwind config)
//
// .animate-fade-in-up {
//   animation: fadeInUp 0.8s cubic-bezier(0.23, 1, 0.32, 1);
// }
// @keyframes fadeInUp {
//   from { opacity: 0; transform: translateY(40px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-pulse-slow {
//   animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
// }
}
