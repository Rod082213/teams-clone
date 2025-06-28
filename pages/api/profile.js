// pages/api/users/profile.js
import { PrismaClient } from '@prisma/client';
import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary'; // Assuming you're using Cloudinary

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const config = {
  api: {
    bodyParser: false, // Let formidable/multer parse the body
  },
};

export default async function handler(req, res) {
  // TODO: Get authenticatedUserId from session (e.g., NextAuth.js)
  // For now, we'll assume the client sends it, which is NOT secure for production.
  // const authenticatedUserId = getUserIdFromSession(req); 

  if (req.method === 'PUT') { // Use PUT for updates
    try {
      const data = await new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          // formidable wraps single string fields in arrays, so unwrap them
          const unwrappedFields = {};
          for (const key in fields) {
            unwrappedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
          }
          resolve({ fields: unwrappedFields, files });
        });
      });

      const { userId, username } = data.fields; // Client MUST send userId to identify who to update
      const avatarFile = data.files.avatar ? data.files.avatar[0] : null;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required to update profile.' });
      }

      // --- AUTHORIZATION (CRUCIAL in real app) ---
      // if (authenticatedUserId !== userId) {
      //   return res.status(403).json({ error: 'Unauthorized to update this profile.' });
      // }
      // ---

      const updateData = {};

      if (username) {
        // Check if new username is already taken by another user
        if (typeof username !== 'string' || username.trim().length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters.' });
        }
        const existingUserWithNewUsername = await prisma.user.findFirst({
          where: {
            username: username.trim(),
            NOT: { id: userId }, // Exclude the current user
          },
        });
        if (existingUserWithNewUsername) {
          return res.status(409).json({ error: 'Username already taken.' });
        }
        updateData.username = username.trim();
      }

      if (avatarFile) {
        // Validate file type and size (similar to chat image upload)
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(avatarFile.mimetype)) {
          return res.status(400).json({ error: 'Invalid avatar file type.' });
        }
        if (avatarFile.size > 2 * 1024 * 1024) { // 2MB limit for avatars
          return res.status(400).json({ error: 'Avatar file size exceeds 2MB.' });
        }

        const cloudinaryResponse = await cloudinary.uploader.upload(avatarFile.filepath, {
          folder: 'user_avatars',
          transformation: [{ width: 200, height: 200, crop: "fill", gravity: "face" }] // Resize and crop
        });
        if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
          throw new Error('Avatar upload to Cloudinary failed.');
        }
        updateData.avatarUrl = cloudinaryResponse.secure_url;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No update data provided (username or avatar).' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, username: true, avatarUrl: true, createdAt: true, updatedAt: true } // Don't send passwordHash
      });

      res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });

    } catch (error) {
      console.error('SERVER: Profile update error:', error);
      res.status(500).json({ error: error.message || 'Could not update profile.' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}