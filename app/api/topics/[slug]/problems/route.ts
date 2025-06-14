import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Initialize a Supabase “admin” client with your service-role key ──────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Helper: Verify JWT and return user ID, or a NextResponse(401) if unauthorized ─
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

// ─── GET: fetch problems by topic slug, but only for the authenticated user ───────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1) Verify JWT & get user ID
    const userIdOrResponse = await getUserIdFromRequest(request);
    if (typeof userIdOrResponse !== "string") {
      // That means it’s a NextResponse (401). Return it immediately.
      return userIdOrResponse;
    }
    const userId = userIdOrResponse;

    // 2) Extract “slug” from the route params
    const { slug } = await params;

    // 3) Look up the topic by slug
    const { data: topic, error: topicError } = await supabaseAdmin
      .from("topics")
      .select("id, name")
      .eq("slug", slug)
      .single();

    if (topicError || !topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    // 4) Fetch only that user’s problems under this topic
    const { data: problems, error } = await supabaseAdmin
      .from("problems")
      .select("*")
      .eq("topic_id", topic.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching problems:", error);
      return NextResponse.json(
        { error: "Failed to fetch problems" },
        { status: 500 }
      );
    }

    // 5) Format each problem (add number, random success_rate, etc.)
    const formattedProblems =
      (problems || []).map((problem, index) => ({
        ...problem,
        number: problem.number || String(index + 1),
        success_rate: Math.floor(Math.random() * 60) + 20,
      }));

    return NextResponse.json({ problems: formattedProblems });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
