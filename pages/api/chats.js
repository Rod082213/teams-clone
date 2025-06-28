// pages/api/chats.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // ... (your GET logic remains the same)
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required for GET requests' });
    }
    try {
      const chats = await prisma.chat.findMany({
        where: { participants: { some: { userId: String(userId) }}},
        include: {
          participants: { include: {  user: { select: { id: true, username: true, avatarUrl: true } },}},
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, username: true, avatarUrl: true }} }}
        },
        orderBy: { lastMessageAt: 'desc' },
      });
      res.status(200).json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ error: 'Could not fetch chats' });
    }
  } else if (req.method === 'POST') {
    const { name, isGroup, participantIds } = req.body;

    // Validation
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'Participant IDs are required.' });
    }
    if (!isGroup && participantIds.length !== 2) {
      return res.status(400).json({ error: 'Private chat requires exactly two participants.' });
    }
    // ... (other validations as before) ...
    if (!participantIds.every(id => typeof id === 'string' && id.trim() !== '')) {
      return res.status(400).json({ error: 'Invalid format for one or more participant IDs.' });
    }

    try {
      console.log('[API CHATS POST] Received data:', { name, isGroup, participantIds }); // <-- Log received data

      if (!isGroup && participantIds.length === 2) {
        const existingChat = await prisma.chat.findFirst({
          where: {
            isGroup: false,
            AND: [
              { participants: { every: { userId: { in: participantIds } } } },
              // { participants: { count: 2 } } // This specific count might be tricky, 'every' might be enough if IDs are unique
            ],
          },
        });
        if (existingChat) {
          console.log('[API CHATS POST] Found existing private chat:', existingChat);
          return res.status(200).json(existingChat);
        }
      }

      const chat = await prisma.chat.create({
        data: {
          name: isGroup ? name : null,
          isGroup,
          lastMessageAt: new Date(),
          participants: {
            create: participantIds.map((id) => {
              if (typeof id !== 'string' || id.trim() === '') {
                console.error('[API CHATS POST] Invalid participant ID in map during creation:', id);
                throw new Error('Invalid participant ID found during mapping for creation.');
              }
              return { userId: id };
            }),
          },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, username: true } },
            },
          },
        }
      });

      console.log('[API CHATS POST] Chat created successfully:', chat); // <-- Log success
      res.status(201).json(chat);

    } catch (error) {
      // --- THIS IS THE CRITICAL LOGGING SECTION FOR THE 500 ERROR ---
      console.error("-----------------------------------------------------");
      console.error("[API CHATS POST] !!!! ERROR CREATING CHAT !!!!");
      console.error("[API CHATS POST] Received Body:", req.body); // Log the body again in case of error
      console.error("[API CHATS POST] Full Error Object:", error);
      console.error("[API CHATS POST] Error Name:", error.name);
      console.error("[API CHATS POST] Error Message:", error.message);
      if (error.code) {
        console.error("[API CHATS POST] Prisma Error Code:", error.code);
      }
      if (error.meta && error.meta.target) { // Prisma often includes target fields in meta
        console.error("[API CHATS POST] Prisma Error Meta Target:", error.meta.target);
      }
      console.error("-----------------------------------------------------");
      // --- END CRITICAL LOGGING SECTION ---

      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Failed to create chat. Conflict with existing data (e.g., trying to create duplicate participant entry if constraints were different).' });
      } else if (error.code === 'P2003') { // Foreign key constraint failed
        return res.status(400).json({ error: 'Failed to create chat. One or more specified users do not exist.' });
      } else if (error.message && error.message.includes('Invalid participant ID found during mapping')) {
        return res.status(400).json({ error: 'Invalid participant ID provided.' });
      }
      // Generic fallback
      res.status(500).json({ error: 'Could not create chat due to a server error. Check server logs for details.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}