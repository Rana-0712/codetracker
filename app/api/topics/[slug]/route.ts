import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Initialize a Supabase “admin” client with your service-role key ────────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Helper: Extract & verify JWT; return userId or a NextResponse(401) ─────────────
async function getUserIdFromRequest(request: Request): Promise<string | NextResponse> {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization token" },
      { status: 401 }
    );
  }

  const {
    data: { user },
    error: getUserError,
  } = await supabaseAdmin.auth.getUser(token);

  if (getUserError || !user) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  return user.id;
}

// ─── GET: Topic details + stats for THIS USER ────────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> } // params is a Promise
) {
  try {
    // 1) Verify JWT & get user ID
    const userIdOrResponse = await getUserIdFromRequest(request);
    if (typeof userIdOrResponse !== "string") {
      // That means it’s a NextResponse with a 401
      return userIdOrResponse;
    }
    const userId = userIdOrResponse;

    // 2) Extract “slug” from route params
    const { slug } = await params;
    console.log("Fetching topic details for slug:", slug);

    // 3) Fetch the topic by slug
    const { data: topic, error: topicError } = await supabaseAdmin
      .from("topics")
      .select("*")
      .eq("slug", slug)
      .single();

    if (topicError || !topic) {
      console.error("Error fetching topic:", topicError);
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    console.log("Found topic:", topic);

    // 4) Fetch only this USER’s problems under that topic
    const { data: problems, error: problemsError } = await supabaseAdmin
      .from("problems")
      .select("difficulty, completed")
      .eq("topic_id", topic.id)
      .eq("user_id", userId); //  only this user’s rows

    if (problemsError) {
      console.error("Error fetching problems:", problemsError);
      return NextResponse.json(
        { error: "Failed to fetch problem stats" },
        { status: 500 }
      );
    }

    // 5) Compute counts from the filtered list
    const total_count = problems?.length || 0;
    const easy_count = problems?.filter((p) => p.difficulty === "Easy").length || 0;
    const medium_count = problems?.filter((p) => p.difficulty === "Medium").length || 0;
    const hard_count = problems?.filter((p) => p.difficulty === "Hard").length || 0;
    const solved_count = problems?.filter((p) => p.completed).length || 0;

    // Attach stats to the topic object
    const topicWithStats = {
      ...topic,
      total_count,
      easy_count,
      medium_count,
      hard_count,
      solved_count,
      last_updated: new Date().toLocaleDateString(),
    };

    console.log("Topic with stats for user:", topicWithStats);
    return NextResponse.json({ topic: topicWithStats });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
