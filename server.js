// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? `http://localhost:${PORT}` : process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${PORT}`,
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`SERVER: User connected: ${socket.id}`);

    socket.on('authenticate', (userId) => {
      if (!userId) {
        console.warn(`SERVER: Authentication attempt with no userId from socket ${socket.id}`);
        return;
      }
      socket.userId = userId;
      console.log(`SERVER: User ${userId} authenticated with socket ${socket.id}`);
    });

    socket.on('join_chat', (chatId) => {
      if (!chatId) {
        console.warn(`SERVER: Join chat attempt with no chatId from socket ${socket.id} (User: ${socket.userId})`);
        return;
      }
      socket.join(chatId);
      console.log(`SERVER: User ${socket.userId || socket.id} joined chat room: ${chatId}`);
    });

    socket.on('send_message', async (data) => {
      // ADD messageType and imageUrl to destructuring
      const { chatId, senderId, content, tempId, messageType, imageUrl } = data;

      // Modified validation: content is not required if it's an image message
      if (!chatId || !senderId) {
        console.error('SERVER: Missing chatId or senderId for send_message:', data);
        socket.emit('message_error', { message: 'Missing required fields for message (chatId or senderId).' });
        return;
      }

      // Validate messageType and corresponding fields
      const type = messageType || 'text'; // Default to 'text' if not provided
      if (type === 'image' && !imageUrl) {
        console.error('SERVER: Image messageType received without an imageUrl:', data);
        socket.emit('message_error', { message: 'Image URL is missing for an image message.' });
        return;
      }
      if (type === 'text' && !content) {
        console.error('SERVER: Text messageType received without content:', data);
        socket.emit('message_error', { message: 'Cannot send an empty text message.' });
        return;
      }

      if (!socket.userId || socket.userId !== senderId) {
        console.error(`SERVER: Unauthorized message send attempt. Socket User: ${socket.userId}, SenderId in payload: ${senderId}`);
        socket.emit('message_error', { message: 'Unauthorized to send message as this user.' });
        return;
      }

      try {
        const messageDataToCreate = {
          content: content || '', // Ensure content is at least an empty string, useful for images with no caption
          senderId,
          chatId,
          messageType: type,
          imageUrl: type === 'image' ? imageUrl : null, // Only store imageUrl if it's an image message
        };

        const message = await prisma.message.create({
          data: messageDataToCreate,
          include: {
            sender: { select: { id: true, username: true, avatarUrl: true } },
          },
        });

        try {
            await prisma.chat.update({
              where: { id: chatId },
              data: { lastMessageAt: new Date() }
            });
        } catch (chatUpdateError) {
            console.error(`SERVER: Failed to update lastMessageAt for chat ${chatId}:`, chatUpdateError);
        }
        
        // Broadcast the full message object, including tempId, messageType, and imageUrl
        // The client's 'receive_message' handler will get the full message object from Prisma,
        // which now includes messageType and imageUrl if they were set.
        io.to(chatId).emit('receive_message', { ...message, tempId: tempId });
        console.log(`SERVER: Message (type: ${message.messageType}) from ${senderId} (tempId: ${tempId || 'N/A'}) to chat ${chatId} - Emitted`);

      } catch (error) {
        console.error('SERVER: Error sending message:', error);
        socket.emit('message_error', { message: 'Failed to send message. Please try again.' });
      }
    });

    socket.on('message_read', async (data) => {
      const { messageId, userId, chatId } = data;

      if (!messageId || !userId || !chatId) {
         console.error('SERVER: Missing data for message_read:', data);
         return;
      }
       if (!socket.userId || socket.userId !== userId) {
        console.error(`SERVER: Unauthorized message_read attempt. Socket User: ${socket.userId}, UserId in payload: ${userId}`);
        return;
      }

      try {
        const existingReceipt = await prisma.readReceipt.findUnique({
          where: { messageId_userId: { messageId, userId } },
        });

        if (!existingReceipt) {
          const newReceipt = await prisma.readReceipt.create({
            data: { messageId, userId, readAt: new Date() },
            include: { user: { select: { username: true }} }
          });
          io.to(chatId).emit('read_receipt_update', {
            messageId, userId, readAt: newReceipt.readAt,
            username: newReceipt.user.username 
          });
          console.log(`SERVER: User ${userId} (${newReceipt.user.username}) read message ${messageId} in chat ${chatId}`);
        }
      } catch (error) {
        console.error('SERVER: Error recording read receipt:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`SERVER: User ${socket.userId || socket.id} disconnected. Reason: ${reason}`);
    });

    socket.on('error', (error) => {
        console.error(`SERVER: Socket error for ${socket.userId || socket.id}:`, error);
    });
  });

  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> SERVER: Ready on http://localhost:${PORT}`);
  });
});