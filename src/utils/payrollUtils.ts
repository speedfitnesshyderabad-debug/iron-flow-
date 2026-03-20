import { User, Attendance, Branch, Shift, Holiday } from '../../types';

export interface SalaryBreakdown {
    baseSalary: number;
    finalBaseSalary: number;
    deductions: number;
    payableDays: number;
    presentDays: number;
    totalDays: number;
    weekOffs: number;
    holidays: number;
    lateDays: number;
    halfDays: number;
    absentDays: number;
    penaltyDays: number;
    forgotCheckoutPenalties: number;
    forgotCheckoutAmount: number;
    dailyRate: number;
    breakdown: string;
}

export const calculateMonthlySalary = (
    user: User,
    attendanceLogs: Attendance[],
    month: number, // 0-11
    year: number,
    branches: Branch[],
    allHolidays: Holiday[]
): SalaryBreakdown => {
    const branch = branches.find(b => b.id === user.branchId);
    const monthlySalary = user.monthlySalary || 0;

    // 1. Calculate Total Days in Month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyRate = monthlySalary / daysInMonth; // Daily rate based on full month (unchanged)

    // Boundary: never count days after today — future days are unknown, not absent
    const today = new Date();
    today.setHours(23, 59, 59, 999); // include all of today
    const lastEligibleDay = new Date(year, month, daysInMonth) > today
        ? today.getDate() : daysInMonth;
    const isSelectedMonthInFuture = new Date(year, month, 1) > today;

    // For fully future months — nothing to compute yet
    if (isSelectedMonthInFuture) {
        return {
            baseSalary: monthlySalary,
            finalBaseSalary: monthlySalary,
            deductions: 0,
            payableDays: 0,
            presentDays: 0,
            totalDays: daysInMonth,
            weekOffs: 0,
            holidays: 0,
            lateDays: 0,
            halfDays: 0,
            absentDays: 0,
            penaltyDays: 0,
            forgotCheckoutPenalties: 0,
            forgotCheckoutAmount: 0,
            dailyRate,
            breakdown: 'Month not started yet'
        };
    }

    // 2. Identify Week Offs & Holidays
    let weekOffCount = 0;
    let holidayCount = 0;
    const userWeekOffs = user.weekOffs || [];
    const branchHolidays = allHolidays
        .filter(h => h.branchId === user.branchId)
        .map(h => h.date);

    // Helper to check if a specific date is a week off
    const isWeekOff = (date: Date) => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        return userWeekOffs.includes(dayName);
    };

    // Helper to check if a specific date is a holiday
    const isHoliday = (dateString: string) => {
        return branchHolidays.includes(dateString);
    };

    // Helper: A week off is ONLY paid if the staff worked (or had a paid holiday/another weekoff)
    // for the 6 continuous days immediately preceding the week off.
    const isPaidWeekOff = (offDate: Date) => {
        let checkDate = new Date(offDate);
        for (let i = 1; i <= 6; i++) {
            checkDate.setDate(checkDate.getDate() - 1);

            // Format checkDate to local YYYY-MM-DD reliably
            const _y = checkDate.getFullYear();
            const _m = String(checkDate.getMonth() + 1).padStart(2, '0');
            const _d = String(checkDate.getDate()).padStart(2, '0');
            const checkDateStr = `${_y}-${_m}-${_d}`;

            if (isHoliday(checkDateStr)) continue; // Holiday counts as a paid day
            if (isWeekOff(checkDate)) continue;    // Another week off? counts as paid day

            // Make sure they have a punch-in for this day
            const wasPresent = attendanceLogs.some(
                a => a.userId === user.id && a.date === checkDateStr
            );

            if (!wasPresent) return false; // Streak broken! Unpaid week off.
        }
        return true;
    };

    // 3. Process Attendance & Calculate Metrics
    let presentDaysCount = 0;
    let lateMarks = 0;
    let halfDays = 0;
    const daysPresentSet = new Set<string>();

    // Filter logs for this month/year for this user
    const monthlyLogs = attendanceLogs.filter(a => {
        const d = new Date(a.date);
        return a.userId === user.id && d.getMonth() === month && d.getFullYear() === year;
    });

    const dailyLogsMap = new Map<string, Attendance[]>();
    monthlyLogs.forEach(log => {
        const existing = dailyLogsMap.get(log.date) || [];
        dailyLogsMap.set(log.date, [...existing, log]);
    });

    // Iterate through elapsed days only (never count future days as absent)
    for (let d = 1; d <= lastEligibleDay; d++) {
        const currentDate = new Date(year, month, d);
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        // Skip today if it's still in progress (optional — punch-in already handles open sessions)
        // Check Status
        const isOff = isWeekOff(currentDate);
        const isHol = isHoliday(dateString);
        const logs = dailyLogsMap.get(dateString);
        const isPresent = logs && logs.length > 0;

        if (isPresent) {
            daysPresentSet.add(dateString);
            presentDaysCount++;

            // CHECK LATE MARKS & HALF DAYS (Only if shift assigned)
            if (user.shifts && user.shifts.length > 0) {
                // Find the earliest punch-in
                const firstLog = logs.reduce((earliest, current) => {
                    return (earliest.timeIn < current.timeIn) ? earliest : current;
                });

                const punchIn = new Date(`2000-01-01 ${firstLog.timeIn}`);

                // SMART MATCHING: Find the closest assigned shift (within 2 hour window)
                let matchedShift: Shift | null = null;
                let minDiff = Number.MAX_VALUE;

                user.shifts.forEach(shift => {
                    if (!shift.start) return;
                    const shiftStart = new Date(`2000-01-01 ${shift.start}`);
                    const diff = Math.abs(punchIn.getTime() - shiftStart.getTime());

                    // Only match if within 2 hours of shift start
                    if (diff < minDiff && diff < (2 * 60 * 60 * 1000)) {
                        minDiff = diff;
                        matchedShift = shift;
                    }
                });

                // Check for Admin Override/Excuse in notes
                const isExcused = logs.some(l =>
                    l.notes && (
                        l.notes.toLowerCase().includes('approved') ||
                        l.notes.toLowerCase().includes('excused') ||
                        l.notes.toLowerCase().includes('shift')
                    )
                );

                if (!isExcused && matchedShift && matchedShift.start) {
                    const shiftStart = new Date(`2000-01-01 ${matchedShift.start}`);

                    // Grace Period: 15 mins
                    // Only count LATE if they are AFTER the shift start
                    if (punchIn > shiftStart) {
                        const diffMins = (punchIn.getTime() - shiftStart.getTime()) / 60000;
                        if (diffMins > 15) {
                            lateMarks++;
                        }
                    }
                }

                // Calculate Work Hours
                const hasOpenSession = logs.some(log => !log.timeOut);
                let totalMinutes = 0;
                logs.forEach(log => {
                    if (log.timeOut) {
                        const start = new Date(`2000-01-01 ${log.timeIn}`);
                        const end = new Date(`2000-01-01 ${log.timeOut}`);
                        totalMinutes += (end.getTime() - start.getTime()) / 60000;
                    }
                });

                // Configurable thresholds (per-staff, with sensible defaults)
                // fullDayHours: hours needed to count as a full paid day (default 8)
                // halfDayHours: hours needed to count as at least a half day (default 4)
                const fullDayMinutes = (user.fullDayHours ?? 8) * 60;
                const halfDayMinutes = (user.halfDayHours ?? 4) * 60;

                // Only apply penalties if ALL sessions are closed
                // (don't penalize someone who is still clocked in)
                if (!isExcused && !hasOpenSession) {
                    if (totalMinutes < halfDayMinutes) {
                        // Worked less than half-day threshold → counts as ABSENT (full day deduction)
                        // We remove it from presentDays count and do NOT credit day
                        daysPresentSet.delete(dateString);
                        presentDaysCount--;
                        // Mark as absent — no further penalty needed (absent day already deducted)
                    } else if (totalMinutes < fullDayMinutes) {
                        // Worked between half-day and full-day → half day (0.5 day penalty)
                        halfDays++;
                    }
                    // else: worked >= fullDayHours → full day, no penalty
                }
            }

        } else {
            // Not Present
            if (isOff) {
                if (isPaidWeekOff(currentDate)) {
                    weekOffCount++;
                } else {
                    // Unpaid week off due to not working 6 continuous days
                    // We don't increment weekOffCount, it will fall into absent logic below
                }
            } else if (isHol) {
                holidayCount++;
            }
            // Else: Absent
        }
    }

    // 4. Calculate Penalties
    // 3 Late Marks = 1 Day Penalty
    const latePenaltyDays = Math.floor(lateMarks / 3);

    // 1 Half Day = 0.5 Day Penalty
    const halfDayPenaltyDays = halfDays * 0.5;

    const totalPenaltyDays = latePenaltyDays + halfDayPenaltyDays;

    // 4b. Count "Forgot Checkout" flat penalties (₹100 each)
    const FORGOT_CHECKOUT_PENALTY = 100;
    const forgotCheckoutPenalties = monthlyLogs.filter(log =>
        log.notes && log.notes.includes('Penalty')
    ).length;
    const forgotCheckoutAmount = forgotCheckoutPenalties * FORGOT_CHECKOUT_PENALTY;

    // 5. Calculate Payable Days
    // Only count elapsed days (up to today) as absent — future days are excluded
    let absentDaysCount = 0;
    let unpaidWeekOffsCount = 0;
    for (let d = 1; d <= lastEligibleDay; d++) {
        const currentDate = new Date(year, month, d);
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const isOFF = isWeekOff(currentDate);
        const isHol = isHoliday(dateString);
        const isPresent = daysPresentSet.has(dateString);

        if (!isPresent) {
            if (isOFF) {
                // If it's a week off but NOT paid, it counts as absent
                if (!isPaidWeekOff(currentDate)) {
                    absentDaysCount++;
                    unpaidWeekOffsCount++;
                }
            } else if (!isHol) {
                // True absence (not off, not holiday)
                absentDaysCount++;
            }
        }
    }

    const totalDeductibleDays = absentDaysCount + totalPenaltyDays;
    // payableDays out of elapsed days (lastEligibleDay), not the full calendar month
    const payableDays = Math.max(0, lastEligibleDay - totalDeductibleDays);

    // Instead of subtracting elapsed deductions from the full month (which assumes future days are worked),
    // calculate actual earned salary based on accumulated payable days.
    const earnedBaseSalary = payableDays * dailyRate;
    const finalBaseSalary = Math.max(0, earnedBaseSalary - forgotCheckoutAmount);
    const totalDeductions = Math.max(0, monthlySalary - finalBaseSalary);

    return {
        baseSalary: monthlySalary,
        finalBaseSalary,
        deductions: totalDeductions,
        payableDays,
        presentDays: presentDaysCount,
        // totalDays = elapsed days in the selected period (not the full calendar month)
        totalDays: lastEligibleDay,
        weekOffs: weekOffCount,
        holidays: holidayCount,
        lateDays: lateMarks,
        halfDays,
        absentDays: absentDaysCount,
        penaltyDays: totalPenaltyDays,
        forgotCheckoutPenalties,
        forgotCheckoutAmount,
        dailyRate,
        breakdown: `Present: ${presentDaysCount}, Lates: ${lateMarks} (-${latePenaltyDays}d), HalfDays: ${halfDays} (-${halfDayPenaltyDays}d), Absent: ${absentDaysCount}${unpaidWeekOffsCount > 0 ? ` (incl ${unpaidWeekOffsCount} unpaid week-offs)` : ''}${forgotCheckoutPenalties > 0 ? `, Forgot Checkout: ${forgotCheckoutPenalties} (-₹${forgotCheckoutAmount})` : ''}`
    };
};
