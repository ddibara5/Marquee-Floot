// Owner-only recovery: this is the existing published app hostname, not a
// verified sending domain. Floot rewrites unverified senders to its shared
// platform sender and restricts delivery to the project owner.
// https://floot.com/docs/integrations/email
export const recoveryEmailConfig: { from: string | null } = {
  from: "Marquee <noreply@marquee-ddibara.floot.app>",
};
