import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params before using its properties
    const { id } = await params;

    // Get problem details
    const { data: problem, error } = await supabase
      .from("problems")
      .select(`
        *,
        topics (
          id,
          name,
          slug
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching problem:", error);
      return NextResponse.json(
        { error: "Failed to fetch problem" },
        { status: 500 }
      );
    }

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // Format problem to match the expected structure
    const formattedProblem = {
      ...problem,
      topic_id: problem.topics?.id,
      topic_name: problem.topics?.name,
      number: problem.number || String(Math.floor(Math.random() * 1000) + 1), // Fallback if number is not set
      success_rate: Math.floor(Math.random() * 60) + 20, // Random success rate for demo
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params before using its properties
    const { id } = await params;
    const body = await request.json();
    const { completed, notes } = body;

    const updateData: any = {};
    if (typeof completed === "boolean") updateData.completed = completed;
    if (typeof notes === "string") updateData.notes = notes;

    const { data, error } = await supabase
      .from("problems")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating problem:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params before using its properties
    const { id } = await params;

    const { error } = await supabase.from("problems").delete().eq("id", id);

    if (error) {
      console.error("Error deleting problem:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
