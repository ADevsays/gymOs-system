import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'sqlite.db' // For dev. In production we'll use a dynamic path.
  },
  verbose: true,
  strict: true,
});
