import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

//  Initialize a Supabase admin client using your service‐role key 
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

//  Helper: Add CORS headers to all responses 
function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

// Helper: Safely extract a message from unknown error 
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

//  OPTIONS (CORS preflight) 
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

//  GET: fetch only the authenticated user's problems 
export async function GET(request: Request) {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return addCorsHeaders(
        new NextResponse(
          JSON.stringify({ error: "Missing Authorization token" }),
          { status: 401 }
        )
      );
    }

    // Verify the JWT and fetch the authenticated user
    const {
      data: { user },
      error: getUserError,
    } = await supabaseAdmin.auth.getUser(token);

    if (getUserError || !user) {
      return addCorsHeaders(
        new NextResponse(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 401 }
        )
      );
    }

    // Parse optional ?limit= query param
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // Fetch only rows where user_id = authenticated user
    let query = supabaseAdmin
      .from("problems")
      .select(`
        *,
        topics (
          name,
          slug
        )
      `)
      .eq("user_id", user.id) // filter by this user’s ID
      .order("created_at", { ascending: false });

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const { data: problems, error } = await query;

    if (error) {
      console.error("Error fetching problems:", error);
      return addCorsHeaders(
        new NextResponse(
          JSON.stringify({ error: "Failed to fetch problems" }),
          { status: 500 }
        )
      );
    }

    // Re‐format 
    const formattedProblems =
      problems?.map((problem) => ({
        ...problem,
        topic_name: problem.topics?.name,
        number: problem.number || String(Math.floor(Math.random() * 1000) + 1),
        success_rate: Math.floor(Math.random() * 60) + 20,
      })) || [];

    const resp = NextResponse.json({ problems: formattedProblems });
    return addCorsHeaders(resp);
  } catch (err) {
    console.error("Error in GET /api/problems:", err);
    const message = extractErrorMessage(err);
    return addCorsHeaders(
      new NextResponse(
        JSON.stringify({ error: `Internal server error: ${message}` }),
        { status: 500 }
      )
    );
  }
}

//  insert a new problem (with user_id) 
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      const resp = NextResponse.json(
        { success: false, error: "Missing Authorization token" },
        { status: 401 }
      );
      return addCorsHeaders(resp);
    }

    // Verify the JWT and fetch the authenticated user
    const {
      data: { user },
      error: getUserError,
    } = await supabaseAdmin.auth.getUser(token);

    if (getUserError || !user) {
      const resp = NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
      return addCorsHeaders(resp);
    }

    // Read the JSON body
    const body = await request.json();
    console.log("Received problem data:", body);

    const { problem } = body;
    if (!problem || !problem.title || !problem.url) {
      const resp = NextResponse.json(
        { success: false, error: "Invalid problem data - missing title or url" },
        { status: 400 }
      );
      return addCorsHeaders(resp);
    }

    // ─── Ensure the client isn't masquerading as another user ───────
    if (problem.user_id !== user.id) {
      const resp = NextResponse.json(
        { success: false, error: "user_id does not match authenticated user" },
        { status: 403 }
      );
      return addCorsHeaders(resp);
    }

    // ─── Find or fallback to default topic ───────────────────────────
    const topicSlug = problem.topic || "dynamic-programming";
    console.log("Looking for topic:", topicSlug);

    let topicToUse: { id: string; name: string } | null = null;
    {
      const { data: t, error: topicError } = await supabaseAdmin
        .from("topics")
        .select("id, name")
        .eq("slug", topicSlug)
        .single();
      if (topicError || !t) {
        console.log(
          "Topic not found or error encountered:",
          topicError,
          "; falling back to dynamic-programming"
        );
        const { data: def, error: defErr } = await supabaseAdmin
          .from("topics")
          .select("id, name")
          .eq("slug", "dynamic-programming")
          .single();

        if (!def || defErr) {
          const resp = NextResponse.json(
            { success: false, error: "No valid default topic found" },
            { status: 400 }
          );
          return addCorsHeaders(resp);
        }
        topicToUse = def;
      } else {
        topicToUse = t;
      }
    }
    console.log("Using topic:", topicToUse);

    // ─── Check if the problem already exists ─────────────────────────
    const {
      data: existingProblem,
      error: existingError,
    } = await supabaseAdmin
      .from("problems")
      .select("*")
      .eq("url", problem.url)
      .single();

    // “PGRST116” means “no rows found,” which is fine here
    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing problem:", existingError);
      const resp = NextResponse.json(
        { success: false, error: existingError.message },
        { status: 500 }
      );
      return addCorsHeaders(resp);
    }

    if (existingProblem) {
      console.log("Problem already exists:", existingProblem);
      const resp = NextResponse.json(
        {
          success: true,
          message: "Problem already exists",
          problem: existingProblem,
        },
        { status: 200 }
      );
      return addCorsHeaders(resp);
    }

    //  Insert the new problem row with user_id = user.id 
    const number = String(Math.floor(Math.random() * 1000) + 1);

    const {
      data: newProblem,
      error: insertError,
    } = await supabaseAdmin
      .from("problems")
      .insert({
        title: problem.title,
        url: problem.url,
        difficulty: problem.difficulty || "Medium",
        description: problem.description || "",
        platform: problem.platform || "unknown",
        topic_id: topicToUse!.id,
        notes: problem.notes || "",
        companies: problem.companies || [],
        tags: problem.topics || [],
        completed: false,
        number,
        user_id: user.id, // guaranteed to be non-null and valid
      })
      .select()
      .single();

    console.log("Insert result:", newProblem, "Error:", insertError);

    if (insertError) {
      console.error("Error saving problem:", insertError);
      const resp = NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
      return addCorsHeaders(resp);
    }

    const resp = NextResponse.json(
      {
        success: true,
        message: "Problem saved successfully",
        problem: newProblem,
      },
      { status: 200 }
    );
    return addCorsHeaders(resp);
  } catch (err: unknown) {
    const message = extractErrorMessage(err);
    console.error("Error saving problem:", message);
    const resp = NextResponse.json(
      { success: false, error: "Failed to save problem: " + message },
      { status: 500 }
    );
    return addCorsHeaders(resp);
  }
}
