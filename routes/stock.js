const express = require('express');
const router = express.Router();
const StockEntry = require('../models/StockEntry');
const Category = require('../models/Category');

// Get all stock entries
router.get('/', async (req, res) => {
  try {
    const entries = await StockEntry.find()
      .populate('fabricType', 'name')
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get stock entries by type (inward/outward)
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const entries = await StockEntry.find({ type })
      .populate('fabricType', 'name')
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get stock entries by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const entries = await StockEntry.find({ fabricType: categoryId })
      .populate('fabricType', 'name')
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new stock entry
router.post('/', async (req, res) => {
  try {
    const { type, date, fabricType, quantity, remarks } = req.body;
    
    const stockEntry = new StockEntry({
      type,
      date: new Date(date),
      fabricType,
      quantity: parseFloat(quantity),
      remarks
    });

    const savedEntry = await stockEntry.save();
    const populatedEntry = await StockEntry.findById(savedEntry._id)
      .populate('fabricType', 'name');
    
    res.status(201).json(populatedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update stock entry
router.put('/:id', async (req, res) => {
  try {
    const { type, date, fabricType, quantity, remarks } = req.body;
    const entryId = req.params.id;

    const updatedEntry = await StockEntry.findByIdAndUpdate(
      entryId,
      {
        type,
        date: new Date(date),
        fabricType,
        quantity: parseFloat(quantity),
        remarks
      },
      { new: true }
    ).populate('fabricType', 'name');

    if (!updatedEntry) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }

    res.json(updatedEntry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete stock entry
router.delete('/:id', async (req, res) => {
  try {
    const entryId = req.params.id;
    const entry = await StockEntry.findByIdAndDelete(entryId);
    
    if (!entry) {
      return res.status(404).json({ message: 'Stock entry not found' });
    }

    res.json({ message: 'Stock entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalInward = await StockEntry.aggregate([
      { $match: { type: 'inward' } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const totalOutward = await StockEntry.aggregate([
      { $match: { type: 'outward' } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const categoryStats = await StockEntry.aggregate([
      {
        $group: {
          _id: '$fabricType',
          totalInward: {
            $sum: {
              $cond: [{ $eq: ['$type', 'inward'] }, '$quantity', 0]
            }
          },
          totalOutward: {
            $sum: {
              $cond: [{ $eq: ['$type', 'outward'] }, '$quantity', 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          categoryName: '$category.name',
          totalInward: 1,
          totalOutward: 1,
          available: { $subtract: ['$totalInward', '$totalOutward'] }
        }
      }
    ]);

    res.json({
      totalInward: totalInward[0]?.total || 0,
      totalOutward: totalOutward[0]?.total || 0,
      available: (totalInward[0]?.total || 0) - (totalOutward[0]?.total || 0),
      categoryStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 