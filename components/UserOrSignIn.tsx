"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { useUser, SignInButton } from "@clerk/nextjs"
import { UserMenu } from "@/components/UserMenu"

export function UserOrSignIn() {
  const { isSignedIn, user } = useUser()

  return isSignedIn ? (
    <UserMenu />
  ) : (
    <SignInButton mode="modal">
      <Button variant="ghost" size="sm" className="gap-2">
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    </SignInButton>
  )
}
