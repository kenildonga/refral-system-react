export type AdminRole = 'superAdmin' | 'admin';

export type PortalRole = 'admin' | 'superAdmin' | 'agent' | 'withdrawal';

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  agentLoginId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  email: string | null;
  isActive: boolean;
  state: string | null;
  city: string | null;
  lastLogin: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export function formatAgentName(agent: Pick<Agent, 'firstName' | 'lastName'>): string {
  return `${agent.firstName} ${agent.lastName}`.trim();
}

export interface AgentCredentials {
  agentLoginId: string;
  password: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  admin: Admin;
}

export interface AgentLoginResponse {
  accessToken: string;
  agent: Agent;
}

export interface UserLoginResponse {
  accessToken: string;
  user: ReferralUser;
}

export interface MessageResponse {
  message: string;
}

export interface CreateAgentResponse {
  agent: Agent;
  credentials: AgentCredentials;
}

export interface ResetAgentPasswordResponse {
  message: string;
  credentials: AgentCredentials;
}

export interface CreateAgentPayload {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  state: string;
  city: string;
}

export interface UpdateAgentPayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  state?: string;
  city?: string;
}

export interface SignUpAgentPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  state: string;
  city: string;
  password: string;
}

export interface UpdateAgentProfilePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  state?: string;
  city?: string;
}

export interface ChangeAgentPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface State {
  id: number;
  name: string;
  stateCode: string;
}

export interface City {
  id: number;
  name: string;
  stateId: number;
}

export interface ReferralUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function formatUserName(user: Pick<ReferralUser, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  password: string;
}

export interface AssignAgentPayload {
  agentId: string;
  stateId: number;
  cityId: number;
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  password: string;
  role?: AdminRole;
}

export interface UpdateAdminPayload {
  name?: string;
  email?: string;
  role?: AdminRole;
}

export type SubmissionUserType = 'agent' | 'user';

export interface FormSummary {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  submissionUserType: SubmissionUserType;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  options?: string[];
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    allowedFileTypes?: string[];
    maxFileSizeMB?: number;
    errorMessage?: string;
  };
}

export interface Form {
  id: string;
  title: string;
  description: string | null;
  fields: ApiFormField[];
  isPublished: boolean;
  submissionUserType: SubmissionUserType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormPayload {
  title: string;
  description?: string;
  fields?: ApiFormField[];
  isPublished?: boolean;
  submissionUserType: SubmissionUserType;
}

export interface UpdateFormPayload {
  title?: string;
  description?: string;
  fields?: ApiFormField[];
  isPublished?: boolean;
  submissionUserType?: SubmissionUserType;
}
