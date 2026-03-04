import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — meal.photos',
  description:
    'Terms and conditions for using the meal.photos platform.',
};

export default function TermsOfServicePage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="last-updated">Last updated: [DATE]</p>

      <h2>1. Acceptance of Terms</h2>
      <p>TODO: By using meal.photos you agree to these terms.</p>

      <h2>2. Description of Service</h2>
      <p>
        TODO: meal.photos is a free platform for uploading meal photos, community
        rating, recipe sharing, and exploring food culture globally.
      </p>

      <h2>3. User Accounts</h2>
      <p>
        TODO: Account registration, responsibility for credentials, one account
        per person.
      </p>

      <h2>4. Content Licensing</h2>
      <p>
        TODO: Users retain ownership of their photos. By uploading, users grant
        meal.photos a non-exclusive, worldwide licence to display, distribute,
        and create derivatives (thumbnails, scorecards) of the content on the
        platform.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>
        TODO: Users must not upload non-food content, offensive material, spam,
        copyrighted content they do not own, or manipulate ratings.
      </p>

      <h2>6. Prohibited Content</h2>
      <p>
        TODO: Explicit list of prohibited content types. Content moderation
        pipeline enforced.
      </p>

      <h2>7. Restaurant Subscriptions</h2>
      <p>
        TODO: Terms specific to restaurant subscribers — pricing, billing,
        cancellation, anonymous testing feature.
      </p>

      <h2>8. Termination</h2>
      <p>
        TODO: meal.photos reserves the right to suspend or terminate accounts
        violating these terms.
      </p>

      <h2>9. Disclaimers</h2>
      <p>TODO: Service provided &quot;as is&quot;, no warranties.</p>

      <h2>10. Limitation of Liability</h2>
      <p>TODO: Standard limitation of liability clause.</p>

      <h2>11. Governing Law</h2>
      <p>TODO: UK law governs these terms.</p>

      <h2>12. Changes to These Terms</h2>
      <p>TODO: How users will be notified of changes.</p>

      <h2>13. Contact</h2>
      <p>TODO: Contact email for legal queries.</p>
    </>
  );
}
