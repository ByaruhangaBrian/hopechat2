import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function getResponseErrorMessage(
  response: Response,
  fallback = 'Something went wrong',
) {
  try {
    const body = await response.json()
    return String(body?.error || body?.message || fallback)
  } catch {
    return fallback
  }
}

export function getErrorMessage(error: unknown, fallback = 'Unknown error') {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message)
  }
  return fallback
}
