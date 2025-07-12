import React from 'react';
import { Button } from './ui/button';
import { LogIn } from 'lucide-react';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { UserMenu } from './UserMenu';

export const UserOrSignIn = () => {
  const { isSignedIn } = useUser();

  return isSignedIn ? (
    <UserMenu />
  ) : (
    <SignInButton mode="modal">
      <Button variant="ghost" size="sm" className="gap-2">
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    </SignInButton>
  );
};