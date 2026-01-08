/**
 * Project Review Agent
 * LangGraph-powered voice agent for reviewing project presentations
 * 
 * This agent:
 * - Receives PPT upload and parses content
 * - Detects AI-generated content
 * - Generates level-wise questions (easy, medium, hard)
 * - Evaluates answers and generates comprehensive report
 */

import { StateGraph, END, START } from '@langchain/langgraph';

import { BaseVoiceAgent } from '../core/voice-agent.js';
import { type AgentMetadata, type BaseAgentConfig } from '../core/types.js';

import { 
  ProjectReviewState, 
  type ProjectReviewStateType,
  createDefaultReviewConnectionState,
  createDefaultReviewTimeState,
} from './state/index.js';
import { ReviewPhase, QuestionLevel } from './types/index.js';
import {
  initializationNode,
  pptParsingNode,
  aiDetectionNode,
  questionGenerationNode,
  askQuestionNode,
  evaluateAnswerNode,
  levelTransitionNode,
  reportGenerationNode,
  closingNode,
} from './nodes/index.js';

// ============================================================================
// Types
// ============================================================================

export interface ProjectReviewAgentConfig extends BaseAgentConfig {
  reviewId: string;
  candidateId: string;
  projectTitle: string;
  maxDurationMinutes?: number;
}

// ============================================================================
// Project Review Agent Implementation
// ============================================================================

export class ProjectReviewAgent extends BaseVoiceAgent<ProjectReviewStateType, ProjectReviewAgentConfig> {
  /**
   * Build the project review LangGraph workflow
   */
  protected buildGraph() {
    const graph = new StateGraph(ProjectReviewState) as any;

    // -----------------------------------------------------------------------
    // Add Nodes
    // -----------------------------------------------------------------------
    
    // Setup phase
    graph.addNode('initializeSession', initializationNode);
    graph.addNode('awaitUpload', this.createWaitForUploadNode());
    graph.addNode('parsePpt', pptParsingNode);
    
    // Analysis phase
    graph.addNode('detectAiContent', aiDetectionNode);
    graph.addNode('generateQuestions', questionGenerationNode);
    
    // Questioning phase
    graph.addNode('presentQuestion', askQuestionNode);
    graph.addNode('assessAnswer', evaluateAnswerNode);
    graph.addNode('transitionLevel', levelTransitionNode);
    
    // Report phase
    graph.addNode('generateReport', reportGenerationNode);
    graph.addNode('closeSession', closingNode);
    
    // Error handling
    graph.addNode('onError', this.createErrorNode());

    // -----------------------------------------------------------------------
    // Add Edges
    // -----------------------------------------------------------------------
    
    // Entry
    graph.addEdge(START, 'initializeSession');
    graph.addEdge('initializeSession', 'awaitUpload');
    
    // Upload routing
    graph.addConditionalEdges('awaitUpload', this.routeFromUpload.bind(this), {
      parsePpt: 'parsePpt',
      awaitUpload: 'awaitUpload',
      onError: 'onError',
    });
    
    // Parsing -> Detection -> Question Gen
    graph.addEdge('parsePpt', 'detectAiContent');
    graph.addEdge('detectAiContent', 'generateQuestions');
    graph.addEdge('generateQuestions', 'presentQuestion');
    
    // Question loop
    graph.addConditionalEdges('presentQuestion', this.routeFromQuestion.bind(this), {
      assessAnswer: 'assessAnswer',
      generateReport: 'generateReport',
    });
    
    graph.addEdge('assessAnswer', 'transitionLevel');
    
    // Level transition routing
    graph.addConditionalEdges('transitionLevel', this.routeFromLevelTransition.bind(this), {
      presentQuestion: 'presentQuestion',
      generateReport: 'generateReport',
    });
    
    // Report -> Closing -> End
    graph.addEdge('generateReport', 'closeSession');
    graph.addEdge('closeSession', END);
    graph.addEdge('onError', END);

    return graph;
  }

  /**
   * Get system prompt for the project review agent
   */
  protected getSystemPrompt(metadata: AgentMetadata): string {
    return `You are an AI project reviewer conducting a professional presentation review session.

Your role:
- Review the candidate's project presentation (PPT)
- Detect potential AI-generated content
- Ask progressively challenging questions
- Evaluate understanding and project ownership
- Provide constructive feedback

Guidelines:
- Be professional but encouraging
- Start with easier questions to build confidence
- Progress to harder questions to test depth
- Note any discrepancies between presentation and answers
- Focus on understanding, not memorization

Session context:
- Session ID: ${metadata.sessionId || 'unknown'}
- Room: ${metadata.roomName || 'unknown'}`;
  }

  /**
   * Create initial state for a new review session
   */
  protected createInitialState(
    sessionId: string,
    roomName: string,
    metadata: AgentMetadata
  ): ProjectReviewStateType {
    return {
      // Session info
      sessionId,
      roomName,
      phase: ReviewPhase.UPLOAD,
      
      // Candidate (will be populated from metadata)
      candidate: metadata.candidate ? {
        id: metadata.candidate.id || '',
        name: metadata.candidate.name || 'Candidate',
        email: metadata.candidate.email || '',
        projectTitle: metadata.projectTitle || 'Project',
      } : null,
      
      // PPT content
      pptFile: null,
      pptMetadata: null,
      slides: [],
      
      // AI Detection
      aiDetection: null,
      
      // Questions
      questionsPool: {
        easy: [],
        medium: [],
        hard: [],
      },
      currentQuestion: null,
      questionsAsked: [],
      currentLevel: QuestionLevel.EASY,
      
      // Answers & Evaluations
      answers: [],
      evaluations: [],
      
      // Report
      finalReport: null,
      
      // Connection
      connection: createDefaultReviewConnectionState(),
      
      // Time tracking
      time: createDefaultReviewTimeState(),
      
      // Conversation
      transcript: [],
      lastAiMessage: '',
      lastUserMessage: '',
      shouldSpeak: true,
      
      // Error handling
      errorCount: 0,
      lastError: null,
    };
  }

  /**
   * Get greeting message for the candidate
   */
  protected getGreetingMessage(metadata: AgentMetadata): string {
    const name = metadata.candidate?.name || 'there';
    return `Hello ${name}! Welcome to your project review session. 
I'm here to discuss your project presentation with you.

Please start by uploading your PowerPoint file. Once I receive it, 
I'll analyze the content and we'll have a discussion about your project.`;
  }

  // =========================================================================
  // Routing Functions
  // =========================================================================

  private routeFromUpload(state: ProjectReviewStateType): string {
    if (state.pptFile) {
      return 'parsePpt';
    }
    if (state.errorCount >= 3) {
      return 'onError';
    }
    return 'awaitUpload';
  }

  private routeFromQuestion(state: ProjectReviewStateType): string {
    // Check if we have a question to ask
    if (state.currentQuestion) {
      return 'assessAnswer';
    }
    
    // Check if we've exhausted all questions
    const { questionsPool, questionsAsked } = state;
    const totalAsked = questionsAsked.length;
    const totalAvailable = 
      questionsPool.easy.length + 
      questionsPool.medium.length + 
      questionsPool.hard.length;
    
    if (totalAsked >= totalAvailable || totalAsked >= 10) {
      return 'generateReport';
    }
    
    return 'assessAnswer';
  }

  private routeFromLevelTransition(state: ProjectReviewStateType): string {
    if (state.phase === ReviewPhase.REPORT_GENERATION) {
      return 'generateReport';
    }
    return 'presentQuestion';
  }

  // =========================================================================
  // Helper Nodes
  // =========================================================================

  private createWaitForUploadNode() {
    return async (state: ProjectReviewStateType): Promise<Partial<ProjectReviewStateType>> => {
      // This node waits for file upload - in real implementation,
      // file upload would be handled by the voice agent's event system
      console.log('[ProjectReview] Waiting for PPT upload...');
      
      if (!state.pptFile) {
        return {
          lastAiMessage: "I'm waiting for your presentation file. Please upload your PowerPoint.",
        };
      }
      
      return {};
    };
  }

  private createErrorNode() {
    return async (state: ProjectReviewStateType): Promise<Partial<ProjectReviewStateType>> => {
      console.log('[ProjectReview] Handling error:', state.lastError);
      return {
        phase: ReviewPhase.ERROR,
        lastAiMessage: `I apologize, but we've encountered an issue: ${state.lastError || 'Unknown error'}. 
Please contact support for assistance.`,
      };
    };
  }

  // =========================================================================
  // Data Message Handling
  // =========================================================================

  /**
   * Handle incoming data messages from the room
   */
  protected onDataMessage(message: { type: string; data?: any }, participant: any): void {
    console.log('[ProjectReview] Data message received:', message.type);
    
    switch (message.type) {
      case 'ppt_uploaded':
        this.handleFileUpload(message.data?.fileUrl || message.data?.url);
        break;
      case 'file_upload':
        this.handleFileUpload(message.data?.fileUrl || message.data?.url);
        break;
      default:
        console.log('[ProjectReview] Unknown message type:', message.type);
    }
  }

  // =========================================================================
  // Public Methods for File Upload Handling
  // =========================================================================

  /**
   * Handle PPT file upload from external source
   * This runs the LangGraph workflow to analyze the PPT and generate questions
   */
  public async handleFileUpload(fileUrl: string): Promise<void> {
    if (!this.currentState || !fileUrl) {
      console.log('[ProjectReview] Cannot process upload - state not ready');
      return;
    }

    console.log(`[ProjectReview] 📤 File upload received: ${fileUrl}`);
    
    // Notify user we're processing
    if (this.session) {
      this.session.say("I've received your presentation file. Let me analyze the content and prepare some questions for you. This will take a moment.");
    }

    try {
      // Update state with file URL
      this.currentState = {
        ...this.currentState,
        pptFile: fileUrl,
        phase: ReviewPhase.PARSING,
      };

      // Run the LangGraph workflow to analyze and generate questions
      console.log('[ProjectReview] 🔄 Running analysis workflow...');
      
      if (this.graph) {
        const result = await this.graph.invoke(this.currentState);
        this.currentState = result;
        
        console.log('[ProjectReview] ✅ Workflow complete');
        console.log(`[ProjectReview] Questions generated: Easy=${result.questionsPool?.easy?.length || 0}, Medium=${result.questionsPool?.medium?.length || 0}, Hard=${result.questionsPool?.hard?.length || 0}`);
        
        // If we have questions, announce we're ready
        const totalQuestions = 
          (result.questionsPool?.easy?.length || 0) + 
          (result.questionsPool?.medium?.length || 0) + 
          (result.questionsPool?.hard?.length || 0);
        
        if (totalQuestions > 0 && this.session) {
          const firstQuestion = result.questionsPool?.easy?.[0]?.question || 
                               result.questionsPool?.medium?.[0]?.question ||
                               'Can you give me an overview of your project?';
          
          this.session.say(`I've analyzed your presentation and prepared ${totalQuestions} questions for you. Let's begin with an easy one: ${firstQuestion}`);
        } else if (this.session) {
          // Fallback if no questions were generated
          this.session.say("I've reviewed your presentation. Let's start with a simple question: Can you give me an overview of your project and its main objectives?");
        }
      }
    } catch (error) {
      console.error('[ProjectReview] ❌ Workflow error:', error);
      
      if (this.session) {
        this.session.say("I encountered an issue analyzing your presentation, but let's proceed. Can you give me an overview of your project?");
      }
    }
  }
}
