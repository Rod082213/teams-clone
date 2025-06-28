// pages/api/auth/login.js
import { PrismaClient } from '@prisma/client';
// const bcrypt = require('bcryptjs'); // For real password checking

const prisma = new PrismaClient();

// !!! WARNING: SIMPLIFIED LOGIN - NO REAL PASSWORD CHECKING !!!

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // In a real app:
    // const isMatch = await bcrypt.compare(password, user.passwordHash);
    // if (!isMatch) {
    //   return res.status(401).json({ error: 'Invalid credentials' });
    // }

    // SIMPLIFIED: If user exists, login is successful for this example.
    // In a real app, you'd generate a session token (e.g., JWT) here.
    // For now, we just return the user object.
    const { ...userWithoutPassword } = user; // Exclude passwordHash if it existed

    res.status(200).json({ message: 'Login successful', user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
}