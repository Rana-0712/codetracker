/* eslint-disable @typescript-eslint/no-unused-vars */


import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Add CORS headers to all responses
function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  return response
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }))
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") ? Number.parseInt(url.searchParams.get("limit")!) : undefined

    let query = supabase
      .from("problems")
      .select(`
        *,
        topics (
          name,
          slug
        )
      `)
      .order("created_at", { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data: problems, error } = await query

    if (error) {
      console.error("Error fetching problems:", error)
      const response = NextResponse.json({ error: "Failed to fetch problems" }, { status: 500 })
      return addCorsHeaders(response)
    }

    // Format problems to match the expected structure
    const formattedProblems =
      problems?.map((problem) => ({
        ...problem,
        topic_name: problem.topics?.name,
        number: problem.number || String(Math.floor(Math.random() * 1000) + 1), // Fallback if number is not set
        success_rate: Math.floor(Math.random() * 60) + 20, // Random success rate for demo
      })) || []

    const response = NextResponse.json({ problems: formattedProblems })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("Error:", error)
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 })
    return addCorsHeaders(response)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Received problem data:", body)

    const { problem } = body

    // Validate the request body
    if (!problem || !problem.title || !problem.url) {
      console.log("Invalid problem data:", problem)
      const response = NextResponse.json({ error: "Invalid problem data - missing title or url" }, { status: 400 })
      return addCorsHeaders(response)
    }

    // Default topic if not provided
    const topicSlug = problem.topic || "dynamic-programming"
    console.log("Looking for topic:", topicSlug)

    // Get topic ID from slug
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("id, name")
      .eq("slug", topicSlug)
      .single()

    console.log("Topic found:", topic, "Error:", topicError)

    if (!topic) {
      // If topic not found, create it or use default
      console.log("Topic not found, using dynamic-programming as default")
      const { data: defaultTopic } = await supabase
        .from("topics")
        .select("id, name")
        .eq("slug", "dynamic-programming")
        .single()

      if (!defaultTopic) {
        const response = NextResponse.json({ error: "No valid topic found" }, { status: 400 })
        return addCorsHeaders(response)
      }

      // Use default topic
      const topicToUse = defaultTopic
      console.log("Using default topic:", topicToUse)

      // Check if problem already exists
      const { data: existingProblem } = await supabase.from("problems").select("*").eq("url", problem.url).single()

      if (existingProblem) {
        console.log("Problem already exists:", existingProblem)
        const response = NextResponse.json(
          {
            success: true,
            message: "Problem already exists",
            problem: existingProblem,
          },
          { status: 200 },
        )
        return addCorsHeaders(response)
      }

      // Generate a problem number
      const number = String(Math.floor(Math.random() * 1000) + 1)

      // Insert the problem with default topic
      const { data: newProblem, error: insertError } = await supabase
        .from("problems")
        .insert({
          title: problem.title,
          url: problem.url,
          difficulty: problem.difficulty || "Medium",
          description: problem.description || "",
          platform: problem.platform || "unknown",
          topic_id: topicToUse.id,
          notes: problem.notes || "",
          companies: problem.companies || [],
          tags: problem.topics || [],
          completed: false,
          number: number,
        })
        .select()
        .single()

      console.log("Insert result:", newProblem, "Error:", insertError)

      if (insertError) {
        console.error("Error saving problem:", insertError)
        const response = NextResponse.json({ error: "Failed to save problem: " + insertError.message }, { status: 500 })
        return addCorsHeaders(response)
      }

      const response = NextResponse.json({
        success: true,
        message: "Problem saved successfully with default topic",
        problem: newProblem,
      })
      return addCorsHeaders(response)
    }

    // Check if problem already exists
    const { data: existingProblem } = await supabase.from("problems").select("*").eq("url", problem.url).single()

    if (existingProblem) {
      console.log("Problem already exists:", existingProblem)
      const response = NextResponse.json(
        {
          success: true,
          message: "Problem already exists",
          problem: existingProblem,
        },
        { status: 200 },
      )
      return addCorsHeaders(response)
    }

    // Generate a problem number
    const number = String(Math.floor(Math.random() * 1000) + 1)

    // Insert the problem
    const { data: newProblem, error: insertError } = await supabase
      .from("problems")
      .insert({
        title: problem.title,
        url: problem.url,
        difficulty: problem.difficulty || "Medium",
        description: problem.description || "",
        platform: problem.platform || "unknown",
        topic_id: topic.id,
        notes: problem.notes || "",
        companies: problem.companies || [],
        tags: problem.topics || [],
        completed: false,
        number: number,
      })
      .select()
      .single()

    console.log("Insert result:", newProblem, "Error:", insertError)

    if (insertError) {
      console.error("Error saving problem:", insertError)
      const response = NextResponse.json({ error: "Failed to save problem: " + insertError.message }, { status: 500 })
      return addCorsHeaders(response)
    }

    const response = NextResponse.json({
      success: true,
      message: "Problem saved successfully",
      problem: newProblem,
    })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("Error saving problem:", error)
    const response = NextResponse.json({ error: "Failed to save problem: " + error }, { status: 500 })
    return addCorsHeaders(response)
  }
}
