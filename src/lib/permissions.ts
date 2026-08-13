/**
 * Per-user menu-item permissions.
 *
 * Each team member's profile carries a `permissions` jsonb map describing
 * which modules they can see/use. Owners and superadmins always have full
 * access regardless of the stored value; admins and agents are scoped by it.
 * Missing keys fall back to the role's defaults, so agents never gain access
 * to business configuration (AI Hub, Automations, Settings) by accident.
 */

export type PermissionKey =
  | "dashboard"
  | "inbox"
  | "contacts"
  | "pipelines"
  | "broadcasts"
  | "automations"
  | "ai"
  | "settings";

export type Permissions = Record<PermissionKey, boolean>;

export const PERMISSION_DEFINITIONS: {
  key: PermissionKey;
  label: string;
  description: string;
}[] = [
  { key: "dashboard", label: "Dashboard", description: "View the overview dashboard" },
  { key: "inbox", label: "Inbox", description: "Chat with customers in the shared inbox" },
  { key: "contacts", label: "Contacts", description: "View and manage contacts" },
  { key: "pipelines", label: "Pipelines", description: "View and manage sales pipelines" },
  { key: "broadcasts", label: "Broadcasts", description: "Send and manage broadcasts" },
  { key: "automations", label: "Automations", description: "Build and manage no-code automations" },
  { key: "ai", label: "AI Hub", description: "Configure the AI assistant and knowledge base" },
  { key: "settings", label: "Settings", description: "WhatsApp, templates, tags, integrations and billing" },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_DEFINITIONS.map(
  (d) => d.key,
);

/** Modules treated as business configuration (not granted to agents by default). */
export const BUSINESS_CONFIG_PERMISSIONS: PermissionKey[] = [
  "automations",
  "ai",
  "settings",
];

const FULL_ACCESS: Permissions = {
  dashboard: true,
  inbox: true,
  contacts: true,
  pipelines: true,
  broadcasts: true,
  automations: true,
  ai: true,
  settings: true,
};

const AGENT_DEFAULT: Permissions = {
  dashboard: true,
  inbox: true,
  contacts: true,
  pipelines: true,
  broadcasts: true,
  automations: false,
  ai: false,
  settings: false,
};

export function isUnrestrictedRole(role?: string | null): boolean {
  return role === "owner" || role === "superadmin";
}

export function defaultPermissionsForRole(
  role?: string | null,
): Permissions {
  if (role === "admin") return { ...FULL_ACCESS };
  return { ...AGENT_DEFAULT };
}

/**
 * Coerces an arbitrary stored/input value into a complete, valid permissions
 * map. Unknown keys are dropped; missing keys fall back to the role defaults.
 * Used both when reading profiles and when accepting input from the API.
 */
export function normalizePermissions(
  raw: unknown,
  role?: string | null,
): Permissions {
  const defaults = defaultPermissionsForRole(role);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }
  const map = raw as Record<string, unknown>;
  const out: Permissions = { ...defaults };
  for (const key of ALL_PERMISSION_KEYS) {
    if (typeof map[key] === "boolean") out[key] = map[key] as boolean;
  }
  return out;
}

/**
 * Whether a user may access a module. Owners/superadmins are always allowed.
 * Admins and agents are governed by their stored permissions (or role defaults).
 */
export function canAccess(
  permissions: Permissions | null | undefined,
  key: PermissionKey,
  role?: string | null,
): boolean {
  if (isUnrestrictedRole(role)) return true;
  if (permissions) return permissions[key] !== false;
  return defaultPermissionsForRole(role)[key];
}

/** Human-friendly summary of a permissions map for table display. */
export function summarizePermissions(
  permissions: Permissions | null | undefined,
  role?: string | null,
): string {
  if (isUnrestrictedRole(role)) return "Full access";
  const resolved = permissions ?? defaultPermissionsForRole(role);
  const disabled = ALL_PERMISSION_KEYS.filter((k) => resolved[k] !== true);
  if (disabled.length === 0) return "All modules";
  const enabled = ALL_PERMISSION_KEYS.filter((k) => resolved[k] === true);
  return `${enabled.length}/${ALL_PERMISSION_KEYS.length} modules · no ${disabled
    .map((k) => PERMISSION_DEFINITIONS.find((d) => d.key === k)?.label)
    .join(", ")}`;
}
