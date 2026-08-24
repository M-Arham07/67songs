import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models/user";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
    Credentials({
      id: "demo-login",
      name: "Demo Login",
      credentials: {
        name: { label: "Display Name", type: "text", placeholder: "Alex" },
      },
      async authorize(credentials) {
        if (!credentials?.name) return null;
        const name = (credentials.name as string).trim();
        if (name.length < 2) return null;

        await connectDB();
        let user = await User.findOne({ name });
        if (!user) {
          user = await User.create({
            name,
            image: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
          });
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email || null,
          image: user.image || null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectDB();
          let dbUser = await User.findOne({ email: user.email });
          if (!dbUser) {
            dbUser = await User.create({
              name: user.name || "Anonymous",
              email: user.email,
              image: user.image,
              emailVerified: new Date(),
            });
          }
          user.id = dbUser._id.toString();
        } catch (error) {
          console.error("[Auth] Error syncing Google user to MongoDB:", error);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET || "default_auth_secret_minimum_32_characters_long!!",
});
