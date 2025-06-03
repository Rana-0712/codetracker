"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, CheckCircle2, Circle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabaseClient"

interface Problem {
  id: string
  name: string
  difficulty: string
  completed: boolean
  url: string
  platform?: string
}

interface ProblemListProps {
  title: string
  expanded?: boolean
}

function getPlatformIcon(platform?: string) {
  switch (platform?.toLowerCase()) {
    case "leetcode": return "LC"
    case "geeksforgeeks": return "GFG"
    case "interviewbit": return "IB"
    case "codechef": return "CC"
    case "codeforces": return "CF"
    default: return "?"
  }
}

function getPlatformColor(platform?: string) {
  switch (platform?.toLowerCase()) {
    case "leetcode": return "bg-orange-500 text-white"
    case "geeksforgeeks": return "bg-green-500 text-white"
    case "interviewbit": return "bg-blue-500 text-white"
    case "codechef": return "bg-purple-500 text-white"
    case "codeforces": return "bg-red-500 text-white"
    default: return "bg-gray-500 text-white"
  }
}

export default function ProblemList({ title, expanded = false }: ProblemListProps) {
  const [isExpanded, setIsExpanded] = useState(expanded)
  const [problems, setProblems] = useState<Problem[]>([])
  const { user } = useAuth()

  useEffect(() => {
    const fetchProblems = async () => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch("/api/problems", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setProblems(data.problems || [])
    }

    if (user) fetchProblems()
  }, [user])

  if (!user) {
    return <div className="p-6 text-muted-foreground text-center">Please sign in to view your saved problems.</div>
  }

  if (problems.length === 0) {
    return <div className="p-6 text-muted-foreground text-center">No problems saved yet.</div>
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 p-4 bg-muted/50 hover:bg-muted/70 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">({problems.length})</span>
      </button>

      {isExpanded && (
        <div className="divide-y divide-border">
          <div className="grid grid-cols-12 px-4 py-2 bg-muted/30 font-medium text-sm">
            <div className="col-span-1"></div>
            <div className="col-span-5">Problem</div>
            <div className="col-span-2">Difficulty</div>
            <div className="col-span-2">Practice</div>
            <div className="col-span-1">Source</div>
            <div className="col-span-1">Actions</div>
          </div>

          {problems.map((problem) => (
            <div key={problem.id} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-muted/20">
              <div className="col-span-1">
                <button
                  onClick={async () => {
                    await fetch(`/api/problems/${problem.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ completed: !problem.completed }),
                    })
                    setProblems((prev) => prev.map(p => p.id === problem.id ? { ...p, completed: !p.completed } : p))
                  }}
                  className="hover:scale-110 transition-transform"
                >
                  {problem.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-green-500" />
                  )}
                </button>
              </div>
              <div className="col-span-5">
                <Link href={`/problem/${problem.id}`} className="hover:underline font-medium">
                  {problem.name}
                </Link>
              </div>
              <div className="col-span-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-normal",
                    problem.difficulty === "Easy" && "bg-green-500/10 text-green-500 border-green-500/20",
                    problem.difficulty === "Medium" && "bg-orange-500/10 text-orange-500 border-orange-500/20",
                    problem.difficulty === "Hard" && "bg-red-500/10 text-red-500 border-red-500/20"
                  )}
                >
                  {problem.difficulty}
                </Badge>
              </div>
              <div className="col-span-2">
                <Link href={problem.url} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="col-span-1">
                <div className={cn("flex items-center justify-center w-8 h-8 rounded text-xs font-bold", getPlatformColor(problem.platform))}>
                  {getPlatformIcon(problem.platform)}
                </div>
              </div>
              <div className="col-span-1">
                <Link href={`/problem/${problem.id}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
