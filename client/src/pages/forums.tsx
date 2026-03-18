import React, { useCallback, useEffect, useRef, useState, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MessageSquare,
  Heart,
  PenLine,
  Upload,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";

type Thread = {
  id: number;
  title: string;
  content: string;
  image?: string | null;
  images?: Array<{ id: string; src: string; caption?: string }>;
  category?: string;
  tags?: string[] | string;
  author?: string;
  authorAvatar?: string;
  date?: string;
  replies?: number;
  likes?: number;
  isHot?: boolean;
  draft?: boolean;
};

const CATEGORIES = ["All", "College Hacks", "Mental Health", "Confessions"];

export default function ForumsPage(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [likedThreads, setLikedThreads] = useState<{ [id: number]: boolean }>({});
  const [showNewThread, setShowNewThread] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New thread form state
  const [newThread, setNewThread] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
    trending: false,
    draft: false,
  });

  // multi-image state
  const [images, setImages] = useState<Array<{ id: string; src: string; caption?: string }>>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const dragThumbId = useRef<string | null>(null);

  useEffect(() => {
    document.title = "UNiSO - Real Talk Forums";
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/forums');
      if (!res.ok) throw new Error('Failed to fetch threads');
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch threads');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  // ----- Helpers -----
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const dataUrlFromFile = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") res(reader.result);
        else rej("no result");
      };
      reader.onerror = (e) => rej(e);
      reader.readAsDataURL(file);
    });

  // handle file(s) selected (multiple)
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const loaded = await Promise.all(
      arr.map(async (f) => ({ id: makeId(), src: await dataUrlFromFile(f), caption: "" }))
    );
    setImages((prev) => [...prev, ...loaded]);
    setCarouselIndex((prev) => (prev === 0 && loaded.length ? prev : prev));
  }, []);

  // handle paste of URLs (comma separated or newline)
  const handlePasteUrls = async (raw: string) => {
    if (!raw) return;
    const candidates = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const mapped = candidates.map((url) => ({ id: makeId(), src: url, caption: "" }));
    setImages((prev) => [...prev, ...mapped]);
  };

  // drop handler for files
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length) handleFiles(files);
  };

  // delete an image
  const deleteImage = (id: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      const newIndex = Math.max(0, Math.min(carouselIndex, next.length - 1));
      setCarouselIndex(newIndex);
      return next;
    });
  };

  // reorder thumbnails via HTML5 drag-and-drop
  const onThumbDragStart = (e: React.DragEvent, id: string) => {
    dragThumbId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const onThumbDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const fromId = dragThumbId.current;
    const toId = id;
    if (!fromId || fromId === toId) return;
    setImages((prev) => {
      const arr = [...prev];
      const fromIndex = arr.findIndex((x) => x.id === fromId);
      const toIndex = arr.findIndex((x) => x.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
      return arr;
    });
  };

  // carousel keyboard and arrow controls
  const prevImage = () => setCarouselIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const nextImage = () => setCarouselIndex((i) => (i < images.length - 1 ? i + 1 : 0));

  // when posting
  const handlePost = async (isDraft = false) => {
    if (!newThread.title.trim() && !newThread.content.trim()) {
      alert("Please add a title or some content.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/forums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: newThread.title,
          content: newThread.content,
          images: images.map((img) => ({ ...img })),
          category: newThread.category,
          tags: newThread.tags ? newThread.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          trending: newThread.trending,
          draft: isDraft,
        }),
      });
      if (!res.ok) throw new Error('Failed to post thread');
      await fetchThreads();
      setShowNewThread(false);
      setNewThread({ title: "", content: "", category: "", tags: "", trending: false, draft: false });
      setImages([]);
      setCarouselIndex(0);
    } catch (err: any) {
      alert(err.message || 'Failed to post thread');
    } finally {
      setCreating(false);
    }
  };

  // safeThreads and filteredThreads
  const safeThreads = threads.map((t) => ({
    ...t,
    tags: Array.isArray(t.tags) ? t.tags : typeof t.tags === "string" ? t.tags.split(",") : [],
  }));

  const filteredThreads = safeThreads.filter((thread) => {
    const matchesSearch =
      !searchQuery ||
      thread.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || thread.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  // touch swipe handling for carousel (mobile)
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 60) {
      if (delta < 0) nextImage();
      else prevImage();
    }
    touchStartX.current = null;
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-gradient-hero text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-secondary/20 rounded-full filter blur-3xl mix-blend-multiply" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full filter blur-3xl mix-blend-multiply" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-poppins">
                💬 Real Talk: Ask. Vent. Vibe.
              </h1>
              <Badge className="bg-white/10 text-white border-0">UNiSO</Badge>
            </div>
            <Button
              className="mt-6 md:mt-0 bg-white text-primary hover:bg-white/90 rounded-full flex items-center gap-2 shadow-lg"
              onClick={() => setShowNewThread(true)}
            >
              <PenLine className="h-4 w-4" />
              New Thread
            </Button>
          </div>
          <p className="mt-3 text-xl text-white/80">
            Unfiltered conversations about classes, college life, and everything in between
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-md p-4 -mt-6 relative z-20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search threads..."
              className="pl-10 border-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabs + Thread list */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Tabs defaultValue="All" onValueChange={(v) => setActiveCategory(v)}>
          <TabsList className="bg-white p-1 shadow-sm mb-6">
            {CATEGORIES.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((category) => (
            <TabsContent key={category} value={category} className="mt-0">
              {loading ? (
                <div className="text-center py-16 text-lg animate-pulse">Loading...</div>
              ) : error ? (
                <div className="text-center py-16 text-red-500">{error}</div>
              ) : filteredThreads.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {filteredThreads.map((thread, idx) => (
                      <motion.div
                        key={thread.id}
                        initial={{ opacity: 0, y: 40, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.96 }}
                        transition={{ delay: idx * 0.03, type: "spring", stiffness: 120 }}
                        className="relative bg-white/60 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-primary/10 max-w-3xl mx-auto mb-10 hover:scale-[1.01] hover:shadow-[0_10px_40px_rgba(80,63,205,0.14)] transition-all duration-300 group"
                      >
                        {/* Carousel top if images exist */}
                        {thread.images && thread.images.length > 0 && (
                          <div className="relative">
                            <div className="w-full h-72 overflow-hidden bg-gray-100">
                              <div className="flex w-full h-full">
                                <img
                                  src={thread.images[0].src}
                                  alt={thread.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="relative p-5 pb-2 z-10">
                          <div className="flex items-center gap-3 mb-2">
                            <img
                              src={thread.authorAvatar}
                              alt={thread.author}
                              className="h-11 w-11 rounded-full object-cover border-2 border-primary shadow-md"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900 font-poppins">{thread.author}</span>
                              <span className="ml-2 text-xs text-gray-500">{formatRelativeTime(thread.date)}</span>
                            </div>
                            {thread.isHot && <Badge className="bg-red-500/10 text-red-500 border-0 px-2 py-1 text-xs">🔥 HOT</Badge>}
                          </div>

                          <div className="mb-2">
                            <span className="block font-semibold text-gray-900 text-lg mb-1">{thread.title}</span>
                            <span className="block text-gray-700 whitespace-pre-line">{thread.content}</span>
                          </div>

                          {thread.tags && Array.isArray(thread.tags) && thread.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {thread.tags.map((tag) => (
                                <Badge key={tag as string} variant="outline" className="bg-gray-50 text-xs px-2 py-1 border-primary/10">#{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="relative flex items-center justify-between px-5 py-3 border-t border-primary/10 bg-white/40 backdrop-blur-lg z-10">
                          <div className="flex items-center gap-4">
                            <motion.button
                              whileTap={{ scale: 1.2 }}
                              className={`flex items-center gap-1 text-gray-600 ${likedThreads[thread.id] ? "text-pink-500" : "hover:text-pink-500"}`}
                              onClick={() => setLikedThreads((l) => ({ ...l, [thread.id]: !l[thread.id] }))}
                            >
                              <Heart className={`h-6 w-6 ${likedThreads[thread.id] ? "fill-pink-500" : "fill-none"}`} />
                              <span className="text-sm font-semibold">{(typeof thread.likes === 'number' ? thread.likes : 0) + (likedThreads[thread.id] ? 1 : 0)}</span>
                            </motion.button>

                            <button className="flex items-center gap-1 text-gray-600 hover:text-primary">
                              <MessageSquare className="h-5 w-5" />
                              <span className="text-sm font-semibold">{thread.replies}</span>
                            </button>
                          </div>

                          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 px-3 py-1 rounded-full font-semibold">
                            Reply
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-2xl">
                  <div className="text-4xl mb-4 animate-bounce">💭</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">No threads found</h3>
                  <p className="text-gray-600 max-w-md mx-auto">Be the first to start a conversation about this topic!</p>
                  <Button variant="default" className="mt-6" onClick={() => setShowNewThread(true)}>
                    <PenLine className="h-4 w-4 mr-2" /> Create Thread
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* New Thread Modal (Instagram-style with multi-image carousel) */}
      <AnimatePresence>
        {showNewThread && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="bg-white/70 backdrop-blur-3xl rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-white/10"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/20 bg-gradient-to-r from-primary/10 to-accent/10">
                <button
                  className="text-sm font-semibold text-gray-600 hover:text-primary flex items-center gap-2"
                  onClick={() => {
                    setShowNewThread(false);
                  }}
                >
                  <X className="h-4 w-4" /> Cancel
                </button>

                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-primary">Create Post</h3>
                  <span className="text-xs text-gray-500">Preview & share beautiful posts</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => { setNewThread((s) => ({ ...s, draft: true })); handlePost(true); }}>
                    Save Draft
                  </Button>
                  <Button onClick={() => handlePost(false)} disabled={creating}>
                    {creating ? "Posting..." : "Share"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row">
                {/* LEFT: Carousel (50%) */}
                <div
                  className="md:w-1/2 bg-gray-50 flex flex-col items-center justify-center p-4 relative"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {/* carousel area */}
                  <div
                    className="w-full h-96 bg-gray-200 rounded-xl overflow-hidden relative"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    ref={carouselRef}
                  >
                    {/* Controls */}
                    {images.length > 0 ? (
                      <>
                        <motion.div
                          key={images[carouselIndex]?.id ?? "empty"}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ type: "spring", stiffness: 260, damping: 30 }}
                          className="w-full h-full"
                        >
                          <img src={images[carouselIndex].src} alt={`img-${carouselIndex}`} className="w-full h-full object-cover" />
                          {/* caption overlay */}
                          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
                            <input
                              aria-label="Image caption"
                              value={images[carouselIndex].caption ?? ""}
                              onChange={(e) =>
                                setImages((prev) => prev.map((im, idx) => (idx === carouselIndex ? { ...im, caption: e.target.value } : im)))
                              }
                              className="bg-black/40 text-white placeholder-white/70 rounded-md px-3 py-2 backdrop-blur-sm w-4/5"
                              placeholder="Write a caption..."
                            />
                            <button
                              className="bg-white/80 p-2 rounded-full shadow-md hover:bg-white"
                              onClick={() => deleteImage(images[carouselIndex].id)}
                              aria-label="Delete image"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </motion.div>

                        {/* left/right arrows */}
                        <button
                          onClick={prevImage}
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/70 p-2 rounded-full shadow-sm hover:bg-white z-20"
                          aria-label="Previous"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/70 p-2 rounded-full shadow-sm hover:bg-white z-20"
                          aria-label="Next"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>

                        {/* image position indicator */}
                        <div className="absolute top-3 left-3 bg-white/60 rounded-full px-3 py-1 text-xs">{`${carouselIndex + 1}/${images.length}`}</div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                        <Upload className="h-12 w-12" />
                        <div className="text-sm">Drag & drop images here</div>
                        <div className="text-xs text-gray-500">or click below to upload / paste URLs</div>
                      </div>
                    )}
                  </div>

                  {/* upload controls */}
                  <div className="mt-4 w-full flex flex-col items-center gap-3">
                    <div className="flex gap-2 w-full">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                      />
                      <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                        Upload Images
                      </Button>

                      <Button
                        variant="ghost"
                        className="px-3"
                        onClick={() => {
                          const example = prompt("Paste one or more image URLs (comma/newline separated)");
                          if (example) handlePasteUrls(example);
                        }}
                      >
                        Paste URLs
                      </Button>
                    </div>

                    {/* thumbnails */}
                    <div className="w-full overflow-x-auto py-2">
                      <div className="flex gap-2">
                        {images.map((img, idx) => (
                          <div
                            key={img.id}
                            draggable
                            onDragStart={(e) => onThumbDragStart(e, img.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => onThumbDrop(e, img.id)}
                            className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer ring-2 ${carouselIndex === idx ? "ring-primary" : "ring-transparent"} relative`}
                            onClick={() => setCarouselIndex(idx)}
                          >
                            <img src={img.src} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteImage(img.id);
                              }}
                              className="absolute top-1 right-1 bg-white/70 rounded-full p-1 shadow"
                              title="Delete"
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Form (50%) */}
                <div className="md:w-1/2 p-6 space-y-4 flex flex-col">
                  <Input
                    placeholder="Title"
                    value={newThread.title}
                    onChange={(e) => setNewThread((s) => ({ ...s, title: e.target.value }))}
                  />

                  <textarea
                    className="w-full bg-white/60 border border-primary/10 rounded-lg px-4 py-3 h-36 resize-none focus:outline-none"
                    placeholder="Write something honest — vent, ask or share"
                    value={newThread.content}
                    onChange={(e) => setNewThread((s) => ({ ...s, content: e.target.value }))}
                  />

                  <Input placeholder="Category (e.g. College Hacks)" value={newThread.category} onChange={(e) => setNewThread((s) => ({ ...s, category: e.target.value }))} />

                  <Input placeholder="Tags (comma separated)" value={newThread.tags} onChange={(e) => setNewThread((s) => ({ ...s, tags: e.target.value }))} />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input id="trending" type="checkbox" checked={newThread.trending} onChange={(e) => setNewThread((s) => ({ ...s, trending: e.target.checked }))} />
                      <label htmlFor="trending" className="text-sm">Mark as trending</label>
                    </div>

                    <div className="text-sm text-gray-500">Preview updates live — tap images to edit captions</div>
                  </div>

                  {/* optional: preview small post card */}
                  <div className="mt-2 border border-primary/10 rounded-lg p-3 bg-white/60 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <img src="https://i.pravatar.cc/150?img=1" alt="you" className="h-10 w-10 rounded-full object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{newThread.title || "Post title"}</div>
                          <div className="text-xs text-gray-500">{images.length ? `${images.length} image${images.length > 1 ? "s" : ""}` : "No images"}</div>
                        </div>
                        <p className="text-xs text-gray-700 mt-1 line-clamp-2">{newThread.content || "Post content preview..."}</p>
                      </div>
                    </div>
                  </div>

                  {/* bottom actions (mobile-friendly) */}
                  <div className="mt-auto flex items-center gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setNewThread((s) => ({ ...s, draft: true })); handlePost(true); }}>
                      Save Draft
                    </Button>
                    <Button onClick={() => handlePost(false)} disabled={creating}>
                      {creating ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
