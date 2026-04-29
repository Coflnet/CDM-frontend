export default {
  brand: {
    name: 'Leitl CDM',
    short: 'CDM',
    sub: 'Container- & Mulden-Management',
    by: 'Coflnet für Leitl',
  },
  nav: {
    apiTokens: 'API Token',
    role: 'Rolle',
    logout: 'Abmelden',
    info: 'Mehr erfahren',
    home: 'Start',
  },
  language: {
    label: 'Sprache',
    de: 'Deutsch',
    en: 'English',
  },
  landing: {
    headline: 'Container ordern. Bauschutt loswerden. Termin halten.',
    intro:
      'Mit dem Leitl CDM bestellen Sie online einen passenden Container, sehen Standzeit und Voll-/Leertermine und behalten alle Dokumente an einem Ort. Ihr Containerdienst aus Eggenfelden – jetzt digital.',
    bullets: {
      order: {
        title: 'Container online bestellen',
        text: 'Mulde, Abrollcontainer oder Sonderformat – PLZ eingeben, Größe wählen, fertig.',
      },
      pickup: {
        title: 'Abholung in Echtzeit',
        text: 'Sie sehen, wann der LKW kommt und wer fährt – inklusive Wiegeschein als PDF.',
      },
      sustain: {
        title: 'Recycling dokumentiert',
        text: 'Bauschutt, Holz, Mischabfall – jede Tour wird sauber erfasst und exportierbar abgelegt.',
      },
    },
    cta: {
      login: 'Anmelden',
      signup: 'Konto erstellen',
      learnMore: 'Wie das Portal funktioniert',
      forCompanies: 'Sie sind ein Containerdienst?',
    },
  },
  auth: {
    loginTab: 'Anmelden',
    signupTab: 'Registrieren',
    email: 'E-Mail',
    emailPh: 'name@firma.de',
    password: 'Passwort',
    passwordPh: '••••••••',
    passwordSignupPh: 'Mindestens 6 Zeichen',
    confirmPassword: 'Passwort bestätigen',
    submitLogin: 'Anmelden',
    submitSignup: 'Konto erstellen',
    pleaseWait: 'Bitte warten...',
    haveAccount: 'Bereits ein Konto?',
    noAccount: 'Noch kein Konto?',
    switchToSignup: 'Jetzt registrieren',
    switchToLogin: 'Anmelden',
    errors: {
      empty: 'Bitte E-Mail und Passwort eingeben.',
      mismatch: 'Passwörter stimmen nicht überein.',
      tooShort: 'Passwort muss mindestens 6 Zeichen lang sein.',
      invalidCredential: 'E-Mail oder Passwort falsch.',
      emailInUse: 'Diese E-Mail-Adresse ist bereits registriert.',
      invalidEmail: 'Ungültige E-Mail-Adresse.',
      tooManyRequests: 'Zu viele Versuche. Bitte später nochmal versuchen.',
      network: 'Netzwerkfehler. Bitte Verbindung prüfen.',
      registrationDisabled: 'Registrierung ist derzeit nicht aktiviert. Bitte den Administrator kontaktieren.',
      genericLogin: 'Anmeldung fehlgeschlagen',
      genericSignup: 'Registrierung fehlgeschlagen',
    },
  },
  roles: {
    admin: 'Administration',
    driver: 'Fahrer',
    customer: 'Kundenportal',
    pickHint: 'Vom Backend freigeschaltet',
    noneYet: 'Noch keine Firmenrolle zugewiesen',
    inactiveHint:
      'Dein Konto ist aktiv. Ein Super-Admin kann deine E-Mail jetzt einer Firma als Admin oder Fahrer zuweisen.',
  },
  apiTokens: {
    title: 'API Token',
    name: 'Name',
    namePh: 'z. B. ERP Integration',
    create: 'Token für 1 Jahr erstellen',
    validUntil: 'Gültig bis {date}',
    revoke: 'Widerrufen',
    revoked: 'Widerrufen',
    loadError: 'API-Token konnten nicht geladen werden.',
    createError: 'API-Token konnte nicht erstellt werden.',
    revokeError: 'API-Token konnte nicht widerrufen werden.',
  },
  info: {
    title: 'Wie funktioniert das Leitl CDM?',
    intro:
      'Das Leitl Container- & Mulden-Management-Portal (kurz CDM) ist die digitale Schaltzentrale zwischen Bauherren, Disposition und Fahrern. Wir lösen damit drei Probleme gleichzeitig: Bestellung, Tourenplanung und Nachweispflicht.',
    sections: {
      customer: {
        title: 'Für Bauherren und Gewerbekunden',
        body:
          'Container per Postleitzahl bestellen, Standort auf der Karte bestätigen, Wiegeschein automatisch erhalten. Kein Telefon-Pingpong, keine verlorenen Lieferscheine.',
      },
      dispatch: {
        title: 'Für die Disposition',
        body:
          'Aufträge nach Region und Größe sortiert, Tourenplanung mit Echtzeit-ETA, Schnittstelle zur bestehenden Wiegesoftware. Eine Oberfläche statt fünf Excel-Listen.',
      },
      driver: {
        title: 'Für die Fahrer',
        body:
          'Stop-Liste auf dem Tablet, Fotos und Unterschrift direkt im Auftrag, automatische Wiegungsmeldung an die Disposition. Funktioniert auch bei schlechter Netzabdeckung.',
      },
    },
    containers: {
      title: 'Welche Container gibt es?',
      body:
        'Vom 3 m³ Mini-Absetzcontainer für schweren Bauschutt bis zum 36 m³ Abrollcontainer für Sperrmüll oder Folien – das Sortiment deckt typische Bau- und Entrümpelungsprojekte ab. Variante mit Deckel, wenn Inhalt vor Regen geschützt werden soll.',
    },
    forCompanies: {
      title: 'Sie sind ein anderer Containerdienst?',
      body:
        'CDM ist als Whitelabel-Plattform aufgebaut. Wenn Sie als regional verwurzelter Containerdienst (wie die Leitl GmbH in Eggenfelden) Ihre Bestellung, Disposition und Dokumentation digitalisieren wollen, melden Sie sich gerne.',
      contact: 'Kontakt aufnehmen',
    },
    back: 'Zurück zur Anmeldung',
  },
  common: {
    loading: 'Bitte warten...',
    close: 'Schließen',
  },
}
