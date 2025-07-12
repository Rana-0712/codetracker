import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/mongodb";
import Problem from "@/models/Problem";
import Topic from "@/models/Topic";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    await connectDB();

    let query = Problem.find({ userId })
      .populate('topicId', 'name slug')
      .sort({ createdAt: -1 });

    if (limit) {
      query = query.limit(limit);
    }

    const problems = await query;

    const formattedProblems = problems.map((problem) => ({
      id: problem._id.toString(),
      title: problem.title,
      number: problem.number || String(Math.floor(Math.random() * 1000) + 1),
      difficulty: problem.difficulty,
      completed: problem.completed,
      url: problem.url,
      platform: problem.platform,
      tags: problem.tags,
      companies: problem.companies,
      notes: problem.notes,
      topic_name: problem.topicId?.name,
      success_rate: Math.floor(Math.random() * 60) + 20,
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

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { problem } = body;

    if (!problem || !problem.title || !problem.url) {
      return NextResponse.json(
        { error: "Invalid problem data - missing title or url" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find or create default topic
    const topicSlug = problem.topic || "dynamic-programming";
    let topic = await Topic.findOne({ slug: topicSlug, userId });

    if (!topic) {
      // Create default topic if it doesn't exist
      topic = new Topic({
        name: "Dynamic Programming",
        slug: "dynamic-programming",
        description: "Dynamic Programming problems",
        userId,
      });
      await topic.save();
    }

    // Check if problem already exists for this user
    const existingProblem = await Problem.findOne({
      url: problem.url,
      userId,
    });

    if (existingProblem) {
      return NextResponse.json({
        success: true,
        message: "Problem already exists",
        problem: existingProblem,
      });
    }

    // Create new problem
    const number = String(Math.floor(Math.random() * 1000) + 1);

    const newProblem = new Problem({
      title: problem.title,
      url: problem.url,
      difficulty: problem.difficulty || "Medium",
      description: problem.description || "",
      platform: problem.platform || "unknown",
      topicId: topic._id,
      notes: problem.notes || "",
      companies: problem.companies || [],
      tags: problem.topics || [],
      completed: false,
      number,
      userId,
    });

    await newProblem.save();

    return NextResponse.json({
      success: true,
      message: "Problem saved successfully",
      problem: newProblem,
    });
  } catch (error: any) {
    console.error("Error saving problem:", error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Problem already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to save problem" },
      { status: 500 }
    );
  }
}