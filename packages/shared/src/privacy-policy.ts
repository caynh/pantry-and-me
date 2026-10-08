export const PRIVACY_POLICY_UPDATED = 'September 30, 2026';

export interface PrivacyBullet {
  label: string;
  text: string;
}

export interface PrivacySection {
  title: string;
  paragraphs?: string[];
  bullets?: PrivacyBullet[];
}

export const PRIVACY_POLICY_INTRO =
  'This policy describes how the pantry&me mobile app handles information when you create an account, keep a pantry, scan food, or search for recipes. It is the policy linked from the app and from the App Store listing.';

export const PRIVACY_POLICY_SECTIONS: PrivacySection[] = [
  {
    title: 'Information the app collects',
    bullets: [
      {
        label: 'Account',
        text: 'If you sign up with email, we store that email and a password hash. If you use Sign in with Apple or Google, we store the identifier those services give us, and the email or name they share. Continuing without an account still creates an anonymous account so your pantry can sync.',
      },
      {
        label: 'Pantry',
        text: 'Ingredient names, quantities, storage location, expiration dates, notes, dietary choices, foods you exclude, and recipes you save.',
      },
      {
        label: 'Photos you submit for scanning',
        text: 'A photo of your fridge, pantry, or a package is sent so the app can suggest ingredients. You choose what is added.',
      },
      {
        label: 'Barcodes you scan or type',
        text: 'The code is looked up to suggest a product name.',
      },
      {
        label: 'Recipe searches',
        text: 'The ingredient names you search with, plus dietary filters, are sent to find recipe articles.',
      },
    ],
    paragraphs: [
      'Expiration reminders are scheduled on your device. Those notifications are not sent to our servers.',
    ],
  },
  {
    title: 'How photos are handled',
    paragraphs: [
      'The camera and photo library are used only to identify food in a picture you take or choose. pantry&me does not keep a copy of that photo. The image is forwarded to OpenAI to read visible food names, and OpenAI’s handling of that image is covered by OpenAI’s privacy terms. The app does not use the microphone.',
    ],
  },
  {
    title: 'Services that process data',
    bullets: [
      { label: 'Supabase', text: 'stores your account and pantry.' },
      { label: 'OpenAI', text: 'reads photos you submit for ingredient scanning.' },
      { label: 'SerpApi', text: 'runs the recipe search against web results.' },
      {
        label: 'Open Food Facts',
        text: 'looks up barcodes. That lookup does not require an account.',
      },
    ],
    paragraphs: [
      'pantry&me does not sell personal information and does not use your pantry or photos for advertising.',
    ],
  },
  {
    title: 'Account deletion',
    paragraphs: [
      'In the app, open Settings, then Account, then Delete account. Deleting removes the account and the ingredients, saved recipes, and preferences stored with it, including an anonymous cloud pantry. Sign in with Apple tokens are revoked as part of deletion. This cannot be undone. Signing out does not delete the account.',
    ],
  },
  {
    title: 'Children',
    paragraphs: [
      'pantry&me is not directed at children under 13, and we do not knowingly collect their information.',
    ],
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function privacyContactEmail(email?: string | null): string | null {
  const trimmed = email?.trim() ?? '';
  return EMAIL_PATTERN.test(trimmed) ? trimmed : null;
}

export function privacyContactSentence(email?: string | null): string {
  const contact = privacyContactEmail(email);
  if (contact) return `Questions about this policy: ${contact}.`;
  return 'Questions about this policy: use the contact method published on the pantry&me App Store listing.';
}
