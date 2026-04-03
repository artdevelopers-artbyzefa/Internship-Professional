import express from 'express';
import User from '../models/User.js';
import Company from '../models/Company.js';
import SiteSupervisor from '../models/SiteSupervisor.js';
import { CompanyAlias, SupervisorAlias } from '../models/Alias.js';
import { normalizeEntityName, isFuzzyMatch } from '../utils/normalization.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const mCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCached(key) {
    const cached = mCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) return cached.data;
    return null;
}

function setCache(key, data) {
    mCache.set(key, { data, timestamp: Date.now() });
    if (mCache.size > 2000) mCache.delete(mCache.keys().next().value);
}

async function getFuzzyCandidates(Model, normalizedInput) {
    if (!normalizedInput || normalizedInput.length < 3) return [];
    let regexes = [];
    if (normalizedInput.length <= 5) regexes.push(new RegExp('^' + normalizedInput.substring(0, 3), 'i'));
    else {
        for (let i = 0; i <= normalizedInput.length - 4; i += 2) regexes.push(new RegExp(normalizedInput.substring(i, i + 4), 'i'));
    }
    return await Model.find({ normalized_key: { $in: regexes } }).limit(50);
}

async function matchCompany(name) {
    const normalized = normalizeEntityName(name);
    let company = await Company.findOne({ normalized_key: normalized });
    if (company) return { matchType: 'exact', entity: company };

    let alias = await CompanyAlias.findOne({ normalized_key: normalized }).populate('company');
    if (alias?.company) return { matchType: 'alias_exact', entity: alias.company };

    const candidates = await getFuzzyCandidates(Company, normalized);
    for (let c of candidates) if (isFuzzyMatch(normalized, c.normalized_key)) return { matchType: 'fuzzy', entity: c };

    const aliasCandidates = await getFuzzyCandidates(CompanyAlias, normalized);
    for (let a of aliasCandidates) {
        if (isFuzzyMatch(normalized, a.normalized_key)) {
            await a.populate('company');
            if (a.company) return { matchType: 'alias_fuzzy', entity: a.company };
        }
    }
    return { matchType: 'none', entity: null };
}

async function matchSupervisor(name) {
    const normalized = normalizeEntityName(name);
    let sup = await SiteSupervisor.findOne({ normalized_key: normalized });
    if (sup) return { matchType: 'exact', entity: sup };

    let alias = await SupervisorAlias.findOne({ normalized_key: normalized }).populate('supervisor');
    if (alias?.supervisor) return { matchType: 'alias_exact', entity: alias.supervisor };

    const candidates = await getFuzzyCandidates(SiteSupervisor, normalized);
    for (let s of candidates) if (isFuzzyMatch(normalized, s.normalized_key)) return { matchType: 'fuzzy', entity: s };

    const aliasCandidates = await getFuzzyCandidates(SupervisorAlias, normalized);
    for (let a of aliasCandidates) {
        if (isFuzzyMatch(normalized, a.normalized_key)) {
            await a.populate('supervisor');
            if (a.supervisor) return { matchType: 'alias_fuzzy', entity: a.supervisor };
        }
    }
    return { matchType: 'none', entity: null };
}

/**
 * @swagger
 * tags:
 *   name: Entities
 *   description: Entity validation and search (Companies, Supervisors, Faculty)
 */

/**
 * @swagger
 * /entities/validate-company:
 *   post:
 *     summary: Validate and match company name against registry
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Match suggestion or new pending entity creation
 */
router.post('/validate-company', protect, asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Company name required' });
    const match = await matchCompany(name);
    if (match.matchType !== 'none') return res.json({ action: 'suggest', matchType: match.matchType, suggestion: match.entity });

    const newCompany = new Company({ name, normalized_key: normalizeEntityName(name), verified: false, status: 'Pending', source: 'student_submission', category: 'Student Self-Assigned' });
    await newCompany.save();
    res.json({ action: 'created_pending', entity: newCompany });
}));

/**
 * @swagger
 * /entities/validate-supervisor:
 *   post:
 *     summary: Validate and match site supervisor name
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               companyId: { type: string }
 *     responses:
 *       200:
 *         description: Match suggestion or new pending entity
 */
router.post('/validate-supervisor', protect, asyncHandler(async (req, res) => {
    const { name, email, companyId } = req.body;
    if (!name) return res.status(400).json({ message: 'Supervisor name required' });
    const match = await matchSupervisor(name);
    if (match.matchType !== 'none') return res.json({ action: 'suggest', matchType: match.matchType, suggestion: match.entity });

    const newSup = new SiteSupervisor({ display_name: name, normalized_key: normalizeEntityName(name), email: email || '', verified: false, status: 'pending', company: companyId || null });
    await newSup.save();
    res.json({ action: 'created_pending', entity: newSup });
}));

/**
 * @swagger
 * /entities/search-company:
 *   get:
 *     summary: Search for active companies by name or key
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of matching companies
 */
router.get('/search-company', protect, asyncHandler(async (req, res) => {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json([]);
    const norm = normalizeEntityName(q);
    const cached = getCached(`comp_${norm}`);
    if (cached) return res.json(cached);

    const companies = await Company.find({ 
        $or: [
            { normalized_key: { $regex: norm, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } }
        ],
        status: 'Active' 
    }).limit(10).select('name address regNo scope siteSupervisors');
    
    setCache(`comp_${norm}`, companies);
    res.json(companies);
}));

/**
 * @swagger
 * /entities/search-faculty:
 *   get:
 *     summary: Search for active faculty supervisors
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of matching faculty
 */
router.get('/search-faculty', protect, asyncHandler(async (req, res) => {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json([]);
    
    const faculty = await User.find({
        role: 'faculty_supervisor',
        status: 'Active',
        $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
        ]
    }).limit(10).select('name email');
    
    res.json(faculty);
}));

/**
 * @swagger
 * /entities/search-mentor:
 *   get:
 *     summary: Aggregated search for mentors across users and companies
 *     tags: [Entities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of matching mentors/supervisors
 */
router.get('/search-mentor', protect, asyncHandler(async (req, res) => {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json([]);

    const users = await User.find({
        role: 'site_supervisor',
        $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
        ]
    }).limit(5).select('name email whatsappNumber assignedCompany');

    const companies = await Company.find({
        'siteSupervisors.name': { $regex: q, $options: 'i' }
    }).limit(5).select('name siteSupervisors');

    const results = users.map(u => ({
        name: u.name,
        email: u.email,
        phone: u.whatsappNumber,
        company: u.assignedCompany,
        source: 'user'
    }));

    companies.forEach(c => {
        c.siteSupervisors.forEach(s => {
            if (s.name.toLowerCase().includes(q.toLowerCase()) && !results.some(r => r.email === s.email)) {
                results.push({
                    name: s.name,
                    email: s.email,
                    phone: s.whatsappNumber,
                    company: c.name,
                    source: 'company'
                });
            }
        });
    });

    res.json(results.slice(0, 10));
}));

export default router;
