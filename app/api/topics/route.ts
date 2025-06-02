import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1) Fetch all topics (id, name, slug, description), ordered by name
    const { data: topics, error } = await supabase
      .from("topics")
      .select(`
        id,
        name,
        slug,
        description
      `)
      .order("name");

    if (error) {
      console.error("Error fetching topics:", error);
      return NextResponse.json(
        { error: "Failed to fetch topics" },
        { status: 500 }
      );
    }

    // 2) For each topic, fetch the exact count of problems belonging to it
    const topicsWithCounts = await Promise.all(
      (topics || []).map(async (topic) => {
        const { count } = await supabase
          .from("problems")
          .select("*", { count: "exact", head: true })
          .eq("topic_id", topic.id);

        return {
          ...topic,
          count: count ?? 0,
        };
      })
    );

    return NextResponse.json({ topics: topicsWithCounts });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
