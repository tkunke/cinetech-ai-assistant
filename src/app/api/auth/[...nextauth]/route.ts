import { NextRequest, NextResponse } from 'next/server';
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { sql, QueryResult } from "@vercel/postgres";
import bcrypt from 'bcryptjs';
import { JWT } from "next-auth/jwt";

// Define the expected structure of the user object
interface LocalUser {
  id: string;
  username: string;
  password: string;
  assistant_name: string;
  default_greeting: string;
}

// Extend the User type to include custom properties
declare module "next-auth" {
  interface User {
    id: string;
    assistant_name: string;
    default_greeting: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      assistant_name: string;
      default_greeting: string;
    }
  }
}

// Extend the JWT type to include custom properties
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    assistant_name: string;
    default_greeting: string;
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

        // Query the PostgreSQL database for the user
        const userQuery: QueryResult<LocalUser> = await sql`SELECT * FROM users WHERE username = ${credentials.username}`;
        const user = userQuery.rows.length > 0 ? userQuery.rows[0] : null;

        if (user && await bcrypt.compare(credentials.password, user.password)) {
          return {
            id: user.id,
            name: user.username,
            assistant_name: user.assistant_name,
            default_greeting: user.default_greeting,
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
        console.log('User in JWT callback:', user);
        token.id = user.id as string; // Use type assertion here
        token.name = user.name;
        token.assistant_name = user.assistant_name;
        token.default_greeting = user.default_greeting;
      }
      console.log('Token in JWT callback:', token);
      return token;
    },
    async session({ session, token }) {
      console.log('Token in Session callback:', token);
      if (typeof token.id === 'string' && token.assistant_name && token.default_greeting) {
        console.log('Setting session user data');
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.assistant_name = token.assistant_name as string;
        session.user.default_greeting = token.default_greeting as string;
      } else {
        console.log('Token did not pass the condition:', token);
      }
      console.log('Session in Session callback:', session);
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url === '/logout') {
        return baseUrl + '/logout';
      }
      return baseUrl + '/assistant';
    }
  }
};

// Create the auth handler
const handler = NextAuth(authOptions);

// Export named handlers for GET and POST
export const GET = handler;
export const POST = handler;
