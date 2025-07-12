"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  Star,
  Youtube,
  Infinity,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

import { useUser } from "@clerk/nextjs";

interface Problem {
  id: string;
  name: string;
  difficulty: string;
  completed: boolean;
  url: string;
  platform?: string;
  companies?: string[];
  tags?: string[];
  isBookmarked?: boolean;
}

interface EnhancedProblemListProps {
  title: string;
  expanded?: boolean;
}

function getPlatformIcon(platform?: string) {
  switch (platform?.toLowerCase()) {
    case "leetcode":
      return <Infinity className="h-4 w-4 text-orange-500" />;
    case "youtube":
      return <Youtube className="h-4 w-4 text-red-500" />;
    case "geeksforgeeks":
      return (
        <div className="w-4 h-4 bg-green-500 rounded text-xs flex items-center justify-center text-white font-bold">
          G
        </div>
      );
    case "interviewbit":
      return (
        <div className="w-4 h-4 bg-blue-500 rounded text-xs flex items-center justify-center text-white font-bold">
          I
        </div>
      );
    case "codechef":
      return (
        <div className="w-4 h-4 bg-purple-500 rounded text-xs flex items-center justify-center text-white font-bold">
          C
        </div>
      );
    case "codeforces":
      return (
        <div className="w-4 h-4 bg-red-500 rounded text-xs flex items-center justify-center text-white font-bold">
          CF
        </div>
      );
    default:
      return <Infinity className="h-4 w-4 text-gray-500" />;
  }
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "text-green-500 bg-green-500/10 border-green-500/20";
    case "medium":
      return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    case "hard":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    case "basic":
      return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    default:
      return "text-gray-500 bg-gray-500/10 border-gray-500/20";
  }
}

async function toggleProblemCompletion(problemId: string, completed: boolean) {
  try {
    const response = await fetch(`/api/problems/${problemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ completed: !completed }),
    });

    if (response.ok) {
      // Simple approach: reload the page so our list refetches
      window.location.reload();
    }
  } catch (error) {
    console.error("Error updating problem:", error);
  }
}

export default function EnhancedProblemList({
  title,
  expanded = false,
}: EnhancedProblemListProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [myProblems, setMyProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState("");

  const { isSignedIn, user } = useUser();

  // Fetch only this user's saved problems when user is signed in
  useEffect(() => {
  if (!isSignedIn || !user) {
    setMyProblems([]);
    setLoading(false);
    return;
  }

  setLoading(true);
  
  fetch("/api/problems")
    .then(res => res.json())
    .then(data => {
      if (data.problems) {
        setMyProblems(data.problems.map((p: any) => ({
          id: p.id,
          name: p.title,
          difficulty: p.difficulty,
          completed: p.completed,
          url: p.url,
          platform: p.platform,
          companies: p.companies,
          tags: p.tags,
        })));
      }
      setLoading(false);
    })
    .catch(error => {
      console.error("Error fetching problems:", error);
      setErrorMessage("Failed to fetch problems");
      setLoading(false);
    });
}, [isSignedIn, user]);


  // If not signed in, prompt to sign in
  if (!isSignedIn) {
    return (
      <div className="p-4 text-center text-red-600">
        Please sign in to see your saved problems.
      </div>
    );
  }

  // If still loading
  if (loading) {
    return (
      <div className="p-4 text-center">Loading your saved problems…</div>
    );
  }

  // If no problems or there was an error
  if (myProblems.length === 0) {
    return (
      <div className="p-4 text-center text-gray-700">
        {errorMessage
          ? `Error: ${errorMessage}`
          : "You haven’t saved any problems yet."}
      </div>
    );
  }

  // At this point, we have at least one problem in myProblems
  const completedCount = myProblems.filter((p) => p.completed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-border/50 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm"
    >
      <motion.button
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 text-left transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ backgroundColor: "rgba(var(--muted), 0.7)" }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </motion.div>
          <span className="font-medium text-lg">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {completedCount} / {myProblems.length}
          </span>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border/30">
              {myProblems.map((problem, index) => (
                <motion.div
                  key={problem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative p-4 hover:bg-muted/20 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    {/* Completion Status */}
                    <motion.button
                      onClick={() => toggleProblemCompletion(problem.id, problem.completed)}
                      className="flex-shrink-0"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {problem.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground hover:text-green-500 transition-colors" />
                      )}
                    </motion.button>

                    {/* Problem Title */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/problem/${problem.id}`} className="group/link">
                        <h3 className="font-medium text-foreground group-hover/link:text-primary transition-colors truncate">
                          {problem.name}
                        </h3>
                      </Link>

                      {/* Companies */}
                      {problem.companies && problem.companies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {problem.companies.slice(0, 2).map((company) => (
                            <Badge
                              key={company}
                              variant="secondary"
                              className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground"
                            >
                              {company}
                            </Badge>
                          ))}
                          {problem.companies.length > 2 && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground"
                            >
                              +{problem.companies.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Platform Icon */}
                    <div className="flex-shrink-0">{getPlatformIcon(problem.platform)}</div>

                    {/* Difficulty Badge */}
                    <div className="flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={cn("font-medium px-3 py-1", getDifficultyColor(problem.difficulty))}
                      >
                        {problem.difficulty}
                      </Badge>
                    </div>

                    {/* Tags */}
                    {problem.tags && problem.tags.length > 0 && (
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {problem.tags[0]}
                        </Badge>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-1 hover:bg-muted rounded">
                        <Star className="h-4 w-4 text-yellow-500" />
                      </motion.button>

                      <Link href={problem.url} target="_blank">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-1 hover:bg-muted rounded">
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </motion.div>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
