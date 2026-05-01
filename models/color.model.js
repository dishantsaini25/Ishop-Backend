const mongoose = require("mongoose");

const ColorSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  color_code: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });
const ColorModel = mongoose.model("Color", ColorSchema);
module.exports = ColorModel;
