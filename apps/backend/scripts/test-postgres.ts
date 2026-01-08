/**
 * Test PostgreSQL Connection
 */

import 'dotenv/config';
import { getDb, testConnection, closeConnection } from '../src/db/index.js';
import { interviews, candidates, jobs, companies } from '../src/db/schema.js';

async function main() {
  console.log('🔍 Testing PostgreSQL connection...\n');

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Failed to connect to PostgreSQL');
    process.exit(1);
  }

  const db = getDb();

  // Count records in each table
  console.log('\n📊 Table statistics:');
  
  const interviewCount = await db.select().from(interviews);
  console.log(`   interviews: ${interviewCount.length} records`);
  
  const candidateCount = await db.select().from(candidates);
  console.log(`   candidates: ${candidateCount.length} records`);
  
  const jobCount = await db.select().from(jobs);
  console.log(`   jobs: ${jobCount.length} records`);
  
  const companyCount = await db.select().from(companies);
  console.log(`   companies: ${companyCount.length} records`);

  // Insert test data
  console.log('\n📝 Inserting test data...');

  // Create a test company
  const [testCompany] = await db.insert(companies).values({
    name: 'Test Company',
    profile: 'A test company for development',
    values: ['Innovation', 'Excellence'],
    industry: 'Technology',
  }).returning();
  console.log(`   Created company: ${testCompany.name} (${testCompany.id})`);

  // Create a test job
  const [testJob] = await db.insert(jobs).values({
    companyId: testCompany.id,
    title: 'Senior Software Engineer',
    description: 'We are looking for a senior engineer with React and Node.js experience',
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    topics: ['Frontend', 'Backend', 'System Design'],
    seniorityLevel: 'senior',
  }).returning();
  console.log(`   Created job: ${testJob.title} (${testJob.id})`);

  // Create a test candidate
  const [testCandidate] = await db.insert(candidates).values({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    resumeText: 'Experienced software engineer with 5 years of experience...',
    resumeSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
  }).returning();
  console.log(`   Created candidate: ${testCandidate.name} (${testCandidate.id})`);

  // Create a test interview
  const [testInterview] = await db.insert(interviews).values({
    roomId: 'test-room-' + Date.now(),
    token: 'test-token-' + Math.random().toString(36).substring(7),
    candidateId: testCandidate.id,
    jobId: testJob.id,
    companyId: testCompany.id,
    interviewerName: 'AI Interviewer',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    duration: 40,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
  }).returning();
  console.log(`   Created interview: ${testInterview.roomId} (${testInterview.id})`);

  // Verify with a join query
  console.log('\n✅ Verifying with join query...');
  const { eq } = await import('drizzle-orm');
  const results = await db
    .select()
    .from(interviews)
    .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
    .leftJoin(jobs, eq(interviews.jobId, jobs.id))
    .leftJoin(companies, eq(interviews.companyId, companies.id));

  console.log(`   Found ${results.length} interview(s) with joined data`);
  
  if (results.length > 0) {
    const r = results[0];
    console.log(`   Sample: Interview for ${r.candidates?.name} at ${r.companies?.name} for ${r.jobs?.title}`);
  }

  // Clean up
  await closeConnection();
  console.log('\n🎉 PostgreSQL test completed successfully!');
}

main().catch(console.error);
