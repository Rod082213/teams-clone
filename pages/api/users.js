// pages/api/users.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // This endpoint is primarily used by the "Start a New Chat" feature
    // to find an existing user by username.
    const { username } = req.body;

    if (!username || typeof username !== 'string' || username.trim() === '') {
      console.log('API /api/users: Received POST with invalid username:', username);
      return res.status(400).json({ error: 'Username is required and must be a non-empty string.' });
    }

    const searchUsername = username.trim();
    // const searchUsernameLower = username.trim().toLowerCase(); // For case-insensitive search

    console.log(`API /api/users: Received POST to find user: "${searchUsername}"`);

    try {
      // Using findUnique assumes your `username` field in Prisma schema has @unique
      // This will be case-sensitive on PostgreSQL by default.
      const user = await prisma.user.findUnique({
        where: {
          username: searchUsername,
          // username: searchUsernameLower, // If you store and search lowercase usernames
        },
        select: { id: true, username: true, avatarUrl: true } // Select only necessary fields
      });

      if (user) {
        console.log(`API /api/users: Found existing user:`, user);
        return res.status(200).json(user); // User found, return their details
      } else {
        console.log(`API /api/users: User "${searchUsername}" NOT FOUND in database.`);
        return res.status(404).json({ error: 'User not found. Please check the username or they may need to register.' });
      }
    } catch (error) {
      console.error("API /api/users: Prisma Error finding user:", error);
      return res.status(500).json({ error: 'Server error while trying to find user.' });
    }
  } else {
    res.setHeader('Allow', ['POST']); // This endpoint currently only supports POST
    return res.status(405).json({ error: `Method ${req.method} Not Allowed on /api/users` });
  }
}