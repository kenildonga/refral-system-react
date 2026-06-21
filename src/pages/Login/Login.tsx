import React, { useState, FormEvent, useEffect } from 'react';
import { Mail, Lock, ArrowLeft, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDashboardPath } from '../../lib/roles';

type LoginFieldErrors = {
  identifier?: string;
  password?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

const Login = () => {
  const { login, isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;
  let portal: 'admin' | 'agent' | 'withdrawal' = 'admin';
  let title = 'Admin Portal';
  let identifierLabel = 'Email address';
  let identifierType: 'email' | 'text' = 'email';
  let identifierPlaceholder = 'admin@example.com';
  let demoHint = 'superadmin@test.com / superpassword123';

  if (path.includes('agent')) {
    portal = 'agent';
    title = 'Agent Portal';
    identifierLabel = 'Agent Login ID';
    identifierType = 'text';
    identifierPlaceholder = 'AGT-XXXXXX';
    demoHint = 'Use credentials provided when your agent account was created';
  } else if (path.includes('withdrawal')) {
    portal = 'withdrawal';
    title = 'User Withdrawal Portal';
    identifierLabel = 'Phone number';
    identifierType = 'text';
    identifierPlaceholder = '9876543210';
    demoHint = 'Use your registered phone number and password';
  }

  useEffect(() => {
    if (portal === 'admin') {
      setIdentifier('superadmin@test.com');
    } else {
      setIdentifier('');
    }
  }, [portal]);

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  const getIdentifierError = (value: string): string | undefined => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return `${identifierLabel} is required`;
    }

    if (portal === 'admin' && !EMAIL_REGEX.test(trimmedValue)) {
      return 'Enter a valid email address';
    }

    if (portal === 'withdrawal' && !PHONE_REGEX.test(trimmedValue)) {
      return 'Phone number must be exactly 10 digits';
    }

    return undefined;
  };

  const validateLoginForm = (): boolean => {
    const nextErrors: LoginFieldErrors = {};
    const identifierError = getIdentifierError(identifier);
    const trimmedPassword = password.trim();

    if (identifierError) {
      nextErrors.identifier = identifierError;
    }

    if (!trimmedPassword) {
      nextErrors.password = 'Password is required';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleIdentifierChange = (value: string) => {
    const nextValue =
      portal === 'withdrawal' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setIdentifier(nextValue);
    setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setFieldErrors((prev) => ({ ...prev, password: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    const normalizedIdentifier =
      portal === 'withdrawal'
        ? identifier.replace(/\D/g, '')
        : identifier.trim();

    setIsLoading(true);
    try {
      await login(normalizedIdentifier, password.trim(), portal);
      toast.success('Successfully logged in!');
      navigate(getDashboardPath(portal === 'admin' ? 'admin' : portal));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const IdentifierIcon = portal === 'agent' ? User : portal === 'withdrawal' ? Phone : Mail;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-[100px]"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <button
          onClick={() => navigate('/choose-login')}
          className="absolute left-0 top-2 p-2 text-text-secondary hover:text-text transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex justify-center mb-6 mt-10">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-background font-bold text-3xl shadow-[0_0_20px_rgba(212,160,23,0.4)]">
            A
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-text tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-primary/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label={identifierLabel}
              type={identifierType}
              placeholder={identifierPlaceholder}
              icon={IdentifierIcon}
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              inputMode={portal === 'withdrawal' ? 'numeric' : undefined}
              maxLength={portal === 'withdrawal' ? 10 : undefined}
              pattern={portal === 'withdrawal' ? '\\d{10}' : undefined}
              autoComplete={portal === 'admin' ? 'email' : 'username'}
              error={fieldErrors.identifier}
              required
              disabled={isLoading}
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                autoComplete="current-password"
                error={fieldErrors.password}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              className="mt-6"
            >
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-text-secondary/60">
            <p>
              {portal === 'admin' && 'API credentials (after seed):'}
              <br />
              {demoHint}
            </p>
            {portal === 'agent' && (
              <p className="mt-3 text-sm text-text-secondary">
                {t('agent.signup.new_agent', 'New agent?')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/agent/sign-up')}
                  className="text-primary hover:underline font-medium"
                >
                  {t('agent.signup.link', 'Sign up')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
