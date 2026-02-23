/**
 * Centralized Date Utility Module
 * 
 * All date calculations should use these functions to prevent
 * timezone-related bugs (UTC vs local time mismatches).
 * 
 * Rules:
 * 1. All dates are stored and compared as "YYYY-MM-DD" strings.
 * 2. Never use raw `new Date()` for date arithmetic — use these helpers.
 * 3. All day calculations use T00:00:00 to eliminate time component drift.
 */

/** Returns today's date as a "YYYY-MM-DD" string in local time */
export const todayDateStr = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calculates the number of whole days between two date strings.
 * Returns a positive number if dateB is after dateA.
 * Always uses date-only comparison (no time component).
 */
export const daysBetween = (dateA: string, dateB: string): number => {
    const a = new Date(dateA + 'T00:00:00').getTime();
    const b = new Date(dateB + 'T00:00:00').getTime();
    return Math.round((b - a) / 86400000);
};

/**
 * Adds a number of days to a date string and returns a new "YYYY-MM-DD" string.
 */
export const addDays = (dateStr: string, days: number): string => {
    const ms = new Date(dateStr + 'T00:00:00').getTime() + days * 86400000;
    const d = new Date(ms);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Clamp a number between min and max (inclusive).
 * Useful for capping pausedDaysUsed, stock, etc.
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};
