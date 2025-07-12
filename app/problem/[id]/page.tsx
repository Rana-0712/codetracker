"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Circle,
  BookOpen,
  Code,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useUser } from "@clerk/nextjs";

interface Problem {
  id: string;
  title: string;
  number: string;
  difficulty: string;
  completed: boolean;
  url: string;
  platform: string;
  description: string;
  notes: string;
  topic_id: string;
  topic_name?: string;
  companies?: string[];
  tags?: string[];
  success_rate?: number;
}

export default function ProblemPage() {
  const params = useParams();
  const id = params.id as string;
  const { isSignedIn, user } = useUser();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  // Fetch the problem details
  useEffect(() => {
    if (!id) return;
    if (!isSignedIn || !user) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch problem details
        const res = await fetch(`/api/problems/${id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          console.error("Fetch error status:", res.status);
          setProblem(null);
          return;
        }

        const data = await res.json();
        setProblem(data.problem || null);
        setNotes(data.problem?.notes || "");
      } catch (error) {
        console.error("Error fetching problem:", error);
        setProblem(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isSignedIn, user]);

  // Update notes
  const handleSaveNotes = async () => {
    if (!problem) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/problems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        const data = await res.json();
        setProblem({ ...problem, notes: data.problem.notes });
      } else {
        console.error("Save notes failed: status", res.status);
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle completion
  const toggleCompletion = async () => {
    if (!problem) return;

    try {
      const res = await fetch(`/api/problems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !problem.completed }),
      });

      if (res.ok) {
        const data = await res.json();
        setProblem({ ...problem, completed: data.problem.completed });
      } else {
        console.error("Toggle completion failed: status", res.status);
      }
    } catch (error) {
      console.error("Error toggling completion:", error);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        Please sign in to view problems
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex justify-center items-center h-screen">
        Problem not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  {problem.number}. {problem.title}
                </h1>
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
              {problem.topic_name && (
                <Link href={`/topics/${problem.topic_id}`}>
                  <span className="text-sm text-muted-foreground hover:text-primary">
                    {problem.topic_name}
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={toggleCompletion}>
              {problem.completed ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Completed
                </>
              ) : (
                <>
                  <Circle className="mr-2 h-4 w-4" />
                  Mark Complete
                </>
              )}
            </Button>
            <Link href={problem.url} target="_blank">
              <Button>
                <ExternalLink className="mr-2 h-4 w-4" />
                Solve
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger
                  value="description"
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="solution"
                  className="flex items-center gap-2"
                >
                  <Code className="h-4 w-4" />
                  Solution
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger
                  value="discussion"
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Discussion
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-0">
                <div className="bg-card rounded-lg p-6 border border-border">
                  <div className="prose dark:prose-invert max-w-none">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: problem.description,
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="solution" className="mt-0">
                <div className="bg-card rounded-lg p-6 border border-border">
                  <p className="text-muted-foreground">
                    No solution available yet.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <div className="bg-card rounded-lg p-6 border border-border">
                  <Textarea
                    placeholder="Add your notes here..."
                    className="min-h-[300px] mb-4"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button onClick={handleSaveNotes} disabled={saving}>
                    {saving ? "Saving..." : "Save Notes"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="discussion" className="mt-0">
                <div className="bg-card rounded-lg p-6 border border-border">
                  <p className="text-muted-foreground">No discussions yet.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="text-lg font-medium mb-4">Problem Info</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Difficulty
                  </h4>
                  <p
                    className={`${
                      problem.difficulty === "Easy"
                        ? "text-green-500"
                        : problem.difficulty === "Medium"
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {problem.difficulty}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Platform
                  </h4>
                  <p className="capitalize">{problem.platform || "Unknown"}</p>
                </div>

                {problem.success_rate && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Success Rate
                    </h4>
                    <p>{problem.success_rate}%</p>
                  </div>
                )}

                {problem.companies && problem.companies.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Companies
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {problem.companies.map((company) => (
                        <Badge
                          key={company}
                          variant="secondary"
                          className="bg-muted"
                        >
                          {company}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {problem.tags && problem.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {problem.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Original Link
                  </h4>
                  <Link
                    href={problem.url}
                    target="_blank"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {problem.url.split("//")[1]?.split("/")[0] ||
                      "External Link"}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
