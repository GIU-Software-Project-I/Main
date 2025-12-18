'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';

// Password strength indicator component
function PasswordStrength({ password }: { password: string }) {
  const calculateStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 4);
  };

  const strength = calculateStrength(password);

  const strengthColors = [
    'bg-destructive',     // 0-1: Weak
    'bg-destructive',     // 1: Weak
    'bg-amber-500',       // 2: Fair
    'bg-blue-500',        // 3: Good
    'bg-green-500',       // 4: Strong
  ];

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${level <= strength ? strengthColors[strength] : 'bg-muted'
              }`}
          />
        ))}
      </div>
      <p className={`text-xs ${strength <= 1 ? 'text-destructive' : strength === 2 ? 'text-amber-600' : strength === 3 ? 'text-blue-600' : 'text-green-600'}`}>
        {strengthLabels[strength]}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const { register, isLoading, error: authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    email: '',
    mobilePhone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  // Clear errors when component mounts or unmounts
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  const displayError = localError || authError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (localError) setLocalError('');
    if (authError) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.nationalId || !formData.mobilePhone) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }

    if (!formData.agreeToTerms) {
      setLocalError('You must agree to the terms and conditions');
      return;
    }

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      nationalId: formData.nationalId,
      email: formData.email,
      password: formData.password,
      mobilePhone: formData.mobilePhone,
    });

    if (result) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Registration Successful!</h2>
            <p className="text-muted-foreground mb-4">Your account has been created. Redirecting to your dashboard...</p>
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-xl">HR</span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Create an account</h1>
          <p className="mt-2 text-muted-foreground">Join our HR platform as a candidate</p>
        </div>

        {/* Register Form */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          {displayError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1.5">
                  First name *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground 
                    placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring 
                    focus:border-transparent transition-all"
                  placeholder="Ahmed"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1.5">
                  Last name *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground 
                    placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring 
                    focus:border-transparent transition-all"
                  placeholder="Hassan"
                />
              </div>
            </div>

            <div>
              <label htmlFor="nationalId" className="block text-sm font-medium text-foreground mb-1.5">
                National ID *
              </label>
              <input
                id="nationalId"
                name="nationalId"
                type="text"
                value={formData.nationalId}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground 
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring 
                  focus:border-transparent transition-all"
                placeholder="ID123456789"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground 
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring 
                  focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="mobilePhone" className="block text-sm font-medium text-foreground mb-1.5">
                Mobile Phone *
              </label>
              <input
                id="mobilePhone"
                name="mobilePhone"
                type="tel"
                autoComplete="tel"
                value={formData.mobilePhone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground 
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring 
                  focus:border-transparent transition-all"
                placeholder="+20 123 456 7890"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground 
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring 
                  focus:border-transparent transition-all"
                placeholder="At least 6 characters"
              />
              <PasswordStrength password={formData.password} />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                Confirm password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground 
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring 
                  focus:border-transparent transition-all"
                placeholder="Confirm your password"
              />
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="agreeToTerms"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-primary border-input rounded focus:ring-ring bg-background"
              />
              <label htmlFor="agreeToTerms" className="ml-2 text-sm text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium 
                rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </div>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
