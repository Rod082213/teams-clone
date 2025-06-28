// pages/api/messages/[chatId].js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { chatId } = req.query;
  const { userId } = req.query; // User requesting messages, for read receipts

  if (req.method === 'GET') {
    try {
      const messages = await prisma.message.findMany({
        where: { chatId: String(chatId) },
        include: {
          sender: { select: { id: true, username: true, avatarUrl: true } },
          readReceipts: { // Include read receipts for each message
            select: {
              userId: true,
              user: { select: { username: true } },
              readAt: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
      });

      // Optionally, mark messages as read by this user (though client-side trigger is better)
      // This is just an example if you wanted server-side logic for it on fetch.
      // Better to do it when client confirms visibility.

      res.status(200).json(messages);
    } catch (error) {
      console.error(`Error fetching messages for chat ${chatId}:`, error);
      res.status(500).json({ error: 'Could not fetch messages' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}