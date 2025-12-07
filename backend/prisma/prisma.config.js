import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'prisma/config';

// Load .env file manually since Prisma CLI has its own module context
const envPath = path.join(import.meta.dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

export default defineConfig({
    earlyAccess: true,
    schema: path.join(import.meta.dirname, 'schema.prisma'),
    migrate: {
        schema: path.join(import.meta.dirname, 'schema.prisma'),
    },
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
