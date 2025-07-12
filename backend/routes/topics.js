const express = require('express');
const { body, validationResult } = require('express-validator');
const Topic = require('../models/Topic');
const Problem = require('../models/Problem');
const { simpleAuth } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(simpleAuth);

// @route   GET /api/topics
// @desc    Get all topics for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const topics = await Topic.find({ userId: req.userId }).sort({ name: 1 });

    const topicsWithCounts = await Promise.all(
      topics.map(async (topic) => {
        const count = await Problem.countDocuments({
          userId: req.userId,
          topicId: topic._id,
        });

        return {
          id: topic._id.toString(),
          name: topic.name,
          slug: topic.slug,
          description: topic.description,
          color: topic.color,
          icon: topic.icon,
          count,
        };
      })
    );

    res.json({ topics: topicsWithCounts });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/topics
// @desc    Create new topic
// @access  Private
router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Topic name is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, color, icon } = req.body;

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const topic = new Topic({
      name,
      slug,
      description: description || "",
      userId: req.userId,
      color: color || '#059669',
      icon: icon || '📚'
    });

    await topic.save();

    res.status(201).json({
      success: true,
      topic: {
        id: topic._id.toString(),
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
        color: topic.color,
        icon: topic.icon
      },
    });
  } catch (error) {
    console.error('Error creating topic:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Topic with this name already exists' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/topics/:slug
// @desc    Get topic by slug
// @access  Private
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const topic = await Topic.findOne({ slug, userId: req.userId });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const problems = await Problem.find({
      userId: req.userId,
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
      color: topic.color,
      icon: topic.icon,
      total_count,
      easy_count,
      medium_count,
      hard_count,
      solved_count,
      last_updated: new Date().toLocaleDateString(),
    };

    res.json({ topic: topicWithStats });
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/topics/:slug/problems
// @desc    Get problems for a topic
// @access  Private
router.get('/:slug/problems', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const topic = await Topic.findOne({ slug, userId: req.userId });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const problems = await Problem.find({
      userId: req.userId,
      topicId: topic._id,
    }).sort({ createdAt: -1 });

    const formattedProblems = problems.map((problem, index) => ({
      id: problem._id.toString(),
      title: problem.title,
      number: problem.number || String(index + 1),
      difficulty: problem.difficulty,
      completed: problem.completed,
      url: problem.url,
      platform: problem.platform,
      tags: problem.tags,
      companies: problem.companies,
      success_rate: Math.floor(Math.random() * 60) + 20,
    }));

    res.json({ problems: formattedProblems });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;