const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rows: { type: [String], required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    dateTime: {
      type: Date,
      required: true,
    },
    theme: {
      type: String,
      enum: ['violet', 'emerald', 'amber', 'rose', 'cyan'],
      default: 'violet',
    },
    rows: {
      type: [String],
      required: true,
    },
    cols: {
      type: Number,
      required: true,
    },
    tiers: {
      type: [tierSchema],
      required: true,
      validate: {
        validator: (tiers) => tiers.length > 0,
        message: 'An event must define at least one pricing tier.',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
