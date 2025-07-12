import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/mongodb";
import Topic from "@/models/Topic";
import Problem from "@/models/Problem";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Fetch all topics for this user
    const topics = await Topic.find({ userId }).sort({ name: 1 });

    // Get problem counts for each topic
    const topicsWithCounts = await Promise.all(
      topics.map(async (topic) => {
        const count = await Problem.countDocuments({
          userId,
          topicId: topic._id,
        });

        return {
          id: topic._id.toString(),
          name: topic.name,
          slug: topic.slug,
          description: topic.description,
          count,
        };
      })
    );

    return NextResponse.json({ topics: topicsWithCounts });
  } catch (error) {
    console.error("Error fetching topics:", error);
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

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Topic name is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const topic = new Topic({
      name,
      slug,
      description: description || "",
      userId,
    });

    await topic.save();

    return NextResponse.json({
      success: true,
      topic: {
        id: topic._id.toString(),
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
      },
    });
  } catch (error: any) {
    console.error("Error creating topic:", error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Topic with this name already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}