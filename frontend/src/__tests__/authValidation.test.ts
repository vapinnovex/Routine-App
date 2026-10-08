import { validateAuth } from '../services/authValidation';

const valid = { name: '  Alex  ', email: '  alex@example.com  ', password: 'a good phrase' };

describe('account form validation', () => {
  it('accepts a complete registration with surrounding name/email whitespace', () => {
    expect(validateAuth('register', valid)).toEqual({});
  });
  it('explains each missing registration field instead of silently blocking submission', () => {
    expect(Object.keys(validateAuth('register', { name: ' ', email: '', password: '' }))).toEqual(['name', 'email', 'password']);
  });
  it('enforces registration password boundaries without changing login requirements', () => {
    expect(validateAuth('register', { ...valid, password: '123456789' }).password).toBeDefined();
    expect(validateAuth('register', { ...valid, password: '1234567890' })).toEqual({});
    expect(validateAuth('register', { ...valid, password: 'x'.repeat(129) }).password).toBeDefined();
    expect(validateAuth('login', { ...valid, name: '', password: 'short' })).toEqual({});
  });
  it('explains invalid email addresses', () => {
    expect(validateAuth('register', { ...valid, email: 'alex@' }).email).toBeDefined();
  });
});
