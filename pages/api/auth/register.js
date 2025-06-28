// pages/api/auth/register.js
import { PrismaClient } from '@prisma/client';
// In a real app, you'd use a library like bcrypt for password hashing
// const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// !!! WARNING: THIS IS A SIMPLIFIED IN-MEMORY STORE FOR DEMONSTRATION !!!
// !!! DO NOT USE IN PRODUCTION. USE A DATABASE AND PROPER PASSWORD HASHING !!!
// For this example, we'll just check against Prisma, but not store hashed passwords
// to avoid adding bcrypt dependency for this quick example.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }


  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // In a real app:
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);
    // await prisma.user.create({ data: { username, passwordHash: hashedPassword } });

    // Simplified for this example (NO PASSWORD HASHING - NOT SECURE):
    // We just create the user. Login will just check username.
    await prisma.user.create({
      data: { username }, // In a real app, also store hashed password
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
}