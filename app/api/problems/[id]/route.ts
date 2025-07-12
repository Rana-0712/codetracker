import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/mongodb";
import Problem from "@/models/Problem";
import mongoose from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid problem ID" }, { status: 400 });
    }

    await connectDB();

    const problem = await Problem.findOne({
      _id: id,
      userId,
    }).populate('topicId', 'name slug');

    if (!problem) {
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      );
    }

    const formattedProblem = {
      id: problem._id.toString(),
      title: problem.title,
      number: problem.number || String(Math.floor(Math.random() * 1000) + 1),
      difficulty: problem.difficulty,
      completed: problem.completed,
      url: problem.url,
      platform: problem.platform,
      description: problem.description,
      notes: problem.notes,
      companies: problem.companies,
      tags: problem.tags,
      topic_id: problem.topicId?._id.toString(),
      topic_name: problem.topicId?.name,
      success_rate: Math.floor(Math.random() * 60) + 20,
    };

    return NextResponse.json({ problem: formattedProblem });
  } catch (error) {
    console.error("Error fetching problem:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid problem ID" }, { status: 400 });
    }

    const body = await request.json();
    const { completed, notes } = body;

    await connectDB();

    const updateData: any = {};
    if (typeof completed === "boolean") updateData.completed = completed;
    if (typeof notes === "string") updateData.notes = notes;

    const problem = await Problem.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!problem) {
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, problem });
  } catch (error) {
    console.error("Error updating problem:", error);
    return NextResponse.json(
      { error: "Failed to update problem" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid problem ID" }, { status: 400 });
    }

    await connectDB();

    const problem = await Problem.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!problem) {
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting problem:", error);
    return NextResponse.json(
      { error: "Failed to delete problem" },
      { status: 500 }
    );
  }
}