/**
 * @fileoverview Timezone Utility for Pakistan Standard Time (PKT).
 * Provides consistent date and time formatting across the system 
 * relative to the Asia/Karachi timezone.
 */

/**
 * Returns the current system time formatted for PKT.
 * 
 * @returns {string} Formatted time string (e.g., "08:30:00 PM").
 */
export const getPKTTime = () => {
    return new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * Returns the current system date formatted for PKT.
 * 
 * @returns {string} Formatted date string (e.g., "Apr 03, 2026").
 */
export const getPKTDate = () => {
    return new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
};

