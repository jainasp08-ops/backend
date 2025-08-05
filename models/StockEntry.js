const mongoose = require('mongoose');

const stockEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['inward', 'outward']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  fabricType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  remarks: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StockEntry', stockEntrySchema); 