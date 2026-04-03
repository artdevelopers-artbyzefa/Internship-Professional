export function normalizeEntityName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/[^\w\s]/gi, '') // Remove special chars
        .replace(/\s+/g, '');     // Remove ALL spaces
}


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

export function isFuzzyMatch(str1, str2, threshold = 2) {
    return levenshteinDistance(normalizeEntityName(str1), normalizeEntityName(str2)) <= threshold;
}
