const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const StockEntry = require('../models/StockEntry');
const cloudinary = require('../utils/cloudinary');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new category
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    const image = req.files?.image;

    let imageUrl = '';
    if (image) {
      // Upload image to Cloudinary
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: 'fabric-categories',
        width: 300,
        crop: 'scale'
      });
      imageUrl = result.secure_url;
    }

    const category = new Category({
      name,
      description,
      image: imageUrl
    });

    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const image = req.files?.image;
    const categoryId = req.params.id;

    let updateData = { name, description };

    if (image) {
      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: 'fabric-categories',
        width: 300,
        crop: 'scale'
      });
      updateData.image = result.secure_url;
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // Delete all stock entries for this category
    await StockEntry.deleteMany({ fabricType: categoryId });
    
    // Delete the category
    const category = await Category.findByIdAndDelete(categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category and related stock entries deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 