/**
 * Zod Request Validation Middleware
 * MT10: Add proper request validation middleware using Zod
 * 
 * This middleware validates request bodies, query parameters, and route parameters
 * against provided Zod schemas and returns clear 400 errors with actionable details.
 */

import { z } from 'zod';

/**
 * Creates validation middleware for request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      return res.status(500).json({ error: 'Internal validation error' });
    }
  };
}

/**
 * Creates validation middleware for query parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      return res.status(500).json({ error: 'Internal validation error' });
    }
  };
}

/**
 * Creates validation middleware for route parameters
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid route parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      return res.status(500).json({ error: 'Internal validation error' });
    }
  };
}

/**
 * Combined validation for body, query, and params
 * @param {Object} options - Validation options
 * @param {z.ZodSchema} [options.body] - Body schema
 * @param {z.ZodSchema} [options.query] - Query schema
 * @param {z.ZodSchema} [options.params] - Params schema
 * @returns {Function[]} Array of middleware functions
 */
export function validate({ body, query, params }) {
  const middlewares = [];
  
  if (body) middlewares.push(validateBody(body));
  if (query) middlewares.push(validateQuery(query));
  if (params) middlewares.push(validateParams(params));
  
  return middlewares;
}

// ============================================
// Common Schema Examples
// ============================================

// UUID validation
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

// Optional UUID
export const optionalUuidSchema = z.string().uuid({ message: 'Invalid UUID format' }).optional();

// Download token validation (hex string, 64 characters)
export const tokenSchema = z.string().length(64, { message: 'Invalid token format' }).regex(/^[a-f0-9]+$/i, { message: 'Token must be hexadecimal' });

// Pagination schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

// ID parameter schema
export const idParamSchema = z.object({
  id: uuidSchema
});

// Token param schema for /verify/:token
export const tokenParamSchema = z.object({
  token: tokenSchema
});

// Paper ID from body
export const paperIdBodySchema = z.object({
  paperId: uuidSchema
});

// Token revoke schema
export const revokeTokenSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' })
});

// Download counts schema
export const downloadCountsSchema = z.object({
  paperIds: z.array(uuidSchema).min(1, { message: 'At least one paper ID required' })
});

export default {
  validateBody,
  validateQuery,
  validateParams,
  validate,
  uuidSchema,
  optionalUuidSchema,
  paginationQuerySchema,
  idParamSchema,
  paperIdBodySchema,
  revokeTokenSchema,
  downloadCountsSchema
};
