import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '../hooks/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Plus, Heart } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'react-hot-toast';

interface CommunityGroup {
  id: number;
  name: string;
  tagline: string;
  interests: string[];
  memberCount: number;
  emoji: string;
  gradientClass: string;
}

// No mock data, all from backend
// Group creation form initial state
const GROUP_FORM_INITIAL = {
  name: '',
  description: '',
  interests: [],
  emoji: '🫂',
};

// Available interests for filtering
const INTERESTS = ["All", "Academic", "Art", "Business", "Coding", "Creative", "Design", "Entertainment", "Fitness", "Health", "Innovation", "Movies", "Music", "Nature", "Plants", "Study", "Tech"];

export default function GroupsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [myGroups, setMyGroups] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupForm, setGroupForm] = useState<any>(GROUP_FORM_INITIAL);

  useEffect(() => {
    document.title = "UNiSO - Community Groups";
    fetchGroups();
    fetchMyGroups();
    fetchFavorites();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/groups');
      const data = await response.json();
      const formattedGroups = data.map((group: any) => ({
        id: group.id || group.$id,
        name: group.name,
        tagline: group.description || '',
        interests: group.interests || [],
        memberCount: group.memberCount || 0,
        emoji: group.emoji || '🫂',
        gradientClass: 'bg-gradient-card-1',
      }));
      setGroups(formattedGroups);
    } catch (error) {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/groups/my', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setMyGroups(data.map((g: any) => g.id));
    } catch {}
  };

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/groups/favorites', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setFavorites(data.map((g: any) => g.id));
    } catch {}
  };

  const toggleInterest = (interest: string) => {
    if (interest === "All") {
      setSelectedInterests([]);
      return;
    }

    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleFavorite = async (id: number) => {
    if (!user) return toast.error('Login to favorite groups');
    const isFav = favorites.includes(id);
    setFavorites(prev => isFav ? prev.filter(favId => favId !== id) : [...prev, id]);
    try {
      await fetch(`/api/groups/${id}/favorite`, {
        method: isFav ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleJoinGroup = async (groupId: number) => {
    if (!user) return toast.error('Login to join groups');
    try {
      await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMyGroups(prev => [...prev, groupId]);
      toast.success('Joined group!');
    } catch {
      toast.error('Failed to join group');
    }
  };

  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const filteredGroups = useMemo(() => {
    return groups.filter(group => {
      const matchesSearch = searchQuery === '' ||
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.tagline.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesInterests = selectedInterests.length === 0 ||
        selectedInterests.some(interest => group.interests.includes(interest));
      const matchesMine = !showOnlyMine || myGroups.includes(group.id);
      return matchesSearch && matchesInterests && matchesMine;
    });
  }, [searchQuery, selectedInterests, showOnlyMine, myGroups, groups]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedInterests([]);
  };

  return (
    <MainLayout>
      {/* Create Group Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogTrigger asChild>
          <Button
            className="mt-6 md:mt-0 bg-white text-primary hover:bg-white/90 rounded-full flex items-center gap-2 shadow-lg"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4" />
            Create New Group
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCreating(true);
              try {
                const res = await fetch('/api/groups', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                  body: JSON.stringify(groupForm),
                });
                if (!res.ok) throw new Error('Failed to create group');
                setGroupForm(GROUP_FORM_INITIAL);
                setShowCreateModal(false);
                fetchGroups();
                toast.success('Group created!');
              } catch {
                toast.error('Failed to create group');
              } finally {
                setCreating(false);
              }
            }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold">Create New Group</h2>
            <input
              className="w-full border rounded p-2"
              placeholder="Group Name"
              value={groupForm.name}
              onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
              required
            />
            <textarea
              className="w-full border rounded p-2"
              placeholder="Description"
              value={groupForm.description}
              onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
            />
            <input
              className="w-full border rounded p-2"
              placeholder="Emoji (e.g. 🫂)"
              value={groupForm.emoji}
              onChange={e => setGroupForm({ ...groupForm, emoji: e.target.value })}
              maxLength={2}
            />
            <div className="flex flex-wrap gap-2">
              {INTERESTS.filter(i => i !== 'All').map(interest => (
                <Badge
                  key={interest}
                  onClick={() => setGroupForm({
                    ...groupForm,
                    interests: groupForm.interests.includes(interest)
                      ? groupForm.interests.filter((i: string) => i !== interest)
                      : [...groupForm.interests, interest],
                  })}
                  className={`cursor-pointer ${groupForm.interests.includes(interest) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {interest}
                </Badge>
              ))}
            </div>
            <Button type="submit" disabled={creating} className="w-full">
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* Header with gradient background */}
      <div className="bg-gradient-hero text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-secondary/20 rounded-full filter blur-3xl mix-blend-multiply"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full filter blur-3xl mix-blend-multiply"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-poppins">
                🫂 Your Vibe. Your Tribe.
              </h1>
            </div>

            <Link href="/create-group">
              <Button
                className="mt-6 md:mt-0 bg-white text-primary hover:bg-white/90 rounded-full flex items-center gap-2 shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Create New Group
              </Button>
            </Link>
          </div>

          <p className="mt-3 text-xl text-white/80">
            Find your people on campus and build your community
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl shadow-md p-4 -mt-6 relative z-20">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search groups by name or description..."
                  className="pl-10 border-gray-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto py-2">
              <Badge
                onClick={() => setSelectedInterests([])}
                className={`cursor-pointer hover:bg-primary hover:text-white transition-colors ${selectedInterests.length === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                  }`}
              >
                All
              </Badge>
              {INTERESTS.filter(i => i !== "All").map(interest => (
                <Badge
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`cursor-pointer hover:bg-primary hover:text-white transition-colors ${selectedInterests.includes(interest) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading groups...</p>
          </div>
        )}

        {/* Group listings */}
        {!loading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'} found
              </h2>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className={`text-gray-600 ${showOnlyMine ? 'bg-primary/10 border-primary' : ''}`}
                  onClick={() => setShowOnlyMine(v => !v)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  My Groups (Filter)
                </Button>
                <Link href="/my-groups">
                  <Button variant="secondary" className="text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    My Groups Page
                  </Button>
                </Link>
              </div>
            </div>

            {filteredGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map(group => (
                  <div
                    key={group.id}
                    className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                  >
                    {/* Group header with gradient */}
                    <div className={`${group.gradientClass} h-24 p-6 flex justify-between items-start relative`}>
                      <div className="bg-white/20 backdrop-blur-sm h-12 w-12 rounded-full flex items-center justify-center text-2xl">
                        {group.emoji}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full h-9 w-9 ${favorites.includes(group.id) ? 'text-red-500' : 'text-white'
                          }`}
                        onClick={() => toggleFavorite(group.id)}
                        aria-label={favorites.includes(group.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart className={`h-5 w-5 ${favorites.includes(group.id) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900">{group.name}</h3>
                      <p className="text-gray-600">{group.tagline}</p>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {group.interests.map((interest, index) => (
                          <Badge
                            key={`${group.id}-${interest}-${index}`}
                            variant="outline"
                            className="bg-gray-50"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-6 flex justify-between items-center">
                        <div className="flex items-center text-gray-600">
                          <Users className="h-4 w-4 mr-2 text-primary" />
                          <span>{group.memberCount} members</span>
                        </div>

                        <Button
                          variant="default"
                          className="rounded-full"
                          onClick={() => handleJoinGroup(group.id)}
                        >
                          Join Group
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty state
              <div className="text-center py-16 bg-gray-50 rounded-2xl">
                <div className="text-4xl mb-4 animate-bounce">🔍</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No groups found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Try adjusting your search or filters. Can't find what you're looking for? Create your own group!
                </p>
                <Button
                  variant="default"
                  className="mt-6"
                  onClick={resetFilters}
                  disabled={searchQuery === '' && selectedInterests.length === 0}
                >
                  Reset all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}