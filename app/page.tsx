"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface Topic {
  id: string
  name: string
  slug: string
  count: number
}

interface Problem {
  id: string
  title: string
  number: string
  difficulty: string
  completed: boolean
  url: string
  platform: string
  tags?: string[]
}

export default function Home() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const topicsRes = await fetch("/api/topics")
        const topicsData = await topicsRes.json()

        const problemsRes = await fetch("/api/problems?limit=20")
        const problemsData = await problemsRes.json()

        setTopics(topicsData.topics || [])
        setProblems(problemsData.problems || [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const toggleCompletion = async (problemId: string) => {
    const target = problems.find((p) => p.id === problemId)
    if (!target) return

    try {
      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId ? { ...p, completed: !p.completed } : p
        )
      )

      const res = await fetch(`/api/problems/${problemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !target.completed }),
      })

      if (!res.ok) {
        setProblems((prev) =>
          prev.map((p) =>
            p.id === problemId ? { ...p, completed: target.completed } : p
          )
        )
      }
    } catch (error) {
      console.error("Error toggling completion:", error)
      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId ? { ...p, completed: target.completed } : p
        )
      )
    }
  }

  const deleteProblem = async (problemId: string) => {
    const target = problems.find((p) => p.id === problemId)
    if (!target) return

    setProblems((prev) => prev.filter((p) => p.id !== problemId))

    try {
      const res = await fetch(`/api/problems/${problemId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        setProblems((prev) => [...prev, target])
        console.error(`Failed to delete problem: ${res.status}`)
      }
    } catch (error) {
      console.error("Error deleting problem:", error)
      setProblems((prev) => [...prev, target])
    }
  }

  const filteredProblems = problems.filter(
    (problem) =>
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Topic Categories */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          {topics.map((topic) => (
            <Link href={`/topics/${topic.slug}`} key={topic.id}>
              <Badge
                variant="outline"
                className="py-2 px-4 text-base hover:bg-primary/10 cursor-pointer"
              >
                {topic.name}{" "}
                <span className="ml-2 text-muted-foreground">{topic.count}</span>
              </Badge>
            </Link>
          ))}
          <Button variant="ghost" size="sm" className="gap-1">
            <span>More</span>
            <span className="text-muted-foreground">▼</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search questions"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="space-y-1">
            {filteredProblems.map((problem, index) => (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <div
                  className={`flex items-center h-16 p-4 rounded-md hover:bg-muted/50 ${
                    problem.completed ? "border-l-4 border-green-500" : ""
                  }`}
                >
                  {/* Completion Toggle */}
                  <div
                    onClick={() => toggleCompletion(problem.id)}
                    className="w-6 mr-4 flex-shrink-0 text-muted-foreground cursor-pointer"
                  >
                    {problem.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-muted-foreground/30"></div>
                    )}
                  </div>

                  {/* Link to Problem Description */}
                  <Link
                    href={`/problem/${problem.id}`}
                    className="flex items-center flex-1 ml-4 truncate"
                  >
                    <div className="w-12 mr-4 flex-shrink-0 font-mono">
                      {problem.number}.
                    </div>
                    <div className="flex-1 font-medium truncate">
                      {problem.title}
                    </div>
                    <div className="flex-shrink-0 w-36 ml-2 mr-4 overflow-hidden whitespace-nowrap">
                      {problem.tags && problem.tags.length > 0 && (
                        <>
                          {problem.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="inline-block mr-1 text-sm px-2 py-1"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {problem.tags.length > 2 && (
                            <Badge
                              variant="outline"
                              className="inline-block mr-1 text-sm px-2 py-1"
                            >
                              +{problem.tags.length - 2}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <div className="w-24 flex-shrink-0 text-right">
                      <Badge
                        variant="outline"
                        className={`${
                          problem.difficulty === "Easy"
                            ? "text-green-500 border-green-500/30"
                            : problem.difficulty === "Medium"
                            ? "text-yellow-500 border-yellow-500/30"
                            : "text-red-500 border-red-500/30"
                        }`}
                      >
                        {problem.difficulty}
                      </Badge>
                    </div>
                  </Link>

                  {/* External Link */}
                  <div className="w-8 ml-4 flex-shrink-0 text-center">
                    <a
                      href={problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </a>
                  </div>

                  {/* Delete Button */}
                  <div
                    onClick={() => deleteProblem(problem.id)}
                    className="w-8 ml-2 flex-shrink-0 text-center cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
