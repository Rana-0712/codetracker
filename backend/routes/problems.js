const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const Topic = require('../models/Topic');
const { simpleAuth } = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware to all routes
router.use(simpleAuth);

// @route   GET /api/problems
// @desc    Get all problems for user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    let query = Problem.find({ userId: req.userId })
      .populate('topicId', 'name slug')
      .sort({ createdAt: -1 });

    if (limitNum) {
      query = query.limit(limitNum);
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

    res.json({ problems: formattedProblems });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   POST /api/problems
// @desc    Create new problem
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { problem } = req.body;

    if (!problem || !problem.title || !problem.url) {
      return res.status(400).json({ error: 'Invalid problem data - missing title or url' });
    }

    // Find or create default topic
    const topicSlug = problem.topic || "dynamic-programming";
    let topic = await Topic.findOne({ slug: topicSlug, userId: req.userId });

    if (!topic) {
      topic = new Topic({
        name: "Dynamic Programming",
        slug: "dynamic-programming",
        description: "Dynamic Programming problems",
        userId: req.userId,
      });
      await topic.save();
    }

    // Check if problem already exists for this user
    const existingProblem = await Problem.findOne({
      url: problem.url,
      userId: req.userId,
    });

    if (existingProblem) {
      return res.json({
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
      userId: req.userId,
    });

    await newProblem.save();

    res.json({
      success: true,
      message: "Problem saved successfully",
      problem: newProblem,
    });
  } catch (error) {
    console.error('Error saving problem:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: "Problem already exists" });
    }

    res.status(500).json({ success: false, error: "Failed to save problem" });
  }
});

// @route   GET /api/problems/:id
// @desc    Get problem by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid problem ID' });
    }

    const problem = await Problem.findOne({
      _id: id,
      userId: req.userId,
    }).populate('topicId', 'name slug');

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
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

    res.json({ problem: formattedProblem });
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   PATCH /api/problems/:id
// @desc    Update problem
// @access  Private
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid problem ID' });
    }

    const { completed, notes } = req.body;

    const updateData = {};
    if (typeof completed === "boolean") updateData.completed = completed;
    if (typeof notes === "string") updateData.notes = notes;

    const problem = await Problem.findOneAndUpdate(
      { _id: id, userId: req.userId },
      updateData,
      { new: true }
    );

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json({ success: true, problem });
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ error: 'Failed to update problem' });
  }
});

// @route   DELETE /api/problems/:id
// @desc    Delete problem
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid problem ID' });
    }

    const problem = await Problem.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ error: 'Failed to delete problem' });
  }
});

// @route   POST /api/problems/check
// @desc    Check if problem exists
// @access  Private
router.post('/check', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const problem = await Problem.findOne({
      url,
      userId: req.userId,
    });

    res.json({ exists: !!problem });
  } catch (error) {
    console.error('Error checking problem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;