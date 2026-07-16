"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import DashboardPageHero from "@/components/DashboardPageHero";
import CostEstimatorConfirmModal from "@/features/cost-estimator/components/CostEstimatorConfirmModal";
import {
  createAppUserAction,
  deleteAppUserAction,
  updateAppUserAction,
} from "@/actions/users";
import type { ManagedUserRow } from "@/features/user-management/types";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/database";

type FormErrors = Partial<
  Record<"fullName" | "username" | "email" | "password" | "role", string>
>;

const ROLE_OPTIONS: Array<{ value: AppRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "payroll_manager", label: "Payroll Manager" },
  { value: "purchaser", label: "Purchaser" },
  { value: "engineer", label: "Engineer" },
  { value: "purchaser", label: "Purchaser" },
  { value: "employee", label: "Employee" },
  { value: "ceo", label: "CEO" },
];

const EMPTY_FORM = {
  fullName: "",
  username: "",
  email: "",
  password: "",
  role: "payroll_manager" as AppRole,
  isActive: true,
};

function formatRoleLabel(role: AppRole) {
  if (role === "admin") return "Admin";
  if (role === "ceo") return "CEO";
  if (role === "payroll_manager") return "Payroll Manager";
  if (role === "purchaser") return "Purchaser";
  if (role === "employee") return "Employee";
  if (role === "purchaser") return "Purchaser";
  return "Engineer";
}

export default function UserManagementPageClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: ManagedUserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<{
    userId: string;
    top: number;
    left: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (left, right) =>
          left.full_name?.localeCompare(right.full_name ?? "") ||
          left.username.localeCompare(right.username),
      ),
    [users],
  );

  const deleteTarget =
    sortedUsers.find((user) => user.id === deleteUserId) ?? null;
  const openMenuUser =
    sortedUsers.find((user) => user.id === openMenu?.userId) ?? null;

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-user-actions-root]")) return;
      setOpenMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!form.username.trim()) {
      nextErrors.username = "Username is required.";
    } else if (
      !/^[a-z0-9._-]{3,30}$/.test(form.username.trim().toLowerCase())
    ) {
      nextErrors.username =
        "Username must be 3-30 characters and use only letters, numbers, dot, dash, or underscore.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!editingUserId && !form.password) {
      nextErrors.password = "Temporary password is required.";
    } else if (!editingUserId && form.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!form.role) {
      nextErrors.role = "Role is required.";
    }

    return nextErrors;
  }

  function updateField<K extends keyof typeof EMPTY_FORM>(
    field: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingUserId(null);
  }

  function handleEditUser(user: ManagedUserRow) {
    setOpenMenu(null);
    setEditingUserId(user.id);
    setErrors({});
    setForm({
      fullName: user.full_name ?? "",
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.is_active,
    });
  }

  function handleSubmit() {
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    startTransition(async () => {
      try {
        if (editingUserId) {
          const response = await updateAppUserAction({
            userId: editingUserId,
            fullName: form.fullName,
            username: form.username,
            email: form.email,
            role: form.role,
            isActive: form.isActive,
          });

          setUsers((current) =>
            current.map((user) =>
              user.id === editingUserId ? response.user : user,
            ),
          );
          toast.success("User updated.");
        } else {
          const response = await createAppUserAction({
            fullName: form.fullName,
            username: form.username,
            email: form.email,
            password: form.password,
            role: form.role,
          });
          setUsers((current) => [response.user, ...current]);
          toast.success("User account created.");
        }

        resetForm();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save user.",
        );
      }
    });
  }

  function handleConfirmDelete() {
    if (!deleteUserId) return;

    startTransition(async () => {
      try {
        await deleteAppUserAction(deleteUserId);
        setUsers((current) =>
          current.filter((user) => user.id !== deleteUserId),
        );
        setDeleteUserId(null);
        toast.success("User deleted.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete user.",
        );
      }
    });
  }

  function handleOpenMenu(userId: string, rect: DOMRect) {
    setOpenMenu((current) =>
      current?.userId === userId
        ? null
        : {
            userId,
            top: rect.bottom + 8,
            left: rect.right,
          },
    );
  }

  function handleAskDelete(userId: string) {
    setOpenMenu(null);
    setDeleteUserId(userId);
  }

  return (
    <div className="space-y-4 p-0 sm:p-6">
      <DashboardPageHero
        eyebrow="Admin"
        title="User Management"
        description="Create, update, and manage user accounts for payroll managers, engineers, purchasers, employees, and CEO users."
      />

      <section className="grid gap-4 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="min-w-0 rounded-none border border-apple-mist bg-white p-4 shadow-[0_10px_30px_rgba(24,83,43,0.06)] sm:rounded-[22px] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                {editingUserId ? "Edit User" : "Create User"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-apple-charcoal">
                {editingUserId ? "Update account details" : "Add a new user"}
              </h2>
            </div>
            {editingUserId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-apple-mist px-4 text-sm font-semibold text-apple-charcoal transition hover:bg-apple-mist/40 sm:w-auto"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="mt-6 grid gap-5">
            <div>
              <label className="text-sm font-semibold text-apple-charcoal">
                Full name <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.fullName}
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
                placeholder="e.g. Maria Santos"
                className={cn(
                  "mt-2 w-full rounded-[12px] border bg-[rgb(var(--apple-snow))] px-4 py-3 text-sm outline-none focus:border-[#1f6a37]",
                  errors.fullName ? "border-rose-300" : "border-apple-mist",
                )}
              />
              {errors.fullName ? (
                <p className="mt-2 text-sm text-rose-600">{errors.fullName}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-semibold text-apple-charcoal">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.username}
                onChange={(event) =>
                  updateField("username", event.target.value)
                }
                placeholder="e.g. maria.santos"
                className={cn(
                  "mt-2 w-full rounded-[12px] border bg-[rgb(var(--apple-snow))] px-4 py-3 text-sm outline-none focus:border-[#1f6a37]",
                  errors.username ? "border-rose-300" : "border-apple-mist",
                )}
              />
              {errors.username ? (
                <p className="mt-2 text-sm text-rose-600">{errors.username}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-semibold text-apple-charcoal">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="e.g. maria@prodisenyo.com"
                className={cn(
                  "mt-2 w-full rounded-[12px] border bg-[rgb(var(--apple-snow))] px-4 py-3 text-sm outline-none focus:border-[#1f6a37]",
                  errors.email ? "border-rose-300" : "border-apple-mist",
                )}
              />
              {errors.email ? (
                <p className="mt-2 text-sm text-rose-600">{errors.email}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-semibold text-apple-charcoal">
                Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.role}
                onChange={(event) =>
                  updateField("role", event.target.value as AppRole)
                }
                className={cn(
                  "mt-2 w-full rounded-[12px] border bg-white px-4 py-3 text-sm outline-none focus:border-[#1f6a37]",
                  errors.role ? "border-rose-300" : "border-apple-mist",
                )}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.role ? (
                <p className="mt-2 text-sm text-rose-600">{errors.role}</p>
              ) : null}
            </div>

            {!editingUserId ? (
              <div>
                <label className="text-sm font-semibold text-apple-charcoal">
                  Temporary password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  placeholder="Minimum 8 characters"
                  className={cn(
                    "mt-2 w-full rounded-[12px] border bg-[rgb(var(--apple-snow))] px-4 py-3 text-sm outline-none focus:border-[#1f6a37]",
                    errors.password ? "border-rose-300" : "border-apple-mist",
                  )}
                />
                {errors.password ? (
                  <p className="mt-2 text-sm text-rose-600">
                    {errors.password}
                  </p>
                ) : null}
              </div>
            ) : (
              <label className="flex items-center gap-3 rounded-[12px] border border-apple-mist bg-[rgb(var(--apple-snow))] px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateField("isActive", event.target.checked)
                  }
                  disabled={editingUserId === currentUserId}
                />
                <span className="text-sm font-medium text-apple-charcoal">
                  Active account
                </span>
              </label>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#1f6a37] px-5 text-sm font-semibold text-white transition hover:bg-[#18552d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <UserPlus size={16} />
                {isPending
                  ? editingUserId
                    ? "Updating user..."
                    : "Creating user..."
                  : editingUserId
                    ? "Update user"
                    : "Create user"}
              </button>
            </div>
          </div>
        </div>

        <section className="min-w-0 rounded-none border border-apple-mist bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.06)] sm:rounded-[22px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apple-steel">
                Directory
              </p>
              <h2 className="mt-2 text-xl font-semibold text-apple-charcoal">
                Users
              </h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {sortedUsers.length} users
            </span>
          </div>

          <div className="overflow-x-auto overflow-y-visible rounded-[18px] border border-apple-mist">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="bg-[rgb(var(--apple-snow))]">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Username
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Role
                  </th>
                  <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Status
                  </th>
                  <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-apple-steel">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-mist">
                {sortedUsers.map((user) => {
                  const isCurrentUser = user.id === currentUserId;

                  return (
                    <tr key={user.id}>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-apple-charcoal">
                          {user.full_name || "Unnamed user"}
                        </p>
                        {isCurrentUser ? (
                          <p className="mt-1 text-xs text-emerald-700">
                            Current account
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-apple-smoke">
                        {user.username}
                      </td>
                      <td className="px-3 py-3 text-apple-smoke">
                        {user.email}
                      </td>
                      <td className="px-3 py-3 text-apple-smoke">
                        {formatRoleLabel(user.role)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                            user.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700",
                          )}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={(event) =>
                            handleOpenMenu(
                              user.id,
                              event.currentTarget.getBoundingClientRect(),
                            )
                          }
                          data-user-actions-root
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-apple-mist bg-white text-apple-smoke transition hover:border-emerald-100 hover:bg-emerald-50/60 hover:text-apple-charcoal"
                          aria-label={`Open actions for ${user.full_name || user.username}`}
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <CostEstimatorConfirmModal
        open={deleteTarget !== null}
        eyebrow="Delete User"
        title="Delete user?"
        description={
          deleteTarget
            ? `This will permanently remove ${deleteTarget.full_name || deleteTarget.username}'s account.`
            : ""
        }
        confirmLabel="Delete user"
        confirmTone="danger"
        pending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteUserId(null)}
      />

      {openMenu && openMenuUser
        ? createPortal(
            <div
              data-user-actions-root
              className="fixed z-[140] min-w-[148px] -translate-x-full overflow-hidden rounded-[16px] border border-[#e8f0ea] bg-white text-left shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
              style={{ top: openMenu.top, left: openMenu.left }}
            >
              <button
                type="button"
                onClick={() => handleEditUser(openMenuUser)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-apple-charcoal transition hover:bg-emerald-50/70"
              >
                <Pencil size={13} />
                Edit user
              </button>
              <button
                type="button"
                onClick={() => handleAskDelete(openMenuUser.id)}
                disabled={openMenuUser.id === currentUserId}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={13} />
                Delete user
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
