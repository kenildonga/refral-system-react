import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  User,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { formatApiError } from '../../lib/api';
import { listCities, listStates } from '../../services/location.service';
import { getAgentProfile } from '../../services/agents.service';
import { assignAgent, createUser, listAgentsByLocation } from '../../services/users.service';
import type { Agent, ApiError, City, ReferralUser, State } from '../../types/api';
import { formatAgentName } from '../../types/api';

type Step = 'profile' | 'location' | 'agent' | 'success';

const STEPS: { id: Step; labelKey: string; fallback: string; icon: typeof User }[] = [
  { id: 'profile', labelKey: 'register.step_profile', fallback: 'Your details', icon: User },
  { id: 'location', labelKey: 'register.step_location', fallback: 'Location', icon: MapPin },
  { id: 'agent', labelKey: 'register.step_agent', fallback: 'Choose agent', icon: Users },
];

const AGENT_PORTAL_STEPS = STEPS.filter((s) => s.id !== 'agent');

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

const RegisterUser = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAgentPortal = user?.role === 'agent';

  const [step, setStep] = useState<Step>('profile');
  const [submitting, setSubmitting] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const [createdUser, setCreatedUser] = useState<ReferralUser | null>(null);
  const [assignedUser, setAssignedUser] = useState<ReferralUser | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [formStateId, setFormStateId] = useState('');
  const [formCityId, setFormCityId] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agentProfile, setAgentProfile] = useState<Agent | null>(null);
  const [loadingAgentProfile, setLoadingAgentProfile] = useState(false);

  const locationLocked = isAgentPortal && !!agentProfile?.state && !!agentProfile?.city;

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchStates = useCallback(async () => {
    try {
      const data = await listStates();
      setStates(data);
    } catch (error) {
      toast.error(formatApiError(error as ApiError));
    }
  }, []);

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  useEffect(() => {
    if (!isAgentPortal) return;
    let cancelled = false;
    setLoadingAgentProfile(true);
    getAgentProfile()
      .then((profile) => {
        if (!cancelled) setAgentProfile(profile);
      })
      .catch((error) => {
        if (!cancelled) toast.error(formatApiError(error as ApiError));
      })
      .finally(() => {
        if (!cancelled) setLoadingAgentProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAgentPortal]);

  useEffect(() => {
    if (!isAgentPortal || !agentProfile?.state || states.length === 0) return;
    const matchedState = states.find((s) => s.name === agentProfile.state);
    if (matchedState) {
      setFormStateId(String(matchedState.id));
    }
  }, [isAgentPortal, agentProfile, states]);

  useEffect(() => {
    if (!isAgentPortal || !agentProfile?.city || cities.length === 0) return;
    const matchedCity = cities.find((c) => c.name === agentProfile.city);
    if (matchedCity) {
      setFormCityId(String(matchedCity.id));
    }
  }, [isAgentPortal, agentProfile, cities]);

  useEffect(() => {
    if (!formStateId) {
      setCities([]);
      setFormCityId('');
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    listCities(Number(formStateId))
      .then((data) => {
        if (!cancelled) setCities(data);
      })
      .catch((error) => {
        if (!cancelled) toast.error(formatApiError(error as ApiError));
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formStateId]);

  const validateProfile = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = t('register.err_first_name', 'First name is required');
    if (!lastName.trim()) errors.lastName = t('register.err_last_name', 'Last name is required');
    if (!/^\d{10}$/.test(phoneNumber)) {
      errors.phoneNumber = t(
        'register.err_phone',
        'Phone number must be exactly 10 digits',
      );
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('register.err_email', 'Valid email is required');
    }
    if (!password.trim()) {
      errors.password = t('register.err_password_required', 'Password is required');
    } else if (
      password.length < 8 ||
      !/[a-zA-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      errors.password = t(
        'register.err_password_rules',
        'Password must be at least 8 characters and include letters and numbers',
      );
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateProfile()) return;

    if (createdUser) {
      setStep('location');
      return;
    }

    setSubmitting(true);
    try {
      const user = await createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber,
        email: email.trim(),
        password,
      });
      setCreatedUser(user);
      setStep('location');
      toast.success(t('register.profile_saved', 'Profile saved'));
    } catch (error) {
      toast.error(formatApiError(error as ApiError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationContinue = async () => {
    if (!formStateId || !formCityId) {
      toast.error(t('register.select_location', 'Please select state and city'));
      return;
    }

    if (isAgentPortal && user?.id && createdUser) {
      setSubmitting(true);
      try {
        const result = await assignAgent(createdUser.id, {
          agentId: user.id,
          stateId: Number(formStateId),
          cityId: Number(formCityId),
        });
        setAssignedUser(result);
        setStep('success');
        toast.success(t('register.success', 'Registration completed successfully'));
      } catch (error) {
        toast.error(formatApiError(error as ApiError));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setStep('agent');
    setLoadingAgents(true);
    setSelectedAgentId('');
    try {
      const data = await listAgentsByLocation(Number(formStateId), Number(formCityId));
      setAgents(data);
    } catch (error) {
      toast.error(formatApiError(error as ApiError));
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!createdUser || !selectedAgentId || !formStateId || !formCityId) return;

    setSubmitting(true);
    try {
      const result = await assignAgent(createdUser.id, {
        agentId: selectedAgentId,
        stateId: Number(formStateId),
        cityId: Number(formCityId),
      });
      setAssignedUser(result);
      setStep('success');
      toast.success(t('register.success', 'Registration completed successfully'));
    } catch (error) {
      toast.error(formatApiError(error as ApiError));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedState = states.find((s) => s.id === Number(formStateId));
  const selectedCity = cities.find((c) => c.id === Number(formCityId));
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const assignedAgentDisplay = isAgentPortal ? agentProfile : selectedAgent;

  const visibleSteps = isAgentPortal ? AGENT_PORTAL_STEPS : STEPS;
  const stepIndex = visibleSteps.findIndex((s) => s.id === step);

  const goBack = () => {
    if (step === 'location') setStep('profile');
    else if (step === 'agent') setStep('location');
  };

  const exitPath = isAgentPortal ? '/agent/dashboard' : '/choose-login';

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(exitPath)}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors"
          >
            <ArrowLeft size={16} />
            {t('register.back', 'Back')}
          </button>
          <Badge variant="primary">{t('register.badge', 'Referral registration')}</Badge>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">
            {t('register.title', 'User Registration')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t(
              'register.subtitle',
              'Complete your profile, choose your location, and connect with a referral agent.',
            )}
          </p>
        </div>

        {step !== 'success' && (
          <div className="flex items-center gap-2">
            {visibleSteps.map((s, index) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = stepIndex > index;
              return (
                <div key={s.id} className="flex flex-1 items-center gap-2 min-w-0">
                  <div
                    className={`flex items-center justify-center size-8 shrink-0 rounded-full border text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-primary bg-primary text-background'
                        : isDone
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  </div>
                  <span
                    className={`hidden sm:block text-xs truncate ${
                      isActive ? 'text-text font-medium' : 'text-text-secondary'
                    }`}
                  >
                    {t(s.labelKey, s.fallback)}
                  </span>
                  {index < visibleSteps.length - 1 && (
                    <div className="hidden sm:block flex-1 h-px bg-border ml-1" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 'profile' && (
          <Card>
            <CardContent className="space-y-4 pt-2">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('register.first_name', 'First name')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    error={fieldErrors.firstName}
                    required
                    disabled={submitting}
                  />
                  <Input
                    label={t('register.last_name', 'Last name')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    error={fieldErrors.lastName}
                    required
                    disabled={submitting}
                  />
                </div>
                <Input
                  label={t('register.phone', 'Phone number')}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(normalizePhone(e.target.value))}
                  placeholder="9876543210"
                  inputMode="numeric"
                  maxLength={10}
                  error={fieldErrors.phoneNumber}
                  required
                  disabled={submitting}
                />
                <Input
                  label={t('register.email', 'Email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={fieldErrors.email}
                  required
                  disabled={submitting}
                />
                <Input
                  label={t('register.password', 'Password')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(
                    'register.password_hint',
                    'Minimum 8 characters with letters and numbers',
                  )}
                  error={fieldErrors.password}
                  required
                  disabled={submitting}
                />
                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={submitting} className="gap-2">
                    {t('register.continue', 'Continue')}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'location' && (
          <Card>
            <CardContent className="space-y-4 pt-2">
              {createdUser && (
                <div className="rounded-lg border border-border bg-surface/50 p-3 text-sm">
                  <p className="text-text-secondary">{t('register.registered_as', 'Registered as')}</p>
                  <p className="font-medium text-text mt-0.5">
                    {createdUser.firstName} {createdUser.lastName} · {createdUser.phoneNumber}
                  </p>
                </div>
              )}
              {isAgentPortal && agentProfile && (
                <p className="text-sm text-text-secondary bg-surface/50 border border-border rounded-lg px-3 py-2">
                  {t('register.agent_self_assign', 'You will be assigned as the referral agent')}:{' '}
                  <span className="text-text font-medium">{formatAgentName(agentProfile)}</span>
                </p>
              )}
              {locationLocked && (
                <p className="text-sm text-text-secondary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  {t(
                    'register.agent_location_locked',
                    'Location is set to your registered service area.',
                  )}
                </p>
              )}
              <Select
                label={t('register.state', 'State')}
                value={formStateId}
                onChange={(e) => {
                  setFormStateId(e.target.value);
                  setFormCityId('');
                }}
                options={[
                  {
                    value: '',
                    label:
                      loadingAgentProfile
                        ? t('common.loading', 'Loading...')
                        : states.length === 0
                          ? t('register.no_states', 'No states available')
                          : t('register.select_state', 'Select state'),
                  },
                  ...states.map((s) => ({ value: s.id, label: `${s.name} (${s.stateCode})` })),
                ]}
                disabled={locationLocked || loadingAgentProfile || states.length === 0}
                required
              />
              <Select
                label={t('register.city', 'City')}
                value={formCityId}
                onChange={(e) => setFormCityId(e.target.value)}
                options={[
                  {
                    value: '',
                    label: !formStateId
                      ? t('register.select_state_first', 'Select state first')
                      : loadingCities
                        ? t('common.loading', 'Loading...')
                        : cities.length === 0
                          ? t('register.no_cities', 'No cities available')
                          : t('register.select_city', 'Select city'),
                  },
                  ...cities.map((c) => ({ value: c.id, label: c.name })),
                ]}
                disabled={locationLocked || !formStateId || loadingCities}
                required
              />
              <div className="flex justify-between pt-2">
                <Button type="button" variant="secondary" onClick={goBack}>
                  {t('register.back_step', 'Back')}
                </Button>
                <Button
                  type="button"
                  onClick={handleLocationContinue}
                  isLoading={submitting}
                  className="gap-2"
                >
                  {isAgentPortal
                    ? t('register.complete', 'Complete registration')
                    : t('register.continue', 'Continue')}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'agent' && !isAgentPortal && (
          <Card>
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-lg border border-border bg-surface/50 p-3 text-sm text-text-secondary">
                {t('register.location_summary', 'Location')}:{' '}
                <span className="text-text font-medium">
                  {selectedCity?.name}, {selectedState?.name}
                </span>
              </div>

              {loadingAgents ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Users className="mx-auto mb-3 text-text-secondary/40" size={40} />
                  <p className="text-text font-medium">
                    {t('register.no_agents', 'No agents available in this location')}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {t('register.no_agents_hint', 'Try a different city or contact support.')}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={() => setStep('location')}
                  >
                    {t('register.change_location', 'Change location')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">
                    {t('register.select_agent', 'Select your referral agent')}
                  </p>
                  {agents.map((agent) => {
                    const selected = selectedAgentId === agent.id;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(212,160,23,0.15)]'
                            : 'border-border bg-surface/40 hover:border-primary/30 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-text">{formatAgentName(agent)}</p>
                            <p className="text-xs text-text-secondary mt-0.5 font-mono">
                              {agent.agentLoginId}
                            </p>
                            {(agent.phoneNumber || agent.email) && (
                              <p className="text-xs text-text-secondary mt-1">
                                {[agent.phoneNumber, agent.email].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          {selected && (
                            <CheckCircle2 className="shrink-0 text-primary" size={20} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {agents.length > 0 && (
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="secondary" onClick={goBack}>
                    {t('register.back_step', 'Back')}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAssignAgent}
                    isLoading={submitting}
                    disabled={!selectedAgentId}
                  >
                    {t('register.complete', 'Complete registration')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'success' && assignedUser && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/15 border border-success/30">
                <CheckCircle2 className="text-success" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">
                  {t('register.success_title', 'Registration complete')}
                </h2>
                <p className="text-sm text-text-secondary mt-2">
                  {t(
                    'register.success_desc',
                    'You have been successfully registered and assigned to an agent.',
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface/50 p-4 text-left text-sm space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-text-secondary">{t('register.name', 'Name')}</span>
                  <span className="text-text font-medium">
                    {assignedUser.firstName} {assignedUser.lastName}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-secondary">{t('register.phone', 'Phone')}</span>
                  <span className="text-text font-medium">{assignedUser.phoneNumber}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-secondary">{t('register.location_summary', 'Location')}</span>
                  <span className="text-text font-medium text-right">
                    {selectedCity?.name}, {selectedState?.name}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-secondary">{t('register.agent', 'Agent')}</span>
                  <span className="text-text font-medium text-right">
                    {assignedAgentDisplay ? formatAgentName(assignedAgentDisplay) : '—'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-text-secondary bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                {t(
                  'register.agent_contact_note',
                  'Your assigned agent will contact you as soon as possible.',
                )}
              </p>
              <Button onClick={() => navigate(exitPath)} className="w-full sm:w-auto">
                {isAgentPortal
                  ? t('register.back_dashboard', 'Back to dashboard')
                  : t('register.done', 'Done')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RegisterUser;
