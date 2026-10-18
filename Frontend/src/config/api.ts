/**
 * Centralized API configuration for JFLL Lead Sourcing Tool.
 * Automatically falls back to the AWS Sydney Lambda URL in production environments.
 */

export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://uxfmnbd6owxk3wxemhizp4gqsa0exlge.lambda-url.ap-southeast-2.on.aws'
    : 'http://localhost:8000')
).replace(/\/$/, '');
