import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> } // ← params is now a Promise
) {
  try {
    // Await the params promise before destructuring
    const { slug } = await params;
    console.log("Fetching topic details for slug:", slug);

    // 1) Get topic by slug
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

    // 2) Get all problems under this topic (only need difficulty & completed)
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

    // 3) Compute counts
    const total_count = problems?.length || 0;
    const easy_count = problems?.filter((p) => p.difficulty === "Easy").length || 0;
    const medium_count = problems?.filter((p) => p.difficulty === "Medium").length || 0;
    const hard_count = problems?.filter((p) => p.difficulty === "Hard").length || 0;
    const solved_count = problems?.filter((p) => p.completed).length || 0;

    const topicWithStats = {
      ...topic,
      total_count,
      easy_count,
      medium_count,
      hard_count,
      solved_count,
      last_updated: new Date().toLocaleDateString(), // your chosen format
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
