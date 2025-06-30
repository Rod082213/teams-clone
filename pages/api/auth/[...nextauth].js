// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
    import { PrismaAdapter } from '@next-auth/prisma-adapter'; // For session storage in DB
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default NextAuth({
  adapter: PrismaAdapter(prisma), // Optional: Store sessions in your DB
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        });

        if (user) {
          // IMPORTANT: You MUST compare hashed passwords here
          // This example assumes you have a 'passwordHash' field on your User model
          // and that it was set during registration.
          // For this example, if you didn't implement password hashing yet,
          // you might temporarily bypass this for testing, BUT THIS IS NOT SECURE.
          // const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          // if (isValid) {
          //   return { id: user.id, name: user.username, email: user.username }; // NextAuth expects 'name' and 'email'
          // }

          // SIMPLIFIED - REMOVE FOR PRODUCTION IF NOT USING HASHING
          if (user && credentials.password) { // Basic check for demo
             return { id: user.id, name: user.username, email: user.username + "@example.com" }; // email is often required by adapter
          }
        }
        return null; // Login failed
      }
    })
  ],
  session: {
    strategy: 'jwt', // Or 'database' if using adapter and want DB sessions
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist the user id to the token right after signin
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      if (token && session.user) {
         session.user.id = token.id; // Add id to session.user
      }
      return session;
    }
  },
  pages: {
    signIn: '/', // Your login page (can be the same page if it handles auth state)
    // error: '/auth/error', // (optional) custom error page
  },
  // Add a secret for JWT signing in production
  secret: process.env.NEXTAUTH_SECRET, // Set this in .env
  // debug: process.env.NODE_ENV === 'development', // Optional for debugging
});