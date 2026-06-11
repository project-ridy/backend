import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const DEFAULT_DATABASE_URL = 'postgresql://localhost:5432/ridy';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  },
});
