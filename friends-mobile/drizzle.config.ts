import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  driver: 'expo',
  dialect: 'sqlite',
} satisfies Config;
