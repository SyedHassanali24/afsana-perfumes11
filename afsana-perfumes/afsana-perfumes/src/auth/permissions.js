// Pure helper (unit-testable). `perms` is the `permissions` object from GET /api/auth/me:
//   { unrestricted: boolean, modules: { products: ['view','edit'] }, deniedFields: [] }
// Owner comes back as { unrestricted: true, modules: {} } -> must be treated as "can do everything".
// This is UX only. The server enforces every permission again.
export function can(perms, key) {
  if (!perms) return false;
  if (perms.unrestricted) return true;
  if (!key) return true; // item with no permission requirement
  const [module, action = 'view'] = key.split('.');
  return !!perms.modules?.[module]?.includes(action);
}
export const canAny = (perms, keys) => keys.some((k) => can(perms, k));
export const fieldHidden = (perms, field) => !perms?.unrestricted && !!perms?.deniedFields?.includes(field);
