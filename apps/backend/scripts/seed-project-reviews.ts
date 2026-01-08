/**
 * Project Review Seed Script (Prisma)
 * Seeds test data for project review sessions
 * 
 * Run: pnpm seed:reviews
 */

import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ============================================================================
// Setup Prisma
// ============================================================================

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================================
// Helpers
// ============================================================================

function generateDevToken(seed: string): string {
  return crypto.createHash('sha256').update(`project-review-dev-${seed}-2024`).digest('base64url');
}

function generateRoomId(suffix: string): string {
  return `review-room-${suffix}`;
}

// Fixed tokens for development testing
const FIXED_TOKENS = {
  'alice-ml': generateDevToken('alice-ml'),
  'charlie-web': generateDevToken('charlie-web'),
  'diana-mobile': generateDevToken('diana-mobile'),
  'evan-gps': generateDevToken('evan-gps'),
};

// ============================================================================
// Seed Data
// ============================================================================

async function seed() {
  console.log('🌱 Starting Project Reviews seed...\n');

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to PostgreSQL');

    // Clean existing data
    console.log('🧹 Cleaning existing data...');
    await prisma.projectReviewReport.deleteMany();
    await prisma.projectReview.deleteMany();
    await prisma.candidate.deleteMany();

    // Insert candidates
    console.log('👤 Creating candidates...');

    const alice = await prisma.candidate.create({
      data: {
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1-555-0201',
      },
    });

    const charlie = await prisma.candidate.create({
      data: {
        name: 'Charlie Kim',
        email: 'charlie.kim@example.com',
        phone: '+1-555-0202',
      },
    });

    const diana = await prisma.candidate.create({
      data: {
        name: 'Diana Patel',
        email: 'diana.patel@example.com',
        phone: '+1-555-0203',
      },
    });

    const evan = await prisma.candidate.create({
      data: {
        name: 'Evan Chen',
        email: 'evan.chen@example.com',
        phone: '+1-555-0204',
      },
    });

    console.log('   ✅ Created 4 candidates');

    // Insert Project Reviews
    console.log('📊 Creating project reviews...');
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const aliceReview = await prisma.projectReview.create({
      data: {
        roomId: generateRoomId('alice-ml'),
        token: FIXED_TOKENS['alice-ml'],
        candidateId: alice.id,
        projectTitle: 'ML-Powered Sentiment Analysis System',
        projectDescription: 'A sentiment analysis system using transformer models for social media monitoring.',
        status: 'upload_required',
        scheduledAt: oneHourFromNow,
        duration: 30,
        expiresAt: oneDayFromNow,
      },
    });

    const charlieReview = await prisma.projectReview.create({
      data: {
        roomId: generateRoomId('charlie-web'),
        token: FIXED_TOKENS['charlie-web'],
        candidateId: charlie.id,
        projectTitle: 'E-Commerce Platform Redesign',
        projectDescription: 'A complete redesign of an e-commerce platform with improved UX and performance.',
        status: 'upload_required',
        scheduledAt: oneHourFromNow,
        duration: 30,
        expiresAt: oneDayFromNow,
      },
    });

    const dianaReview = await prisma.projectReview.create({
      data: {
        roomId: generateRoomId('diana-mobile'),
        token: FIXED_TOKENS['diana-mobile'],
        candidateId: diana.id,
        projectTitle: 'Cross-Platform Fitness App',
        projectDescription: 'A fitness tracking app with social features and AI-powered workout recommendations.',
        status: 'pending',
        scheduledAt: oneDayFromNow,
        duration: 30,
        expiresAt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const evanReview = await prisma.projectReview.create({
      data: {
        roomId: generateRoomId('evan-gps'),
        token: FIXED_TOKENS['evan-gps'],
        candidateId: evan.id,
        projectTitle: 'Real-Time GPS Tracking System',
        projectDescription: 'A comprehensive GPS tracking solution for fleet management.',
        status: 'upload_required',
        scheduledAt: oneHourFromNow,
        duration: 30,
        expiresAt: oneDayFromNow,
      },
    });

    console.log('   ✅ Created 4 project reviews');

    // Print test URLs
    console.log('\n📝 Test Project Review URLs:');
    console.log('═══════════════════════════════════════════════════════════════');

    console.log('\n🔵 Alice Johnson - ML Project (Ready for upload):');
    console.log(`   http://localhost:3050/review/${aliceReview.roomId}?token=${aliceReview.token}`);

    console.log('\n🟢 Charlie Kim - Web Project (Ready for upload):');
    console.log(`   http://localhost:3050/review/${charlieReview.roomId}?token=${charlieReview.token}`);

    console.log('\n🟡 Diana Patel - Mobile Project (Scheduled tomorrow):');
    console.log(`   http://localhost:3050/review/${dianaReview.roomId}?token=${dianaReview.token}`);

    console.log('\n🟣 Evan Chen - GPS Tracking System (Ready for upload):');
    console.log(`   http://localhost:3050/review/${evanReview.roomId}?token=${evanReview.token}`);

    console.log('\n═══════════════════════════════════════════════════════════════');

    console.log('\n✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  process.exit(0);
}

seed();
