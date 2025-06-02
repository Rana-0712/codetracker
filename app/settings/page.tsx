import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="sync">Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure your CodeTracker preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" placeholder="Your Name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your.email@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <select id="theme" className="w-full p-2 border rounded-md">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Topics</CardTitle>
              <CardDescription>Create, edit, or delete topics for organizing your problems.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Dynamic Programming</p>
                    <p className="text-sm text-muted-foreground">12 problems</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500">
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Arrays</p>
                    <p className="text-sm text-muted-foreground">8 problems</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500">
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">Strings</p>
                    <p className="text-sm text-muted-foreground">5 problems</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500">
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-2">Add New Topic</h3>
                <div className="space-y-2">
                  <Label htmlFor="topic-name">Topic Name</Label>
                  <Input id="topic-name" placeholder="e.g., Greedy Algorithms" />
                </div>
                <div className="space-y-2 mt-2">
                  <Label htmlFor="topic-description">Description (Optional)</Label>
                  <Textarea id="topic-description" placeholder="Brief description of this topic" />
                </div>
                <Button className="mt-4">Add Topic</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>Configure synchronization between the Chrome extension and web app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="auto-sync" className="rounded" />
                <Label htmlFor="auto-sync">Enable automatic sync</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sync-frequency">Sync Frequency</Label>
                <select id="sync-frequency" className="w-full p-2 border rounded-md">
                  <option value="realtime">Real-time</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">Last synced: 2 hours ago</p>
                <Button variant="outline">Sync Now</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export/Import</CardTitle>
              <CardDescription>Export your data or import from a backup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">Export all your saved problems as a JSON file.</p>
                <Button variant="outline">Export Data</Button>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm mb-2">Import problems from a JSON file.</p>
                <div className="flex gap-2">
                  <Input type="file" id="import-file" />
                  <Button>Import</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
