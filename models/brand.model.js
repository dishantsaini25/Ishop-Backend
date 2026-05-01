const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true
    },
    image: {
      type: String,
      required: true
    },
    status: {
      type: Boolean,
      default: true
    },
    is_home: {
      type: Boolean,
      default: false
    },
    is_best: {
      type: Boolean,
      default: false
    },
    is_top: {
      type: Boolean,
      default: false
    },
    category_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category"
      }
    ]
  },
  { timestamps: true }
);

const BrandModel = mongoose.model("Brand", brandSchema);

module.exports = BrandModel;
