import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { config } from "../config/index.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
        ...schema
    }
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: config.cors.origins,
});