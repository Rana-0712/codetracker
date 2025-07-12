import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Home = () => {
  const navigate = useNavigate();
  const { isSignedIn, user } = useAuth();

  const [topics, setTopics] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [topicsRes, problemsRes] = await Promise.all([
          axios.get('/api/topics'),
          axios.get('/api/problems?limit=20')
        ]);

        setTopics(topicsRes.data.topics || []);
        setProblems(problemsRes.data.problems || []);
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSignedIn, user]);

  const toggleCompletion = async (id) => {
    const target = problems.find((p) => p.id === id);
    if (!target) return;

    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p))
    );

    try {
      await axios.patch(`/api/problems/${id}`, {
        completed: !target.completed
      });
    } catch (err) {
      console.error('Toggle error', err);
      setProblems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, completed: target.completed } : p))
      );
    }
  };

  const deleteProblem = async (id) => {
    const target = problems.find((p) => p.id === id);
    if (!target) return;

    setProblems((prev) => prev.filter((p) => p.id !== id));

    try {
      await axios.delete(`/api/problems/${id}`);
    } catch (err) {
      console.error('Delete error', err);
      setProblems((prev) => [...prev, target]);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to CodeTracker</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access your problems</p>
        </div>
      </div>
    );
  }

  const filteredProblems = problems.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Topics */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          {topics.map((topic) => (
            <Link to={`/topics/${topic.slug}`} key={topic.id}>
              <Badge
                variant="outline"
                className="py-2 px-4 text-base hover:bg-primary/10 cursor-pointer"
              >
                {topic.name}
                <span className="ml-2 text-muted-foreground">{topic.count}</span>
              </Badge>
            </Link>
          ))}
          <Button variant="ghost" size="sm" className="gap-1">
            <span>More</span>
            <span className="text-muted-foreground">▼</span>
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search questions"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-1">
            {filteredProblems.map((problem, index) => (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <div
                  className={`flex items-center h-16 p-4 rounded-md hover:bg-muted/50 ${
                    problem.completed ? "border-l-4 border-green-500" : ""
                  }`}
                >
                  <div
                    onClick={() => toggleCompletion(problem.id)}
                    className="w-6 mr-4 flex-shrink-0 text-muted-foreground cursor-pointer"
                  >
                    {problem.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-muted-foreground/30" />
                    )}
                  </div>

                  <Link
                    to={`/problem/${problem.id}`}
                    className="flex items-center flex-1 ml-4 truncate"
                  >
                    <div className="w-12 mr-4 flex-shrink-0 font-mono">
                      {problem.number}.
                    </div>
                    <div className="flex-1 font-medium truncate">
                      {problem.title}
                    </div>
                    <div className="flex-shrink-0 w-36 ml-2 mr-4 overflow-hidden whitespace-nowrap">
                      {problem.tags?.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="inline-block mr-1 text-sm px-2 py-1"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {problem.tags && problem.tags.length > 2 && (
                        <Badge
                          variant="outline"
                          className="inline-block mr-1 text-sm px-2 py-1"
                        >
                          +{problem.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                    <div className="w-24 flex-shrink-0 text-right">
                      <Badge
                        variant="outline"
                        className={`${
                          problem.difficulty === "Easy"
                            ? "text-green-500 border-green-500/30"
                            : problem.difficulty === "Medium"
                            ? "text-yellow-500 border-yellow-500/30"
                            : "text-red-500 border-red-500/30"
                        }`}
                      >
                        {problem.difficulty}
                      </Badge>
                    </div>
                  </Link>

                  <div className="w-8 ml-4 flex-shrink-0 text-center">
                    <a
                      href={problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </a>
                  </div>

                  <div
                    onClick={() => deleteProblem(problem.id)}
                    className="w-8 ml-2 flex-shrink-0 text-center cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;