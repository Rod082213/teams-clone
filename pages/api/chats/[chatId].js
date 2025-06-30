// pages/api/messages/[chatId].js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/*
  1. This function was defined but never called, causing an error.
  It's commented out until you implement the authorization logic.
*/
// async function getAuthenticatedUserId(req) { return null; }

export default async function handler(req, res) {
  const { chatId } = req.query;

  if (req.method === 'GET') {
    /*
      2. This variable was assigned a value from the query but never used.
      It has been removed to fix the error.
    */
    // const { userId: requestingUserId } = req.query; 

    try {
      const messages = await prisma.message.findMany({
        where: { chatId: String(chatId) },
        include: {
          sender: { select: { id: true, username: true } },
          readReceipts: {
            select: { userId: true, user: { select: { username: true } }, readAt: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      res.status(200).json(messages);
    } catch (error) {
      console.error(`Error fetching messages for chat ${chatId}:`, error);
      res.status(500).json({ error: 'Could not fetch messages' });
    }
  } else if (req.method === 'DELETE') {
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required for deletion.' });
    }

    // --- AUTHORIZATION CHECK (Highly simplified) ---
    // The call to getAuthenticatedUserId is already commented out, which is why the function was unused.
    // const authenticatedUserId = await getAuthenticatedUserId(req); 
    // ...

    try {
      console.log(`SERVER: Attempting to delete chat ${chatId} and its related data via /api/messages endpoint.`);
      
      // Transaction to ensure all or nothing is deleted
      await prisma.$transaction([
        prisma.readReceipt.deleteMany({
          where: { message: { chatId: String(chatId) } },
        }),
        prisma.message.deleteMany({
          where: { chatId: String(chatId) },
        }),
        prisma.chatParticipant.deleteMany({
          where: { chatId: String(chatId) },
        }),
        prisma.chat.delete({
          where: { id: String(chatId) },
        })
      ]);

      console.log(`SERVER: Successfully deleted chat ${chatId} and all related data.`);
      res.status(200).json({ message: 'Chat and all associated data deleted successfully' });
    } catch (error) {
      console.error(`SERVER: Error deleting chat ${chatId} via /api/messages:`, error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Chat not found or already deleted.' });
      }
      res.status(500).json({ error: 'Could not delete chat due to a server error.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}