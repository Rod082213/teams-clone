// pages/api/messages/[chatId].js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { chatId, userId } = req.query; // Get both chatId and userId

    // Basic validation
    if (!chatId || !userId) {
      return res.status(400).json({ error: 'chatId and userId are required.' });
    }

    try {
      // Step 1: Fetch the messages for the chat
      const messages = await prisma.message.findMany({
        where: { chatId: String(chatId) },
        include: {
          sender: { select: { id: true, username: true, avatarUrl: true } },
          readReceipts: {
            select: {
              userId: true,
              user: { select: { username: true } },
              readAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Step 2: Use the 'userId' to create read receipts for any unread messages.
      // This is the logic that fixes the "unused variable" error.
      const messageIds = messages.map((message) => message.id);

      if (messageIds.length > 0) {
        await prisma.readReceipt.createMany({
          data: messageIds.map((id) => ({
            messageId: id,
            userId: String(userId),
          })),
          skipDuplicates: true, // This is crucial! It prevents errors if a receipt already exists.
        });
      }

      // Step 3: Send the original messages back to the client.
      res.status(200).json(messages);
    } catch (error) {
      console.error(`Error fetching messages or creating read receipts for chat ${chatId}:`, error);
      res.status(500).json({ error: 'Could not fetch messages' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}