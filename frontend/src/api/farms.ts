import { apiClient } from './client';
import { 
  FarmCreateRequest, 
  FarmCreateResponse, 
  AssignUnitsRequest, 
  AssignUnitsResponse, 
  IrrigateResponse, 
  AnalyticsResponse 
} from '../types';
import { ENV } from '../config/options';
import { addMockFarm, assignMockUnits, irrigateMockFarm, generateMockAnalytics } from './mocks';

export async function createFarm(data: FarmCreateRequest): Promise<FarmCreateResponse> {
  if (ENV.USE_MOCKS) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(addMockFarm(data));
      }, 400);
    });
  }

  return apiClient<FarmCreateResponse>('/api/v1/farms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function assignUnits(farmId: string, data: AssignUnitsRequest): Promise<AssignUnitsResponse> {
  if (ENV.USE_MOCKS) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(assignMockUnits(farmId, data.unit_ids));
        } catch (e: any) {
          reject(e);
        }
      }, 350);
    });
  }

  return apiClient<AssignUnitsResponse>(`/api/v1/farms/${farmId}/units`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function irrigateFarm(farmId: string): Promise<IrrigateResponse> {
  if (ENV.USE_MOCKS) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(irrigateMockFarm(farmId));
        } catch (e: any) {
          reject(e);
        }
      }, 350);
    });
  }

  return apiClient<IrrigateResponse>(`/api/v1/farms/${farmId}/irrigate`, {
    method: 'POST',
  });
}

export async function getFarmAnalytics(farmId: string): Promise<AnalyticsResponse> {
  if (ENV.USE_MOCKS) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(generateMockAnalytics(farmId));
        } catch (e: any) {
          reject(e);
        }
      }, 400);
    });
  }

  return apiClient<AnalyticsResponse>(`/api/v1/farms/${farmId}/analytics`, {
    method: 'GET',
  });
}
