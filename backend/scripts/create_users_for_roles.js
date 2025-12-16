
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Hardcode for reliability in this specific debug session
const URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/HR-System-Final?appName=Cluster0';

const SYSTEM_ROLES = [
  'department employee',
  'department head',
  'HR Manager',
  'HR Employee',
  'Payroll Specialist',
  'Payroll Manager',
  'System Admin',
  'Legal & Policy Admin',
  'Recruiter',
  'Finance Staff',
  'Job Candidate',
  'HR Admin',
];

const DEFAULT_PASSWORD = 'RoleUser@1234';

function slugify(input) {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

function emailFor(role) {
  const roleSlug = slugify(role).replace(/-/g, '.');
  return `${roleSlug}@company.com`;
}

async function hashPassword(p) {
  const saltRounds = 10;
  return bcrypt.hash(p, saltRounds);
}

async function upsertEmployee(empColl, { employeeNumber, firstName, lastName, nationalId, workEmail, personalEmail, password }) {
  let existing = await empColl.findOne({
    $or: [
      { workEmail },
      { personalEmail }
    ],
  });

  const now = new Date();
  const hashed = await hashPassword(password);

  if (existing) {
    console.log(`Updating existing user: ${workEmail}`);
    await empColl.updateOne({ _id: existing._id }, {
      $set: {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        password: hashed,
        status: 'ACTIVE',
        updatedAt: now
      }
    });
    return { doc: existing, created: false };
  }

  console.log(`Creating new user: ${workEmail}`);
  const doc = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    nationalId,
    password: hashed,
    workEmail,
    personalEmail,
    mobilePhone: '+0000000000',
    employeeNumber,
    dateOfHire: now,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  const res = await empColl.insertOne(doc);
  const inserted = await empColl.findOne({ _id: res.insertedId });
  return { doc: inserted, created: true };
}

async function ensureRoles(roleColl, employeeId, roles) {
  const existing = await roleColl.findOne({ employeeProfileId: employeeId });
  const now = new Date();
  if (existing) {
    console.log(`Updating roles for user ${employeeId}`);
    await roleColl.updateOne(
      { _id: existing._id },
      { $set: { roles: roles, isActive: true, updatedAt: now } },
    );
    return roles;
  }
  console.log(`Creating roles for user ${employeeId}`);
  await roleColl.insertOne({ employeeProfileId: employeeId, roles, permissions: [], isActive: true, createdAt: now, updatedAt: now });
  return roles;
}

async function main() {
  console.log('Connecting to MongoDB...');
  // Removed deprecated options to avoid potential strict mode errors
  await mongoose.connect(URI);
  console.log('Connected!');

  const db = mongoose.connection;
  const empColl = db.collection('employee_profiles');
  const roleColl = db.collection('employee_system_roles');

  for (const role of SYSTEM_ROLES) {
    try {
      const roleSlug = slugify(role);
      const firstName = role.split(' ')[0] || 'Role';
      let lastName = role.split(' ').slice(1).join(' ') || 'User';
      if (lastName === '') lastName = 'User';

      const workEmail = emailFor(role);
      const personalEmail = workEmail;

      const uniqueSuffix = Date.now().toString().slice(-6);
      const employeeNumber = `EMP-${roleSlug.toUpperCase().slice(0, 10)}-${uniqueSuffix}`;
      const nationalId = `NID-${roleSlug.toUpperCase().slice(0, 10)}-${uniqueSuffix}`;

      const { doc } = await upsertEmployee(empColl, {
        employeeNumber,
        firstName,
        lastName,
        nationalId,
        workEmail,
        personalEmail,
        password: DEFAULT_PASSWORD,
      });

      await ensureRoles(roleColl, doc._id, [role]);
    } catch (e) {
      console.error(`Error processing role ${role}:`, e);
    }
  }

  console.log('Seed completed.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
