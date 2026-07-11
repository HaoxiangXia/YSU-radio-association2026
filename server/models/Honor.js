const mongoose = require('mongoose');

const HonorSchema = new mongoose.Schema({
  title: { type: String, required: true },
  rank: { type: Number },
  year: { type: Number },
  description: { type: String }
});

module.exports = mongoose.model('Honor', HonorSchema);