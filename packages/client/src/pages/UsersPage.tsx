import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usersApi, Role, type User, type Pagination } from "../lib/api";
import { userFormSchema, type UserFormData } from "../lib/schemas";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, admins: 0, agents: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [serverError, setServerError] = useState("");
  const [filters, setFilters] = useState({ search: "", role: "", status: "", sortBy: "createdAt", sortOrder: "desc", page: "1" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: "", email: "", password: "", role: "AGENT" },
  });

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder;
      params.page = filters.page;
      params.limit = "20";

      const data = await usersApi.list(params);
      setUsers(data.users || []);
      if (data.pagination) setPagination(data.pagination);
      if (data.stats) {
        setStats(data.stats);
      } else {
        // Fallback computation if stats not directly returned
        const total = data.pagination?.total ?? data.users.length;
        const active = data.users.filter((u) => u.isActive !== false).length;
        const admins = data.users.filter((u) => u.role === Role.ADMIN).length;
        const agents = data.users.filter((u) => u.role === Role.AGENT).length;
        setStats({ total, active, admins, agents });
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setServerError("");
    reset({ name: "", email: "", password: "", role: "AGENT" });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setServerError("");
    reset({ name: u.name, email: u.email, password: "", role: u.role });
    setShowModal(true);
  };

  const onSubmit = async (data: UserFormData) => {
    setServerError("");
    try {
      if (editUser) {
        const payload: Record<string, string> = {
          name: data.name,
          email: data.email,
          role: data.role,
        };
        if (data.password && data.password.trim() !== "") {
          if (data.password.length < 6) {
            setServerError("Password must be at least 6 characters");
            return;
          }
          payload.password = data.password;
        }
        await usersApi.update(editUser.id, payload as any);
      } else {
        if (!data.password || data.password.trim() === "") {
          setServerError("Password is required when creating a new agent");
          return;
        }
        if (data.password.length < 6) {
          setServerError("Password must be at least 6 characters");
          return;
        }
        await usersApi.create({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
        });
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this user account? They will no longer be able to log in.")) return;
    try {
      await usersApi.delete(id);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate user");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await usersApi.update(id, { isActive: true });
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reactivate user");
    }
  };

  const handleSortChange = (value: string) => {
    if (value === "newest") {
      setFilters({ ...filters, sortBy: "createdAt", sortOrder: "desc", page: "1" });
    } else if (value === "name") {
      setFilters({ ...filters, sortBy: "name", sortOrder: "asc", page: "1" });
    } else if (value === "tickets") {
      setFilters({ ...filters, sortBy: "_count.tickets", sortOrder: "desc", page: "1" });
    }
  };

  const statCards = [
    { label: "Total Team Members", value: stats.total, icon: "👥", color: "from-indigo-500/10 to-violet-500/10 text-indigo-700 border-indigo-200" },
    { label: "Active Accounts", value: stats.active, icon: "✅", color: "from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200" },
    { label: "Administrators", value: stats.admins, icon: "🔐", color: "from-purple-500/10 to-pink-500/10 text-purple-700 border-purple-200" },
    { label: "Support Agents", value: stats.agents, icon: "🎧", color: "from-blue-500/10 to-cyan-500/10 text-blue-700 border-blue-200" },
  ];

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Team Members</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage administrative privileges and support agents across your organization.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-150 shrink-0 cursor-pointer border-0"
          onClick={openCreate}
        >
          <span>+ New Agent</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}
          >
            <div className={`absolute right-0 top-0 w-24 h-24 bg-gradient-to-br ${stat.color} rounded-full blur-2xl opacity-40 pointer-events-none`} />
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{stat.value}</span>
            </div>
            <div className="text-2xl p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Search team members by name or email..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: "1" })}
          />
        </div>
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value, page: "1" })}
          className="bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-3.5 py-2 text-sm text-slate-700 outline-none transition-all duration-150 cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin Only</option>
          <option value="AGENT">Agent Only</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: "1" })}
          className="bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-3.5 py-2 text-sm text-slate-700 outline-none transition-all duration-150 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <select
          onChange={(e) => handleSortChange(e.target.value)}
          defaultValue="newest"
          className="bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-3.5 py-2 text-sm text-slate-700 outline-none transition-all duration-150 cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="name">Name (A-Z)</option>
          <option value="tickets">Most Tickets</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading team members...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <span className="text-4xl mb-3">👥</span>
            <p className="text-base font-semibold text-slate-900">No team members found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search filters or create a new agent account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Name & Email</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Assigned Tickets</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{u.name}</span>
                          <span className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        u.role === Role.ADMIN
                          ? "bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-xs text-slate-700">
                        <span>🎫</span>
                        <span>{u._count?.tickets ?? 0} tickets</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        u.isActive !== false
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        {u.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        {u.isActive !== false ? (
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-xs font-medium text-red-600 border border-red-200 shadow-2xs transition-all cursor-pointer"
                            onClick={() => handleDelete(u.id)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-xs font-medium text-emerald-700 border border-emerald-200 shadow-2xs transition-all cursor-pointer"
                            onClick={() => handleReactivate(u.id)}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 px-6 py-3.5 rounded-2xl shadow-sm">
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 transition-all duration-150 cursor-pointer shadow-2xs"
            disabled={pagination.page <= 1}
            onClick={() => setFilters({ ...filters, page: String(pagination.page - 1) })}
          >
            ← Previous
          </button>
          <span className="text-xs font-medium text-slate-500">
            Page <strong className="text-slate-900">{pagination.page}</strong> of <strong className="text-slate-900">{pagination.totalPages}</strong>
          </span>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 transition-all duration-150 cursor-pointer shadow-2xs"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: String(pagination.page + 1) })}
          >
            Next →
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {editUser ? "Edit User" : "Create New Agent"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {editUser ? "Update credentials and system roles for this account." : "Add a new support agent or administrator to your helpdesk team."}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              {serverError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium animate-fade-in">
                  <span>⚠️</span>
                  <span>{serverError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Name</label>
                  {errors.name && <span className="text-xs text-red-600 font-medium">{errors.name.message}</span>}
                </div>
                <input
                  {...register("name")}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150"
                  placeholder="Agent Name"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Email</label>
                  {errors.email && <span className="text-xs text-red-600 font-medium">{errors.email.message}</span>}
                </div>
                <input
                  type="email"
                  {...register("email")}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150"
                  placeholder="agent@example.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {editUser ? "New Password (leave blank to keep current)" : "Password"}
                  </label>
                  {errors.password && <span className="text-xs text-red-600 font-medium">{errors.password.message}</span>}
                </div>
                <input
                  type="password"
                  {...register("password")}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">System Role</label>
                <select
                  {...register("role")}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 rounded-xl px-4 py-2 text-sm text-slate-700 outline-none transition-all duration-150 cursor-pointer"
                >
                  <option value={Role.AGENT}>Agent (Can manage and resolve tickets)</option>
                  <option value={Role.ADMIN}>Admin (Full system and user access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer border-0 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : editUser ? (
                    "Update User"
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
