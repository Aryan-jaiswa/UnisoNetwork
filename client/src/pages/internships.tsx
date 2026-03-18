'use client';

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Search,
  Briefcase,
  MapPin,
  Clock,
  ExternalLink,
  Zap,
} from 'lucide-react';

const DOMAINS = ['All', 'Tech', 'Design', 'Marketing', 'Business', 'Finance'];

export default function InternshipsPage() {
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('All');
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    const fetchInternships = async () => {
      try {
        const res = await fetch('/api/internships');
        const data = await res.json();
        setInternships(data);
      } catch (err) {
        console.error('Failed to fetch internships:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInternships();
  }, []);

  const filteredInternships = internships.filter((internship) => {
    const matchesSearch =
      searchQuery === '' ||
      internship.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      internship.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      internship.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDomain =
      selectedDomain === 'All' || internship.domain === selectedDomain;
    const matchesRemote = !remoteOnly || internship.location === 'Remote';

    return matchesSearch && matchesDomain && matchesRemote;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-hero text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-secondary/20 rounded-full filter blur-3xl mix-blend-multiply" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full filter blur-3xl mix-blend-multiply" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 relative z-10">
          <Link
            href="/"
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Back to Home</span>
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-poppins flex items-center gap-3">
                <span>🔥</span> Internships for You
              </h1>
              <p className="mt-3 text-xl text-white/80">
                Curated roles from companies that actually want students
              </p>
            </div>
            <div className="mt-6 md:mt-0">
              <Badge className="bg-white/20 text-white border-0 py-1 px-3">
                <Zap className="h-3.5 w-3.5 mr-1 text-yellow-300" />
                <span>Updated today</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-md p-4 -mt-6 relative z-20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by role, company, or keywords..."
                className="pl-10 border-gray-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-lg">
                <Switch
                  id="remote-toggle"
                  checked={remoteOnly}
                  onCheckedChange={setRemoteOnly}
                />
                <label
                  htmlFor="remote-toggle"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Remote only
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {filteredInternships.length} opportunities found
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading internships...
          </div>
        ) : filteredInternships.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInternships.map((internship) => (
              <div
                key={internship.$id}
                className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100"
              >
                <div
                  className={`${internship.companyColor || 'bg-gradient-card-3'
                    } h-16 flex items-center px-6`}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="bg-white/20 backdrop-blur-sm h-10 w-10 rounded-md flex items-center justify-center text-xl">
                      {internship.logo || '💼'}
                    </div>
                    <Badge className="bg-white/20 text-white border-0">
                      {internship.postedDate}
                    </Badge>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    {internship.role}
                  </h3>
                  <p className="text-primary font-medium">{internship.company}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-gray-600 flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      {internship.location}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-gray-600 flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      {internship.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-0"
                    >
                      {internship.domain}
                    </Badge>
                  </div>

                  <p className="mt-4 text-gray-600 text-sm line-clamp-3">
                    {internship.description}
                  </p>

                  <div className="mt-5 flex justify-between items-center">
                    <Button
                      variant="default"
                      className="rounded-full"
                      onClick={() => window.open(internship.applyLink, '_blank')}
                    >
                      Apply Now
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-gray-500 p-2 h-9 w-9 rounded-full"
                    >
                      <Briefcase className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-4 animate-bounce">✨</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No gigs? Time to manifest ✨
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try adjusting your filters or check back later for new opportunities.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSearchQuery('');
                setSelectedDomain('All');
                setRemoteOnly(false);
              }}
            >
              Reset all filters
            </Button>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl text-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/10"></div>
            <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full bg-white/10"></div>
          </div>
          <div className="relative z-10 md:flex md:items-center md:justify-between">
            <div className="md:max-w-xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 font-poppins">
                Can&apos;t find what you&apos;re looking for?
              </h2>
              <p className="text-white/80 mb-6 md:mb-0">
                Set up job alerts and we’ll notify you when new opportunities that
                match your interests become available.
              </p>
            </div>
            <Button className="bg-white text-primary hover:bg-white/90 shadow-lg rounded-full py-6 px-6">
              Create Job Alert
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
