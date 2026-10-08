import type { Metadata } from 'next';
import {
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_UPDATED,
  privacyContactEmail,
  privacyContactSentence,
} from '@pantry-and-me/shared';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy Policy · pantry&me',
  description: 'How pantry&me handles your account, pantry, and food photos.',
};

const contactEmail = privacyContactEmail(process.env.PRIVACY_CONTACT_EMAIL);

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif',
        padding: '2.5rem 1.25rem 4rem',
        maxWidth: 720,
        margin: '0 auto',
        lineHeight: 1.55,
      }}>
      <p style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 13 }}>pantry&amp;me</p>
      <h1 style={{ fontSize: '2rem', lineHeight: 1.2, margin: '0.4rem 0 0.5rem' }}>Privacy Policy</h1>
      <p style={{ marginTop: 0 }}>Last updated {PRIVACY_POLICY_UPDATED}.</p>
      <p>{PRIVACY_POLICY_INTRO}</p>
      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.bullets ? (
            <ul>
              {section.bullets.map((bullet) => (
                <li key={bullet.label}>
                  <strong>{bullet.label}.</strong> {bullet.text}
                </li>
              ))}
            </ul>
          ) : null}
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <h2>Contact</h2>
      <p>
        {contactEmail ? (
          <>
            Questions about this policy: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </>
        ) : (
          privacyContactSentence()
        )}
      </p>
    </main>
  );
}
