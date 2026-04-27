// Single source of truth for master-level permissions.
// Use isMaster(user?.email) anywhere a privileged action needs to be gated.

export const MASTER_EMAILS = [
  'amonncrispimufrj@gmail.com',
  'amonnscrispim@gmail.com',
];

export const isMaster = (email?: string | null): boolean => {
  if (!email) return false;
  return MASTER_EMAILS.includes(email.toLowerCase().trim());
};
