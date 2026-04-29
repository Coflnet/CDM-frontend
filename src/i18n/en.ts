export default {
  brand: {
    name: 'Leitl CDM',
    short: 'CDM',
    sub: 'Container & Skip Management',
    by: 'Coflnet for Leitl',
  },
  nav: {
    apiTokens: 'API tokens',
    role: 'Role',
    logout: 'Sign out',
    info: 'Learn more',
    home: 'Home',
  },
  language: {
    label: 'Language',
    de: 'Deutsch',
    en: 'English',
  },
  landing: {
    headline: 'Order a skip. Get rid of debris. Stay on schedule.',
    intro:
      'With Leitl CDM you order the right container online, see drop-off and pick-up windows, and keep every document in one place. Your local container service in Eggenfelden – now digital.',
    bullets: {
      order: {
        title: 'Order containers online',
        text: 'Skip, roll-off, or special size – enter the postcode, pick a size, done.',
      },
      pickup: {
        title: 'Live pick-up status',
        text: 'See when the truck arrives and who is driving – with weighbridge ticket as PDF.',
      },
      sustain: {
        title: 'Recycling on record',
        text: 'Mixed waste, wood, debris – every trip is logged and exportable for compliance.',
      },
    },
    cta: {
      login: 'Sign in',
      signup: 'Create account',
      learnMore: 'How the portal works',
      forCompanies: 'Run a container service yourself?',
    },
  },
  auth: {
    loginTab: 'Sign in',
    signupTab: 'Sign up',
    email: 'Email',
    emailPh: 'name@company.com',
    password: 'Password',
    passwordPh: '••••••••',
    passwordSignupPh: 'At least 6 characters',
    confirmPassword: 'Confirm password',
    submitLogin: 'Sign in',
    submitSignup: 'Create account',
    pleaseWait: 'Please wait...',
    haveAccount: 'Already have an account?',
    noAccount: 'No account yet?',
    switchToSignup: 'Sign up now',
    switchToLogin: 'Sign in',
    errors: {
      empty: 'Please enter email and password.',
      mismatch: 'Passwords do not match.',
      tooShort: 'Password must be at least 6 characters.',
      invalidCredential: 'Email or password incorrect.',
      emailInUse: 'This email address is already registered.',
      invalidEmail: 'Invalid email address.',
      tooManyRequests: 'Too many attempts. Please try again later.',
      network: 'Network error. Please check your connection.',
      registrationDisabled: 'Registration is currently disabled. Please contact your administrator.',
      genericLogin: 'Sign-in failed',
      genericSignup: 'Sign-up failed',
    },
  },
  roles: {
    admin: 'Administration',
    driver: 'Driver',
    customer: 'Customer portal',
    pickHint: 'Granted by the backend',
    noneYet: 'No company role assigned yet',
    inactiveHint:
      'Your account is active. A super-admin can now assign your email to a company as admin or driver.',
  },
  apiTokens: {
    title: 'API tokens',
    name: 'Name',
    namePh: 'e.g. ERP integration',
    create: 'Create token (1 year)',
    validUntil: 'Valid until {date}',
    revoke: 'Revoke',
    revoked: 'Revoked',
    loadError: 'Could not load API tokens.',
    createError: 'Could not create API token.',
    revokeError: 'Could not revoke API token.',
  },
  info: {
    title: 'How does Leitl CDM work?',
    intro:
      'The Leitl Container & Skip Management portal (CDM) is the digital hub between site managers, dispatch and drivers. It solves three problems at once: ordering, route planning and compliance documentation.',
    sections: {
      customer: {
        title: 'For site managers and businesses',
        body:
          'Order a container by postcode, confirm the location on the map, get the weighbridge ticket automatically. No phone tag, no lost paperwork.',
      },
      dispatch: {
        title: 'For dispatch',
        body:
          'Jobs sorted by region and size, route planning with live ETA, and an interface to your existing weighbridge software. One screen instead of five Excel sheets.',
      },
      driver: {
        title: 'For drivers',
        body:
          'Stop list on the tablet, photos and signature attached to the job, automatic weight notification to dispatch. Works even on patchy mobile coverage.',
      },
    },
    forCompanies: {
      title: 'Run a different container service?',
      body:
        'CDM is built as a white-label platform. If you are a regional container service (like Leitl GmbH in Eggenfelden) and want to digitise ordering, dispatch and documentation, get in touch.',
      contact: 'Get in touch',
    },
    back: 'Back to sign-in',
  },
  common: {
    loading: 'Please wait...',
    close: 'Close',
  },
}
