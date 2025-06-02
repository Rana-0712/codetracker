import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // Await params before using its properties
    const { slug } = await params;
    console.log("Fetching topic details for slug:", slug);

    // Get topic details
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("*")
      .eq("slug", slug)
      .single();

    if (topicError || !topic) {
      console.error("Error fetching topic:", topicError);
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    console.log("Found topic:", topic);

    // Get problem counts by difficulty
    const { data: problems, error: problemsError } = await supabase
      .from("problems")
      .select("difficulty, completed")
      .eq("topic_id", topic.id);

    if (problemsError) {
      console.error("Error fetching problems:", problemsError);
      return NextResponse.json(
        { error: "Failed to fetch problem stats" },
        { status: 500 }
      );
    }

    const total_count = problems?.length || 0;
    const easy_count = problems?.filter((p) => p.difficulty === "Easy").length || 0;
    const medium_count =
      problems?.filter((p) => p.difficulty === "Medium").length || 0;
    const hard_count =
      problems?.filter((p) => p.difficulty === "Hard").length || 0;
    const solved_count = problems?.filter((p) => p.completed).length || 0;

    const topicWithStats = {
      ...topic,
      total_count,
      easy_count,
      medium_count,
      hard_count,
      solved_count,
      last_updated: new Date().toLocaleDateString(),
    };

    console.log("Topic with stats:", topicWithStats);

    return NextResponse.json({ topic: topicWithStats });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
