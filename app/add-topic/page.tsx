import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function createTopic(formData: FormData) {
  "use server"

  const name = formData.get("name") as string
  const description = formData.get("description") as string

  if (!name) {
    return
  }

  // Create slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  const { error } = await supabase.from("topics").insert({
    name,
    slug,
    description: description || "",
  })

  if (!error) {
    redirect("/")
  }
}

export default function AddTopicPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Add New Topic</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Create Topic</CardTitle>
          <CardDescription>Add a new topic category to organize your problems.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTopic} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Topic Name</Label>
              <Input id="name" name="name" placeholder="e.g., Greedy Algorithms" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" name="description" placeholder="Brief description of this topic" />
            </div>
            <Button type="submit" className="w-full">
              Create Topic
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
