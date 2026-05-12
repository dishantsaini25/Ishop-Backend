const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer/path to Cloudinary
 * @param {Buffer|string} fileData - file buffer or temp path
 * @param {string} folder - cloudinary folder name
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadToCloudinary = (fileData, folder = 'ishop/products') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    uploadStream.end(fileData);
  });
};

/**
 * Delete image from Cloudinary
 * @param {string} public_id
 */
const deleteFromCloudinary = async (public_id) => {
  try {
    if (!public_id) return;
    await cloudinary.uploader.destroy(public_id);
  } catch (e) {
    console.error('Cloudinary delete error:', e.message);
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, cloudinary };
