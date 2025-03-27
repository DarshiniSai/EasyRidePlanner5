import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useClerk, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sign-in/*" component={() => <div className="min-h-screen flex items-center justify-center">Sign In UI is handled by Clerk</div>} />
      <Route path="/sign-up/*" component={() => <div className="min-h-screen flex items-center justify-center">Sign Up UI is handled by Clerk</div>} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
