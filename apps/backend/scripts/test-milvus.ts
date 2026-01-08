/**
 * Test script for Milvus Vector DB connection
 * Run with: pnpm tsx scripts/test-milvus.ts
 */

import 'dotenv/config';
import {
  initializeVectorDB,
  storeQuestion,
  findSimilarQuestions,
  getSimilarQuestionsContext,
  closeVectorDB,
} from '../src/agent/services/vector.service.js';

async function testMilvus() {
  console.log('🔍 Testing Milvus Vector DB Connection...\n');

  try {
    // Initialize
    console.log('1. Initializing Vector DB...');
    await initializeVectorDB();
    console.log('   ✅ Connected and collection ready\n');

    // Store some test questions
    console.log('2. Storing test questions...');
    const testQuestions = [
      {
        question: 'Explain the difference between REST and GraphQL APIs',
        topic: 'API Design',
        difficulty: 3,
        jobTitle: 'Backend Engineer',
      },
      {
        question: 'How would you design a rate limiting system?',
        topic: 'System Design',
        difficulty: 4,
        jobTitle: 'Senior Engineer',
      },
      {
        question: 'What is the difference between SQL and NoSQL databases?',
        topic: 'Database',
        difficulty: 2,
        jobTitle: 'Full Stack Developer',
      },
      {
        question: 'Describe your experience with microservices architecture',
        topic: 'System Design',
        difficulty: 3,
        jobTitle: 'Backend Engineer',
      },
      {
        question: 'How do you handle authentication in REST APIs?',
        topic: 'API Design',
        difficulty: 3,
        jobTitle: 'Backend Engineer',
      },
    ];

    for (const q of testQuestions) {
      await storeQuestion(q.question, q.topic, q.difficulty, { jobTitle: q.jobTitle });
      console.log(`   ✅ Stored: "${q.question.slice(0, 50)}..."`);
    }
    console.log();

    // Wait a moment for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Search for similar questions
    console.log('3. Searching for similar questions...');
    const searchQuery = 'How do you design RESTful APIs?';
    console.log(`   Query: "${searchQuery}"`);
    
    const similar = await findSimilarQuestions(searchQuery, '', 3);
    console.log(`   Found ${similar.length} similar questions:`);
    for (const q of similar) {
      console.log(`   - "${q.question}" (similarity: ${(q.similarity * 100).toFixed(1)}%)`);
    }
    console.log();

    // Get context for prompt
    console.log('4. Getting similar questions context...');
    const context = await getSimilarQuestionsContext(searchQuery, '');
    console.log('   Context for LLM:');
    console.log(context.split('\n').map(l => `   ${l}`).join('\n'));
    console.log();

    // Cleanup
    await closeVectorDB();
    console.log('✅ All tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testMilvus();
