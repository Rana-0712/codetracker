import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/mongodb";
import Topic from "@/models/Topic";
import Problem from "@/models/Problem";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    await connectDB();

    // Find the topic by slug and userId
    const topic = await Topic.findOne({ slug, userId });

    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Get problem statistics for this topic and user
    const problems = await Problem.find({
      userId,
      topicId: topic._id,
    });

    const total_count = problems.length;
    const easy_count = problems.filter((p) => p.difficulty === "Easy").length;
    const medium_count = problems.filter((p) => p.difficulty === "Medium").length;
    const hard_count = problems.filter((p) => p.difficulty === "Hard").length;
    const solved_count = problems.filter((p) => p.completed).length;

    const topicWithStats = {
      id: topic._id.toString(),
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      total_count,
      easy_count,
      medium_count,
      hard_count,
      solved_count,
      last_updated: new Date().toLocaleDateString(),
    };

    return NextResponse.json({ topic: topicWithStats });
  } catch (error) {
    console.error("Error fetching topic:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}