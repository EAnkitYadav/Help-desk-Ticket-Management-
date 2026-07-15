import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReplyThread } from "../ReplyThread";
import { aiApi, type Ticket } from "../../lib/api";

// Mock the API client
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual,
    aiApi: {
      polishReply: vi.fn(),
      summarize: vi.fn(),
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
  comments: [
    {
      id: "comment-1",
      body: "Agent response body text.",
      isInternal: false,
      isAiGenerated: false,
      ticketId: "ticket-123",
      authorId: "agent-1",
      author: { id: "agent-1", name: "Agent Smith", email: "agent@example.com" },
      createdAt: "2026-07-14T09:10:00.000Z",
      updatedAt: "2026-07-14T09:10:00.000Z",
    },
  ],
};

describe("ReplyThread Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the original description and comments correctly", () => {
    render(<ReplyThread ticket={mockTicket} onReplySubmit={vi.fn()} />);

    // Check sender info
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("CUSTOMER")).toBeInTheDocument();

    // Check description text
    expect(
      screen.getByText("This is a test ticket description.")
    ).toBeInTheDocument();

    // Check agent comments
    expect(screen.getByText("Agent Smith")).toBeInTheDocument();
    expect(screen.getByText("AGENT")).toBeInTheDocument();
    expect(screen.getByText("Agent response body text.")).toBeInTheDocument();
  });

  it("renders the reply form when the ticket status is OPEN", () => {
    render(<ReplyThread ticket={mockTicket} onReplySubmit={vi.fn()} />);

    expect(
      screen.getByPlaceholderText("Write your reply to the customer...")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Reply" })
    ).toBeInTheDocument();
  });

  it("does not render the reply form when the ticket status is CLOSED", () => {
    const closedTicket = { ...mockTicket, status: "CLOSED" as const };
    render(<ReplyThread ticket={closedTicket} onReplySubmit={vi.fn()} />);

    expect(
      screen.queryByPlaceholderText("Write your reply to the customer...")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send Reply" })
    ).not.toBeInTheDocument();
  });

  it("calls onReplySubmit when typing and clicking submit", async () => {
    const onReplySubmitMock = vi.fn().mockResolvedValue(undefined);
    render(<ReplyThread ticket={mockTicket} onReplySubmit={onReplySubmitMock} />);

    const textarea = screen.getByPlaceholderText(
      "Write your reply to the customer..."
    );
    const submitBtn = screen.getByRole("button", { name: "Send Reply" });

    // Type a reply
    fireEvent.change(textarea, { target: { value: "Hello customer, here is help." } });
    expect(textarea).toHaveValue("Hello customer, here is help.");

    // Submit form
    fireEvent.click(submitBtn);

    expect(onReplySubmitMock).toHaveBeenCalledWith(
      "Hello customer, here is help."
    );
    
    // Wait for the textarea to be cleared
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("calls aiApi.polishReply when Polish button is clicked and updates textarea", async () => {
    vi.mocked(aiApi.polishReply).mockResolvedValue({
      polishedText: "Polished response from AI.",
    });

    render(<ReplyThread ticket={mockTicket} onReplySubmit={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(
      "Write your reply to the customer..."
    );
    const polishBtn = screen.getByRole("button", { name: "✨ Polish" });

    // Type a draft reply
    fireEvent.change(textarea, { target: { value: "Draft reply" } });

    // Click Polish button
    fireEvent.click(polishBtn);

    expect(aiApi.polishReply).toHaveBeenCalledWith("Draft reply", "ticket-123");

    // Wait for the textarea to be updated with polished text
    await waitFor(() => {
      expect(textarea).toHaveValue("Polished response from AI.");
    });
  });

  it("calls aiApi.summarize when Summarize button is clicked and displays the summary", async () => {
    vi.mocked(aiApi.summarize).mockResolvedValue({
      summary: "This is a generated ticket summary.",
    });

    render(<ReplyThread ticket={mockTicket} onReplySubmit={vi.fn()} />);

    // Find the summarize button
    const summarizeBtn = screen.getByRole("button", { name: /Summarize Ticket/i });
    expect(summarizeBtn).toBeInTheDocument();

    // Click it
    fireEvent.click(summarizeBtn);

    expect(aiApi.summarize).toHaveBeenCalledWith("ticket-123");

    // Wait for the summary container to appear
    await waitFor(() => {
      expect(screen.getByText("This is a generated ticket summary.")).toBeInTheDocument();
    });
  });
});

