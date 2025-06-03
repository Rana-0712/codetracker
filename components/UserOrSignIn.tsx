"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { UserMenu } from "@/components/UserMenu"

export function UserOrSignIn() {
  const { user } = useAuth()

  return user ? (
    <UserMenu />
  ) : (
    <Link href="/signin">
      <Button variant="ghost" size="sm" className="gap-2">
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    </Link>
  )
}
