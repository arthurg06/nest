// NEST Terms & Conditions — single source for the version the app enforces
// and the content the modal renders. Shared so the server records exactly the
// version the member read.
//
// Versioning: bump TERMS_VERSION when the terms materially change; accounts
// store the version they accepted, so a future release can compare and ask
// members to review the update before continuing.
//
// IMPORTANT: starter template only — not lawyer-reviewed legal advice, and it
// does not make NEST immune from liability. Applicable consumer, privacy and
// platform laws may impose obligations that terms cannot waive.

export const TERMS_VERSION = "2026-08-20";
export const TERMS_LAST_UPDATED = "August 20, 2026";

export interface TermsSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export const TERMS_INTRO =
  "Welcome to NEST. By creating an account or using NEST, you agree to these Terms & Conditions.";

export const TERMS_SECTIONS: TermsSection[] = [
  {
    heading: "1. Using NEST",
    paragraphs: [
      "NEST is a social platform designed to help users discover and connect with other people within the NEST community.",
      "You are responsible for the information you provide and for your activity on the platform.",
      "You agree not to:"
    ],
    bullets: [
      "Provide intentionally false or misleading information.",
      "Impersonate another person.",
      "Use NEST for unlawful purposes.",
      "Harass, threaten, abuse, or intentionally harm other users.",
      "Upload content that violates another person's rights.",
      "Attempt to access another user's account.",
      "Attempt to interfere with, exploit, or disrupt the platform.",
      "Use NEST for spam, scams, or fraudulent activity."
    ]
  },
  {
    heading: "2. Your Account",
    paragraphs: [
      "You are responsible for maintaining the security of your account and password.",
      "You are responsible for activity carried out through your account.",
      "You should not share your password or account credentials with another person.",
      "NEST may suspend or terminate accounts that violate these Terms or pose a risk to other users or the platform."
    ]
  },
  {
    heading: "3. User Content",
    paragraphs: [
      "Users may upload information, photographs, biographies, social media information, and other content to NEST.",
      "You retain ownership of content you upload.",
      "By uploading content to NEST, you grant NEST a non-exclusive license to host, store, display, and distribute that content as necessary to operate the service.",
      "You are responsible for ensuring that you have the right to upload anything you post."
    ]
  },
  {
    heading: "4. Interactions With Other Users",
    paragraphs: [
      "NEST allows users to discover and communicate with other users.",
      "NEST does not control or guarantee the behavior, identity, intentions, or actions of other users.",
      "You are responsible for exercising appropriate judgment when communicating with or meeting other people.",
      "Do not share sensitive personal information or meet someone in person without taking appropriate safety precautions.",
      "NEST is not responsible for interactions, communications, meetings, relationships, disputes, injuries, losses, or other events occurring between users outside the NEST platform, to the extent permitted by applicable law."
    ]
  },
  {
    heading: "5. City Guide and Recommendations",
    paragraphs: [
      "NEST may allow users to submit recommendations for places, activities, venues, or other locations.",
      "Recommendations are user-generated and may not represent the views or endorsements of NEST.",
      "NEST does not guarantee that a recommended location is safe, open, available, accurate, or suitable for you.",
      "You are responsible for independently evaluating any recommendation before visiting or using a recommended place."
    ]
  },
  {
    heading: "6. Availability of the Service",
    paragraphs: [
      "NEST is provided on an ongoing basis, but we do not guarantee that the service will always be available, uninterrupted, secure, or error-free.",
      "Features may be modified, suspended, or discontinued from time to time."
    ]
  },
  {
    heading: "7. Disclaimer",
    paragraphs: [
      "To the maximum extent permitted by applicable law, NEST is not responsible for losses, damages, injuries, disputes, or other consequences arising from:"
    ],
    bullets: [
      "Interactions between users.",
      "User-generated content.",
      "Meetings between users.",
      "Places or activities recommended by users.",
      "Events or activities organized by users.",
      "Information provided by users.",
      "Use or inability to use the platform."
    ]
  },
  {
    heading: "8. Limitation of Liability",
    paragraphs: [
      "To the maximum extent permitted by applicable law, NEST and its operators will not be liable for indirect, incidental, consequential, special, or punitive damages arising from use of the service or interactions between users.",
      "Where liability cannot legally be excluded, it will be limited to the maximum extent permitted by applicable law.",
      "Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited under applicable law."
    ]
  },
  {
    heading: "9. Termination",
    paragraphs: [
      "You may stop using NEST at any time.",
      "NEST may suspend or terminate accounts that violate these Terms, create risks for other users, or otherwise misuse the platform."
    ]
  },
  {
    heading: "10. Changes to These Terms",
    paragraphs: [
      "These Terms may be updated from time to time.",
      "If material changes are made, NEST may require users to review and accept the updated Terms before continuing to use the service."
    ]
  },
  {
    heading: "11. Contact",
    paragraphs: [
      "For questions regarding these Terms, users may contact NEST through the contact information provided within the service."
    ]
  }
];
