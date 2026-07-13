import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ticketsApi } from "../lib/api";
import { FormField } from "../components/FormField";
import { createTicketSchema, type CreateTicketFormData } from "../lib/schemas";

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      senderEmail: "",
      senderName: "",
      subject: "",
      body: "",
      category: "",
      priority: "",
    },
  });

  const onSubmit = async (data: CreateTicketFormData) => {
    setServerError("");
    try {
      const result = await ticketsApi.create({
        subject: data.subject,
        body: data.body,
        senderEmail: data.senderEmail,
        senderName: data.senderName || null,
        category: data.category || null,
        priority: data.priority || null,
      } as any);
      navigate(`/tickets/${result.ticket.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to create ticket");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between pb-4 border-b border-[#2e3140]">
        <div className="flex items-center gap-4">
          <button
            className="px-3 py-1.5 rounded-xl bg-[#1a1d27] hover:bg-[#22262f] border border-[#2e3140] text-xs font-semibold text-[#9499a8] hover:text-white transition-colors duration-150 cursor-pointer"
            onClick={() => navigate("/tickets")}
          >
            ← Back to Tickets
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Create New Ticket</h1>
        </div>
      </div>

      <div className="bg-[#1a1d27] border border-[#2e3140] rounded-2xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
          {serverError && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-fade-in">
              <span className="text-lg">⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Customer Email" error={errors.senderEmail} required id="sender-email">
              <input
                id="sender-email"
                type="email"
                {...register("senderEmail")}
                placeholder="customer@example.com"
                className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-sm text-[#e4e6ec] placeholder-[#6b7080] outline-none transition-all duration-200"
              />
            </FormField>

            <FormField label="Customer Name" error={errors.senderName} id="sender-name">
              <input
                id="sender-name"
                type="text"
                {...register("senderName")}
                placeholder="John Doe"
                className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-sm text-[#e4e6ec] placeholder-[#6b7080] outline-none transition-all duration-200"
              />
            </FormField>
          </div>

          <FormField label="Subject" error={errors.subject} required id="ticket-subject">
            <input
              id="ticket-subject"
              type="text"
              {...register("subject")}
              placeholder="Brief summary of the issue"
              className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-sm text-[#e4e6ec] placeholder-[#6b7080] outline-none transition-all duration-200"
            />
          </FormField>

          <FormField label="Description" error={errors.body} required id="ticket-body">
            <textarea
              id="ticket-body"
              {...register("body")}
              rows={6}
              placeholder="Describe the issue in detail…"
              className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-[#e4e6ec] placeholder-[#6b7080] outline-none transition-all duration-200 resize-y"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Category" error={errors.category} id="ticket-category">
              <select
                id="ticket-category"
                {...register("category")}
                className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-sm text-[#e4e6ec] outline-none transition-all duration-200 cursor-pointer"
              >
                <option value="">Select Category</option>
                <option value="GENERAL_QUESTION">General Question</option>
                <option value="TECHNICAL_QUESTION">Technical Question</option>
                <option value="REFUND_REQUEST">Refund Request</option>
              </select>
            </FormField>

            <FormField label="Priority" error={errors.priority} id="ticket-priority">
              <select
                id="ticket-priority"
                {...register("priority")}
                className="w-full bg-[#0f1117] border border-[#2e3140] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-2.5 text-sm text-[#e4e6ec] outline-none transition-all duration-200 cursor-pointer"
              >
                <option value="">Select Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2e3140]">
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-transparent hover:bg-[#22262f] text-sm font-semibold text-[#9499a8] hover:text-white transition-colors duration-150 cursor-pointer"
              onClick={() => navigate("/tickets")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                "Create Ticket"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
