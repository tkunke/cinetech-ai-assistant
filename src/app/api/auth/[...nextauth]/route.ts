import { NextRequest, NextResponse } from 'next/server';
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { kv } from "@vercel/kv";
import NextAuthHandler from 'next-auth/next';
import { JWT } from "next-auth/jwt";

// Define the expected structure of the user object
interface LocalUser {
  username: string;
  password: string;
  assistantName: string;
  defaultGreeting: string;
}

// Extend the User type to include custom properties
declare module "next-auth" {
  interface User {
    id: string;
    assistantName: string;
    defaultGreeting: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      assistantName: string;
      defaultGreeting: string;
    }
  }
}

// Extend the JWT type to include custom properties
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    assistantName: string;
    defaultGreeting: string;
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const user = await kv.get<LocalUser>(`user:${credentials.username}`);
        if (user && user.password === credentials.password) {
          return {
            id: credentials.username, // Use username as ID
            name: user.username,
            assistantName: user.assistantName,
            defaultGreeting: user.defaultGreeting,
          };
        }
        return null;
      }
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/logout',
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // Use username as ID
        token.name = user.name;
        token.assistantName = user.assistantName;
        token.defaultGreeting = user.defaultGreeting;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && token.assistantName && token.defaultGreeting) {
        session.user.id = token.id;
        session.user.name = token.name as string || session.user.name as string;
        session.user.assistantName = token.assistantName as string;
        session.user.defaultGreeting = token.defaultGreeting as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url === '/logout') {
        return baseUrl + '/logout'
      }
      return baseUrl + '/assistant';
    }
  }
};

// Create the auth handler
const handler = NextAuthHandler(authOptions);

// Export named handlers for GET and POST
export const GET = handler;
export const POST = handler;
