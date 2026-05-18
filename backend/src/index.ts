import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

console.log("DATABASE_URL in backend:", process.env.DATABASE_URL);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || '5qkGYgq4OsMFS0Ii';

app.use(cors({
  origin: '*',
  methods: '*',
  allowedHeaders: '*'
}));
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

interface DecodedToken {
  sub: string;
  email: string;
  role?: string;
  aud?: string;
}

// Decode Auth Header
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      (req as any).user = decoded;
    } catch (err) {
      console.warn('Invalid token provided:', err);
    }
  }
  next();
});

// Column types cache to differentiate between JSON/JSONB columns and regular arrays/objects
const tableColumnTypesCache: Record<string, Record<string, string>> = {};

async function getTableColumnTypes(schemaName: string, tableName: string): Promise<Record<string, string>> {
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
    const res = await prisma.$queryRawUnsafe<{ column_name: string; data_type: string }[]>(query, schemaName, tableName);
    const types: Record<string, string> = {};
    for (const row of res) {
      types[row.column_name] = row.data_type;
    }
    tableColumnTypesCache[cacheKey] = types;
    return types;
  } catch (err) {
    console.error(`Error fetching column types for ${cacheKey}:`, err);
    return {};
  }
}

// Dynamic query executer
async function executeQuery(table: string, method: string, args: any[], filters: any[]) {
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
  const queryParams: any[] = [];
  
  const addParam = (val: any) => {
    queryParams.push(val);
    return `$${queryParams.length}`;
  };

  const whereClauses: string[] = [];
  let orderByClause = '';
  let limitClause = '';
  let single = false;
  let countType: string | null = null;

  for (const filter of filters) {
    const { type, args: filterArgs } = filter;
    
    if (type === 'eq') {
      const [col, val] = filterArgs;
      if (val === null) {
        whereClauses.push(`"${col}" IS NULL`);
      } else {
        whereClauses.push(`"${col}" = ${addParam(val)}`);
      }
    } else if (type === 'neq') {
      const [col, val] = filterArgs;
      if (val === null) {
        whereClauses.push(`"${col}" IS NOT NULL`);
      } else {
        whereClauses.push(`"${col}" != ${addParam(val)}`);
      }
    } else if (type === 'gt') {
      const [col, val] = filterArgs;
      whereClauses.push(`"${col}" > ${addParam(val)}`);
    } else if (type === 'gte') {
      const [col, val] = filterArgs;
      whereClauses.push(`"${col}" >= ${addParam(val)}`);
    } else if (type === 'lt') {
      const [col, val] = filterArgs;
      whereClauses.push(`"${col}" < ${addParam(val)}`);
    } else if (type === 'lte') {
      const [col, val] = filterArgs;
      whereClauses.push(`"${col}" <= ${addParam(val)}`);
    } else if (type === 'like') {
      const [col, val] = filterArgs;
      whereClauses.push(`"${col}" LIKE ${addParam(val)}`);
    } else if (type === 'ilike') {
      const [col, val] = filterArgs;
      whereClauses.push(`"${col}" ILIKE ${addParam(val)}`);
    } else if (type === 'is') {
      const [col, val] = filterArgs;
      if (val === null) {
        whereClauses.push(`"${col}" IS NULL`);
      } else if (val === false) {
        whereClauses.push(`"${col}" IS NOT TRUE`);
      } else if (val === true) {
        whereClauses.push(`"${col}" IS TRUE`);
      } else {
        whereClauses.push(`"${col}" IS ${val}`);
      }
    } else if (type === 'in') {
      const [col, vals] = filterArgs;
      if (Array.isArray(vals) && vals.length > 0) {
        const placeholders = vals.map(v => addParam(v)).join(', ');
        whereClauses.push(`"${col}" IN (${placeholders})`);
      } else {
        whereClauses.push('1 = 0');
      }
    } else if (type === 'contains') {
      const [col, val] = filterArgs;
      whereClauses.push(`"${col}" @> ${addParam(val)}`);
    } else if (type === 'containedBy') {
      const [col, val] = filterArgs;
      whereClauses.push(`"${col}" <@ ${addParam(val)}`);
    } else if (type === 'order') {
      const [col, options] = filterArgs;
      const asc = options?.ascending !== false;
      orderByClause = `ORDER BY "${col}" ${asc ? 'ASC' : 'DESC'}`;
    } else if (type === 'limit') {
      const [val] = filterArgs;
      limitClause = `LIMIT ${addParam(parseInt(val))}`;
    } else if (type === 'single') {
      single = true;
    } else if (type === 'count') {
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
    
    const valueStrings: string[] = [];
    for (const row of dataRows) {
      const rowVals: string[] = [];
      for (const col of cols) {
        let val = row[col];
        const isJsonCol = colTypes[col] === 'json' || colTypes[col] === 'jsonb';
        if (isJsonCol) {
          rowVals.push(addParam(val === null ? null : JSON.stringify(val)));
        } else if (Array.isArray(val)) {
          rowVals.push(addParam(val));
        } else if (val && typeof val === 'object' && !(val instanceof Date)) {
          rowVals.push(addParam(JSON.stringify(val)));
        } else {
          rowVals.push(addParam(val));
        }
      }
      valueStrings.push(`(${rowVals.join(', ')})`);
    }
    
    queryText = `INSERT INTO "${schemaName}"."${table}" (${colStrings}) VALUES ${valueStrings.join(', ')} RETURNING *`;
  }
  else if (method === 'update') {
    const data = args[0];
    const updateClauses: string[] = [];
    
    for (const col of Object.keys(data)) {
      let val = data[col];
      const isJsonCol = colTypes[col] === 'json' || colTypes[col] === 'jsonb';
      if (isJsonCol) {
        updateClauses.push(`"${col}" = ${addParam(val === null ? null : JSON.stringify(val))}`);
      } else if (Array.isArray(val)) {
        updateClauses.push(`"${col}" = ${addParam(val)}`);
      } else if (val && typeof val === 'object' && !(val instanceof Date)) {
        updateClauses.push(`"${col}" = ${addParam(JSON.stringify(val))}`);
      } else {
        updateClauses.push(`"${col}" = ${addParam(val)}`);
      }
    }
    
    queryText = `UPDATE "${schemaName}"."${table}" SET ${updateClauses.join(', ')} ${whereString} RETURNING *`;
  }
  else if (method === 'delete') {
    queryText = `DELETE FROM "${schemaName}"."${table}" ${whereString} RETURNING *`;
  }

  console.log(`Executing SQL: ${queryText} with params:`, queryParams);
  
  const res = await prisma.$queryRawUnsafe<any[]>(queryText, ...queryParams);

  let dataResult: any = res;
  if (single) {
    dataResult = res.length > 0 ? res[0] : null;
  }

  let totalCount: number | null = null;
  if (countType) {
    const countQuery = `SELECT COUNT(*) as count FROM "${schemaName}"."${table}" ${whereString}`;
    const countRes = await prisma.$queryRawUnsafe<any[]>(countQuery, ...queryParams);
    totalCount = Number(countRes[0]?.count || 0);
  }

  // Hydrate Joins dynamically if select contains nested queries
  if (method === 'select' && args && args.length > 0) {
    const selectStr = args[0];
    if (typeof selectStr === 'string' && selectStr !== '*') {
      const complexJoinRegex = /(?:(\w+):)?(\w+)\(([^)]+)\)/g;
      const joinsToHydrate: { fieldName: string, selectFields: string, aliasName?: string }[] = [];
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
        const fks = await prisma.$queryRawUnsafe<any[]>(fkQuery, schemaName, table);
        
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
        const reverseFks = await prisma.$queryRawUnsafe<any[]>(reverseFkQuery, schemaName, table);

        const rows = Array.isArray(dataResult) ? dataResult : [dataResult];
        for (const row of rows) {
          if (!row) continue;
          for (const join of joinsToHydrate) {
            const { fieldName, selectFields, aliasName } = join;
            
            // Check direct FK
            const fk = fks.find(f => f.foreign_table === fieldName || f.column_name === fieldName || f.column_name === `${fieldName}_id`);
            if (fk) {
              const localValue = row[fk.column_name];
              if (localValue) {
                const selectPart = selectFields === '*' ? '*' : selectFields.split(',').map(f => `"${f.trim()}"`).join(', ');
                const joinQuery = `SELECT ${selectPart} FROM "${fk.foreign_schema}"."${fk.foreign_table}" WHERE "${fk.foreign_col}" = $1 LIMIT 1`;
                const joinRes = await prisma.$queryRawUnsafe<any[]>(joinQuery, localValue);
                const val = joinRes.length > 0 ? joinRes[0] : null;
                row[aliasName || fieldName] = val;
              } else {
                row[aliasName || fieldName] = null;
              }
            } else {
              // Check reverse FK
              const revFk = reverseFks.find(r => r.foreign_table_name === fieldName);
              if (revFk) {
                const localValue = row['id'];
                if (localValue) {
                  const selectPart = selectFields === '*' ? '*' : selectFields.split(',').map(f => `"${f.trim()}"`).join(', ');
                  const joinQuery = `SELECT ${selectPart} FROM "${revFk.foreign_schema}"."${revFk.foreign_table_name}" WHERE "${revFk.foreign_column_name}" = $1`;
                  const joinRes = await prisma.$queryRawUnsafe<any[]>(joinQuery, localValue);
                  const isOneToOne = (fieldName === 'perfiles' || fieldName === 'users');
                  row[aliasName || fieldName] = isOneToOne ? (joinRes.length > 0 ? joinRes[0] : null) : joinRes;
                } else {
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
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
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
    const existing = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id FROM auth.users WHERE email = $1 LIMIT 1',
      email
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    // Supabase JS client sends metadata as `data` at top level, not inside `options`
    const userMetadata = data || options?.data || {};

    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.users (
        id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, 
        created_at, updated_at, email_confirmed_at, confirmed_at, role, aud
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, 
      userId, 
      email, 
      hashedPassword, 
      JSON.stringify(userMetadata), 
      JSON.stringify({ provider: 'email', providers: ['email'] }),
      now, 
      now, 
      now, 
      now, 
      'authenticated', 
      'authenticated'
    );

    await prisma.$executeRawUnsafe(`
      INSERT INTO public.perfiles (
        id, email, nombre, rol, club_id, telefono, created_at
      ) VALUES ($1, $2, $3, $4::public.user_role, $5, $6, $7)
    `,
      userId,
      email,
      userMetadata.nombre || userMetadata.nombre_completo || '',
      userMetadata.rol || 'entrenador',
      userMetadata.club_id || null,
      userMetadata.telefono || '',
      now
    );

    const access_token = jwt.sign(
      { sub: userId, email, role: 'authenticated', aud: 'authenticated' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refresh_token = crypto.randomUUID();
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.sessions (
        id, user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4)
    `,
      crypto.randomUUID(),
      userId,
      now,
      now
    );

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
  } catch (error: any) {
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
      const users = await prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM auth.users WHERE email = $1 LIMIT 1',
        email
      );

      if (users.length === 0) {
        return res.status(400).json({ error: 'Invalid login credentials' });
      }

      const dbUser = users[0];
      const match = await bcrypt.compare(password, dbUser.encrypted_password);
      if (!match) {
        return res.status(400).json({ error: 'Invalid login credentials' });
      }

      const now = new Date().toISOString();
      await prisma.$executeRawUnsafe(
        'UPDATE auth.users SET last_sign_in_at = $1 WHERE id = $2',
        now,
        dbUser.id
      );

      const access_token = jwt.sign(
        { sub: dbUser.id, email: dbUser.email, role: dbUser.role || 'authenticated', aud: dbUser.aud || 'authenticated' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const refresh_token = crypto.randomUUID();

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
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  } else if (grantType === 'refresh_token') {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    try {
      const users = await prisma.$queryRawUnsafe<any[]>('SELECT * FROM auth.users LIMIT 1');
      if (users.length === 0) {
        return res.status(400).json({ error: 'No users found' });
      }
      
      const dbUser = users[0];
      const now = new Date().toISOString();
      const access_token = jwt.sign(
        { sub: dbUser.id, email: dbUser.email, role: 'authenticated', aud: 'authenticated' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

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
        refresh_token: crypto.randomUUID(),
        expires_in: 604800,
        token_type: 'bearer',
        user: responseUser,
        session: {
          access_token,
          refresh_token: crypto.randomUUID(),
          expires_in: 604800,
          token_type: 'bearer',
          user: responseUser
        }
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Token refresh failed' });
    }
  } else {
    return res.status(400).json({ error: 'Unsupported grant type' });
  }
});

// GET AUTH USER
app.get('/auth/v1/user', async (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const users = await prisma.$queryRawUnsafe<any[]>(
      'SELECT * FROM auth.users WHERE id = $1 LIMIT 1', 
      user.sub
    );
    
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
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// AUTH LOGOUT
app.post('/auth/v1/logout', (req, res) => {
  return res.status(200).json({});
});

// REST V1 RPC ENDPOINT
app.post('/rest/v1/rpc/:functionName', async (req, res) => {
  const { functionName } = req.params;
  console.log(`[RPC] Calling function "${functionName}" with body:`, req.body);

  try {
    const keys = Object.keys(req.body || {});
    const params: any[] = [];
    
    // Construct named arguments list like: p_club_nombre => $1, p_pais => $2
    const argStrings = keys.map((key, idx) => {
      params.push(req.body[key]);
      return `"${key}" => $${idx + 1}`;
    }).join(', ');

    const sql = `SELECT * FROM public."${functionName}"(${argStrings})`;
    console.log(`Executing RPC SQL: ${sql} with params:`, params);
    
    const queryResult = await prisma.$queryRawUnsafe<any[]>(sql, ...params);
    console.log('RPC Query result:', queryResult);

    // Format output:
    // If the function returns a single row with a single column matching the functionName, 
    // we return the value of that column directly (handles scalar, composite, json returns).
    if (
      Array.isArray(queryResult) && 
      queryResult.length === 1 && 
      Object.keys(queryResult[0]).length === 1 && 
      queryResult[0][functionName] !== undefined
    ) {
      return res.status(200).json(queryResult[0][functionName]);
    }

    // Otherwise return the full result
    return res.status(200).json(queryResult);
  } catch (error: any) {
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
  
  const actionMap: Record<string, string> = {
    get: 'select',
    post: 'insert',
    patch: 'update',
    delete: 'delete'
  };
  
  const action = actionMap[method];
  if (!action) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const filters: any[] = [];
  let selectArgs: any[] = ['*'];

  for (const [key, value] of Object.entries(req.query)) {
    if (!value) continue;
    
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
      } else if (op === 'neq') {
        filters.push({ type: 'neq', args: [key, val === 'null' ? null : val] });
      } else if (op === 'gt') {
        filters.push({ type: 'gt', args: [key, val] });
      } else if (op === 'gte') {
        filters.push({ type: 'gte', args: [key, val] });
      } else if (op === 'lt') {
        filters.push({ type: 'lt', args: [key, val] });
      } else if (op === 'lte') {
        filters.push({ type: 'lte', args: [key, val] });
      } else if (op === 'like') {
        filters.push({ type: 'like', args: [key, val] });
      } else if (op === 'ilike') {
        filters.push({ type: 'ilike', args: [key, val] });
      } else if (op === 'is') {
        if (val === 'null') {
          filters.push({ type: 'is', args: [key, null] });
        } else if (val === 'true') {
          filters.push({ type: 'is', args: [key, true] });
        } else if (val === 'false') {
          filters.push({ type: 'is', args: [key, false] });
        } else {
          filters.push({ type: 'is', args: [key, val] });
        }
      } else if (op === 'in') {
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
    let bodyArgs: any[] = [];
    if (action === 'insert' || action === 'update') {
      bodyArgs = [req.body];
    } else {
      bodyArgs = selectArgs;
    }

    const result = await executeQuery(table, action, bodyArgs, filters);

    if (result.count !== null) {
      res.setHeader('Content-Range', `0-${Array.isArray(result.data) ? result.data.length : 1}/${result.count}`);
    }

    const statusCode = action === 'insert' ? 201 : 200;
    return res.status(statusCode).json(result.data);
  } catch (error: any) {
    console.error(`Error in /rest/v1/${table}:`, error);
    return res.status(400).json({
      message: error.message || 'Database query error',
      details: error.details || error
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Promesas Backend running on port ${port}`);
});
