export type AuthFields = { name: string; email: string; password: string };
export type AuthErrors = Partial<Record<keyof AuthFields, string>>;

export function validateAuth(mode: 'login' | 'register', fields: AuthFields): AuthErrors {
  const errors: AuthErrors = {};
  if (mode === 'register' && !fields.name.trim()) errors.name = 'Enter your name.';
  if (!fields.email.trim()) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = 'Enter a valid email address, like you@example.com.';
  if (!fields.password) errors.password = 'Enter your password.';
  else if (mode === 'register' && fields.password.length < 10) errors.password = 'Use at least 10 characters for your password.';
  else if (fields.password.length > 128) errors.password = 'Use no more than 128 characters.';
  return errors;
}
