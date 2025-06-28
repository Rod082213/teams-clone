// pages/api/users/block.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  // TODO: Implement proper authentication to get current authenticated blockerUserId
  // const blockerUserId = getAuthenticatedUserId(req); // Placeholder

  if (req.method === 'POST') { // Block a user
    const { blockerUserId, blockedUserId } = req.body; // Client needs to send both

    if (!blockerUserId || !blockedUserId) {
      return res.status(400).json({ error: 'Blocker ID and Blocked User ID are required.' });
    }
    if (blockerUserId === blockedUserId) {
      return res.status(400).json({ error: 'Cannot block yourself.' });
    }

    try {
      await prisma.block.create({
        data: {
          blockerId: blockerUserId,
          blockedId: blockedUserId,
        },
      });
      res.status(201).json({ message: `User ${blockedUserId} blocked successfully.` });
    } catch (error) {
      if (error.code === 'P2002') { // Unique constraint failed (already blocked)
        return res.status(409).json({ error: 'User already blocked.' });
      }
      if (error.code === 'P2003') { // Foreign key constraint (user doesn't exist)
         return res.status(404).json({ error: 'One or both users not found.'});
      }
      console.error('Error blocking user:', error);
      res.status(500).json({ error: 'Could not block user.' });
    }
  } else if (req.method === 'DELETE') { // Unblock a user
    // For DELETE, IDs might come from query params or body
    const { blockerUserId, blockedUserId } = req.body; // Or req.query

    if (!blockerUserId || !blockedUserId) {
      return res.status(400).json({ error: 'Blocker ID and Blocked User ID are required.' });
    }

    try {
      await prisma.block.delete({
        where: {
          blockerId_blockedId: { // Using the composite ID defined in schema
            blockerId: blockerUserId,
            blockedId: blockedUserId,
          },
        },
      });
      res.status(200).json({ message: `User ${blockedUserId} unblocked successfully.` });
    } catch (error) {
      if (error.code === 'P2025') { // Record to delete not found
        return res.status(404).json({ error: 'Block relationship not found.' });
      }
      console.error('Error unblocking user:', error);
      res.status(500).json({ error: 'Could not unblock user.' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}