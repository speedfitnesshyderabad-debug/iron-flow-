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
    const dailyRate = monthlySalary / daysInMonth; // Simple daily rate

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

    // Iterate through all days in the month to classify them
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(year, month, d);
        const dateString = currentDate.toISOString().split('T')[0];

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

                // SMART MATCHING: Find the closest assigned shift
                let matchedShift = user.shifts[0];
                let minDiff = Number.MAX_VALUE;

                user.shifts.forEach(shift => {
                    if (!shift.start) return;
                    const shiftStart = new Date(`2000-01-01 ${shift.start}`);
                    const diff = Math.abs(punchIn.getTime() - shiftStart.getTime());

                    if (diff < minDiff) {
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
                let totalMinutes = 0;
                logs.forEach(log => {
                    if (log.timeOut) {
                        const start = new Date(`2000-01-01 ${log.timeIn}`);
                        const end = new Date(`2000-01-01 ${log.timeOut}`);
                        totalMinutes += (end.getTime() - start.getTime()) / 60000;
                    }
                });

                if (!isExcused && totalMinutes < (5 * 60)) { // Less than 5 hours
                    halfDays++;
                }
            }

        } else {
            // Not Present
            if (isOff) weekOffCount++;
            else if (isHol) holidayCount++;
            // Else: Absent
        }
    }

    // 4. Calculate Penalties
    // 3 Late Marks = 1 Day Penalty
    const latePenaltyDays = Math.floor(lateMarks / 3);

    // 1 Half Day = 0.5 Day Penalty
    const halfDayPenaltyDays = halfDays * 0.5;

    const totalPenaltyDays = latePenaltyDays + halfDayPenaltyDays;

    // 5. Calculate Payable Days
    // Payable = Present + WeekOffs + Holidays
    // Actually: Payable = TotalDays - (TrueAbsences + Penalties)
    // Let's count True Absences
    let absentDaysCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(year, month, d);
        const dateString = currentDate.toISOString().split('T')[0];
        const isOFF = isWeekOff(currentDate) || isHoliday(dateString);
        const isPresent = daysPresentSet.has(dateString);

        if (!isPresent && !isOFF) {
            absentDaysCount++;
        }
    }

    const totalDeductibleDays = absentDaysCount + totalPenaltyDays;
    const payableDays = Math.max(0, daysInMonth - totalDeductibleDays);

    const deductions = totalDeductibleDays * dailyRate;
    const finalBaseSalary = Math.max(0, monthlySalary - deductions);

    return {
        baseSalary: monthlySalary,
        finalBaseSalary,
        deductions,
        payableDays,
        presentDays: presentDaysCount,
        totalDays: daysInMonth,
        weekOffs: weekOffCount,
        holidays: holidayCount,
        lateDays: lateMarks,
        halfDays,
        absentDays: absentDaysCount,
        penaltyDays: totalPenaltyDays,
        dailyRate,
        breakdown: `Present: ${presentDaysCount}, Lates: ${lateMarks} (-${latePenaltyDays}d), HalfDays: ${halfDays} (-${halfDayPenaltyDays}d), Absent: ${absentDaysCount}`
    };
};
