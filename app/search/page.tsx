/* eslint-disable @typescript-eslint/no-unused-vars */

import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@supabase/supabase-js";
import ProblemList from "@/components/problem-list";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function searchProblems(query: string) {
  if (!query) return [];

  const { data: problems } = await supabase
    .from("problems")
    .select("*")
    .or(
      `title.ilike.%${query}%, description.ilike.%${query}%, tags.cs.{${query}}`
    )
    .order("created_at", { ascending: false });

  return problems || [];
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: {};
  searchParams: { q?: string };
}) {
  const query = searchParams.q || "";
  const problems = await searchProblems(query);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Search Problems</h1>
      </div>

      <div className="mb-6">
        <form method="GET" className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search problems..."
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      {query && (
        <div className="mb-4">
          <p className="text-muted-foreground">
            {problems.length} result{problems.length !== 1 ? "s" : ""} for{" "}
            &quot;{query}&quot;
          </p>
        </div>
      )}

      {problems.length > 0 ? (
        <ProblemList
          title="Search Results"
          expanded={true}
          problems={problems.map((p) => ({
            id: p.id,
            name: p.title,
            difficulty: p.difficulty || "Medium",
            completed: p.completed || false,
            url: p.url,
            platform: p.platform,
          }))}
        />
      ) : query ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No problems found matching your search.
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Enter a search term to find problems.
          </p>
        </div>
      )}
    </div>
  );
}
