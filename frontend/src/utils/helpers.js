// ── Helpers & Utilities ──────────────────────────────────────

/** Return grade letter from percentage */
export function gradeFromPct(pct) {
    if (pct >= 90) return 'A+';
    if (pct >= 85) return 'A';
    if (pct >= 80) return 'A-';
    if (pct >= 75) return 'B+';
    if (pct >= 70) return 'B';
    return 'C';
}

/** Format today's date as Monday, January 1, 2025 */
export function formatDate() {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

/** Get initials from full name (max 2 chars) */
export function getInitials(name = '') {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/** Role → mock user lookup */
export const roleUsers = {
    'Student': { name: 'Ali Hassan', reg: '2021-CUI-ATD-001', email: 'ali@cuiatd.edu.pk' },
    'Faculty Supervisor': { name: 'Dr. Kamran Ahmed', email: 'kamran@cuiatd.edu.pk' },
    'Internship Office': { name: 'Admin Officer', email: 'admin@cuiatd.edu.pk' },
    'HOD': { name: 'Prof. Imran Shafi', email: 'hod@cuiatd.edu.pk' },
    'Site Supervisor': { name: 'Mr. Tariq Mehmood', email: 'tariq@techsoft.com' },
};
