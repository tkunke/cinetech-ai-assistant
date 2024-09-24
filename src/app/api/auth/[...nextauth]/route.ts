import { NextRequest, NextResponse } from 'next/server';
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { JWT } from "next-auth/jwt";

// Define the expected structure of the user object
interface LocalUser {
  id: string;
  username: string;
  email: string;
  password: string;
  assistant_name: string;
  first_name: string;
  subscription_type: string;
}

// Extend the User type to include custom properties
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    assistant_name: string;
    first_name: string;
    subscription_type: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      assistant_name: string;
      first_name: string;
      subscription_type: string;
    }
  }
}

// Extend the JWT type to include custom properties
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    assistant_name: string;
    first_name: string;
    subscription_type: string;
  }
}

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

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

        // Connect to the database
        const client = await pool.connect();

        try {
          // Query the PostgreSQL database for the user
          const result = await client.query<LocalUser>(
            'SELECT * FROM users WHERE username = $1',
            [credentials.username]
          );
          const user = result.rows.length > 0 ? result.rows[0] : null;

          if (user && await bcrypt.compare(credentials.password, user.password)) {
            return {
              id: user.id,
              name: user.username,
              email: user.email,
              first_name: user.first_name,
              assistant_name: user.assistant_name,
              subscription_type: user.subscription_type
            };
          }
        } finally {
          client.release(); // Always release the client
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
        token.id = user.id as string;
        token.name = user.name;
        token.email = user.email;
        token.first_name = user.first_name;
        token.assistant_name = user.assistant_name;
        token.subscription_type = user.subscription_type;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.id === 'string' && token.assistant_name) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.first_name = token.first_name as string;
        session.user.assistant_name = token.assistant_name as string;
        session.user.subscription_type = token.subscription_type as string;
      }
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
