"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const prisma_1 = require("../generated/prisma");
const email_service_1 = require("./services/email.service");
console.log("DATABASE_URL in backend:", process.env.DATABASE_URL);
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new prisma_1.PrismaClient({ adapter });
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || '5qkGYgq4OsMFS0Ii';
app.use((0, cors_1.default)({
    origin: '*',
    methods: '*',
    allowedHeaders: '*'
}));
// Local file storage (replaces Supabase Storage)
const UPLOADS_DIR = path_1.default.resolve(__dirname, '..', 'uploads');
if (!fs_1.default.existsSync(UPLOADS_DIR))
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
function safePath(bucket, filePath) {
    const clean = path_1.default.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const full = path_1.default.resolve(UPLOADS_DIR, bucket, clean);
    const base = path_1.default.resolve(UPLOADS_DIR, bucket);
    if (!full.startsWith(base))
        return null;
    return full;
}
/** Extract file body from multipart/form-data or return raw body */
function extractFileBody(contentType, body) {
    if (!contentType || !contentType.includes('multipart/form-data'))
        return body;
    const boundaryMatch = contentType.match(/boundary=([^;\s]+)/);
    if (!boundaryMatch)
        return body;
    const boundaryStr = `--${boundaryMatch[1]}`;
    const boundaryBuf = Buffer.from(boundaryStr);
    const crlf = Buffer.from('\r\n');
    const doubleCrlf = Buffer.from('\r\n\r\n');
    let pos = 0;
    let bestPart = Buffer.alloc(0);
    while (pos < body.length) {
        const boundaryStart = body.indexOf(boundaryBuf, pos);
        if (boundaryStart === -1)
            break;
        const afterBoundary = boundaryStart + boundaryBuf.length;
        // Check if this is the closing boundary (ends with --)
        if (afterBoundary + 1 < body.length && body[afterBoundary] === 45 && body[afterBoundary + 1] === 45)
            break;
        let eol = body.indexOf(Buffer.from('\n'), afterBoundary);
        if (eol === -1)
            break;
        const partStart = eol + 1;
        let headersEnd = body.indexOf(doubleCrlf, partStart);
        if (headersEnd === -1)
            break;
        const dataStart = headersEnd + 4;
        const nextBoundary = body.indexOf(boundaryBuf, dataStart);
        if (nextBoundary === -1)
            break;
        let dataEnd = nextBoundary;
        if (dataEnd >= 2 && body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10)
            dataEnd -= 2;
        if (dataEnd >= 1 && body[dataEnd - 1] === 10)
            dataEnd -= 1;
        const part = body.subarray(dataStart, dataEnd);
        if (part.length > bestPart.length) {
            bestPart = part;
        }
        pos = nextBoundary;
    }
    return bestPart.length > 0 ? bestPart : body;
}
app.all(/\/storage\/v1\/.*/, async (req, res) => {
    const relativePath = req.path.replace(/^\/storage\/v1\//, '');
    const parts = relativePath.split('/');
    const method = req.method.toUpperCase();
    console.log(`[local storage] ${method} ${req.path}`);
    // Collect body
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    await new Promise(resolve => req.on('end', resolve));
    const rawBody = chunks.length > 0 ? Buffer.concat(chunks) : Buffer.alloc(0);
    const fileBody = extractFileBody(req.headers['content-type'], rawBody);
    try {
        // POST /storage/v1/object/list/:bucket — list objects
        if (parts[0] === 'object' && parts[1] === 'list' && method === 'POST') {
            const bucket = parts[2];
            const dir = path_1.default.resolve(UPLOADS_DIR, bucket);
            if (!fs_1.default.existsSync(dir))
                return res.json([]);
            const files = fs_1.default.readdirSync(dir, { recursive: true }).filter(f => fs_1.default.statSync(path_1.default.join(dir, f.toString())).isFile());
            const result = files.map((f) => {
                const stat = fs_1.default.statSync(path_1.default.join(dir, f.toString()));
                return {
                    name: f.toString(),
                    id: crypto_1.default.randomUUID(),
                    updated_at: stat.mtime.toISOString(),
                    created_at: stat.birthtime.toISOString(),
                    last_accessed_at: stat.atime.toISOString(),
                    metadata: { size: stat.size, mimetype: 'application/octet-stream' },
                };
            });
            return res.json(result);
        }
        // GET /storage/v1/object/public/:bucket/:path — serve public file
        if (parts[0] === 'object' && parts[1] === 'public' && (method === 'GET' || method === 'HEAD')) {
            const bucket = parts[2];
            const fileRelPath = parts.slice(3).join('/');
            const full = safePath(bucket, fileRelPath);
            if (!full || !fs_1.default.existsSync(full))
                return res.status(404).json({ error: 'File not found' });
            return res.sendFile(full);
        }
        // GET /storage/v1/bucket/:id — bucket info
        if (parts[0] === 'bucket' && method === 'GET') {
            const bucketId = parts[1];
            const dir = path_1.default.resolve(UPLOADS_DIR, bucketId);
            if (!fs_1.default.existsSync(dir))
                return res.status(404).json({ error: 'Bucket not found' });
            return res.json({ id: bucketId, name: bucketId, public: true });
        }
        // POST or PUT /storage/v1/object/:bucket/:path — upload file
        if (parts[0] === 'object' && !parts[1]?.startsWith('public') && !parts[1]?.startsWith('list') && (method === 'POST' || method === 'PUT')) {
            const bucket = parts[1];
            const fileRelPath = parts.slice(2).join('/');
            const full = safePath(bucket, fileRelPath);
            if (!full)
                return res.status(403).json({ error: 'Invalid path' });
            const dir = path_1.default.dirname(full);
            if (!fs_1.default.existsSync(dir))
                fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.writeFileSync(full, fileBody);
            const fileId = crypto_1.default.randomUUID();
            return res.status(200).json({ Key: `${bucket}/${fileRelPath}`, Id: fileId });
        }
        // DELETE /storage/v1/object/:bucket/:path — delete file
        if (parts[0] === 'object' && method === 'DELETE') {
            const bucket = parts[1];
            const fileRelPath = parts.slice(2).join('/');
            const full = safePath(bucket, fileRelPath);
            if (!full || !fs_1.default.existsSync(full))
                return res.status(404).json({ error: 'File not found' });
            fs_1.default.unlinkSync(full);
            return res.status(200).json({ message: 'Deleted' });
        }
        return res.status(404).json({ error: 'Not found', path: req.path });
    }
    catch (err) {
        console.error('[local storage] error:', err);
        res.status(500).json({ error: err.message });
    }
});
app.use(express_1.default.json());
// Log incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Decode Auth Header
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.user = decoded;
        }
        catch (err) {
            console.warn('Invalid token provided:', err);
        }
    }
    next();
});
// Column types cache to differentiate between JSON/JSONB columns and regular arrays/objects
const tableColumnTypesCache = {};
async function getTableColumnTypes(schemaName, tableName) {
    const cacheKey = `${schemaName}.${tableName}`;
    if (tableColumnTypesCache[cacheKey]) {
        return tableColumnTypesCache[cacheKey];
    }
    try {
        const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
    `;
        const res = await prisma.$queryRawUnsafe(query, schemaName, tableName);
        const types = {};
        for (const row of res) {
            types[row.column_name] = row.data_type;
        }
        tableColumnTypesCache[cacheKey] = types;
        return types;
    }
    catch (err) {
        console.error(`Error fetching column types for ${cacheKey}:`, err);
        return {};
    }
}
// Dynamic query executer
async function executeQuery(table, method, args, filters) {
    const isAuthTable = [
        'users', 'identities', 'sessions', 'refresh_tokens', 'mfa_factors',
        'mfa_challenges', 'mfa_amr_claims', 'one_time_tokens', 'saml_providers',
        'saml_relay_states', 'sso_providers', 'sso_domains', 'audit_log_entries',
        'instances', 'schema_migrations', 'webauthn_challenges', 'webauthn_credentials',
        'custom_oauth_providers', 'oauth_authorizations', 'oauth_clients', 'oauth_consents',
        'oauth_client_states'
    ].includes(table);
    const schemaName = isAuthTable ? 'auth' : 'public';
    const colTypes = await getTableColumnTypes(schemaName, table);
    let queryText = '';
    const queryParams = [];
    const addParam = (val) => {
        queryParams.push(val);
        return `$${queryParams.length}`;
    };
    const whereClauses = [];
    let orderByClause = '';
    let limitClause = '';
    let single = false;
    let countType = null;
    for (const filter of filters) {
        const { type, args: filterArgs } = filter;
        if (type === 'eq') {
            const [col, val] = filterArgs;
            if (val === null) {
                whereClauses.push(`"${col}" IS NULL`);
            }
            else {
                whereClauses.push(`"${col}" = ${addParam(val)}`);
            }
        }
        else if (type === 'neq') {
            const [col, val] = filterArgs;
            if (val === null) {
                whereClauses.push(`"${col}" IS NOT NULL`);
            }
            else {
                whereClauses.push(`"${col}" != ${addParam(val)}`);
            }
        }
        else if (type === 'gt') {
            const [col, val] = filterArgs;
            whereClauses.push(`"${col}" > ${addParam(val)}`);
        }
        else if (type === 'gte') {
            const [col, val] = filterArgs;
            whereClauses.push(`"${col}" >= ${addParam(val)}`);
        }
        else if (type === 'lt') {
            const [col, val] = filterArgs;
            whereClauses.push(`"${col}" < ${addParam(val)}`);
        }
        else if (type === 'lte') {
            const [col, val] = filterArgs;
            whereClauses.push(`"${col}" <= ${addParam(val)}`);
        }
        else if (type === 'like') {
            const [col, val] = filterArgs;
            whereClauses.push(`"${col}" LIKE ${addParam(val)}`);
        }
        else if (type === 'ilike') {
            const [col, val] = filterArgs;
            whereClauses.push(`"${col}" ILIKE ${addParam(val)}`);
        }
        else if (type === 'is') {
            const [col, val] = filterArgs;
            if (val === null) {
                whereClauses.push(`"${col}" IS NULL`);
            }
            else if (val === false) {
                whereClauses.push(`"${col}" IS NOT TRUE`);
            }
            else if (val === true) {
                whereClauses.push(`"${col}" IS TRUE`);
            }
            else {
                whereClauses.push(`"${col}" IS ${val}`);
            }
        }
        else if (type === 'in') {
            const [col, vals] = filterArgs;
            if (Array.isArray(vals) && vals.length > 0) {
                const placeholders = vals.map(v => addParam(v)).join(', ');
                whereClauses.push(`"${col}" IN (${placeholders})`);
            }
            else {
                whereClauses.push('1 = 0');
            }
        }
        else if (type === 'contains') {
            const [col, val] = filterArgs;
            whereClauses.push(`"${col}" @> ${addParam(val)}`);
        }
        else if (type === 'containedBy') {
            const [col, val] = filterArgs;
            whereClauses.push(`"${col}" <@ ${addParam(val)}`);
        }
        else if (type === 'order') {
            const [col, options] = filterArgs;
            const asc = options?.ascending !== false;
            orderByClause = `ORDER BY "${col}" ${asc ? 'ASC' : 'DESC'}`;
        }
        else if (type === 'limit') {
            const [val] = filterArgs;
            limitClause = `LIMIT ${addParam(parseInt(val))}`;
        }
        else if (type === 'single') {
            single = true;
        }
        else if (type === 'count') {
            countType = filterArgs[0] || 'exact';
        }
    }
    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    if (method === 'select') {
        queryText = `SELECT * FROM "${schemaName}"."${table}" ${whereString} ${orderByClause} ${limitClause}`;
    }
    else if (method === 'insert') {
        const data = args[0];
        const dataRows = Array.isArray(data) ? data : [data];
        if (dataRows.length === 0) {
            return { data: [], count: 0 };
        }
        if (colTypes['id'] === 'uuid') {
            const crypto = require('crypto');
            for (const row of dataRows) {
                if (row['id'] === undefined || row['id'] === null) {
                    row['id'] = crypto.randomUUID();
                }
            }
        }
        const cols = Object.keys(dataRows[0]);
        const colStrings = cols.map(c => `"${c}"`).join(', ');
        const valueStrings = [];
        for (const row of dataRows) {
            const rowVals = [];
            for (const col of cols) {
                let val = row[col];
                const isJsonCol = colTypes[col] === 'json' || colTypes[col] === 'jsonb';
                if (isJsonCol) {
                    rowVals.push(addParam(val === null ? null : JSON.stringify(val)));
                }
                else if (Array.isArray(val)) {
                    rowVals.push(addParam(val));
                }
                else if (val && typeof val === 'object' && !(val instanceof Date)) {
                    rowVals.push(addParam(JSON.stringify(val)));
                }
                else {
                    rowVals.push(addParam(val));
                }
            }
            valueStrings.push(`(${rowVals.join(', ')})`);
        }
        queryText = `INSERT INTO "${schemaName}"."${table}" (${colStrings}) VALUES ${valueStrings.join(', ')} RETURNING *`;
    }
    else if (method === 'update') {
        const data = args[0];
        const updateClauses = [];
        for (const col of Object.keys(data)) {
            let val = data[col];
            const isJsonCol = colTypes[col] === 'json' || colTypes[col] === 'jsonb';
            if (isJsonCol) {
                updateClauses.push(`"${col}" = ${addParam(val === null ? null : JSON.stringify(val))}`);
            }
            else if (Array.isArray(val)) {
                updateClauses.push(`"${col}" = ${addParam(val)}`);
            }
            else if (val && typeof val === 'object' && !(val instanceof Date)) {
                updateClauses.push(`"${col}" = ${addParam(JSON.stringify(val))}`);
            }
            else {
                updateClauses.push(`"${col}" = ${addParam(val)}`);
            }
        }
        queryText = `UPDATE "${schemaName}"."${table}" SET ${updateClauses.join(', ')} ${whereString} RETURNING *`;
    }
    else if (method === 'delete') {
        queryText = `DELETE FROM "${schemaName}"."${table}" ${whereString} RETURNING *`;
    }
    console.log(`Executing SQL: ${queryText} with params:`, queryParams);
    const res = await prisma.$queryRawUnsafe(queryText, ...queryParams);
    let dataResult = res;
    if (single) {
        dataResult = res.length > 0 ? res[0] : null;
    }
    let totalCount = null;
    if (countType) {
        const countQuery = `SELECT COUNT(*) as count FROM "${schemaName}"."${table}" ${whereString}`;
        const countRes = await prisma.$queryRawUnsafe(countQuery, ...queryParams);
        totalCount = Number(countRes[0]?.count || 0);
    }
    // Hydrate Joins dynamically if select contains nested queries
    if (method === 'select' && args && args.length > 0) {
        const selectStr = args[0];
        if (typeof selectStr === 'string' && selectStr !== '*') {
            const complexJoinRegex = /(?:(\w+):)?(\w+)\(([^)]+)\)/g;
            const joinsToHydrate = [];
            let match;
            while ((match = complexJoinRegex.exec(selectStr)) !== null) {
                const aliasName = match[1];
                const relationName = match[2];
                const selectFields = match[3];
                joinsToHydrate.push({ fieldName: relationName, selectFields, aliasName });
            }
            if (joinsToHydrate.length > 0 && res.length > 0) {
                const fkQuery = `
          SELECT 
            kcu.column_name, 
            ccu.table_name AS foreign_table, 
            ccu.column_name AS foreign_col,
            ccu.table_schema AS foreign_schema
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu 
            ON tc.constraint_name = kcu.constraint_name 
            AND tc.table_schema = kcu.table_schema 
          JOIN information_schema.constraint_column_usage AS ccu 
            ON ccu.constraint_name = tc.constraint_name 
            AND ccu.table_schema = tc.table_schema 
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = $1 
            AND tc.table_name = $2
        `;
                const fks = await prisma.$queryRawUnsafe(fkQuery, schemaName, table);
                const reverseFkQuery = `
          SELECT 
            kcu.column_name AS foreign_col, 
            tc.table_name AS foreign_table, 
            kcu.table_name AS foreign_table_name,
            kcu.column_name AS foreign_column_name,
            tc.table_schema AS foreign_schema
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu 
            ON tc.constraint_name = kcu.constraint_name 
            AND tc.table_schema = kcu.table_schema 
          JOIN information_schema.constraint_column_usage AS ccu 
            ON ccu.constraint_name = tc.constraint_name 
            AND ccu.table_schema = tc.table_schema 
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_schema = $1 
            AND ccu.table_name = $2
        `;
                const reverseFks = await prisma.$queryRawUnsafe(reverseFkQuery, schemaName, table);
                const rows = Array.isArray(dataResult) ? dataResult : [dataResult];
                for (const row of rows) {
                    if (!row)
                        continue;
                    for (const join of joinsToHydrate) {
                        const { fieldName, selectFields, aliasName } = join;
                        // Check direct FK
                        const fk = fks.find(f => f.foreign_table === fieldName || f.column_name === fieldName || f.column_name === `${fieldName}_id`);
                        if (fk) {
                            const localValue = row[fk.column_name];
                            if (localValue) {
                                const selectPart = selectFields === '*' ? '*' : selectFields.split(',').map(f => `"${f.trim()}"`).join(', ');
                                const joinQuery = `SELECT ${selectPart} FROM "${fk.foreign_schema}"."${fk.foreign_table}" WHERE "${fk.foreign_col}" = $1 LIMIT 1`;
                                const joinRes = await prisma.$queryRawUnsafe(joinQuery, localValue);
                                const val = joinRes.length > 0 ? joinRes[0] : null;
                                row[aliasName || fieldName] = val;
                            }
                            else {
                                row[aliasName || fieldName] = null;
                            }
                        }
                        else {
                            // Check reverse FK
                            const revFk = reverseFks.find(r => r.foreign_table_name === fieldName);
                            if (revFk) {
                                const localValue = row['id'];
                                if (localValue) {
                                    const selectPart = selectFields === '*' ? '*' : selectFields.split(',').map(f => `"${f.trim()}"`).join(', ');
                                    const joinQuery = `SELECT ${selectPart} FROM "${revFk.foreign_schema}"."${revFk.foreign_table_name}" WHERE "${revFk.foreign_column_name}" = $1`;
                                    const joinRes = await prisma.$queryRawUnsafe(joinQuery, localValue);
                                    const isOneToOne = (fieldName === 'perfiles' || fieldName === 'users');
                                    row[aliasName || fieldName] = isOneToOne ? (joinRes.length > 0 ? joinRes[0] : null) : joinRes;
                                }
                                else {
                                    row[aliasName || fieldName] = [];
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return { data: dataResult, count: totalCount };
}
// Basic health check
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.status(200).json({ status: 'ok', database: 'connected' });
    }
    catch (error) {
        console.error('Database connection failed', error);
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});
// AUTH SIGNUP
app.post('/auth/v1/signup', async (req, res) => {
    const { email, password, options, data } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const existing = await prisma.$queryRawUnsafe('SELECT id FROM auth.users WHERE email = $1 LIMIT 1', email);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const userId = crypto_1.default.randomUUID();
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const now = new Date().toISOString();
        // Supabase JS client sends metadata as `data` at top level, not inside `options`
        const userMetadata = data || options?.data || {};
        await prisma.$executeRawUnsafe(`
      INSERT INTO auth.users (
        id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, 
        created_at, updated_at, email_confirmed_at, confirmed_at, role, aud
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, userId, email, hashedPassword, JSON.stringify(userMetadata), JSON.stringify({ provider: 'email', providers: ['email'] }), now, now, now, now, 'authenticated', 'authenticated');
        // Insert profile (skip if already exists — Supabase trigger may have created it)
        const existingProfile = await prisma.$queryRawUnsafe('SELECT id FROM public.perfiles WHERE id = $1 LIMIT 1', userId);
        if (existingProfile.length === 0) {
            await prisma.$executeRawUnsafe(`
        INSERT INTO public.perfiles (
          id, email, nombre, rol, club_id, telefono, deportista_id, estado, created_at
        ) VALUES ($1, $2, $3, $4::public.user_role, $5, $6, $7, $8, $9)
      `, userId, email, userMetadata.nombre || userMetadata.nombre_completo || '', userMetadata.rol || 'entrenador', userMetadata.club_id || null, userMetadata.telefono || '', userMetadata.deportista_id || null, userMetadata.estado || 'activo', now);
        }
        const access_token = jsonwebtoken_1.default.sign({ sub: userId, email, role: 'authenticated', aud: 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });
        const refresh_token = crypto_1.default.randomUUID();
        await prisma.$executeRawUnsafe(`
      INSERT INTO auth.sessions (
        id, user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4)
    `, crypto_1.default.randomUUID(), userId, now, now);
        const responseUser = {
            id: userId,
            aud: 'authenticated',
            role: 'authenticated',
            email,
            email_confirmed_at: now,
            phone: null,
            confirmed_at: now,
            last_sign_in_at: now,
            raw_app_meta_data: { provider: 'email', providers: ['email'] },
            raw_user_meta_data: userMetadata,
            created_at: now,
            updated_at: now
        };
        // Enviar correo de bienvenida/registro
        const clubId = userMetadata.club_id || null;
        if (clubId) {
            try {
                const clubRes = await prisma.$queryRawUnsafe('SELECT nombre FROM public.clubes WHERE id = $1 LIMIT 1', clubId);
                const clubNombre = clubRes.length > 0 ? clubRes[0].nombre : 'Nuestra Plataforma';
                await (0, email_service_1.sendEmail)(prisma, email, 'registro', {
                    nombre: userMetadata.nombre || userMetadata.nombre_completo || 'Usuario',
                    email: email,
                    club: clubNombre
                }, clubId);
            }
            catch (e) {
                console.error("Error enviando correo de bienvenida:", e);
            }
        }
        return res.status(200).json({
            access_token,
            refresh_token,
            expires_in: 604800,
            token_type: 'bearer',
            user: responseUser,
            session: {
                access_token,
                refresh_token,
                expires_in: 604800,
                token_type: 'bearer',
                user: responseUser
            }
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: error.message || 'Signup failed' });
    }
});
// AUTH LOGIN / TOKEN
app.post('/auth/v1/token', async (req, res) => {
    const grantType = req.query.grant_type;
    if (grantType === 'password') {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        try {
            const users = await prisma.$queryRawUnsafe('SELECT * FROM auth.users WHERE email = $1 LIMIT 1', email);
            if (users.length === 0) {
                return res.status(400).json({ error: 'Invalid login credentials' });
            }
            const dbUser = users[0];
            const match = await bcryptjs_1.default.compare(password, dbUser.encrypted_password);
            if (!match) {
                return res.status(400).json({ error: 'Invalid login credentials' });
            }
            const now = new Date().toISOString();
            await prisma.$executeRawUnsafe('UPDATE auth.users SET last_sign_in_at = $1 WHERE id = $2', now, dbUser.id);
            const access_token = jsonwebtoken_1.default.sign({ sub: dbUser.id, email: dbUser.email, role: dbUser.role || 'authenticated', aud: dbUser.aud || 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });
            const refresh_token = crypto_1.default.randomUUID();
            const responseUser = {
                id: dbUser.id,
                aud: dbUser.aud || 'authenticated',
                role: dbUser.role || 'authenticated',
                email: dbUser.email,
                email_confirmed_at: dbUser.email_confirmed_at,
                phone: dbUser.phone,
                confirmed_at: dbUser.confirmed_at,
                last_sign_in_at: now,
                raw_app_meta_data: dbUser.raw_app_meta_data || {},
                raw_user_meta_data: dbUser.raw_user_meta_data || {},
                created_at: dbUser.created_at,
                updated_at: dbUser.updated_at
            };
            return res.status(200).json({
                access_token,
                refresh_token,
                expires_in: 604800,
                token_type: 'bearer',
                user: responseUser,
                session: {
                    access_token,
                    refresh_token,
                    expires_in: 604800,
                    token_type: 'bearer',
                    user: responseUser
                }
            });
        }
        catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ error: 'Login failed' });
        }
    }
    else if (grantType === 'refresh_token') {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }
        try {
            const users = await prisma.$queryRawUnsafe('SELECT * FROM auth.users LIMIT 1');
            if (users.length === 0) {
                return res.status(400).json({ error: 'No users found' });
            }
            const dbUser = users[0];
            const now = new Date().toISOString();
            const access_token = jsonwebtoken_1.default.sign({ sub: dbUser.id, email: dbUser.email, role: 'authenticated', aud: 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });
            const responseUser = {
                id: dbUser.id,
                aud: 'authenticated',
                role: 'authenticated',
                email: dbUser.email,
                email_confirmed_at: dbUser.email_confirmed_at,
                phone: dbUser.phone,
                confirmed_at: dbUser.confirmed_at,
                last_sign_in_at: now,
                raw_app_meta_data: dbUser.raw_app_meta_data || {},
                raw_user_meta_data: dbUser.raw_user_meta_data || {},
                created_at: dbUser.created_at,
                updated_at: dbUser.updated_at
            };
            return res.status(200).json({
                access_token,
                refresh_token: crypto_1.default.randomUUID(),
                expires_in: 604800,
                token_type: 'bearer',
                user: responseUser,
                session: {
                    access_token,
                    refresh_token: crypto_1.default.randomUUID(),
                    expires_in: 604800,
                    token_type: 'bearer',
                    user: responseUser
                }
            });
        }
        catch (error) {
            return res.status(500).json({ error: 'Token refresh failed' });
        }
    }
    else {
        return res.status(400).json({ error: 'Unsupported grant type' });
    }
});
// GET AUTH USER
app.get('/auth/v1/user', async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const users = await prisma.$queryRawUnsafe('SELECT * FROM auth.users WHERE id = $1 LIMIT 1', user.sub);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const dbUser = users[0];
        return res.status(200).json({
            id: dbUser.id,
            aud: dbUser.aud,
            role: dbUser.role,
            email: dbUser.email,
            email_confirmed_at: dbUser.email_confirmed_at,
            phone: dbUser.phone,
            confirmed_at: dbUser.confirmed_at,
            last_sign_in_at: dbUser.last_sign_in_at,
            raw_app_meta_data: dbUser.raw_app_meta_data,
            raw_user_meta_data: dbUser.raw_user_meta_data,
            created_at: dbUser.created_at,
            updated_at: dbUser.updated_at
        });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// AUTH LOGOUT
app.post('/auth/v1/logout', (req, res) => {
    return res.status(200).json({});
});
// AUTH RECOVER PASSWORD (Send Email)
app.post('/auth/v1/recover', async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email is required' });
    try {
        const users = await prisma.$queryRawUnsafe('SELECT id, raw_user_meta_data FROM auth.users WHERE email = $1 LIMIT 1', email);
        if (users.length > 0) {
            const user = users[0];
            const meta = user.raw_user_meta_data || {};
            const nombre = meta.nombre || meta.nombre_completo || 'Usuario';
            const clubId = meta.club_id || null;
            const resetLink = `https://fichaje.pro/reset-password?email=${encodeURIComponent(email)}`;
            try {
                let clubNombre = 'Club';
                if (clubId) {
                    const clubRes = await prisma.$queryRawUnsafe('SELECT nombre FROM public.clubes WHERE id = $1 LIMIT 1', clubId);
                    if (clubRes.length > 0)
                        clubNombre = clubRes[0].nombre;
                }
                await (0, email_service_1.sendEmail)(prisma, email, 'recuperacion', {
                    nombre: nombre,
                    link_recuperacion: resetLink,
                    club: clubNombre
                }, clubId || undefined);
            }
            catch (e) {
                console.error("Error enviando correo de recuperación:", e);
            }
        }
        // Siempre retornamos 200 aunque el correo no exista, por seguridad
        return res.status(200).json({ message: 'If the email exists, a recovery link was sent.' });
    }
    catch (error) {
        console.error('Recover error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// REST V1 RPC ENDPOINT
app.post('/rest/v1/rpc/:functionName', async (req, res) => {
    const { functionName } = req.params;
    console.log(`[RPC] Calling function "${functionName}" with body:`, req.body);
    try {
        const keys = Object.keys(req.body || {});
        const params = [];
        // Construct named arguments list like: p_club_nombre => $1, p_pais => $2
        const argStrings = keys.map((key, idx) => {
            params.push(req.body[key]);
            return `"${key}" => $${idx + 1}`;
        }).join(', ');
        const sql = `SELECT * FROM public."${functionName}"(${argStrings})`;
        console.log(`Executing RPC SQL: ${sql} with params:`, params);
        const queryResult = await prisma.$queryRawUnsafe(sql, ...params);
        console.log('RPC Query result:', queryResult);
        // Format output:
        // If the function returns a single row with a single column matching the functionName, 
        // we return the value of that column directly (handles scalar, composite, json returns).
        if (Array.isArray(queryResult) &&
            queryResult.length === 1 &&
            Object.keys(queryResult[0]).length === 1 &&
            queryResult[0][functionName] !== undefined) {
            return res.status(200).json(queryResult[0][functionName]);
        }
        // Otherwise return the full result
        return res.status(200).json(queryResult);
    }
    catch (error) {
        console.error(`Error in /rest/v1/rpc/${functionName}:`, error);
        return res.status(400).json({
            message: error.message || 'Database RPC error',
            details: error.details || error
        });
    }
});
// REST V1 POSTGREST ENDPOINT
app.all('/rest/v1/:table', async (req, res) => {
    const { table } = req.params;
    const method = req.method.toLowerCase();
    const actionMap = {
        get: 'select',
        post: 'insert',
        patch: 'update',
        delete: 'delete'
    };
    const action = actionMap[method];
    if (!action) {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const filters = [];
    let selectArgs = ['*'];
    for (const [key, value] of Object.entries(req.query)) {
        if (!value)
            continue;
        const valStr = String(value);
        if (key === 'select') {
            selectArgs = [valStr];
            continue;
        }
        if (key === 'order') {
            const parts = valStr.split('.');
            const col = parts[0];
            const ascending = parts[1] !== 'desc';
            filters.push({ type: 'order', args: [col, { ascending }] });
            continue;
        }
        if (key === 'limit') {
            filters.push({ type: 'limit', args: [parseInt(valStr)] });
            continue;
        }
        const dotIdx = valStr.indexOf('.');
        if (dotIdx !== -1) {
            const op = valStr.substring(0, dotIdx);
            const val = valStr.substring(dotIdx + 1);
            if (op === 'eq') {
                filters.push({ type: 'eq', args: [key, val === 'null' ? null : val] });
            }
            else if (op === 'neq') {
                filters.push({ type: 'neq', args: [key, val === 'null' ? null : val] });
            }
            else if (op === 'gt') {
                filters.push({ type: 'gt', args: [key, val] });
            }
            else if (op === 'gte') {
                filters.push({ type: 'gte', args: [key, val] });
            }
            else if (op === 'lt') {
                filters.push({ type: 'lt', args: [key, val] });
            }
            else if (op === 'lte') {
                filters.push({ type: 'lte', args: [key, val] });
            }
            else if (op === 'like') {
                filters.push({ type: 'like', args: [key, val] });
            }
            else if (op === 'ilike') {
                filters.push({ type: 'ilike', args: [key, val] });
            }
            else if (op === 'is') {
                if (val === 'null') {
                    filters.push({ type: 'is', args: [key, null] });
                }
                else if (val === 'true') {
                    filters.push({ type: 'is', args: [key, true] });
                }
                else if (val === 'false') {
                    filters.push({ type: 'is', args: [key, false] });
                }
                else {
                    filters.push({ type: 'is', args: [key, val] });
                }
            }
            else if (op === 'in') {
                const cleanVal = val.replace(/^\((.*)\)$/, '$1');
                const vals = cleanVal.split(',').map(v => {
                    let trimmed = v.trim();
                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        return trimmed.substring(1, trimmed.length - 1);
                    }
                    return trimmed;
                });
                filters.push({ type: 'in', args: [key, vals] });
            }
        }
    }
    const acceptHeader = req.headers['accept'] || '';
    if (String(acceptHeader).includes('vnd.pgrst.object+json')) {
        filters.push({ type: 'single', args: [] });
    }
    const preferHeader = req.headers['prefer'] || '';
    if (String(preferHeader).includes('count=')) {
        const countType = String(preferHeader).includes('count=exact') ? 'exact' : 'planned';
        filters.push({ type: 'count', args: [countType] });
    }
    try {
        let bodyArgs = [];
        if (action === 'insert' || action === 'update') {
            bodyArgs = [req.body];
        }
        else {
            bodyArgs = selectArgs;
        }
        const result = await executeQuery(table, action, bodyArgs, filters);
        if (result.count !== null) {
            res.setHeader('Content-Range', `0-${Array.isArray(result.data) ? result.data.length : 1}/${result.count}`);
        }
        const statusCode = action === 'insert' ? 201 : 200;
        return res.status(statusCode).json(result.data);
    }
    catch (error) {
        console.error(`Error in /rest/v1/${table}:`, error);
        return res.status(400).json({
            message: error.message || 'Database query error',
            details: error.details || error
        });
    }
});
// SEND NOTIFICATION EMAIL
app.post('/api/notifications/send', async (req, res) => {
    const { to, tipo, variables, club_id } = req.body;
    if (!to || !tipo || !club_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos: to, tipo, club_id' });
    }
    try {
        const result = await (0, email_service_1.sendNotificationEmail)(prisma, to, tipo, variables || {}, club_id);
        if (result) {
            return res.status(200).json({ success: true, message: 'Notificación enviada' });
        }
        else {
            return res.status(400).json({ success: false, message: 'No se pudo enviar la notificación' });
        }
    }
    catch (error) {
        console.error('Error sending notification:', error);
        return res.status(500).json({ error: error.message || 'Error interno' });
    }
});
// SEND WELCOME EMAIL (registration template) — called after user creation from Club panel
app.post('/api/notifications/welcome', async (req, res) => {
    const { to, nombre, club_id } = req.body;
    if (!to || !nombre || !club_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos: to, nombre, club_id' });
    }
    try {
        const clubRes = await prisma.$queryRawUnsafe('SELECT nombre FROM public.clubes WHERE id = $1 LIMIT 1', club_id);
        const clubNombre = clubRes.length > 0 ? clubRes[0].nombre : 'Club';
        const result = await (0, email_service_1.sendEmail)(prisma, to, 'registro', {
            nombre,
            email: to,
            club: clubNombre
        }, club_id);
        if (result) {
            return res.status(200).json({ success: true, message: 'Correo de bienvenida enviado' });
        }
        else {
            return res.status(400).json({ success: false, message: 'No se pudo enviar el correo de bienvenida' });
        }
    }
    catch (error) {
        console.error('Error sending welcome email:', error);
        return res.status(500).json({ error: error.message || 'Error interno' });
    }
});
app.listen(port, () => {
    console.log(`🚀 Fichaje Backend running on port ${port}`);
});
