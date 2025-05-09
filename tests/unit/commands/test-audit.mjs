import test from 'ava';
import sinon from 'sinon';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get directory name of current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../');

test.beforeEach(t => {
  // Create the test sandbox
  t.context.sandbox = sinon.createSandbox();
  
  // Mock fs functions
  t.context.existsSync = t.context.sandbox.stub(fs, 'existsSync').returns(true);
  t.context.readFileSync = t.context.sandbox.stub(fs, 'readFileSync');
  t.context.writeFileSync = t.context.sandbox.stub(fs, 'writeFileSync');
  t.context.mkdirSync = t.context.sandbox.stub(fs, 'mkdirSync');
  
  // Mock console.log/error to avoid test output noise
  t.context.consoleLog = t.context.sandbox.stub(console, 'log');
  t.context.consoleError = t.context.sandbox.stub(console, 'error');
  
  // Setup readFileSync mock to return different content based on path
  t.context.readFileSync.callsFake(filePath => {
    if (filePath.includes('user-authentication-flow.md')) {
      return `# User Authentication Flow

## Checks
- [ ] Implement user signup with email and password
- [ ] Validate user login credentials
- [ ] Enable password reset
- [ ] Support OAuth authentication
`;
    } else if (filePath.includes('app.js')) {
      return `
function authenticateUser(email, password) {
  // Validate login credentials
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Check if user exists in database
  const user = findUserByEmail(email);
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, message: 'Invalid password' };
  }
  
  // Generate session token
  const token = generateSessionToken(user);
  
  return { 
    success: true, 
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  };
}

function signupUser(email, password, name) {
  // Validate input
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Check if user already exists
  const existingUser = findUserByEmail(email);
  if (existingUser) {
    return { success: false, message: 'User already exists' };
  }
  
  // Hash password and create user
  const passwordHash = hashPassword(password);
  const user = createUser({
    email,
    passwordHash,
    name
  });
  
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  };
}
`;
    }
    return '';
  });
});

test.afterEach(t => {
  t.context.sandbox.restore();
});

test('Audit command should compare spec checks against implementation', async t => {
  // Import the module to test
  const auditModule = await import('../../../src/commands/audit.js');
  
  // Mock the getFeaturesData function
  t.context.getFeaturesData = t.context.sandbox.stub().resolves([
    {
      slug: 'user-authentication-flow',
      title: 'User Authentication Flow',
      filePath: 'checkmate/specs/user-authentication-flow.md'
    }
  ]);
  auditModule.getFeaturesData = t.context.getFeaturesData;
  
  // Mock extractActionBullets to return specific bullets
  t.context.extractActionBullets = t.context.sandbox.stub().resolves([
    'Implement user signup with email and password',
    'Validate user login credentials',
    'Generate session token',
    'Hash user passwords'
  ]);
  auditModule.extractActionBullets = t.context.extractActionBullets;
  
  // Run the audit command
  const result = await auditModule.auditCommand({
    spec: 'user-authentication-flow',
    quiet: true,
    json: true
  });
  
  // Verify behavior
  t.is(result.spec, 'user-authentication-flow', 'Should identify the correct spec');
  t.is(result.matches.length, 2, 'Should match 2 items');
  t.is(result.missingInCode.length, 2, 'Should find 2 items missing in code');
  t.is(result.missingInSpec.length, 2, 'Should find 2 items missing in spec');
  
  // Check status determination
  t.is(result.status, 'FAIL', 'Status should be FAIL due to missing items in code');
});

test('Audit command should report success when all spec checks are implemented', async t => {
  // Import the module to test
  const auditModule = await import('../../../src/commands/audit.js');
  
  // Mock the getFeaturesData function
  t.context.getFeaturesData = t.context.sandbox.stub().resolves([
    {
      slug: 'user-authentication-flow',
      title: 'User Authentication Flow',
      filePath: 'checkmate/specs/user-authentication-flow.md'
    }
  ]);
  auditModule.getFeaturesData = t.context.getFeaturesData;
  
  // Mock extractActionBullets to return bullets matching all spec items
  t.context.extractActionBullets = t.context.sandbox.stub().resolves([
    'Implement user signup with email and password',
    'Validate user login credentials',
    'Enable password reset',
    'Support OAuth authentication',
    'Generate session token',
    'Hash user passwords'
  ]);
  auditModule.extractActionBullets = t.context.extractActionBullets;
  
  // Run the audit command
  const result = await auditModule.auditCommand({
    spec: 'user-authentication-flow',
    quiet: true,
    json: true
  });
  
  // Verify behavior
  t.is(result.spec, 'user-authentication-flow', 'Should identify the correct spec');
  t.is(result.matches.length, 4, 'Should match all 4 spec items');
  t.is(result.missingInCode.length, 0, 'Should find no items missing in code');
  t.is(result.missingInSpec.length, 2, 'Should find items from code missing in spec');
  
  // Check status determination - PASS because all spec items are implemented
  t.is(result.status, 'PASS', 'Status should be PASS - no spec items missing in code');
});

test('Audit command should handle non-existent spec', async t => {
  // Import the module to test
  const auditModule = await import('../../../src/commands/audit.js');
  
  // Override existsSync to return false for spec file
  t.context.existsSync.callsFake(path => {
    if (path.includes('non-existent-spec')) {
      return false;
    }
    return true;
  });
  
  // Mock the getFeaturesData function to return empty list
  t.context.getFeaturesData = t.context.sandbox.stub().resolves([]);
  auditModule.getFeaturesData = t.context.getFeaturesData;
  
  // Run the audit command with non-existent spec
  const result = await auditModule.auditCommand({
    spec: 'non-existent-spec',
    quiet: true,
    json: true
  });
  
  // Verify behavior
  t.truthy(result.error, 'Should return an error');
  t.true(result.message.includes('not found'), 'Error message should indicate spec not found');
}); 