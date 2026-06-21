import { api } from '../lib/api';
import type {
  AdminLoginResponse,
  AgentLoginResponse,
  UserLoginResponse,
  MessageResponse,
} from '../types/api';

export function adminLogin(email: string, password: string) {
  return api<AdminLoginResponse>('/admins/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    token: null,
    skipAuthHandler: true,
  });
}

export function agentLogin(agentLoginId: string, password: string) {
  return api<AgentLoginResponse>('/agents/login', {
    method: 'POST',
    body: JSON.stringify({ agentLoginId, password }),
    token: null,
    skipAuthHandler: true,
  });
}

export function userLogin(phoneNumber: string, password: string) {
  return api<UserLoginResponse>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, password }),
    token: null,
    skipAuthHandler: true,
  });
}

export function adminLogout() {
  return api<MessageResponse>('/admins/logout', { method: 'POST' });
}

export function agentLogout() {
  return api<MessageResponse>('/agents/logout', { method: 'POST' });
}

export function userLogout() {
  return api<MessageResponse>('/users/logout', { method: 'POST' });
}

export function changeAdminPassword(currentPassword: string, newPassword: string) {
  return api<MessageResponse>('/admins/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function changeAgentPassword(currentPassword: string, newPassword: string) {
  return api<MessageResponse>('/agents/me/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
