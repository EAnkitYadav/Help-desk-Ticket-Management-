import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TicketDetails } from "../TicketDetails";
import { ticketsApi, type Ticket, type User } from "../../lib/api";

// Mock the API client
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual,
    ticketsApi: {
      update: vi.fn(),
      addMessage: vi.fn(),
      get: vi.fn(),
    },
  };
});

const mockTicket: Ticket = {
  id: "ticket-123",
  subject: "Test Ticket Subject",
  description: "This is a test ticket description.",
  senderEmail: "customer@example.com",
  senderName: "Jane Doe",
  status: "OPEN",
  category: "TECHNICAL_QUESTION",
  priority: "HIGH",
  aiSummary: null,
  aiSuggestedReply: null,
  assignedToId: null,
  assignedTo: null,
  createdAt: "2026-07-14T09:00:00.000Z",
  updatedAt: "2026-07-14T09:00:00.000Z",
  comments: [],
};

const mockAgents: User[] = [
  { id: "agent-1", name: "Sarah Johnson", email: "sarah@example.com", role: "AGENT" },
  { id: "agent-2", name: "Mike Chen", email: "mike@example.com", role: "AGENT" },
];

describe("TicketDetails Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ticket subject and customer info correctly", () => {
    render(
      <TicketDetails
        ticket={mockTicket}
        agents={mockAgents}
        onTicketUpdate={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Test Ticket Subject")).toBeInTheDocument();
    expect(screen.getByText("customer@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Jane Doe")[0]).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    const onBackMock = vi.fn();
    render(
      <TicketDetails
        ticket={mockTicket}
        agents={mockAgents}
        onTicketUpdate={vi.fn()}
        onBack={onBackMock}
      />
    );

    const backBtn = screen.getByRole("button", { name: "← Back" });
    fireEvent.click(backBtn);
    expect(onBackMock).toHaveBeenCalled();
  });

  it("resolves ticket and calls onTicketUpdate on status change click", async () => {
    const updatedTicket = { ...mockTicket, status: "RESOLVED" as const };
    vi.mocked(ticketsApi.update).mockResolvedValue({ ticket: updatedTicket });
    
    const onTicketUpdateMock = vi.fn();

    render(
      <TicketDetails
        ticket={mockTicket}
        agents={mockAgents}
        onTicketUpdate={onTicketUpdateMock}
      />
    );

    const resolveBtn = screen.getByRole("button", { name: "✅ Resolve" });
    fireEvent.click(resolveBtn);

    expect(ticketsApi.update).toHaveBeenCalledWith("ticket-123", {
      status: "RESOLVED",
    });

    await waitFor(() => {
      expect(onTicketUpdateMock).toHaveBeenCalledWith(updatedTicket);
    });
  });

  it("handles assignment dropdown change and updates state", async () => {
    const updatedTicket = { ...mockTicket, assignedToId: "agent-1" };
    vi.mocked(ticketsApi.update).mockResolvedValue({ ticket: updatedTicket });

    const onTicketUpdateMock = vi.fn();

    render(
      <TicketDetails
        ticket={mockTicket}
        agents={mockAgents}
        onTicketUpdate={onTicketUpdateMock}
      />
    );

    const select = screen.getByRole("combobox", { name: "Assignment" });
    fireEvent.change(select, { target: { value: "agent-1" } });

    expect(ticketsApi.update).toHaveBeenCalledWith("ticket-123", {
      assignedToId: "agent-1",
    });

    await waitFor(() => {
      expect(onTicketUpdateMock).toHaveBeenCalledWith(updatedTicket);
    });
  });
});
