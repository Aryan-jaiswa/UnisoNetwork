import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/AuthContext';

const INTERESTS = ["Academic", "Art", "Business", "Coding", "Creative", "Design", "Entertainment", "Fitness", "Health", "Innovation", "Movies", "Music", "Nature", "Plants", "Study", "Tech"];

export default function CreateGroupPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState<{
    name: string;
    description: string;
    interests: string[];
    emoji: string;
  }>({
    name: '',
    description: '',
    interests: [],
    emoji: '🫂',
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Login required');
    setCreating(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create group');
      toast.success('Group created!');
      navigate('/groups');
    } catch {
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-[#f8f9ff] via-[#e0e7ff] to-[#f0f4ff] py-16 px-2">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 animate-fade-in-up" style={{boxShadow: '0 8px 32px 0 rgba(80, 80, 200, 0.10)'}}>
          <h1 className="text-4xl font-extrabold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 drop-shadow-lg">Create New Group</h1>
          <form onSubmit={handleSubmit} className="space-y-7">
            <input
              className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-lg bg-gray-50 placeholder-gray-400"
              placeholder="Group Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
            <textarea
              className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-lg min-h-[90px] bg-gray-50 placeholder-gray-400"
              placeholder="Description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
            <input
              className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-lg bg-gray-50 placeholder-gray-400"
              placeholder="Emoji (e.g. 🫂)"
              value={form.emoji}
              onChange={e => setForm({ ...form, emoji: e.target.value })}
              maxLength={2}
            />
            <div>
              <div className="mb-2 text-base font-semibold text-gray-700">Select Interests</div>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => (
                  <Badge
                    key={interest}
                    onClick={() => setForm({
                      ...form,
                      interests: form.interests.includes(interest)
                        ? form.interests.filter((i: string) => i !== interest)
                        : [...form.interests, interest],
                    })}
                    className={`cursor-pointer px-4 py-2 rounded-full border text-base font-medium transition-colors shadow-sm ${form.interests.includes(interest) ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-primary/10'}`}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={creating} className="w-full py-3 text-lg rounded-full bg-gradient-to-r from-primary to-blue-500 hover:from-blue-500 hover:to-primary transition-all shadow-md">
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
