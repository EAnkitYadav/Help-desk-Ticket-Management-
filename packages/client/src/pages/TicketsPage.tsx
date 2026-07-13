import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ticketsApi, type Ticket, type Pagination } from "../lib/api";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  RESOLVED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  CLOSED: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  MEDIUM: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  HIGH: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  URGENT: "bg-red-500/15 text-red-400 border border-red-500/20 animate-pulse",
};

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL_QUESTION: "General",
  TECHNICAL_QUESTION: "Technical",
  REFUND_REQUEST: "Refund",
};

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    search: "",
    page: "1",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const navigate = useNavigate();

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      params.page = filters.page;
      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder;

      const data = await ticketsApi.list(params);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const onSortingChange = (updaterOrValue: any) => {
    const nextSorting = typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue;
    setSorting(nextSorting);
    if (nextSorting && nextSorting.length > 0) {
      setFilters((prev) => ({
        ...prev,
        sortBy: nextSorting[0].id,
        sortOrder: nextSorting[0].desc ? "desc" : "asc",
        page: "1",
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        sortBy: "createdAt",
        sortOrder: "desc",
        page: "1",
      }));
    }
  };

  const columns = [
    {
      accessorKey: "subject",
      header: "Subject",
      enableSorting: true,
      cell: ({ row }: any) => {
        const ticket = row.original;
        return (
          <>
            <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors block truncate">
              {ticket.subject}
            </span>
            {ticket._count && (
              <span className="text-[11px] text-[#6b7080] font-medium mt-0.5 inline-block">
                {ticket._count.comments} comment{ticket._count.comments !== 1 ? "s" : ""}
              </span>
            )}
          </>
        );
      },
    },
    {
      accessorKey: "senderName",
      header: "Sender",
      enableSorting: true,
      cell: ({ row }: any) => {
        const ticket = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-[#e4e6ec]">{ticket.senderName || ticket.senderEmail}</span>
            {ticket.senderName && (
              <span className="text-xs text-[#6b7080]">{ticket.senderEmail}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      cell: ({ row }: any) => {
        const status = row.getValue("status") as string;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_COLORS[status] || "bg-gray-500/15 text-gray-400"}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      enableSorting: true,
      cell: ({ row }: any) => {
        const category = row.getValue("category") as string;
        return category ? CATEGORY_LABELS[category] || category : "—";
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      enableSorting: true,
      cell: ({ row }: any) => {
        const priority = row.getValue("priority") as string;
        return priority ? (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[priority] || "bg-gray-500/15 text-gray-400"}`}>
            {priority}
          </span>
        ) : "—";
      },
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
      enableSorting: false,
      cell: ({ row }: any) => {
        const ticket = row.original;
        return ticket.assignedTo?.name ? (
          <span className="inline-flex items-center gap-1.5 bg-[#22262f] border border-[#2e3140] px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            {ticket.assignedTo.name}
          </span>
        ) : (
          <span className="text-[#6b7080] italic">Unassigned</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      enableSorting: true,
      cell: ({ row }: any) => {
        return formatDate(row.getValue("createdAt"));
      },
    },
  ];

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2e3140]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Support Tickets</h1>
          <p className="text-sm text-[#9499a8] mt-1">
            {pagination ? `${pagination.total} total tickets in queue` : "Loading tickets..."}
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 shrink-0 cursor-pointer"
          onClick={() => navigate("/tickets/new")}
        >
          <span>+ New Ticket</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#1a1d27] p-3.5 rounded-2xl border border-[#2e3140] shadow-sm">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7080]">🔍</span>
          <input
            type="text"
            placeholder="Search tickets by subject or sender..."
            className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-4 py-2 text-sm text-[#e4e6ec] placeholder-[#6b7080] outline-none transition-all duration-200"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: "1" })}
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: "1" })}
          className="bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2 text-sm text-[#e4e6ec] outline-none transition-all duration-200 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value, page: "1" })}
          className="bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3.5 py-2 text-sm text-[#e4e6ec] outline-none transition-all duration-200 cursor-pointer"
        >
          <option value="">All Categories</option>
          <option value="GENERAL_QUESTION">General Question</option>
          <option value="TECHNICAL_QUESTION">Technical Question</option>
          <option value="REFUND_REQUEST">Refund Request</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="bg-[#1a1d27] border border-[#2e3140] rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#9499a8]">
            <div className="w-8 h-8 border-3 border-[#2e3140] border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Loading tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <span className="text-4xl mb-3">🎫</span>
            <p className="text-base font-semibold text-[#e4e6ec]">No tickets found</p>
            <p className="text-xs text-[#6b7080] mt-1">Try adjusting your search criteria or create a new ticket.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="bg-[#22262f] border-b border-[#2e3140] text-[11px] font-semibold uppercase tracking-wider text-[#9499a8]"
                  >
                    {headerGroup.headers.map((header) => {
                      const isSortable = header.column.getCanSort();
                      const sortDirection = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className={`py-3.5 px-5 select-none ${
                            isSortable
                              ? "cursor-pointer hover:bg-[#2c313d] hover:text-white transition-colors duration-150"
                              : ""
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {isSortable && (
                              <span className="inline-block ml-1 text-slate-400">
                                {sortDirection === "asc" ? (
                                  <ArrowUp className="w-3.5 h-3.5 inline-block" />
                                ) : sortDirection === "desc" ? (
                                  <ArrowDown className="w-3.5 h-3.5 inline-block" />
                                ) : (
                                  <ArrowUpDown className="w-3.5 h-3.5 inline-block opacity-40 hover:opacity-100" />
                                )}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-[#2e3140]/60 text-sm">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/tickets/${row.original.id}`)}
                    className="hover:bg-[#22262f]/80 transition-colors duration-150 cursor-pointer group"
                  >
                    {row.getVisibleCells().map((cell) => {
                      let tdClass = "py-4 px-5";
                      if (cell.column.id === "subject") tdClass += " max-w-xs";
                      if (cell.column.id === "category") tdClass += " text-xs text-[#9499a8] font-medium";
                      if (cell.column.id === "assignedTo") tdClass += " text-xs text-[#e4e6ec]";
                      if (cell.column.id === "createdAt") tdClass += " text-xs text-[#9499a8] whitespace-nowrap";

                      return (
                        <td key={cell.id} className={tdClass}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-[#1a1d27] border border-[#2e3140] px-6 py-3.5 rounded-2xl shadow-sm">
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#22262f] hover:bg-[#2e3140] text-[#e4e6ec] disabled:opacity-40 disabled:cursor-not-allowed border border-[#2e3140] transition-all duration-150 cursor-pointer"
            disabled={pagination.page <= 1}
            onClick={() => setFilters({ ...filters, page: String(pagination.page - 1) })}
          >
            ← Previous
          </button>
          <span className="text-xs font-medium text-[#9499a8]">
            Page <strong className="text-white">{pagination.page}</strong> of <strong className="text-white">{pagination.totalPages}</strong>
          </span>
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#22262f] hover:bg-[#2e3140] text-[#e4e6ec] disabled:opacity-40 disabled:cursor-not-allowed border border-[#2e3140] transition-all duration-150 cursor-pointer"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: String(pagination.page + 1) })}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
