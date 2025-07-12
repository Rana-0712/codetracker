"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  Play,
  Star,
  Clock,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

import { useUser } from "@clerk/nextjs";

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  total_count: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  solved_count: number;
  last_updated?: string;
}

interface Problem {
  id: string;
  title: string;
  number: string;
  difficulty: string;
  completed: boolean;
  url: string;
  platform: string;
  tags?: string[];
  success_rate?: number;
}

export default function TopicPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isSignedIn, user } = useUser();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!slug || !isSignedIn || !user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch topic details
        const topicRes = await fetch(
          `/api/topics/${encodeURIComponent(slug)}`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (!topicRes.ok) {
          throw new Error(`Failed to fetch topic: ${topicRes.status}`);
        }
        const topicData = await topicRes.json();

        // Fetch problems for this topic
        const problemsRes = await fetch(
          `/api/topics/${encodeURIComponent(slug)}/problems`,
          { headers: { "Content-Type": "application/json" } }
        );
        if (!problemsRes.ok) {
          throw new Error(`Failed to fetch problems: ${problemsRes.status}`);
        }
        const problemsData = await problemsRes.json();

        setTopic(topicData.topic || null);
        setProblems(problemsData.problems || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, isSignedIn, user]);

  // Toggle completion status for a problem
  const toggleCompletion = async (problemId: string) => {
    const target = problems.find((p) => p.id === problemId);
    if (!target) return;

    // Optimistically update UI
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId ? { ...p, completed: !p.completed } : p
      )
    );

    try {
      const res = await fetch(`/api/problems/${problemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !target.completed }),
      });

      if (!res.ok) {
        // Revert if API call failed
        setProblems((prev) =>
          prev.map((p) =>
            p.id === problemId ? { ...p, completed: target.completed } : p
          )
        );
      }
    } catch (error) {
      console.error("Error toggling completion:", error);
      // Revert on error
      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId ? { ...p, completed: target.completed } : p
        )
      );
    }
  };

  // Delete a problem
  const deleteProblem = async (problemId: string) => {
    const target = problems.find((p) => p.id === problemId);
    if (!target) return;

    // Optimistically remove from UI
    setProblems((prev) => prev.filter((p) => p.id !== problemId));

    try {
      const res = await fetch(`/api/problems/${problemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Re‐add if deletion failed
        setProblems((prev) => [...prev, target]);
        console.error(`Failed to delete problem: ${res.status}`);
      }
    } catch (error) {
      console.error("Error deleting problem:", error);
      // Revert on error
      setProblems((prev) => [...prev, target]);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        Please sign in to view topics
      </div>
    );
  }

  const filteredProblems = problems.filter(
    (problem) =>
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex justify-center items-center h-screen">
        Topic not found
      </div>
    );
  }

  const solvedPercentage =
    Math.round((topic.solved_count / topic.total_count) * 100) || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {topic.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{topic.name}</h1>
                  <p className="text-muted-foreground">
                    {topic.total_count} questions • {topic.solved_count} Saved
                  </p>
                </div>
              </div>

              <Button className="w-full mb-4" size="lg">
                <Play className="mr-2 h-4 w-4" />
                Practice
              </Button>

              <div className="flex gap-2 mb-6">
                <Button variant="outline" size="icon">
                  <Star className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Clock className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              {topic.last_updated && (
                <p className="text-sm text-muted-foreground mb-6">
                  Updated: {topic.last_updated}
                </p>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Progress</h3>
                  <div className="text-center mb-2">
                    <div className="text-4xl font-bold">
                      {topic.solved_count}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Solved
                    </div>
                  </div>
                  <Progress value={solvedPercentage} className="h-2 mb-4" />

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted p-3 rounded-md text-center">
                      <div className="text-green-500 font-medium">
                        {topic.easy_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Easy</div>
                    </div>
                    <div className="bg-muted p-3 rounded-md text-center">
                      <div className="text-yellow-500 font-medium">
                        {topic.medium_count}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Medium
                      </div>
                    </div>
                    <div className="bg-muted p-3 rounded-md text-center">
                      <div className="text-red-500 font-medium">
                        {topic.hard_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Hard</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="md:col-span-3">
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

            {/* Problem List */}
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
                    {/* 1) Completion Toggle */}
                    <div
                      onClick={() => toggleCompletion(problem.id)}
                      className="w-6 mr-4 flex-shrink-0 cursor-pointer text-muted-foreground"
                    >
                      {problem.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-muted-foreground/30"></div>
                      )}
                    </div>

                    {/* 2) Link to Problem Page */}
                    <Link
                      href={`/problem/${problem.id}`}
                      className="flex items-center flex-1 ml-4 truncate"
                    >
                      {/* Problem Number */}
                      <div className="w-12 mr-4 flex-shrink-0 font-mono">
                        {problem.number}.
                      </div>

                      {/* Title */}
                      <div className="flex-1 font-medium truncate">
                        {problem.title}
                      </div>

                      {/* Topic Tags (up to 2, single line) */}
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

                      {/* Difficulty */}
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

                    {/* 3) External Solve Link */}
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

                    {/* 4) Delete Button */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
