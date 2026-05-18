const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

content = content.replace(/@default\(dbgenerated\("gen_random_uuid\(\)"\)\)/g, '@default(uuid())');
content = content.replace(/@default\(dbgenerated\("uuid_generate_v4\(\)"\)\)/g, '@default(uuid())');
content = content.replace(/@default\(dbgenerated\("timezone\('utc'::text, now\(\)\)"\)\)/g, '@default(now())');
content = content.replace(/@default\(dbgenerated\("lower\(\(identity_data ->> 'email'::text\)\)"\)\)/g, '');
content = content.replace(/@default\(dbgenerated\("\(now\(\) \+ '00:03:00'::interval\)"\)\)/g, '');
content = content.replace(/@default\(dbgenerated\("LEAST\(email_confirmed_at, phone_confirmed_at\)"\)\)/g, '');
content = content.replace(/@default\(dbgenerated\("lower\(\(identity_data ->> 'email'::text\)\)"\)\)/g, '');

fs.writeFileSync(schemaPath, content);
console.log('Schema fixed');
