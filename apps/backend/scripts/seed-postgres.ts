/**
 * PostgreSQL Seed Script (Prisma)
 * Seeds test data for interview-pendent-be
 * 
 * Run: pnpm seed
 */

import 'dotenv/config';
import { prisma } from '../src/db/prisma.js';
import crypto from 'crypto';

// ============================================================================
// Helpers
// ============================================================================

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateRoomId(suffix: string): string {
  return `interview-${suffix}`;
}

// Generate deterministic tokens for dev testing (so URLs don't change between seeds)
function generateDevToken(seed: string): string {
  return crypto.createHash('sha256').update(`interview-dev-${seed}-2025`).digest('base64url');
}

// Fixed tokens for development testing
const FIXED_TOKENS = {
  'alex-sre': generateDevToken('alex-sre'),
  'sarah-eng': generateDevToken('sarah-eng'),
};

// ============================================================================
// Seed Data
// ============================================================================

async function seed() {
  console.log('🌱 Starting PostgreSQL seed (Prisma)...\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Clean existing test data (order matters due to foreign keys)
    console.log('🧹 Cleaning existing test data...');
    await prisma.interviewTranscript.deleteMany();
    await prisma.proctoringAlert.deleteMany();
    await prisma.interviewReport.deleteMany();
    await prisma.projectReviewReport.deleteMany();
    await prisma.projectReview.deleteMany();
    await prisma.interview.deleteMany();
    await prisma.candidate.deleteMany();
    await prisma.job.deleteMany();
    await prisma.company.deleteMany();
    console.log('   ✅ Cleaned all tables\n');

    // ========================================================================
    // Company: Linear
    // ========================================================================
    console.log('🏢 Creating Linear...');
    const linear = await prisma.company.create({
      data: {
        name: 'Linear',
        profile: `Linear is issuing-tracking software that streamlines software projects, sprints, tasks, and bug tracking. It's built for high-performance teams who want to move fast without sacrificing quality.

Founded in 2019 by Karri Saarinen (former Airbnb Design Lead) and Tuomas Artman (former Uber Engineering Lead), Linear has grown to become the preferred project management tool for some of the world's best engineering teams including Vercel, Ramp, Loom, Retool, and Cash App.

Our mission is to build software that enhances productivity and brings joy to professional work. We believe that the best tools are invisible - they get out of your way and let you focus on what matters.

We are a fully remote company with team members across the Americas and Europe. We value craftsmanship, pragmatism, and building with intention. Every feature we ship is designed to be fast, keyboard-first, and beautiful.`,
        values: [
          'Craftsmanship - We take pride in building high-quality software',
          'Speed - We move fast and ship frequently',
          'Simplicity - We reduce complexity wherever possible',
          'Focused - We say no to distractions and stay aligned',
          'Transparent - We share openly and communicate clearly'
        ],
        ethicsGuidelines: `At Linear, we believe in fair and unbiased hiring practices. We evaluate candidates based on their skills, experience, and potential - never on factors like background, education prestige, or demographics.

Our interview process is designed to be respectful of candidates' time. We commit to:
- Providing clear expectations before each interview
- Giving constructive feedback when requested
- Making decisions promptly (typically within 1 week)
- Compensating candidates for any take-home work exceeding 4 hours

We look for people who are collaborative, curious, and care about craft. You don't need to know everything - we value growth mindset and willingness to learn.`,
        industry: 'Software / Developer Tools',
      },
    });
    console.log('   ✅ Created Linear\n');

    // ========================================================================
    // Job 1: Senior SRE / Platform Engineer
    // ========================================================================
    console.log('💼 Creating jobs...');

    const sreJob = await prisma.job.create({
      data: {
        companyId: linear.id,
        title: 'Senior Site Reliability Engineer',
        description: `## About This Role

As a Senior Site Reliability Engineer at Linear, you will be responsible for the reliability, scalability, and performance of our production infrastructure. You'll work closely with our product engineering teams to ensure that Linear remains fast, reliable, and available for the thousands of teams who depend on it daily.

Linear serves engineering teams at companies like Vercel, Ramp, and Cash App. Our users expect sub-100ms response times and 99.99% availability. You'll be instrumental in maintaining and improving these numbers.

## What You'll Do

**Infrastructure & Platform**
- Design, build, and maintain our cloud infrastructure on AWS and GCP
- Implement and manage Kubernetes clusters for our microservices architecture
- Build observability solutions using Prometheus, Grafana, and custom tooling
- Develop Infrastructure as Code using Terraform and Pulumi
- Manage our global CDN and edge computing strategy

**Reliability & Performance**
- Define and monitor SLOs/SLIs for all production services
- Lead incident response and conduct thorough post-mortems
- Implement automated remediation for common failure modes
- Optimize system performance to maintain our <100ms p99 latency target
- Design disaster recovery and business continuity plans

**Developer Experience**
- Build internal platforms and tooling to improve developer productivity
- Create self-service infrastructure provisioning for product teams
- Maintain CI/CD pipelines and improve deployment velocity
- Write documentation and runbooks for operational procedures

**Security & Compliance**
- Implement security best practices across our infrastructure
- Manage secrets, certificates, and access controls
- Support SOC 2 Type II compliance requirements
- Conduct security audits and vulnerability assessments

## What We're Looking For

**Required Experience (5+ years)**
- Production experience with Kubernetes at scale (1000+ pods)
- Deep expertise in AWS or GCP (networking, compute, storage, IAM)
- Strong programming skills in Go, Python, or TypeScript
- Experience with Infrastructure as Code (Terraform preferred)
- Proficiency with observability tools (Prometheus, Grafana, Datadog)
- Solid understanding of networking (TCP/IP, DNS, load balancing, CDN)
- Experience with PostgreSQL or similar relational databases at scale

**Nice to Have**
- Experience with ClickHouse or other analytical databases
- Background in real-time systems or WebSocket infrastructure
- Contributions to open-source infrastructure projects
- Experience building developer platforms or internal tooling

**Mindset**
- You think in systems and understand second-order effects
- You're comfortable with ambiguity and can drive projects to completion
- You balance pragmatism with long-term thinking
- You communicate clearly and document thoroughly
- You enjoy mentoring and sharing knowledge

## Technical Environment

- **Cloud**: AWS (primary), GCP (analytics)
- **Orchestration**: Kubernetes, Helm, ArgoCD
- **Databases**: PostgreSQL, Redis, ClickHouse
- **Observability**: Prometheus, Grafana, Jaeger, Sentry
- **IaC**: Terraform, Pulumi
- **Languages**: TypeScript, Go, Python
- **Real-time**: WebSockets, Server-Sent Events

## Interview Process

1. **Intro Call** (30 min) - Meet the hiring manager, discuss your background
2. **Technical Screen** (60 min) - System design and infrastructure discussion
3. **AI Interview** (45 min) - Technical deep-dive with our AI interviewer
4. **Team Interviews** (3 x 45 min) - Meet potential teammates
5. **Final Round** (45 min) - Discussion with leadership

## Compensation & Benefits

- **Salary**: $180,000 - $260,000 USD (based on experience and location)
- **Equity**: Significant equity package
- **Benefits**: Health, dental, vision (100% covered)
- **Time Off**: Unlimited PTO with minimum 4 weeks encouraged
- **Remote**: Fully remote, async-first culture
- **Equipment**: $5,000 home office stipend
- **Learning**: $2,000 annual learning budget`,
        requiredSkills: ['Kubernetes', 'AWS', 'Terraform', 'Go', 'PostgreSQL', 'Prometheus', 'Docker', 'Linux'],
        topics: ['site reliability', 'infrastructure', 'kubernetes', 'observability', 'incident response', 'performance optimization', 'system design'],
        seniorityLevel: 'senior',
      },
    });

    // ========================================================================
    // Job 2: Senior Full-Stack Engineer
    // ========================================================================

    const fullstackJob = await prisma.job.create({
      data: {
        companyId: linear.id,
        title: 'Senior Full-Stack Engineer',
        description: `## About This Role

As a Senior Full-Stack Engineer at Linear, you'll work on our core product - the issue tracking and project management tool used by thousands of high-performance engineering teams. You'll have the opportunity to shape the future of how software teams work together.

Linear is known for its speed, polish, and attention to detail. Every interaction should feel instant. Every feature should be intuitive. You'll be joining a team that obsesses over these details and has set a new standard for what developer tools should feel like.

## What You'll Do

**Product Development**
- Build new features end-to-end, from database schema to pixel-perfect UI
- Own entire product areas and make significant technical decisions
- Work closely with designers to implement beautiful, responsive interfaces
- Contribute to product direction through RFCs and design discussions

**Frontend Excellence**
- Create fast, accessible, keyboard-first interfaces with React
- Build real-time collaborative features using WebSockets
- Implement complex state management for offline-first functionality
- Optimize bundle sizes and render performance
- Write comprehensive tests (unit, integration, e2e)

**Backend Systems**
- Design and implement GraphQL APIs with proper authorization
- Build data models and migrations for PostgreSQL
- Implement background jobs and event-driven architectures
- Create integrations with GitHub, GitLab, Slack, and other tools
- Ensure data consistency in distributed systems

**Technical Leadership**
- Review code and provide constructive feedback
- Write technical design documents for complex features
- Mentor junior engineers and help grow the team
- Establish best practices and improve developer experience

## What We're Looking For

**Required Experience (5+ years)**
- Strong proficiency in TypeScript and React
- Experience building and maintaining GraphQL or REST APIs
- Solid understanding of relational databases (PostgreSQL preferred)
- Track record of shipping high-quality products
- Excellent communication skills and collaborative mindset

**Frontend Expertise**
- Deep understanding of React patterns and performance optimization
- Experience with state management (we use MobX, but transferable skills matter)
- Strong CSS skills, including responsive design and animations
- Accessibility (a11y) knowledge and experience
- Testing experience (Jest, React Testing Library, Playwright)

**Backend Competency**
- Node.js experience in production environments
- Database design and query optimization
- API design principles and best practices
- Familiarity with caching strategies (Redis)
- Understanding of security best practices

**Nice to Have**
- Experience building real-time collaborative applications
- Background with Electron or desktop applications
- Contributions to design systems or component libraries
- Experience with offline-first architectures
- Open-source contributions

**Mindset**
- You have high standards and care about code quality
- You're product-minded and think about user impact
- You can work autonomously but collaborate effectively
- You're curious and continuously learning
- You write clear documentation and communicate proactively

## Technical Stack

- **Frontend**: React, TypeScript, MobX, Tailwind CSS
- **Backend**: Node.js, GraphQL (Pothos), Prisma
- **Database**: PostgreSQL, Redis
- **Real-time**: WebSockets, Server-Sent Events
- **Desktop**: Electron
- **Mobile**: React Native
- **Testing**: Jest, Playwright, Storybook
- **Infrastructure**: AWS, Kubernetes

## Our Engineering Culture

- **Quality over quantity** - We'd rather ship one great feature than three mediocre ones
- **Ownership** - You'll own features from concept to production
- **Async-first** - Most communication happens in writing
- **Small teams** - Typically 2-3 engineers per project
- **Ship fast** - We deploy multiple times per day
- **User focus** - We talk to users frequently and iterate based on feedback

## Interview Process

1. **Intro Call** (30 min) - Discuss your background and interests
2. **Technical Screen** (60 min) - Live coding and system design
3. **AI Interview** (45 min) - Deep-dive technical discussion
4. **Take-home Project** (4 hours, paid) - Build a small feature
5. **Team Interviews** (3 x 45 min) - Meet the team
6. **Final Round** (45 min) - Meet leadership

## Compensation & Benefits

- **Salary**: $170,000 - $240,000 USD (based on experience and location)
- **Equity**: Meaningful equity stake
- **Benefits**: Comprehensive health, dental, vision (100% covered)
- **Time Off**: Unlimited PTO with minimum 4 weeks encouraged
- **Remote**: Fully remote with optional co-working stipend
- **Equipment**: $5,000 home office setup
- **Learning**: $2,000 annual education budget
- **Wellness**: $1,200 annual wellness stipend`,
        requiredSkills: ['TypeScript', 'React', 'Node.js', 'GraphQL', 'PostgreSQL', 'Git', 'Testing'],
        topics: ['frontend', 'backend', 'react', 'graphql', 'database design', 'api design', 'performance', 'real-time'],
        seniorityLevel: 'senior',
      },
    });

    console.log('   ✅ Created 2 jobs\n');

    // ========================================================================
    // Candidates
    // ========================================================================
    console.log('👤 Creating candidates...');

    const alexChen = await prisma.candidate.create({
      data: {
        name: 'Alex Chen',
        email: 'alex.chen@example.com',
        phone: '+1-555-0201',
        resumeText: `Senior Site Reliability Engineer with 7 years of experience building and scaling cloud infrastructure.

Currently at Datadog as Staff SRE, leading platform reliability for their metrics ingestion pipeline handling 10B+ data points per day. Previously at Stripe where I built the observability platform and reduced incident MTTR by 60%.

Experience:
- 7 years in SRE/Platform Engineering roles
- Kubernetes at scale (5000+ pods, multi-cluster federation)
- AWS expert (all major services, FinOps optimization)
- Built internal developer platforms serving 500+ engineers
- Led incident response for Tier-1 services

Technical Skills:
- Languages: Go (primary), Python, TypeScript, Bash
- Infrastructure: AWS, GCP, Terraform, Pulumi, Ansible
- Containers: Kubernetes, Docker, Helm, ArgoCD, Istio
- Databases: PostgreSQL, Redis, ClickHouse, DynamoDB
- Observability: Prometheus, Grafana, Jaeger, Datadog, PagerDuty
- Security: HashiCorp Vault, AWS IAM, SOC 2 compliance

Education:
- M.S. Computer Science, Stanford University
- B.S. Computer Engineering, UC Berkeley

Notable Projects:
- Designed zero-downtime database migration framework
- Built multi-region failover system with <30s RTO
- Created self-service infrastructure platform reducing provisioning time by 90%`,
        resumeSkills: ['Kubernetes', 'AWS', 'Terraform', 'Go', 'PostgreSQL', 'Prometheus', 'Docker', 'Grafana', 'ClickHouse'],
        accommodations: [],
      },
    });

    const sarahJohnson = await prisma.candidate.create({
      data: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        phone: '+1-555-0202',
        resumeText: `Full-Stack Engineer with 6 years of experience building high-quality web applications.

Currently Senior Engineer at Figma, working on the real-time collaboration engine. Previously at Notion where I led the development of their API platform. Passionate about building fast, accessible, and beautiful user interfaces.

Experience:
- 6 years in full-stack roles at design tool companies
- Built real-time collaborative features used by millions
- Led API platform development from 0 to 10,000+ integrations
- Expertise in React performance optimization

Technical Skills:
- Frontend: React, TypeScript, MobX, Redux, Tailwind CSS
- Backend: Node.js, GraphQL, REST, PostgreSQL, Redis
- Real-time: WebSockets, CRDTs, Operational Transform
- Testing: Jest, Playwright, Cypress, Storybook
- Tools: Git, GitHub Actions, Linear, Figma

Education:
- B.S. Computer Science, MIT

Notable Projects:
- Implemented multiplayer cursors and live editing at Figma
- Designed and built Notion's public API (used by 10k+ apps)
- Created component library used by 50+ engineers
- Open-source contributor to React Query and Radix UI`,
        resumeSkills: ['TypeScript', 'React', 'Node.js', 'GraphQL', 'PostgreSQL', 'WebSockets', 'Testing', 'Git'],
        accommodations: [],
      },
    });

    console.log('   ✅ Created 2 candidates\n');

    // ========================================================================
    // Interviews
    // ========================================================================
    console.log('📅 Creating interviews...');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await prisma.interview.createMany({
      data: [
        {
          roomId: generateRoomId('alex-sre'),
          token: FIXED_TOKENS['alex-sre'],
          candidateId: alexChen.id,
          jobId: sreJob.id,
          companyId: linear.id,
          interviewerId: 'alex-ai',
          interviewerName: 'Alex AI',
          scheduledAt: now,
          duration: 45,
          status: 'scheduled',
          proctoringEnabled: false,
          language: 'en',
          expiresAt: tomorrow,
        },
        {
          roomId: generateRoomId('sarah-eng'),
          token: FIXED_TOKENS['sarah-eng'],
          candidateId: sarahJohnson.id,
          jobId: fullstackJob.id,
          companyId: linear.id,
          interviewerId: 'alex-ai',
          interviewerName: 'Alex AI',
          scheduledAt: now,
          duration: 45,
          status: 'scheduled',
          proctoringEnabled: false,
          language: 'en',
          expiresAt: tomorrow,
        },
      ],
    });

    console.log('   ✅ Created 2 interviews\n');

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('═'.repeat(60));
    console.log('✨ Seed Complete!');
    console.log('═'.repeat(60));
    console.log('\n📊 Summary:');
    console.log('   • 1 Company: Linear');
    console.log('   • 2 Jobs: Senior SRE, Senior Full-Stack Engineer');
    console.log('   • 2 Candidates: Alex Chen, Sarah Johnson');
    console.log('   • 2 Interviews: Ready for testing');
    console.log('\n🔗 Test Interview URLs:');
    console.log(`   Alex (SRE):    http://localhost:3050/room/${generateRoomId('alex-sre')}?token=${FIXED_TOKENS['alex-sre']}`);
    console.log(`   Sarah (Eng):   http://localhost:3050/room/${generateRoomId('sarah-eng')}?token=${FIXED_TOKENS['sarah-eng']}`);
    console.log('\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seed();
