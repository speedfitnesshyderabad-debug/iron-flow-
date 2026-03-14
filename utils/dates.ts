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

/** Returns today's date as a "YYYY-MM-DD" string in IST (Asia/Kolkata) time */
export const todayDateStr = (): string => {
    const now = new Date();
    // Use Intl.DateTimeFormat to force Asia/Kolkata
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    // en-CA format is YYYY-MM-DD
    return formatter.format(now);
};

/** Returns current time as a localized string in IST (Asia/Kolkata) time */
export const currentTimeStr = (): string => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    });
    return formatter.format(now);
};

/** Returns current month index (0-11) in IST */
export const currentMonthIdx = (): number => {
    const now = new Date();
    const monthStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        month: 'numeric'
    }).format(now);
    return parseInt(monthStr) - 1;
};

/** Returns current year in IST */
export const currentYear = (): number => {
    const now = new Date();
    return parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric'
    }).format(now));
};

/** Returns a date string for the start of the current month in IST (YYYY-MM-01) */
export const currentMonthStart = (): string => {
    const now = new Date();
    const year = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(now);
    const month = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: '2-digit' }).format(now);
    return `${year}-${month}-01`;
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
 * Checks if a subscription is effectively active based on its status and date.
 */
export const isSubscriptionActive = (sub: { status: string; endDate: string }, today: string): boolean => {
    return sub.status === 'ACTIVE' && sub.endDate >= today;
};

/**
 * Clamp a number between min and max (inclusive).
 * Useful for capping pausedDaysUsed, stock, etc.
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};
