import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const AddTopicPage = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Topic name is required');
      return;
    }

    try {
      setLoading(true);
      
      await axios.post('/api/topics', {
        name: formData.name,
        description: formData.description
      });

      navigate('/');
    } catch (error) {
      console.error('Error creating topic:', error);
      alert('Failed to create topic. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        Please sign in to create topics
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Topic Name</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="e.g., Greedy Algorithms" 
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Brief description of this topic"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Topic'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddTopicPage;