const mongoose = require('mongoose');

const TrainingSchema = new mongoose.Schema({
  year: { type: String },
  type: { type: String },
  count: { type: Number },
  participants: { type: Number },
  description: { type: String }
});

module.exports = mongoose.model('Training', TrainingSchema);