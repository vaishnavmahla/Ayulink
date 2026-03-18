import { defineConfig, env } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Prisma 7 CLI uses this direct URL for pushing changes to Supabase
    url: env("DIRECT_URL"),
  },
});