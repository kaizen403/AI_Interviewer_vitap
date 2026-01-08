/**
 * Security Middleware
 * Rate limiting and security utilities
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

/**
 * API Rate Limiter
 * Limits requests per IP address
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict Rate Limiter for auth endpoints
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: {
        error: 'Too many login attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Token Rate Limiter
 */
export const tokenLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 token requests per minute
    message: {
        error: 'Too many token requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Upload Rate Limiter
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads per hour
    message: {
        error: 'Too many uploads, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Audit Log Middleware Factory
 * Creates a middleware that logs actions for audit purposes
 */
export const auditLog = (action: string) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        console.log(`[AUDIT] ${action}`, {
            ip: req.ip,
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
        });
        next();
    };
};
