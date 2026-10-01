import { apiClient } from './client';
import { 
  Profile, 
  ProfileCreateRequest, 
  ProfileUpdateRequest, 
  ProfileResponse 
} from '../types';
import { ENV } from '../config/options';
import { getMockProfileData, saveMockProfile } from './mocks';

export async function getProfile(): Promise<ProfileResponse> {
  if (ENV.USE_MOCKS) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockProfileData());
      }, 300);
    });
  }

  return apiClient<ProfileResponse>('/api/v1/profile', {
    method: 'GET',
  });
}

export async function createProfile(data: ProfileCreateRequest): Promise<{ message: string }> {
  // Clean payload: omit undefined / null values
  const payload: Record<string, any> = { name: data.name };
  if (data.age !== undefined && data.age !== null) payload.age = Number(data.age);
  if (data.gender) payload.gender = data.gender;
  if (data.phone) payload.phone = data.phone;

  if (data.location && Object.values(data.location).some(v => v !== undefined && v !== '')) {
    payload.location = { ...data.location };
  }
  if (data.farming && Object.values(data.farming).some(v => v !== undefined && v !== '')) {
    payload.farming = { ...data.farming };
  }
  if (data.preferences && Object.values(data.preferences).some(v => v !== undefined && v !== '')) {
    payload.preferences = { ...data.preferences };
  }

  if (ENV.USE_MOCKS) {
    return new Promise((resolve) => {
      setTimeout(() => {
        saveMockProfile(payload as Profile);
        resolve({ message: 'Profile created successfully' });
      }, 300);
    });
  }

  return apiClient<{ message: string }>('/api/v1/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<{ message: string }> {
  if (ENV.USE_MOCKS) {
    return new Promise((resolve) => {
      setTimeout(() => {
        saveMockProfile(data as Profile);
        resolve({ message: 'Profile updated successfully' });
      }, 300);
    });
  }

  return apiClient<{ message: string }>('/api/v1/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
