const Rule = require("../models/Rule");

// @desc    Get all rules
// @route   GET /api/rules
// @access  Private
exports.getRules = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ displayOrder: 1, createdAt: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// @desc    Create a rule
// @route   POST /api/rules
// @access  Private (Admin only)
exports.createRule = async (req, res) => {
  const { title, content, displayOrder } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ msg: "Please provide both title and content" });
  }

  try {
    const rule = await Rule.create({
      title,
      content,
      displayOrder: displayOrder || 0,
      lastUpdatedBy: req.user?.id || req.user?._id
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// @desc    Update a rule
// @route   PUT /api/rules/:id
// @access  Private (Admin only)
exports.updateRule = async (req, res) => {
  const { title, content, displayOrder } = req.body;
  try {
    let rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ msg: "Rule not found" });
    }

    rule.title = title || rule.title;
    rule.content = content || rule.content;
    rule.displayOrder = displayOrder !== undefined ? displayOrder : rule.displayOrder;
    rule.lastUpdatedBy = req.user?.id || req.user?._id;

    await rule.save();
    res.json(rule);
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

// @desc    Delete a rule
// @route   DELETE /api/rules/:id
// @access  Private (Admin only)
exports.deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ msg: "Rule not found" });
    }
    await rule.deleteOne();
    res.json({ msg: "Rule removed" });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
