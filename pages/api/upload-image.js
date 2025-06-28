// pages/api/upload-image.js
import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

// Important: Tell Next.js not to parse the body, let formidable handle it
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const data = await new Promise((resolve, reject) => {
      const form = formidable({ multiples: false }); // Allow only single file upload for 'image'
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Formidable parsing error:', err);
          return reject(new Error('Error parsing form data.'));
        }
        if (!files.image || files.image.length === 0) {
          return reject(new Error('No image file provided.'));
        }
        resolve({ fields, files });
      });
    });

    const imageFile = data.files.image[0]; // formidable v3+ returns files.image as an array

    if (!imageFile) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    // Validate file type (optional, but good practice)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, GIF, WebP allowed.' });
    }

    // Validate file size (optional, e.g., 5MB limit)
    if (imageFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit.' });
    }
    
    console.log('SERVER: Uploading image to Cloudinary:', imageFile.originalFilename);

    // Upload to Cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(imageFile.filepath, {
      folder: 'chat_app_images', // Optional: organize in a folder in Cloudinary
      // public_id: `some_unique_name`, // Optional: define a specific public ID
      // transformation: [{ width: 500, height: 500, crop: "limit" }] // Optional: transform on upload
    });
    
    console.log('SERVER: Cloudinary upload response:', cloudinaryResponse.secure_url);

    if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
      throw new Error('Cloudinary upload failed.');
    }

    res.status(200).json({ imageUrl: cloudinaryResponse.secure_url });

  } catch (error) {
    console.error('SERVER: Image upload API error:', error);
    res.status(500).json({ error: error.message || 'Sorry, something went wrong during image upload.' });
  }
}