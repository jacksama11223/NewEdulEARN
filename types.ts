
export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  password?: string;
  name: string;
  role: UserRole;
  isLocked: boolean;
  apiKey: string | null;
  squadronId?: string;
  hasSeenOnboarding: boolean;
}

export interface Course {
  id: string;
  name: string;
  teacher: string;
  defaultPersona?: string;
}

export interface ModuleItem {
  type: 'lesson' | 'assignment';
  id: string;
}

export interface Module {
  id: string;
  name: string;
  items: ModuleItem[];
}

export interface CourseStructure {
  modules: Module[];
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  type: 'video' | 'text';
  content: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  type: 'file' | 'quiz';
  quizId?: string;
  createdAt?: string;
  // New fields for Commander's Challenge
  description?: string;
  rank?: 'S' | 'A' | 'B';
  isBoss?: boolean;
  rewardXP?: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
  title?: string;
}

export interface FileSubmission {
  id: string;
  studentId: string;
  studentName: string;
  status: 'Chưa nộp' | 'Đã nộp';
  grade: number | null;
  feedback: string | null;
  fileName: string | null;
  timestamp: string | null;
}

export interface QuizSubmission {
  score: number;
  total: number;
  percentage: number;
  timestamp: string;
  answers: Record<string, number>;
}

export interface AnalyticsData {
  progress: number;
  grade: string;
}

export interface DiscussionPost {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

export interface Recommendation {
  id: string;
  title: string;
  service: string;
}

export interface FallbackContent {
  id: string;
  title: string;
  service: string;
}

export interface AccessLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface BackupStatus {
  lastBackup: string;
  status: string;
  nextBackup: string;
}

export interface Announcement {
  id: string;
  text: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  text: string;
  read: boolean;
  type: string;
  timestamp: string;
  metadata?: any;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
}

export interface SpaceJunk {
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'legendary';
    xpValue: number;
}

export interface GamificationState {
  points: number;
  diamonds: number;
  badges: Badge[];
  inventory: string[];
  equippedSkin: string;
  equippedPet: string | null;
  lastStudyDate: string | null;
  streakDays: number;
  junkInventory: SpaceJunk[];
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'skin' | 'pet' | 'effect';
  cost: number;
  currency: 'xp' | 'diamond';
  icon: string;
  cssClass: string;
  description: string;
}

export interface Mission {
  id: string;
  title: string;
  target: number;
  current: number;
  reward: number;
  type: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  members: string[];
  mission?: Mission;
}

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  timestamp: Date;
  isSOS?: boolean;
  sosStatus?: 'PENDING' | 'RESOLVED';
  rescuerName?: string;
  isWhisper?: boolean;
  challenge?: {
      id: string;
      question: QuizQuestion;
      status: string;
  };
  intel?: {
      noteId: string;
      title: string;
      preview: string;
      fullContent: string;
  };
  trade?: {
      id: string;
      deckId: string;
      deckTitle: string;
      cost: number;
      status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  };
  gradeDispute?: {
      assignmentId: string;
      assignmentTitle: string;
      score: number;
      maxScore: number;
      feedback: string | null;
  };
  reward?: {
      type: 'diamond' | 'item';
      value: number | string;
      message: string;
  };
  squadronInvite?: {
      groupId: string;
      groupName: string;
      status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  };
}

export interface GroupChatMessage {
    id: string;
    user: { id: string, name: string, role: string };
    text: string;
    timestamp: Date;
    isSOS?: boolean;
    sosStatus?: string;
    rescuerName?: string;
    isWhisper?: boolean;
}

export interface WafLog {
  id: string;
  ip: string;
  type: string;
  path: string;
  timestamp: Date;
}

export type MockTestResultStatus = 'RUNNING' | 'PASS' | 'FAIL' | null;

export interface MockTestResults {
  unit: MockTestResultStatus;
  integration: MockTestResultStatus;
  e2e: MockTestResultStatus;
}

export interface VideoNote {
  id: string;
  userId: string;
  lessonId: string;
  timestamp: number;
  text: string;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  box?: number;
  nextReview?: number;
  lastReviewed?: number;
}

export interface FlashcardDeck {
  id: string;
  courseId?: string;
  moduleId?: string;
  title: string;
  cards: Flashcard[];
}

export interface LearningNode {
  id: string;
  title: string;
  description: string;
  type: 'theory' | 'practice' | 'challenge' | 'secret';
  isLocked: boolean;
  isCompleted: boolean;
  flashcards?: Flashcard[];
  flashcardsMastered?: number;
  isExamUnlocked?: boolean;
  examScore?: number;
  examQuestions?: ExamQuestion[]; // PERSIST GENERATED EXAM
  lastReviewed?: number;
}

export interface LearningPath {
  id: string;
  creatorId: string;
  title: string;
  topic: string;
  createdAt: string;
  targetLevel?: string;
  goal?: string;
  dailyCommitment?: string;
  suggestedSkinId?: string;
  nodes: LearningNode[];
  wager?: {
      amount: number;
      deadline: string;
      isResolved: boolean;
  };
}

export interface PersonalNote {
  id: string;
  // Added optional _id for MongoDB compatibility
  _id?: string;
  userId: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  linkedAssignmentId?: string;
  linkedPathId?: string;
  pdfFileId?: string;
  sharedWithSquadronId?: string;
  unlockedBy?: string[];
  comments?: NoteComment[];
}

export interface NoteComment {
    id: string;
    userId: string;
    userName: string;
    content: string;
    highlightedText?: string;
    timestamp: string;
}

export interface Task {
  id: string;
  // Added optional _id for MongoDB compatibility
  _id?: string;
  userId: string;
  text: string;
  isCompleted: boolean;
  isArchived: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Database {
  USERS: Record<string, User>;
  COURSES: Course[];
  COURSE_STRUCTURE: Record<string, CourseStructure>;
  LESSONS: Record<string, Lesson>;
  ASSIGNMENTS: Record<string, Assignment>;
  QUIZZES: Record<string, Quiz>;
  FILE_SUBMISSIONS: Record<string, FileSubmission[]>;
  QUIZ_SUBMISSIONS: Record<string, Record<string, QuizSubmission>>;
  ANALYTICS: Record<string, AnalyticsData>;
  DISCUSSION: Record<string, DiscussionPost[]>;
  RECOMMENDATIONS: Recommendation[];
  FALLBACK_CONTENT: FallbackContent[];
  ACCESS_LOGS: AccessLog[];
  BACKUP_STATUS: BackupStatus;
  ANNOUNCEMENTS: Announcement[];
  NOTIFICATIONS: Record<string, Notification[]>;
  GAMIFICATION: GamificationState;
  SHOP_ITEMS: ShopItem[];
  STUDY_GROUPS: StudyGroup[];
  CHAT_MESSAGES: Record<string, ChatMessage[]>;
  GROUP_CHAT_MESSAGES: Record<string, GroupChatMessage[]>;
  WAF_LOGS: WafLog[];
  MOCK_TEST_RESULTS: MockTestResults;
  VIDEO_NOTES: Record<string, VideoNote[]>;
  FLASHCARD_DECKS: Record<string, FlashcardDeck>;
  LESSON_PROGRESS: Record<string, string[]>;
  LEARNING_PATHS: Record<string, LearningPath>;
  SCRATCHPAD: Record<string, string>;
  NODE_NOTES: Record<string, PersonalNote>;
  PERSONAL_NOTES: Record<string, PersonalNote>;
  TASKS: Record<string, Task>;
  COMMUNITY_QUESTIONS: any[];
}

export interface GeneratedModuleItem {
    title: string;
    type: 'lesson_video' | 'lesson_text' | 'assignment_quiz' | 'assignment_file';
    contentOrDescription: string;
}

export interface GeneratedModule {
    title: string;
    items: GeneratedModuleItem[];
}

export interface ServiceStatus {
    [key: string]: 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL';
}

export type ServiceName = 
    | 'user_management'
    | 'course_management'
    | 'content_delivery'
    | 'assessment_taking'
    | 'storage_service'
    | 'grading_service'
    | 'notification_service'
    | 'chat_service'
    | 'group_service'
    | 'forum_service'
    | 'ai_tutor_service'
    | 'ai_assistant_service'
    | 'personalization'
    | 'analytics';

export type ServiceStatusValue = 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL';

export interface FeatureFlag {
    status: 'OFF' | 'SPECIFIC' | 'ALL';
    specificUsers: string;
}

export type FeatureFlagStatus = 'OFF' | 'SPECIFIC' | 'ALL';

export interface GeminiChatMessage {
    role: 'user' | 'model';
    parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

export interface ExamQuestion {
    id: string;
    type: 'mcq' | 'short_answer' | 'fill_gap' | 'arrange_words';
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
}

export interface PlacementTestQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
}

export interface RiddleData {
    question: string;
    answer: string;
    hint: string;
}
