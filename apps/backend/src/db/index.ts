/**
 * Database Connection and Exports
 * Prisma-based database client for interview-pendent-be
 */

import { prisma } from './prisma.js';

// Re-export prisma client
export { prisma };

// Test connection function
export async function testConnection(): Promise<boolean> {
    try {
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL (Prisma)');
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to PostgreSQL:', error);
        return false;
    }
}

// Graceful shutdown
export async function disconnect(): Promise<void> {
    await prisma.$disconnect();
}
