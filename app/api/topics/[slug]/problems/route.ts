import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }   // ← Notice Promise<…> here
) {
  try {
    // await the params before destructuring
    const { slug } = await params;
    console.log("Fetching problems for topic slug:", slug);

    // 1) Look up the topic by slug
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (topicError || !topic) {
      console.error("Error fetching topic:", topicError);
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    console.log("Found topic:", topic);

    // 2) Now fetch all problems whose topic_id matches topic.id
    const { data: problems, error } = await supabase
      .from("problems")
      .select("*")
      .eq("topic_id", topic.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching problems:", error);
      return NextResponse.json({ error: "Failed to fetch problems" }, { status: 500 });
    }

    console.log(`Found ${problems?.length || 0} problems for topic ${topic.name}`);

    // 3) Format each problem (e.g. add a random success_rate, or fallback numbering)
    const formattedProblems =
      problems?.map((problem, index) => ({
        ...problem,
        number: problem.number || String(index + 1),
        success_rate: Math.floor(Math.random() * 60) + 20,
      })) || [];

    return NextResponse.json({ problems: formattedProblems });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
