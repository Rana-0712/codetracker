import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider } from "@/context/AuthContext";
import { UserOrSignIn } from "@/components/UserOrSignIn";
import logo from "../public/codetracker logo2.png";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  icons: {
    icon: "/favicon1.ico",
  },
  title: "CodeTracker",
  description: "Track and organize your coding practice problems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/codetracker logo1.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider> 
            <div className="min-h-screen bg-background">
              {/* Navigation Header */}
              <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                  <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2">
                      <Image
                        src={logo}
                        alt="CodeTracker Logo"
                        width={48}
                        height={48}
                      />
                      {/* <span className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        CodeTracker
                      </span> */}
                    </Link>
                  </div>

                  <nav className="flex items-center gap-2">
                    <Link href="/">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Home className="h-4 w-4" />
                        Home
                      </Button>
                    </Link>
                    {/* <Link href="/search">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Search className="h-4 w-4" />
                        Search
                      </Button>
                    </Link> */}
                    <Link href="/add-topic">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Topic
                      </Button>
                    </Link>
                    {/* <Link href="/settings">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Button>
                    </Link> */}
                    <UserOrSignIn />
                    <ThemeToggle />
                  </nav>
                </div>
              </header>

              {children}
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
