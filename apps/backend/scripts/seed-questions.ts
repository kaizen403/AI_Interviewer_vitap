/**
 * Seed Interview Questions Script
 * 
 * Generates interview questions using OpenAI, creates embeddings,
 * saves to local JSON file (cache), and stores in Milvus.
 * 
 * Usage:
 *   pnpm tsx scripts/seed-questions.ts generate   # Generate new questions + embeddings
 *   pnpm tsx scripts/seed-questions.ts load       # Load from JSON to Milvus (no OpenAI)
 *   pnpm tsx scripts/seed-questions.ts stats      # Show collection stats
 */

import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// ============================================================================
// Configuration
// ============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'interview-questions.json');

const MILVUS_ADDRESS = process.env.MILVUS_ADDRESS || 'localhost:19530';
const MILVUS_TOKEN = process.env.MILVUS_TOKEN || '';
const EMBEDDING_DIM = 1536; // text-embedding-3-small

// Collection naming
const COLLECTION_PREFIX = 'questions_';
const GLOBAL_BEHAVIORAL_COLLECTION = 'questions_behavioral';
const GLOBAL_ETHICS_COLLECTION = 'questions_ethics';

function getCollectionName(jobTitle: string): string {
  return `${COLLECTION_PREFIX}${jobTitle.toLowerCase().replace(/\s+/g, '_')}`;
}

// ============================================================================
// Question Generation Config
// ============================================================================

const JOB_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Product Manager',
  'Engineering Manager',
  'QA Engineer',
  'Mobile Developer',
];

const TOPICS_BY_ROLE: Record<string, string[]> = {
  'Frontend Developer': ['React', 'JavaScript', 'TypeScript', 'CSS', 'Performance', 'Accessibility', 'Testing', 'State Management'],
  'Backend Developer': ['Node.js', 'APIs', 'Databases', 'System Design', 'Security', 'Microservices', 'Caching', 'Authentication'],
  'Full Stack Developer': ['React', 'Node.js', 'Databases', 'APIs', 'DevOps Basics', 'System Design', 'TypeScript', 'Testing'],
  'DevOps Engineer': ['CI/CD', 'Docker', 'Kubernetes', 'AWS', 'Terraform', 'Monitoring', 'Security', 'Linux'],
  'Data Scientist': ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Data Visualization', 'Feature Engineering', 'A/B Testing', 'Deep Learning'],
  'Machine Learning Engineer': ['ML Systems', 'Model Deployment', 'Python', 'Deep Learning', 'MLOps', 'Data Pipelines', 'Model Optimization', 'Distributed Training'],
  'Product Manager': ['Product Strategy', 'User Research', 'Metrics', 'Roadmapping', 'Stakeholder Management', 'Prioritization', 'Go-to-Market', 'Technical Understanding'],
  'Engineering Manager': ['Team Leadership', 'Technical Decision Making', 'Hiring', 'Performance Management', 'Project Planning', 'Cross-team Collaboration', 'Architecture', 'Mentoring'],
  'QA Engineer': ['Test Strategy', 'Automation', 'API Testing', 'Performance Testing', 'Bug Tracking', 'CI/CD', 'Security Testing', 'Mobile Testing'],
  'Mobile Developer': ['React Native', 'iOS', 'Android', 'Mobile Performance', 'App Architecture', 'Push Notifications', 'Offline Storage', 'Mobile Security'],
};

// Behavioral topics (common across all roles)
const BEHAVIORAL_TOPICS = [
  'Leadership',
  'Conflict Resolution',
  'Failure & Learning',
  'Teamwork',
  'Problem Solving',
  'Communication',
  'Time Management',
  'Adaptability',
];

// Ethics topics
const ETHICS_TOPICS = [
  'Data Privacy',
  'AI Ethics',
  'Workplace Ethics',
  'Bias & Fairness',
];

// ProbeScore dimensions for tagging
const PROBE_DIMENSIONS = ['DM', 'PS', 'CM', 'AD', 'EF', 'VA'] as const;

// ============================================================================
// Types
// ============================================================================

interface GeneratedQuestion {
  id: string;
  question: string;
  topic: string;
  jobTitle: string;
  difficulty: number; // 1-5
  dimension: string; // ProbeScore dimension
  category: 'technical' | 'behavioral' | 'ethics' | 'situational';
  expectedPoints: string[];
  embedding: number[];
  createdAt: string;
}

interface QuestionsData {
  version: string;
  generatedAt: string;
  totalQuestions: number;
  byJobTitle: Record<string, {
    count: number;
    topics: string[];
    questions: GeneratedQuestion[];
  }>;
  behavioral: {
    count: number;
    questions: GeneratedQuestion[];
  };
  ethics: {
    count: number;
    questions: GeneratedQuestion[];
  };
}

// ============================================================================
// OpenAI Client
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Milvus Client
// ============================================================================

function getMilvusClient(): MilvusClient {
  const config: { address: string; token?: string } = {
    address: MILVUS_ADDRESS,
  };
  if (MILVUS_TOKEN) {
    config.token = MILVUS_TOKEN;
  }
  return new MilvusClient(config);
}

// ============================================================================
// Question Generation
// ============================================================================

async function generateQuestionsForTopic(
  jobTitle: string,
  topic: string,
  category: 'technical' | 'behavioral' | 'ethics',
  count: number = 5
): Promise<Omit<GeneratedQuestion, 'embedding'>[]> {
  const difficultyDescriptions = {
    1: 'Basic/Entry-level - tests fundamental understanding',
    2: 'Intermediate - requires some experience',
    3: 'Advanced - requires solid experience and deeper knowledge',
    4: 'Expert - requires extensive experience and nuanced understanding',
    5: 'Principal/Staff level - requires architectural thinking and leadership experience',
  };

  const prompt = `Generate ${count} interview questions for a ${jobTitle} position about "${topic}".

Category: ${category}
${category === 'behavioral' ? 'Use STAR format (Situation, Task, Action, Result) style questions.' : ''}
${category === 'ethics' ? 'Focus on ethical dilemmas and decision-making scenarios.' : ''}

For each question, provide:
1. The question text
2. Difficulty level (1-5): 
   - 1: ${difficultyDescriptions[1]}
   - 2: ${difficultyDescriptions[2]}
   - 3: ${difficultyDescriptions[3]}
   - 4: ${difficultyDescriptions[4]}
   - 5: ${difficultyDescriptions[5]}
3. Primary ProbeScore dimension it tests:
   - DM: Domain Mastery (technical knowledge)
   - PS: Problem Solving (analytical thinking)
   - CM: Communication (clarity, structure)
   - AD: Adaptability (handling change, learning)
   - EF: Execution Focus (getting things done)
   - VA: Values Alignment (ethics, culture fit)
4. 3-5 key points a strong answer should include

Respond in JSON format:
{
  "questions": [
    {
      "question": "...",
      "difficulty": 1-5,
      "dimension": "DM|PS|CM|AD|EF|VA",
      "expectedPoints": ["point1", "point2", "point3"]
    }
  ]
}

Make questions:
- Open-ended (not yes/no)
- Specific enough to evaluate expertise
- Varied in difficulty (include at least one of each: 1-2, 3, 4-5)
- Unique and not easily found online`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const parsed = JSON.parse(content);
    
    return parsed.questions.map((q: any, idx: number) => ({
      id: `q_${jobTitle.toLowerCase().replace(/\s+/g, '_')}_${topic.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${idx}`,
      question: q.question,
      topic,
      jobTitle,
      difficulty: q.difficulty,
      dimension: q.dimension,
      category,
      expectedPoints: q.expectedPoints || [],
      createdAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error(`Failed to generate questions for ${jobTitle}/${topic}:`, error);
    return [];
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function generateEmbeddings(questions: Omit<GeneratedQuestion, 'embedding'>[]): Promise<GeneratedQuestion[]> {
  const results: GeneratedQuestion[] = [];
  const batchSize = 100; // OpenAI allows up to 2048, but let's be conservative

  console.log(`\nGenerating embeddings for ${questions.length} questions...`);

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    const texts = batch.map(q => `${q.jobTitle} - ${q.topic}: ${q.question}`);

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      for (let j = 0; j < batch.length; j++) {
        results.push({
          ...batch[j],
          embedding: response.data[j].embedding,
        });
      }

      console.log(`  Embedded ${Math.min(i + batchSize, questions.length)}/${questions.length}`);
    } catch (error) {
      console.error(`Failed to generate embeddings for batch ${i}:`, error);
    }

    // Rate limiting
    if (i + batchSize < questions.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

// ============================================================================
// Data Persistence
// ============================================================================

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveQuestionsToFile(questions: GeneratedQuestion[]) {
  ensureDataDir();
  
  // Organize by job title
  const byJobTitle: Record<string, { count: number; topics: string[]; questions: GeneratedQuestion[] }> = {};
  const behavioral: GeneratedQuestion[] = [];
  const ethics: GeneratedQuestion[] = [];

  for (const q of questions) {
    if (q.category === 'behavioral') {
      behavioral.push(q);
    } else if (q.category === 'ethics') {
      ethics.push(q);
    } else {
      if (!byJobTitle[q.jobTitle]) {
        byJobTitle[q.jobTitle] = { count: 0, topics: [], questions: [] };
      }
      byJobTitle[q.jobTitle].questions.push(q);
      byJobTitle[q.jobTitle].count++;
      if (!byJobTitle[q.jobTitle].topics.includes(q.topic)) {
        byJobTitle[q.jobTitle].topics.push(q.topic);
      }
    }
  }

  const data: QuestionsData = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalQuestions: questions.length,
    byJobTitle,
    behavioral: {
      count: behavioral.length,
      questions: behavioral,
    },
    ethics: {
      count: ethics.length,
      questions: ethics,
    },
  };

  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2));
  console.log(`\n✅ Saved ${questions.length} questions to ${QUESTIONS_FILE}`);
  console.log(`   Job Titles: ${Object.keys(byJobTitle).join(', ')}`);
  console.log(`   Behavioral: ${behavioral.length} questions`);
  console.log(`   Ethics: ${ethics.length} questions`);
}

function loadQuestionsFromFile(): QuestionsData | null {
  if (!fs.existsSync(QUESTIONS_FILE)) {
    console.log(`❌ No questions file found at ${QUESTIONS_FILE}`);
    return null;
  }

  const data: QuestionsData = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
  console.log(`✅ Loaded ${data.totalQuestions} questions from file (generated: ${data.generatedAt})`);
  console.log(`   Job Titles: ${Object.keys(data.byJobTitle).join(', ')}`);
  console.log(`   Behavioral: ${data.behavioral.count} questions`);
  console.log(`   Ethics: ${data.ethics.count} questions`);
  return data;
}

// ============================================================================
// Milvus Operations
// ============================================================================

async function ensureCollection(client: MilvusClient, collectionName: string) {
  const hasCollection = await client.hasCollection({
    collection_name: collectionName,
  });

  if (!hasCollection.value) {
    console.log(`Creating collection: ${collectionName}...`);
    
    await client.createCollection({
      collection_name: collectionName,
      fields: [
        { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 128 },
        { name: 'question', data_type: DataType.VarChar, max_length: 2000 },
        { name: 'topic', data_type: DataType.VarChar, max_length: 256 },
        { name: 'job_title', data_type: DataType.VarChar, max_length: 256 },
        { name: 'difficulty', data_type: DataType.Int32 },
        { name: 'dimension', data_type: DataType.VarChar, max_length: 8 },
        { name: 'category', data_type: DataType.VarChar, max_length: 32 },
        { name: 'expected_points', data_type: DataType.VarChar, max_length: 4000 },
        { name: 'embedding', data_type: DataType.FloatVector, dim: EMBEDDING_DIM },
      ],
    });

    await client.createIndex({
      collection_name: collectionName,
      field_name: 'embedding',
      index_type: 'IVF_FLAT',
      metric_type: 'COSINE',
      params: { nlist: 128 },
    });

    console.log(`✅ Collection ${collectionName} created`);
  }

  await client.loadCollection({ collection_name: collectionName });
}

async function insertQuestions(client: MilvusClient, collectionName: string, questions: GeneratedQuestion[]) {
  if (questions.length === 0) return;
  
  const batchSize = 100;
  let inserted = 0;

  console.log(`  Inserting ${questions.length} questions into ${collectionName}...`);

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);

    await client.insert({
      collection_name: collectionName,
      data: batch.map(q => ({
        id: q.id,
        question: q.question,
        topic: q.topic,
        job_title: q.jobTitle,
        difficulty: q.difficulty,
        dimension: q.dimension,
        category: q.category,
        expected_points: JSON.stringify(q.expectedPoints),
        embedding: q.embedding,
      })),
    });

    inserted += batch.length;
  }

  await client.flush({ collection_names: [collectionName] });
  console.log(`  ✅ Inserted ${inserted} questions`);
}

async function storeQuestionsInMilvus(client: MilvusClient, data: QuestionsData) {
  console.log('\n📦 Storing questions in Milvus (by job title)...\n');

  // Store technical questions by job title
  for (const [jobTitle, jobData] of Object.entries(data.byJobTitle)) {
    const collectionName = getCollectionName(jobTitle);
    await ensureCollection(client, collectionName);
    await insertQuestions(client, collectionName, jobData.questions);
  }

  // Store behavioral questions (global)
  await ensureCollection(client, GLOBAL_BEHAVIORAL_COLLECTION);
  await insertQuestions(client, GLOBAL_BEHAVIORAL_COLLECTION, data.behavioral.questions);

  // Store ethics questions (global)
  await ensureCollection(client, GLOBAL_ETHICS_COLLECTION);
  await insertQuestions(client, GLOBAL_ETHICS_COLLECTION, data.ethics.questions);

  console.log('\n✅ All questions stored in Milvus');
}

async function getCollectionStats(client: MilvusClient) {
  console.log('\n📊 Collection Statistics:\n');
  
  const collections = await client.listCollections();
  const questionCollections = collections.data.filter(c => 
    c.name.startsWith(COLLECTION_PREFIX) || 
    c.name === GLOBAL_BEHAVIORAL_COLLECTION || 
    c.name === GLOBAL_ETHICS_COLLECTION
  );

  for (const col of questionCollections) {
    try {
      const stats = await client.getCollectionStatistics({ collection_name: col.name });
      console.log(`   ${col.name}: ${stats.data.row_count} questions`);
    } catch (e) {
      console.log(`   ${col.name}: (not loaded)`);
    }
  }
}

// ============================================================================
// Main Commands
// ============================================================================

async function generateCommand() {
  console.log('🚀 Generating Interview Questions\n');
  console.log('This will call OpenAI to generate questions and embeddings.');
  console.log('Questions will be saved to local JSON file AND stored in Milvus.\n');

  const allQuestions: Omit<GeneratedQuestion, 'embedding'>[] = [];

  // Generate technical questions for each role
  for (const role of JOB_ROLES) {
    const topics = TOPICS_BY_ROLE[role] || [];
    console.log(`\n📝 Generating for ${role} (${topics.length} topics)...`);

    for (const topic of topics) {
      process.stdout.write(`   ${topic}...`);
      const questions = await generateQuestionsForTopic(role, topic, 'technical', 5);
      allQuestions.push(...questions);
      console.log(` ✓ (${questions.length} questions)`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate behavioral questions (common across roles)
  console.log('\n📝 Generating behavioral questions...');
  for (const topic of BEHAVIORAL_TOPICS) {
    process.stdout.write(`   ${topic}...`);
    const questions = await generateQuestionsForTopic('General', topic, 'behavioral', 5);
    allQuestions.push(...questions);
    console.log(` ✓ (${questions.length} questions)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate ethics questions
  console.log('\n📝 Generating ethics questions...');
  for (const topic of ETHICS_TOPICS) {
    process.stdout.write(`   ${topic}...`);
    const questions = await generateQuestionsForTopic('General', topic, 'ethics', 5);
    allQuestions.push(...questions);
    console.log(` ✓ (${questions.length} questions)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Generated ${allQuestions.length} questions total`);

  // Generate embeddings
  const questionsWithEmbeddings = await generateEmbeddings(allQuestions);

  // Save to local file (cache) - organized by job title
  saveQuestionsToFile(questionsWithEmbeddings);

  // Load the structured data and store in Milvus
  const data = loadQuestionsFromFile();
  if (data) {
    const client = getMilvusClient();
    await storeQuestionsInMilvus(client, data);
    await getCollectionStats(client);
  }

  console.log('\n✅ Done! Questions saved to file and Milvus (by job title).');
}

async function loadCommand() {
  console.log('📥 Loading Questions from Local File to Milvus\n');

  const data = loadQuestionsFromFile();
  if (!data) {
    console.log('Run "generate" command first to create questions.');
    process.exit(1);
  }

  const client = getMilvusClient();
  
  // Drop existing collections to reload fresh
  console.log('Dropping existing collections...');
  const collections = await client.listCollections();
  for (const col of collections.data) {
    if (col.name.startsWith(COLLECTION_PREFIX) || 
        col.name === GLOBAL_BEHAVIORAL_COLLECTION || 
        col.name === GLOBAL_ETHICS_COLLECTION) {
      await client.dropCollection({ collection_name: col.name });
      console.log(`  Dropped: ${col.name}`);
    }
  }

  await storeQuestionsInMilvus(client, data);
  await getCollectionStats(client);

  console.log('\n✅ Done! Questions loaded into Milvus (by job title).');
}

async function statsCommand() {
  const client = getMilvusClient();
  await getCollectionStats(client);

  // Also show file stats
  if (fs.existsSync(QUESTIONS_FILE)) {
    const data: QuestionsData = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
    console.log('\n📄 Local File Statistics:');
    console.log(`   File: ${QUESTIONS_FILE}`);
    console.log(`   Total Questions: ${data.totalQuestions}`);
    console.log(`   Generated: ${data.generatedAt}`);
    console.log(`   Version: ${data.version}`);

    console.log('\n   Technical Questions by Job Title:');
    Object.entries(data.byJobTitle).forEach(([role, roleData]) => {
      console.log(`     - ${role}: ${roleData.count} questions (${roleData.topics.length} topics)`);
    });

    console.log(`\n   Behavioral (Global): ${data.behavioral.count} questions`);
    console.log(`   Ethics (Global): ${data.ethics.count} questions`);
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

const command = process.argv[2];

switch (command) {
  case 'generate':
    generateCommand().catch(console.error);
    break;
  case 'load':
    loadCommand().catch(console.error);
    break;
  case 'stats':
    statsCommand().catch(console.error);
    break;
  default:
    console.log(`
Interview Questions Seed Script

Usage:
  pnpm tsx scripts/seed-questions.ts <command>

Commands:
  generate  Generate new questions using OpenAI, save to file, store in Milvus
  load      Load questions from local JSON file to Milvus (no OpenAI calls)
  stats     Show collection and file statistics

Examples:
  pnpm tsx scripts/seed-questions.ts generate   # First time setup
  pnpm tsx scripts/seed-questions.ts load       # Reload Milvus from cached file
  pnpm tsx scripts/seed-questions.ts stats      # Check what's stored
`);
}
