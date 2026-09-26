"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMentionedUserIds = extractMentionedUserIds;
const users_1 = require("./users");
/* Mirrors frontend/src/lib/ports.ts's PORT_OPTIONS — kept in sync by hand,
   same as the frontend copy is kept in sync with port_type in
   database/create-tables.sql. Needed here so "@IT" or "@Publications" can
   resolve to every member holding that portfolio. */
const PORT_LABELS = [
    { value: 'careers', label: 'Careers' },
    { value: 'sponsorships', label: 'Sponsorships' },
    { value: 'IT', label: 'IT' },
    { value: 'publication', label: 'Publications' },
    { value: 'cabinet', label: 'Cabinet' },
    { value: 'socials', label: 'Socials' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'outreach', label: 'Outreach' },
    { value: 'programs', label: 'Programs' },
    { value: 'HR', label: 'HR' },
];
/**
 * Finds every "@<full name>" or "@<portfolio>" tag in free-typed content and
 * resolves it to the real user(s) it refers to — a name resolves to that one
 * member, a portfolio resolves to everyone currently holding it. There's no
 * bracketed/canonical mention syntax and no persisted "who got tagged" table:
 * this just matches "@" followed by the longest known name or portfolio
 * label it can find, case-insensitively, requiring a word boundary right
 * after the match (so "@IT" matches but "@ITest" doesn't, and "@Zachary
 * Abrantes" doesn't accidentally match "@Zachary Abran"). A typo simply
 * doesn't resolve to anyone — the same failure mode as most other apps'
 * plain-text @mentions when you don't pick from an autocomplete list.
 *
 * Longest candidates are tried first so a multi-word name is never shadowed
 * by a shorter partial match.
 */
async function extractMentionedUserIds(content, excludeUserId) {
    const directory = await (0, users_1.listDirectoryUsers)();
    const candidates = [];
    for (const u of directory) {
        candidates.push({ phrase: `${u.firstName} ${u.lastName}`, userIds: [u.id] });
    }
    for (const p of PORT_LABELS) {
        const memberIds = directory.filter((u) => u.port === p.value).map((u) => u.id);
        if (memberIds.length === 0)
            continue;
        candidates.push({ phrase: p.label, userIds: memberIds });
        if (p.label.toLowerCase() !== p.value.toLowerCase()) {
            candidates.push({ phrase: p.value, userIds: memberIds });
        }
    }
    candidates.sort((a, b) => b.phrase.length - a.phrase.length);
    const matched = new Set();
    const lowerContent = content.toLowerCase();
    let searchFrom = 0;
    while (true) {
        const at = lowerContent.indexOf('@', searchFrom);
        if (at === -1)
            break;
        const rest = content.slice(at + 1);
        const restLower = rest.toLowerCase();
        let consumed = 1;
        for (const candidate of candidates) {
            const phraseLower = candidate.phrase.toLowerCase();
            if (!restLower.startsWith(phraseLower))
                continue;
            const nextChar = rest[phraseLower.length];
            if (nextChar !== undefined && /[a-zA-Z0-9]/.test(nextChar))
                continue;
            candidate.userIds.forEach((id) => matched.add(id));
            consumed = 1 + phraseLower.length;
            break;
        }
        searchFrom = at + consumed;
    }
    matched.delete(excludeUserId);
    return Array.from(matched);
}
//# sourceMappingURL=mentions.js.map