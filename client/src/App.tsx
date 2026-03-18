import React from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/AuthContext";

// Pages
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import InternshipsPage from "@/pages/internships";
import GroupsPage from "@/pages/groups";
import EventsPage from "@/pages/events";
import ForumsPage from "@/pages/forums";
import ResourcesPage from "@/pages/resources";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Profile from "@/pages/profile";
import CreateGroupPage from "@/pages/create-group";
import MyGroupsPage from "@/pages/my-groups";

type ProtectedRouteProps = {
  component: React.FC;
};

function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white"></div>
      </div>
    );
  }

  return user ? <Component /> : <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/internships" component={() => <ProtectedRoute component={InternshipsPage} />} />
  <Route path="/groups" component={() => <ProtectedRoute component={GroupsPage} />} />
  <Route path="/create-group" component={() => <ProtectedRoute component={CreateGroupPage} />} />
  <Route path="/my-groups" component={() => <ProtectedRoute component={MyGroupsPage} />} />
      <Route path="/events" component={() => <ProtectedRoute component={EventsPage} />} />
      <Route path="/forums" component={() => <ProtectedRoute component={ForumsPage} />} />
      <Route path="/resources" component={() => <ProtectedRoute component={ResourcesPage} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route component={NotFound} />
    </Switch>
  );
}


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
