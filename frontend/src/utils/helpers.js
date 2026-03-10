// ── Helpers & Utilities ──────────────────────────────────────

/** Return grade letter from percentage (Semester System scale) */
export function gradeFromPct(pct) {
    if (pct >= 85) return 'A';
    if (pct >= 80) return 'A-';
    if (pct >= 75) return 'B+';
    if (pct >= 71) return 'B';
    if (pct >= 68) return 'B-';
    if (pct >= 64) return 'C+';
    if (pct >= 61) return 'C';
    if (pct >= 58) return 'C-';
    if (pct >= 54) return 'D+';
    if (pct >= 50) return 'D';
    return 'F';
}

/** Return grade points (GPA equivalent) from percentage */
export function gradePointsFromPct(pct) {
    if (pct >= 85) return '4.00';
    if (pct >= 80) return '3.66';
    if (pct >= 75) return '3.33';
    if (pct >= 71) return '3.00';
    if (pct >= 68) return '2.66';
    if (pct >= 64) return '2.33';
    if (pct >= 61) return '2.00';
    if (pct >= 58) return '1.66';
    if (pct >= 54) return '1.30';
    if (pct >= 50) return '1.00';
    return '0.00';
}

/** Return colour classes for a grade letter */
export function gradeColor(grade) {
    if (grade === 'A') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (grade === 'A-') return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
    if (grade === 'B+') return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    if (grade === 'B') return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' };
    if (grade === 'B-') return { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' };
    if (grade === 'C+') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    if (grade === 'C') return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' };
    if (grade === 'C-') return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' };
    if (grade === 'D+') return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' };
    if (grade === 'D') return { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-100' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }; // F
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
