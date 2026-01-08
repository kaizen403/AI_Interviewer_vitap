import 'dotenv/config';
import path from "node:path";
import { defineConfig } from "prisma/config";

// Use local prisma schema
const LOCAL_PRISMA_PATH = path.join(import.meta.dirname, "prisma");

export default defineConfig({
    schema: path.join(LOCAL_PRISMA_PATH, "schema.prisma"),
    datasource: {
        url: process.env.DATABASE_URL!,
    },
    migrations: {
        path: path.join(LOCAL_PRISMA_PATH, "migrations"),
    },
});
