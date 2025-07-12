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

    // Fetch problems for this topic and user
    const problems = await Problem.find({
      userId,
      topicId: topic._id,
    }).sort({ createdAt: -1 });

    // Format problems with additional fields
    const formattedProblems = problems.map((problem, index) => ({
      id: problem._id.toString(),
      title: problem.title,
      number: problem.number || String(index + 1),
      difficulty: problem.difficulty,
      completed: problem.completed,
      url: problem.url,
      platform: problem.platform,
      tags: problem.tags,
      success_rate: Math.floor(Math.random() * 60) + 20, // Random for demo
    }));

    return NextResponse.json({ problems: formattedProblems });
  } catch (error) {
    console.error("Error fetching problems:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}