const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        trim: true,
        required: true,
        maxlength: 100
    },
    slug: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true

    },
    description: {
        type: String,
    },
    thumbnail: {
        type: String,
        required: true
    },
    original_price: {
        type: Number,
        required: true
    },
    discount_price: {
        type: Number,
        default: 0
    },
    final_price: {
        type: Number,
        required: true
    },
    stock: {
        type: Boolean,
        default: true
    },
    status: {
        type: Boolean,
        default: true
    },
    is_best_seller: {
        type: Boolean,
        default: false
    },
    show_home: {
        type: Boolean,
        default: false
    },
    is_featured: {
        type: Boolean,
        default: false
    },
    is_hot: {
        type: Boolean,
        default: false
    },
    // ==================== DEAL OF THE DAY ====================
    deal_of_day: {
        is_deal: {
            type: Boolean,
            default: false
        },
        deal_end_time: {
            type: Date,
            default: null
        },
        deal_discount_percent: {
            type: Number,
            default: 0
        },
        sold_count: {
            type: Number,
            default: 0
        },
        total_stock_for_deal: {
            type: Number,
            default: 0
        }
    },
    other_images: [{
        type: String,
        default: []
    }],
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: true
    },
    color_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Color'
    }],
    brand_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true
    }
},
    {
        timestamps: true
    }
);

const productModel = mongoose.model('products', ProductSchema);

module.exports = productModel;


