// pages/api/messages/[chatId].js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Placeholder for auth - REPLACE WITH REAL AUTH
async function getAuthenticatedUserId(req) { return null; } 

export default async function handler(req, res) {
  const { chatId } = req.query;

  if (req.method === 'GET') {
    const { userId: requestingUserId } = req.query; // User requesting messages
    // ... (your existing GET logic for fetching messages) ...
    try {
      const messages = await prisma.message.findMany({
        where: { chatId: String(chatId) },
        include: {
          sender: { select: { id: true, username: true } },
          readReceipts: { 
            select: { userId: true, user: { select: { username: true } }, readAt: true }
          }
        },
        orderBy: { createdAt: 'asc' },
      });
      res.status(200).json(messages);
    } catch (error) {
      console.error(`Error fetching messages for chat ${chatId}:`, error);
      res.status(500).json({ error: 'Could not fetch messages' });
    }
  } else if (req.method === 'DELETE') { // <<<--- ADDING DELETE LOGIC HERE
    // This DELETE method will delete the ENTIRE CHAT associated with chatId
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required for deletion.' });
    }

    // --- AUTHORIZATION CHECK (Highly simplified) ---
    // const authenticatedUserId = await getAuthenticatedUserId(req);
    // if (!authenticatedUserId) return res.status(401).json({ error: 'Auth required' });
    // Verify user is part of this chat before deleting
    // const chatToVerify = await prisma.chat.findFirst({
    //   where: { 
    //     id: String(chatId), 
    //     participants: { some: { userId: authenticatedUserId }}
    //   }
    // });
    // if (!chatToVerify) return res.status(403).json({ error: 'Forbidden or chat not found' });
    // --- END AUTHORIZATION ---

    try {
      console.log(`SERVER: Attempting to delete chat ${chatId} and its related data via /api/messages endpoint.`);
      
      // 1. Delete ReadReceipts
      await prisma.readReceipt.deleteMany({
        where: { message: { chatId: String(chatId) } },
      });
      console.log(`SERVER: Deleted read receipts for chat ${chatId}`);

      // 2. Delete Messages
      await prisma.message.deleteMany({
        where: { chatId: String(chatId) },
      });
      console.log(`SERVER: Deleted messages for chat ${chatId}`);

      // 3. Delete ChatParticipants
      await prisma.chatParticipant.deleteMany({
        where: { chatId: String(chatId) },
      });
      console.log(`SERVER: Deleted chat participants for chat ${chatId}`);

      // 4. Delete Chat
      await prisma.chat.delete({
        where: { id: String(chatId) },
      });
      console.log(`SERVER: Deleted chat ${chatId}`);

      res.status(200).json({ message: 'Chat and all associated data deleted successfully' });
    } catch (error) {
      console.error(`SERVER: Error deleting chat ${chatId} via /api/messages:`, error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Chat not found or already deleted.' });
      }
      res.status(500).json({ error: 'Could not delete chat due to a server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']); // Add DELETE to Allow header
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}