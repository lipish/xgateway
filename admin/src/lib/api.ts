/**
 * API Configuration and utilities
 * 
 * This module provides a centralized way to make API calls with proper
 * base URL configuration. The API URL can be configured via:
 * 1. VITE_API_URL environment variable (recommended for development)
 * 2. Default to http://localhost:8000
 */

// Get API URL from environment or use default
const getApiUrl = (): string => {
  // Use environment variable if set, otherwise use empty string
  // (Vite proxy will forward /api/* requests to the backend)
  return import.meta.env.VITE_API_URL || ''
}

export const API_URL = getApiUrl()

/**
 * Make an API request with proper error handling
 */
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}

/**
 * GET request helper
 */
export function apiGet<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: 'GET' })
}

/**
 * POST request helper
 */
export function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT request helper
 */
export function apiPut<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiCall<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request helper
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: 'DELETE' })
}
