/* app/api/problems/[id]/route.ts */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize a Supabase client with the SERVICE-ROLE key
// (It must be a server‐only environment variable—never expose this on the front end.)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to extract and verify the JWT, then return the user ID.
// If invalid or missing, we respond with 401.
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

// ─── GET problem by ID (only if it belongs to the authenticated user) ─────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1) Verify JWT & get user_id
  const userIdOrResponse = await getUserIdFromRequest(request);
  if (typeof userIdOrResponse !== "string") {
    // That means it is a NextResponse (401). Return it directly.
    return userIdOrResponse;
  }
  const userId = userIdOrResponse;

  // 2) Extract the `id` param
  const { id } = await params;

  try {
    // 3) Fetch only if user_id matches
    const { data: problem, error } = await supabaseAdmin
      .from("problems")
      .select(`*, topics ( id, name, slug )`)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      // If row not found or user_id mismatch, return 404
      console.error("Error fetching problem:", error);
      return NextResponse.json(
        { error: "Problem not found or access denied" },
        { status: 404 }
      );
    }

    // Format as before
    const formattedProblem = {
      ...problem,
      topic_id: problem.topics?.id,
      topic_name: problem.topics?.name,
      number: problem.number || String(Math.floor(Math.random() * 1000) + 1),
      success_rate: Math.floor(Math.random() * 60) + 20,
    };

    return NextResponse.json({ problem: formattedProblem });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH update problem (only if it belongs to the authenticated user) ─────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1) Verify JWT & get user_id
  const userIdOrResponse = await getUserIdFromRequest(request);
  if (typeof userIdOrResponse !== "string") {
    // That means it's a 401 response
    return userIdOrResponse;
  }
  const userId = userIdOrResponse;

  // 2) Extract the `id` param
  const { id } = await params;

  try {
    const body = await request.json();
    const { completed, notes } = body;

    const updateData: Partial<{ completed: boolean; notes: string }> = {};
    if (typeof completed === "boolean") updateData.completed = completed;
    if (typeof notes === "string") updateData.notes = notes;

    // 3) Only update if user_id matches as well
    const { data, error } = await supabaseAdmin
      .from("problems")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating problem:", error);
      // Could be “not found” or “access denied”
      return NextResponse.json(
        { error: "Failed to update or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, problem: data });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to update problem" },
      { status: 500 }
    );
  }
}

// ─── DELETE problem by ID (only if it belongs to the authenticated user) ─────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1) Verify JWT & get user_id
  const userIdOrResponse = await getUserIdFromRequest(request);
  if (typeof userIdOrResponse !== "string") {
    // That means it's a 401 response
    return userIdOrResponse;
  }
  const userId = userIdOrResponse;

  // 2) Extract the `id` param
  const { id } = await params;

  try {
    // 3) Only delete if user_id matches
    const { error } = await supabaseAdmin
      .from("problems")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting problem:", error);
      return NextResponse.json(
        { error: "Failed to delete or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to delete problem" },
      { status: 500 }
    );
  }
}
