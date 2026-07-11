const mongoose = require('mongoose');

const CompetitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  year: { type: Number },
  participants: { type: Number },
  description: { type: String },
  tracks: [{ type: String }]
});

module.exports = mongoose.model('Competition', CompetitionSchema);