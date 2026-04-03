/**
 * @fileoverview String Normalization and Comparison Utilities.
 * Provides specialized logic for fuzzy matching of company names and entity 
 * search across different input sources.
 */

/**
 * Normalizes an entity name by stripping special characters and removing all spaces.
 * This ensures high consistency when comparing disparate string sources.
 * 
 * @param {string} name - Original entity name.
 * @returns {string} Normalized lowercase string without spaces/special chars.
 */
export function normalizeEntityName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '');
}

/**
 * Calculates the edit distance between two strings.
 * Used for detecting similar entity names (e.g., typos or minor variations).
 * 
 * @param {string} s1 - First string.
 * @param {string} s2 - Second string.
 * @returns {number} The Levenshtein distance.
 */
export function levenshteinDistance(s1, s2) {
    if (s1.length < s2.length) {
        return levenshteinDistance(s2, s1);
    }
    if (s2.length === 0) {
        return s1.length;
    }
    let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
        let currentRow = [i + 1];
        for (let j = 0; j < s2.length; j++) {
            let insertions = previousRow[j + 1] + 1;
            let deletions = currentRow[j] + 1;
            let substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
            currentRow.push(Math.min(insertions, deletions, substitutions));
        }
        previousRow = currentRow;
    }
    return previousRow[previousRow.length - 1];
}

/**
 * Performs a fuzzy match between two strings using normalized Levenshtein distance.
 * 
 * @param {string} str1 - First string.
 * @param {string} str2 - Second string.
 * @param {number} [threshold=2] - Sensitivity threshold (lower is stricter).
 * @returns {boolean} True if strings are similar enough.
 */
export function isFuzzyMatch(str1, str2, threshold = 2) {
    return levenshteinDistance(normalizeEntityName(str1), normalizeEntityName(str2)) <= threshold;
}

