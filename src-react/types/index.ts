export interface Project {
  id: string;
  name: string;
  path: string;
  conversations: Conversation[];
  createdAt: string;
  lastOpened?: string;
  isPinned?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  fileOperations?: FileOperation[];
  workedMs?: number;
  retryable?: boolean;
  timestamp: string;
  streaming?: boolean;
}

export interface Attachment {
  name: string;
  type: string;
  mediaType: string;
  size: number;
  data: number[];
  dataUrl: string;
}

export interface ApiConfig {
  baseUrl: string;
  authToken: string;
  model: string;
}

export interface AgentStatus {
  type: 'thinking' | 'reading' | 'editing' | 'generating' | 'idle';
  message: string;
}

export interface FileOperation {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  linesAdded?: number;
  linesDeleted?: number;
  content?: string;
}

export interface UsageInfo {
  success: boolean;
  data?: {
    used?: number;
    limit?: number;
    remaining?: number;
    resets_at?: string;
    [key: string]: any;
  };
  error?: string;
}
