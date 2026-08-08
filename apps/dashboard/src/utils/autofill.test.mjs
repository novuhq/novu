/**
 * Tests for GitHub issue #12267
 * Run with: node src/utils/autofill.test.mjs
 */
import assert from 'node:assert/strict';

const AUTOCOMPLETE_PASSWORD_MANAGERS_OFF = {
  autoComplete: 'off',
  'data-1p-ignore': true,
  'data-form-type': 'other',
};

function resolveRenderedInputProps(callerProps, disableAutofill = false) {
  const autofillAttributes = disableAutofill ? AUTOCOMPLETE_PASSWORD_MANAGERS_OFF : {};
  return { ...autofillAttributes, ...callerProps };
}

function resolveRenderedInputProps_BEFORE_FIX(callerProps) {
  return { ...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF, ...callerProps };
}

let passed = 0, failed = 0;

function describe(name, fn) { console.log('\n' + name); fn(); }
function it(name, fn) {
  try { fn(); console.log('  ✅  ' + name); passed++; }
  catch(err) { console.error('  ❌  ' + name + '\n       ' + err.message); failed++; }
}
function expectAutofillEnabled(props) {
  assert.notEqual(props.autoComplete, 'off');
  assert.notEqual(props['data-1p-ignore'], true);
  assert.ok(props.name);
  assert.ok(props.autoComplete);
}
function expectAutofillBlocked(props) {
  assert.equal(props.autoComplete, 'off');
  assert.equal(props['data-1p-ignore'], true);
  assert.equal(props['data-form-type'], 'other');
}

describe('primitives/input.tsx — disableAutofill forwarded correctly', () => {
  it('defaults to false — no blocking on plain <Input>', () => {
    expectAutofillEnabled(resolveRenderedInputProps({ name: 'email', autoComplete: 'email' }));
  });
  it('disableAutofill=false — caller autoComplete wins', () => {
    const r = resolveRenderedInputProps({ name: 'password', autoComplete: 'current-password' }, false);
    assert.equal(r.autoComplete, 'current-password');
    assert.equal(r['data-1p-ignore'], undefined);
  });
  it('disableAutofill=true — block applied (workflow/integrations)', () => {
    expectAutofillBlocked(resolveRenderedInputProps({ name: 'workflowName' }, true));
  });
});

describe('better-auth/sign-in.tsx', () => {
  it('email: name="email" autoComplete="email"', () => {
    const r = resolveRenderedInputProps({ name: 'email', autoComplete: 'email' });
    assert.equal(r.name, 'email'); assert.equal(r.autoComplete, 'email');
    expectAutofillEnabled(r);
  });
  it('password: name="password" autoComplete="current-password"', () => {
    const r = resolveRenderedInputProps({ name: 'password', autoComplete: 'current-password' });
    assert.equal(r.autoComplete, 'current-password');
    expectAutofillEnabled(r);
  });
});

describe('better-auth/sign-up.tsx', () => {
  it('firstName: autoComplete="given-name"', () => {
    expectAutofillEnabled(resolveRenderedInputProps({ name: 'firstName', autoComplete: 'given-name' }));
  });
  it('lastName: autoComplete="family-name"', () => {
    expectAutofillEnabled(resolveRenderedInputProps({ name: 'lastName', autoComplete: 'family-name' }));
  });
  it('email: autoComplete="email"', () => {
    expectAutofillEnabled(resolveRenderedInputProps({ name: 'email', autoComplete: 'email' }));
  });
  it('password: autoComplete="new-password" (triggers browser save prompt)', () => {
    const r = resolveRenderedInputProps({ name: 'password', autoComplete: 'new-password' });
    assert.equal(r.autoComplete, 'new-password');
    expectAutofillEnabled(r);
  });
});

describe('self-hosted/components.tsx — attrs unblocked by input.tsx fix', () => {
  it('sign-in email reaches DOM', () => {
    const r = resolveRenderedInputProps({ name: 'email', autoComplete: 'email' });
    assert.equal(r.autoComplete, 'email'); assert.equal(r['data-1p-ignore'], undefined);
  });
  it('sign-in password reaches DOM', () => {
    expectAutofillEnabled(resolveRenderedInputProps({ name: 'password', autoComplete: 'current-password' }));
  });
  it('sign-up password reaches DOM', () => {
    expectAutofillEnabled(resolveRenderedInputProps({ name: 'password', autoComplete: 'new-password' }));
  });
  it('organizationName reaches DOM', () => {
    expectAutofillEnabled(resolveRenderedInputProps({ name: 'organizationName', autoComplete: 'organization' }));
  });
});

describe('Non-regression — workflow/integrations stay blocked', () => {
  it('workflow name blocked', () => { expectAutofillBlocked(resolveRenderedInputProps({ name: 'workflowName' }, true)); });
  it('workflow identifier blocked', () => { expectAutofillBlocked(resolveRenderedInputProps({ name: 'workflowIdentifier' }, true)); });
  it('integration apiKey blocked', () => { expectAutofillBlocked(resolveRenderedInputProps({ name: 'apiKey' }, true)); });
});

describe('BEFORE fix simulation', () => {
  it('BEFORE: email gets autoComplete="off"', () => {
    assert.equal(resolveRenderedInputProps_BEFORE_FIX({}).autoComplete, 'off');
  });
  it('AFTER: autoComplete="email" now reaches DOM', () => {
    const r = resolveRenderedInputProps({ name: 'email', autoComplete: 'email' }, false);
    assert.equal(r.autoComplete, 'email'); assert.equal(r['data-1p-ignore'], undefined);
  });
});

console.log('\n' + '─'.repeat(50));
if (failed === 0) { console.log('✅  All ' + passed + ' tests passed'); }
else { console.log('❌  ' + failed + ' failed, ' + passed + ' passed'); process.exit(1); }
