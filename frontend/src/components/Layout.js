import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { UserOrSignIn } from './UserOrSignIn';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/codetracker logo2.png"
                alt="CodeTracker Logo"
                width={48}
                height={48}
              />
            </Link>
          </div>

          <nav className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link to="/add-topic">
              <Button variant="ghost" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Topic
              </Button>
            </Link>
            <UserOrSignIn />
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
};

export default Layout;