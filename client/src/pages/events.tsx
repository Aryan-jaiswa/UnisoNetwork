import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Users, CalendarDays, Sparkles, Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { toast } from 'react-hot-toast';

// Available categories for filtering
const CATEGORIES = ["All", "Social", "Career", "Food", "Workshop", "Entertainment", "Tech", "Sports", "Academic"];

interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  category: string;
  attendees: number;
  image: string;
  featured: boolean;
}

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "UNiSO - Campus Events";
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      const data = await response.json();
      const formattedEvents = data.map((doc: any) => ({
        id: doc.id || doc.$id,
        title: doc.title,
        description: doc.description,
        date: new Date(doc.event_date || doc.date),
        location: doc.location,
        category: doc.category || '',
        attendees: doc.attendees || 0,
        image: doc.image || '',
        featured: doc.featured || false
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on search, date and category
  const filteredEvents = events.filter(event => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());

    // Date filter
    let matchesDate = true;
    if (selectedDate === 'This Week') {
      matchesDate = isThisWeek(event.date);
    } else if (selectedDate === 'This Month') {
      matchesDate = isThisMonth(event.date);
    } else if (selectedDate === 'Future') {
      matchesDate = event.date > new Date();
    }

    // Category filter
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;

    return matchesSearch && matchesDate && matchesCategory;
  });

  // Helper function to check if a date is in the current week
  function isThisWeek(date: Date) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return date >= weekStart && date <= weekEnd;
  }

  // Helper function to check if a date is in the current month
  function isThisMonth(date: Date) {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }

  // RSVP to an event
  const handleRSVP = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to RSVP');
      }

      toast.success("You've successfully RSVP'd to this event!");
      fetchEvents(); // Refresh the events list
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      toast.error('Failed to RSVP to event');
    }
  };

  return (
    <MainLayout>
      {/* Header with gradient background */}
      <div className="bg-gradient-hero text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-secondary/20 rounded-full filter blur-3xl mix-blend-multiply"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full filter blur-3xl mix-blend-multiply"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-poppins">
                📅 Campus Pulse
              </h1>
            </div>

            <Button
              className="mt-6 md:mt-0 bg-white text-primary hover:bg-white/90 rounded-full flex items-center gap-2 shadow-lg"
              onClick={() => {
                if (filteredEvents.length === 0) {
                  toast.error('No events to add to calendar.');
                  return;
                }
                // Generate ICS file for all filtered events
                const icsContent = [
                  'BEGIN:VCALENDAR',
                  'VERSION:2.0',
                  'PRODID:-//UNiSO//Campus Events//EN',
                  ...filteredEvents.map(event => `BEGIN:VEVENT\nSUMMARY:${event.title}\nDESCRIPTION:${event.description}\nLOCATION:${event.location}\nDTSTART:${event.date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}\nDTEND:${new Date(event.date.getTime() + 60*60*1000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}\nEND:VEVENT`),
                  'END:VCALENDAR'
                ].join('\r\n');
                const blob = new Blob([icsContent], { type: 'text/calendar' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'uniso-events.ics';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('Calendar file downloaded!');
              }}
            >
              <Calendar className="h-4 w-4" />
              Add to Calendar
            </Button>
          </div>

          <p className="mt-3 text-xl text-white/80">
            Never miss what's happening on campus
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-md p-4 -mt-6 relative z-20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search events..."
                className="pl-10 border-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Dates</SelectItem>
                  <SelectItem value="This Week">This Week</SelectItem>
                  <SelectItem value="This Month">This Month</SelectItem>
                  <SelectItem value="Future">Future Events</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      )}

      {/* Content when loaded */}
      {!loading && (
        <>
          {/* Featured events */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {filteredEvents.some(event => event.featured) && (
              <>
                <div className="flex items-center mb-6">
                  <Sparkles className="h-5 w-5 text-yellow-500 mr-2" />
                  <h2 className="text-2xl font-bold text-gray-800">Featured Events</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {filteredEvents
                    .filter(event => event.featured)
                    .map(event => (
                      <div
                        key={event.id}
                        className="group rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 bg-white h-full flex flex-col"
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={event.image}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-0 right-0 p-2">
                            <Badge className="bg-primary text-white">{event.category}</Badge>
                          </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                          <p className="text-gray-600 mb-4 flex-1">{event.description}</p>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center text-gray-500">
                              <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                              <span>{event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            </div>

                            <div className="flex items-center text-gray-500">
                              <Clock className="h-4 w-4 mr-2 text-primary" />
                              <span>{event.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>

                            <div className="flex items-center text-gray-500">
                              <MapPin className="h-4 w-4 mr-2 text-primary" />
                              <span>{event.location}</span>
                            </div>

                            <div className="flex items-center text-gray-500">
                              <Users className="h-4 w-4 mr-2 text-primary" />
                              <span>{event.attendees} attending</span>
                            </div>
                          </div>

                          <Button
                            className="mt-6 w-full"
                            onClick={() => handleRSVP(event.id)}
                          >
                            RSVP Now
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* All events */}
            <div className="flex items-center mb-6">
              <CalendarDays className="h-5 w-5 text-primary mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">All Events</h2>
            </div>

            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents
                  .filter(event => !event.featured || (filteredEvents.filter(e => e.featured).length === 0))
                  .map(event => (
                    <div
                      key={event.id}
                      className="group rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 bg-white h-full flex flex-col"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-0 right-0 p-2">
                          <Badge className="bg-primary text-white">{event.category}</Badge>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                        <p className="text-gray-600 mb-4 flex-1">{event.description}</p>

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center text-gray-500">
                            <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                            <span>{event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          </div>

                          <div className="flex items-center text-gray-500">
                            <Clock className="h-4 w-4 mr-2 text-primary" />
                            <span>{event.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                          </div>

                          <div className="flex items-center text-gray-500">
                            <MapPin className="h-4 w-4 mr-2 text-primary" />
                            <span>{event.location}</span>
                          </div>

                          <div className="flex items-center text-gray-500">
                            <Users className="h-4 w-4 mr-2 text-primary" />
                            <span>{event.attendees} attending</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          className="mt-6 w-full"
                          onClick={() => handleRSVP(event.id)}
                        >
                          RSVP Now
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              // Empty state
              <div className="text-center py-16 bg-gray-50 rounded-2xl">
                <div className="text-4xl mb-4 animate-bounce">🔍</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No events found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Try adjusting your search or filters. Check back later for new events!
                </p>
                <Button
                  variant="default"
                  className="mt-6"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDate('All');
                    setSelectedCategory('All');
                    toast.success('Filters reset!');
                  }}
                >
                  Reset all filters
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </MainLayout>
  );
}