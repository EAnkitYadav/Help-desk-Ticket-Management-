import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ticketsApi, usersApi, type Ticket, type Pagination } from "../lib/api";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20",
  PROCESSING: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse",
  OPEN: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  RESOLVED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  CLOSED: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  MEDIUM: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20",
  URGENT: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 animate-pulse",
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
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    category: "",
    priority: "",
    assignedTo: "",
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
    const fetchAgents = async () => {
      try {
        const res = await usersApi.list({ limit: "100" });
        setAgents(res.users);
      } catch (err) {
        console.error("Failed to load agents:", err);
      }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [filters]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignedTo) params.assignedTo = filters.assignedTo;
      if (filters.search) params.search = filters.search;
      params.page = filters.page;
      params.limit = "10";
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
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors block truncate">
              {ticket.subject}
            </span>
            {ticket._count && (
              <span className="text-[11px] text-muted-foreground font-medium mt-0.5 inline-block">
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
            <span className="font-medium text-foreground">{ticket.senderName || ticket.senderEmail}</span>
            {ticket.senderName && (
              <span className="text-xs text-muted-foreground">{ticket.senderEmail}</span>
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
          <span className="inline-flex items-center gap-1.5 bg-muted border border-border px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {ticket.assignedTo.name}
          </span>
        ) : (
          <span className="text-muted-foreground italic">Unassigned</span>
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
      pagination: {
        pageIndex: parseInt(filters.page, 10) - 1,
        pageSize: 10,
      },
    },
    pageCount: pagination?.totalPages ?? 0,
    onSortingChange,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination ? `${pagination.total} total tickets in queue` : "Loading tickets..."}
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 shrink-0 cursor-pointer"
          onClick={() => navigate("/tickets/new")}
        >
          <span>+ New Ticket</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-card p-3.5 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
          <input
            type="text"
            placeholder="Search tickets by subject or sender..."
            className="w-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: "1" })}
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: "1" })}
          className="bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-sm text-foreground outline-none transition-all duration-200 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value, page: "1" })}
          className="bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-sm text-foreground outline-none transition-all duration-200 cursor-pointer"
        >
          <option value="">All Categories</option>
          <option value="GENERAL_QUESTION">General Question</option>
          <option value="TECHNICAL_QUESTION">Technical Question</option>
          <option value="REFUND_REQUEST">Refund Request</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: "1" })}
          className="bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-sm text-foreground outline-none transition-all duration-200 cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <select
          value={filters.assignedTo}
          onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value, page: "1" })}
          className="bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-sm text-foreground outline-none transition-all duration-200 cursor-pointer"
        >
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tickets Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-3 border-border border-t-primary rounded-full animate-spin" />
            <span className="text-sm">Loading tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <span className="text-4xl mb-3">🎫</span>
            <p className="text-base font-semibold text-foreground">No tickets found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria or create a new ticket.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="bg-muted border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {headerGroup.headers.map((header) => {
                        const isSortable = header.column.getCanSort();
                        const sortDirection = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            className={`py-3.5 px-5 select-none ${
                              isSortable
                                ? "cursor-pointer hover:bg-accent hover:text-foreground transition-colors duration-150"
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
                                <span className="inline-block ml-1 text-muted-foreground">
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
                <tbody className="divide-y divide-border/60 text-sm">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/tickets/${row.original.id}`)}
                      className="hover:bg-accent/50 transition-colors duration-150 cursor-pointer group"
                    >
                      {row.getVisibleCells().map((cell) => {
                        let tdClass = "py-4 px-5";
                        if (cell.column.id === "subject") tdClass += " max-w-xs";
                        if (cell.column.id === "category") tdClass += " text-xs text-muted-foreground font-medium";
                        if (cell.column.id === "assignedTo") tdClass += " text-xs text-foreground";
                        if (cell.column.id === "createdAt") tdClass += " text-xs text-muted-foreground whitespace-nowrap";

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

            {/* Pagination Footer */}
            {pagination && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border/60 gap-4 bg-muted/50">
                <div className="text-xs text-muted-foreground font-medium order-2 sm:order-1 select-none">
                  Showing <strong className="text-foreground">{Math.min((parseInt(filters.page, 10) - 1) * 10 + 1, pagination.total)}</strong>–
                  <strong className="text-foreground">{Math.min(parseInt(filters.page, 10) * 10, pagination.total)}</strong> of{" "}
                  <strong className="text-foreground">{pagination.total}</strong> tickets
                </div>
                <div className="flex items-center gap-1.5 order-1 sm:order-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: "1" })}
                    disabled={!table.getCanPreviousPage()}
                    className="flex items-center justify-center p-2 rounded-lg bg-background border border-border hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer min-w-[34px] h-[34px] text-center text-[10px] font-bold"
                    title="First Page"
                  >
                    &lt;&lt;
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: String(parseInt(filters.page, 10) - 1) })}
                    disabled={!table.getCanPreviousPage()}
                    className="flex items-center justify-center p-2 rounded-lg bg-background border border-border hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer min-w-[34px] h-[34px] text-center text-[10px] font-bold"
                    title="Previous Page"
                  >
                    &lt;
                  </button>
                  <span className="text-xs text-muted-foreground px-2 font-medium select-none">
                    Page <strong className="text-foreground">{filters.page}</strong> of <strong className="text-foreground">{pagination.totalPages}</strong>
                  </span>
                  <button
                    onClick={() => setFilters({ ...filters, page: String(parseInt(filters.page, 10) + 1) })}
                    disabled={!table.getCanNextPage()}
                    className="flex items-center justify-center p-2 rounded-lg bg-background border border-border hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer min-w-[34px] h-[34px] text-center text-[10px] font-bold"
                    title="Next Page"
                  >
                    &gt;
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: String(pagination.totalPages) })}
                    disabled={!table.getCanNextPage()}
                    className="flex items-center justify-center p-2 rounded-lg bg-background border border-border hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer min-w-[34px] h-[34px] text-center text-[10px] font-bold"
                    title="Last Page"
                  >
                    &gt;&gt;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
