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

function generateRoomId(suffix: string): string {
  return `review-room-${suffix}`;
}

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
    await prisma.pptChunk.deleteMany();
    await prisma.projectReview.deleteMany();
    await prisma.student.deleteMany();

    // Insert students
    console.log('👤 Creating students...');

    const alice = await prisma.student.create({
      data: {
        name: 'Alice Johnson',
        email: 'alice.johnson21@vitap.ac.in',
        regNo: '21BCE1234',
      },
    });

    const charlie = await prisma.student.create({
      data: {
        name: 'Charlie Kim',
        email: 'charlie.kim21@vitap.ac.in',
        regNo: '21BCE5678',
      },
    });

    const diana = await prisma.student.create({
      data: {
        name: 'Diana Patel',
        email: 'diana.patel22@vitap.ac.in',
        regNo: '22BCE2345',
      },
    });

    const evan = await prisma.student.create({
      data: {
        name: 'Evan Chen',
        email: 'evan.chen22@vitap.ac.in',
        regNo: '22BCE6789',
      },
    });

    console.log('   ✅ Created 4 students');

    // Insert Project Reviews
    console.log('📊 Creating project reviews...');

    const aliceReview = await prisma.projectReview.create({
      data: {
        roomId: generateRoomId('alice-ml'),
        studentId: alice.id,
        projectTitle: 'ML-Powered Sentiment Analysis System',
        projectDescription: 'A sentiment analysis system using transformer models for social media monitoring.',
        status: 'upload_required',
        duration: 30,
      },
    });

    const charlieReview = await prisma.projectReview.create({
      data: {
        roomId: generateRoomId('charlie-web'),
        studentId: charlie.id,
        projectTitle: 'E-Commerce Platform Redesign',
        projectDescription: 'A complete redesign of an e-commerce platform with improved UX and performance.',
        status: 'upload_required',
        duration: 30,
      },
    });

    const dianaReview = await prisma.projectReview.create({
      data: {
        roomId: generateRoomId('diana-mobile'),
        studentId: diana.id,
        projectTitle: 'Cross-Platform Fitness App',
        projectDescription: 'A fitness tracking app with social features and AI-powered workout recommendations.',
        status: 'pending',
        duration: 30,
      },
    });

    const evanReview = await prisma.projectReview.create({
      data: {
        roomId: generateRoomId('evan-gps'),
        studentId: evan.id,
        projectTitle: 'Real-Time GPS Tracking System',
        projectDescription: 'A comprehensive GPS tracking solution for fleet management.',
        status: 'upload_required',
        duration: 30,
      },
    });

    console.log('   ✅ Created 4 project reviews');

    // Print test URLs
    console.log('\n📝 Test Project Review URLs:');
    console.log('═══════════════════════════════════════════════════════════════');

    console.log('\n🔵 Alice Johnson - ML Project (Ready for upload):');
    console.log(`   http://localhost:3050/review/${aliceReview.roomId}`);

    console.log('\n🟢 Charlie Kim - Web Project (Ready for upload):');
    console.log(`   http://localhost:3050/review/${charlieReview.roomId}`);

    console.log('\n🟡 Diana Patel - Mobile Project (Pending):');
    console.log(`   http://localhost:3050/review/${dianaReview.roomId}`);

    console.log('\n🟣 Evan Chen - GPS Tracking System (Ready for upload):');
    console.log(`   http://localhost:3050/review/${evanReview.roomId}`);

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
