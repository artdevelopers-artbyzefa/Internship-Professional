/**
 * Helper to get current time in Pakistan Standard Time (PKT)
 * @returns {string} Formatted time string
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
 * Helper to get current date in Pakistan
 * @returns {string} Formatted date string
 */
export const getPKTDate = () => {
    return new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
};
