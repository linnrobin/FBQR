"use client";

/**
 * FBQRSYS Staff Management page.
 * Route: /fbqrsys/settings/staff
 * Requires: admins:manage
 *
 * Spec: docs/platform-owner.md § Screen 8 — FBQRSYS Staff List
 */
import { useEffect, useState, type FormEvent } from "react";
import { Users, Plus, X } from "lucide-react";

interface Role {
  id: string;
  name: string;
  permissions: string[];
  _count: { assignments: number };
}

interface StaffMember {
  id: string;
  email: string;
  createdAt: string;
  mustChangePassword: boolean;
  createdBy: { email: string } | null;
  roleAssignments: {
    systemRole: { id: string; name: string };
  }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Create role form
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch("/api/fbqrsys/staff").then((r) => r.json()),
      fetch("/api/fbqrsys/roles").then((r) => r.json()),
    ])
      .then(([staffData, rolesData]) => {
        setStaff(staffData.staff ?? []);
        setRoles(rolesData.roles ?? []);
        setAvailablePermissions(rolesData.availablePermissions ?? []);
        if (rolesData.roles?.length && !inviteRoleId) {
          setInviteRoleId(rolesData.roles[0].id);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);

    const res = await fetch("/api/fbqrsys/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        password: invitePassword,
        roleId: inviteRoleId,
      }),
    });

    setInviteLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setInviteError(d.error ?? "Gagal membuat akun.");
      return;
    }

    setShowInvite(false);
    setInviteEmail("");
    setInvitePassword("");
    loadData();
  }

  async function handleCreateRole(e: FormEvent) {
    e.preventDefault();
    setRoleError(null);
    setRoleLoading(true);

    const res = await fetch("/api/fbqrsys/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roleName, permissions: rolePermissions }),
    });

    setRoleLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setRoleError(d.error ?? "Gagal membuat role.");
      return;
    }

    setShowCreateRole(false);
    setRoleName("");
    setRolePermissions([]);
    loadData();
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-stone-900">Staff FBQRSYS</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Undang Staff
        </button>
      </div>

      {/* Roles section */}
      <div className="mb-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-900">Role</h2>
          <button
            onClick={() => setShowCreateRole(true)}
            className="text-sm text-orange-600 hover:underline"
          >
            + Buat Role Baru
          </button>
        </div>
        {roles.length === 0 ? (
          <p className="text-sm text-stone-400">Belum ada role.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <p className="text-sm font-semibold text-stone-900">{role.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {role.permissions.length} permission · {role._count.assignments} anggota
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff table */}
      <div className="rounded-lg border border-stone-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-stone-100" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-stone-300 mb-4" />
            <h3 className="text-base font-semibold text-stone-900 mb-1">
              Belum ada staff FBQRSYS
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              Undang anggota tim pertama Anda.
            </p>
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Undang Staff
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="min-w-[200px] px-4 py-3 text-left font-semibold text-stone-700">Email</th>
                <th className="w-[160px] px-4 py-3 text-left font-semibold text-stone-700">Role</th>
                <th className="w-[160px] px-4 py-3 text-left font-semibold text-stone-700">Dibuat Oleh</th>
                <th className="w-[130px] px-4 py-3 text-left font-semibold text-stone-700">Bergabung</th>
                <th className="w-[100px] px-4 py-3 text-left font-semibold text-stone-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-stone-100 h-14 hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-900">{s.email}</td>
                  <td className="px-4 py-3">
                    {s.roleAssignments.length > 0
                      ? s.roleAssignments.map((ra) => ra.systemRole.name).join(", ")
                      : <span className="text-stone-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {s.createdBy?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {formatDate(s.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {s.mustChangePassword ? (
                      <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-300">
                        Ganti Password
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-300">
                        Aktif
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-900">Undang Staff Baru</h3>
              <button
                onClick={() => setShowInvite(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="staff@fbqr.app"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Password Sementara <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">— Pilih Role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              {inviteError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                  {inviteError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {inviteLoading ? "Membuat Akun..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-900">Buat Role Baru</h3>
              <button
                onClick={() => setShowCreateRole(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Nama Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Merchant Manager"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Permissions <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-stone-200 p-3 max-h-48 overflow-y-auto">
                  {availablePermissions.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rolePermissions.includes(perm)}
                        onChange={(e) => {
                          setRolePermissions((prev) =>
                            e.target.checked
                              ? [...prev, perm]
                              : prev.filter((p) => p !== perm)
                          );
                        }}
                        className="rounded border-stone-300 text-orange-600"
                      />
                      <span className="text-xs font-mono text-stone-700">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              {roleError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                  {roleError}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRole(false)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={roleLoading}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {roleLoading ? "Membuat..." : "Buat Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
