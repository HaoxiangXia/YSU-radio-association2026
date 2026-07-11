const mongoose = require('mongoose');

const AssociationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  englishName: { type: String },
  abbreviation: { type: String },
  establishmentYear: { type: Number },
  motto: { type: String },
  slogan: { type: String },
  description: { type: String },
  memberCount: { type: Number },
  starRating: { type: Number },
  awards: [{ type: String }]
});

module.exports = mongoose.model('Association', AssociationSchema);