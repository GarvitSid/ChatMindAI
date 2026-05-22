import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // max 5 requests per windowMs per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 1 minute.',
  },
});

export interface UserChatLimiterOptions {
  windowMs?: number;
  max?: number;
  skip?: () => boolean;
}

/**
 * Creates a rate limiter keyed by authenticated user ID (req.user._id).
 * Must be mounted after `authenticate` middleware.
 */
export const createUserChatLimiter = (options: UserChatLimiterOptions = {}) => {
  return rateLimit({
    windowMs: options.windowMs ?? 1 * 60 * 1000, // 1 minute default
    max: options.max ?? 15, // max 15 requests per minute per user
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user!._id.toString(),
    skip: options.skip ?? (() => process.env.NODE_ENV === 'test'),
    message: {
      success: false,
      message: 'Too many questions asked in a short period. Please wait a moment before asking again.',
    },
  });
};

export const userChatLimiter = createUserChatLimiter();
