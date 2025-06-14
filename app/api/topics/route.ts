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

// ─── GET: Return all topics, each with a count of THIS USER’s problems ───────────────
export async function GET(request: Request) {
  try {
    // 1) Verify JWT & get user ID
    const userIdOrResponse = await getUserIdFromRequest(request);
    if (typeof userIdOrResponse !== "string") {
      // Means it’s a NextResponse(401). Return it immediately.
      return userIdOrResponse;
    }
    const userId = userIdOrResponse;

    // 2) Fetch all topics (id, name, slug, description), ordered by name
    const { data: topics, error: topicsError } = await supabaseAdmin
      .from("topics")
      .select(`
        id,
        name,
        slug,
        description
      `)
      .order("name", { ascending: true });

    if (topicsError) {
      console.error("Error fetching topics:", topicsError);
      return NextResponse.json(
        { error: "Failed to fetch topics" },
        { status: 500 }
      );
    }

    // 3) For each topic, count only this user’s problems
    const topicsWithCounts = await Promise.all(
      (topics || []).map(async (topic) => {
        const { count, error: countError } = await supabaseAdmin
          .from("problems")
          .select("*", { count: "exact", head: true })
          .eq("topic_id", topic.id)
          .eq("user_id", userId);

        if (countError) {
          console.error(
            `Error counting problems for topic ${topic.id}:`,
            countError
          );
        }

        return {
          id: topic.id,
          name: topic.name,
          slug: topic.slug,
          description: topic.description,
          count: count ?? 0,
        };
      })
    );

    return NextResponse.json({ topics: topicsWithCounts });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
