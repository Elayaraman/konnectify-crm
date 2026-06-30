import { useState, type FormEvent } from "react";

import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCRMStore } from "@/store/useCRMStore";
import type { ApiSuccessResponse, Ticket } from "@/types";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type CopilotResult =
  | {
      type: "clarify";
      question: string;
    }
  | {
      type: "action";
      action: "created" | "updated";
      ticket: Ticket;
    }
  | {
      type: "action";
      action: "deleted";
      ticket_id: number;
    }
  | {
      type: "list";
      tickets: Ticket[];
      mode: "list" | "count";
    };

const initialMessages: ChatMessage[] = [
  {
    role: "assistant",
    text: "Konnectify Copilot is ready. Ask me to create, update, or list tickets.",
  },
];

function formatStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function describeResult(result: CopilotResult): string {
  if (result.type === "clarify") {
    return result.question;
  }

  if (result.type === "action") {
    if (result.action === "deleted") {
      return `Deleted ticket #${result.ticket_id}`;
    }

    const verb = result.action === "created" ? "Created" : "Updated";
    return `${verb} ticket #${result.ticket.id}: ${result.ticket.title}`;
  }

  if (result.type === "list") {
    if (result.mode === "count") {
      return `You have ${result.tickets.length} ticket(s) matching that criteria.`;
    }

    if (result.tickets.length === 0) {
      return "No matching tickets found.";
    }

    return result.tickets
      .map(
        (ticket) =>
          `#${ticket.id} ${ticket.title} - ${formatStatus(ticket.status)}`,
      )
      .join("\n");
  }

  return "Unknown result type.";
}

export function Copilot() {
  const addTicket = useCRMStore((state) => state.addTicket);
  const updateTicket = useCRMStore((state) => state.updateTicket);
  const removeTicket = useCRMStore((state) => state.removeTicket);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || isLoading) {
      return;
    }

    setInput("");
    setIsLoading(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      { role: "user", text: message },
    ]);

    try {
      const response = await apiClient.post<ApiSuccessResponse<CopilotResult>>(
        "/copilot",
        {
          message,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      );
      const result = response.data.data;

      if (result.type === "action") {
        if (result.action === "created") {
          addTicket(result.ticket);
        } else if (result.action === "updated") {
          updateTicket(result.ticket);
        } else if (result.action === "deleted") {
          removeTicket(result.ticket_id);
        }
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", text: describeResult(result) },
      ]);
    } catch (caughtError) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          text:
            caughtError instanceof Error
              ? caughtError.message
              : "Copilot could not process that request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside className="flex h-full flex-col border-l border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-5">
        <p className="text-base font-semibold text-neutral-950">
          Konnectify Copilot
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Create, update, and list tickets with natural language.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messages.map((message, index) => (
          <div
            className={[
              "rounded-lg border px-3 py-2 text-sm leading-6",
              message.role === "user"
                ? "ml-6 border-neutral-900 bg-neutral-900 text-white"
                : "mr-6 border-neutral-200 bg-neutral-50 text-neutral-700",
            ].join(" ")}
            key={`${message.role}-${index}`}
          >
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
        ))}
        {isLoading ? (
          <div className="mr-6 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            Thinking...
          </div>
        ) : null}
      </div>

      <form className="border-t border-neutral-200 p-5" onSubmit={handleSubmit}>
        <Input
          aria-label="Copilot message"
          disabled={isLoading}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Create a high priority ticket for Rapido..."
          value={input}
        />
        <Button className="mt-3 w-full" disabled={isLoading || !input.trim()} type="submit">
          Send
        </Button>
      </form>
    </aside>
  );
}
