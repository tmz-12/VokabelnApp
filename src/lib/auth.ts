import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  appName: "VokabelnApp",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
  user: { deleteUser: { enabled: false } },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await db.insert(schema.userProfiles).values({ userId: createdUser.id }).onConflictDoNothing();
        },
      },
    },
  },
  plugins: [nextCookies()],
});
