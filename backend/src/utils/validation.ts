/**
 * Validates whether a given string is a valid 24-character hexadecimal MongoDB ObjectId.
 * Prevents Mongoose CastError exceptions and 12-byte buffer edge cases.
 */
export const isValidObjectId = (id: string): boolean => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};
