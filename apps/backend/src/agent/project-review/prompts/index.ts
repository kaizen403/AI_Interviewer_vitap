/**
 * Project Review Prompts
 * All AI prompts and message templates for project review
 */

import { QuestionLevel } from '../types/index.js';

// ============================================================================
// Level Transition Messages
// ============================================================================

export const LEVEL_TRANSITION_MESSAGES: Record<QuestionLevel, string> = {
  [QuestionLevel.EASY]: "Let's start with some basic questions about your project.",
  [QuestionLevel.MEDIUM]: "Great! Now let's dive a bit deeper into the technical details.",
  [QuestionLevel.HARD]: "Excellent! Now for some more challenging questions to test your expertise.",
};

// ============================================================================
// Feedback Messages
// ============================================================================

export const FEEDBACK_MESSAGES = {
  excellent: [
    'Excellent explanation!',
    'Very thorough answer!',
    'Great, you clearly understand this well.',
  ],
  good: [
    'Good, thank you.',
    'Nice explanation.',
    'That covers the key points well.',
  ],
  adequate: [
    'I see, thank you for explaining.',
    'Okay, I understand.',
    'Thank you for your answer.',
  ],
  weak: [
    "I understand. Let's continue.",
    "Okay, let's move on.",
    'Thank you, noted.',
  ],
};

// ============================================================================
// Session Messages
// ============================================================================

export const WELCOME_MESSAGE = `Hello! Welcome to your project review session. 
    
I'll be reviewing your project presentation today. To get started, please upload your PowerPoint file. 
Once uploaded, I'll analyze the content and ask you questions to understand your project better.`;

export const CLOSING_MESSAGE = `Thank you for participating in this project review session. 
Your detailed report will be available shortly. 
If you have any questions about the process, please reach out to your coordinator.
Have a great day!`;

export const WAITING_FOR_UPLOAD = "I'm waiting for your presentation file. Please upload your PowerPoint.";

export const UPLOAD_ERROR = "I'm having trouble reading your presentation. Could you please try uploading it again?";

// ============================================================================
// AI Detection Prompts
// ============================================================================

export const AI_DETECTION_SYSTEM_PROMPT = `You are an expert at detecting AI-generated content.
Analyze the following text for signs of AI generation.

Look for:
- Unusually perfect grammar and structure
- Generic phrasing without specific details
- Lack of personal voice or unique insights
- Overuse of transitional phrases
- Perfect but surface-level explanations
- Missing real-world examples or anecdotes
- Repetitive sentence structures

Be objective and provide confidence levels.`;

export const AI_DETECTION_USER_PROMPT = (content: string) => 
  `Analyze this text for AI-generated content:\n\n${content}`;

// ============================================================================
// Question Generation Prompts
// ============================================================================

export const QUESTION_GEN_SYSTEM_PROMPT = `You are an expert reviewer generating questions about a project presentation.

Your goal is to generate questions that will verify the candidate truly understands and owns this project.
Questions should test real knowledge, not just recall of slides.`;

export const QUESTION_LEVEL_INSTRUCTIONS: Record<QuestionLevel, string> = {
  [QuestionLevel.EASY]: `Generate EASY questions that:
- Ask about basic facts presented in the slides
- Require simple recall of information
- Can be answered in 1-2 sentences
- Test surface-level understanding`,

  [QuestionLevel.MEDIUM]: `Generate MEDIUM questions that:
- Ask about relationships between concepts
- Require explanation of methods or approaches
- Need 2-3 sentences to answer well
- Test understanding of "how" and "why"`,

  [QuestionLevel.HARD]: `Generate HARD questions that:
- Challenge assumptions or decisions made
- Ask about edge cases or limitations
- Require deep technical knowledge
- Test critical thinking and expertise
- Ask "what if" scenarios`,
};

export const generateQuestionPrompt = (
  projectTitle: string,
  slideContent: string,
  level: QuestionLevel,
  count: number
): string => `Project: ${projectTitle}

Presentation Content:
${slideContent}

${QUESTION_LEVEL_INSTRUCTIONS[level]}

Generate ${count} ${level.toUpperCase()} level questions.`;

// ============================================================================
// Answer Evaluation Prompts
// ============================================================================

export const EVALUATION_SYSTEM_PROMPT = `You are evaluating a candidate's answer about their project.

Score from 1-10:
- 9-10: Excellent, deep understanding, provides insights beyond the presentation
- 7-8: Good, demonstrates clear ownership and understanding
- 5-6: Adequate, knows the basics but lacks depth
- 3-4: Weak, struggles to explain concepts
- 1-2: Poor, cannot answer or appears unfamiliar with content

Flag concerns if:
- Answer contradicts presentation content
- Candidate seems unfamiliar with their own project
- Answers are suspiciously vague or generic
- Technical terms used incorrectly`;

export const generateEvaluationPrompt = (
  question: string,
  level: QuestionLevel,
  context: string,
  expectedPoints: string[],
  answer: string
): string => `Question (${level} level): ${question}

Context from presentation: ${context}

Expected points to cover:
${expectedPoints.map(p => `- ${p}`).join('\n')}

Candidate's answer: ${answer}

Evaluate this answer.`;

// ============================================================================
// Report Generation Prompts
// ============================================================================

export const REPORT_SYSTEM_PROMPT = `You are generating a comprehensive project review report.
Be objective, constructive, and provide actionable feedback.
Base your assessment on the evidence from the Q&A session.`;

export const generateReportPrompt = (
  candidateName: string,
  projectTitle: string,
  scoresByLevel: string,
  aiDetectionSummary: string,
  concernsCount: number
): string => `Generate a project review report for:

Candidate: ${candidateName}
Project: ${projectTitle}

Scores by Level:
${scoresByLevel}

AI Detection Summary:
${aiDetectionSummary}

Flagged Concerns: ${concernsCount}

Provide:
1. Overall assessment (2-3 sentences)
2. Key strengths observed
3. Areas for improvement
4. Recommendation (proceed/review/reject)
5. Next steps (2-3 action items)`;
