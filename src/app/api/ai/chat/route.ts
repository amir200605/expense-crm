import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { SessionUser } from "@/lib/permissions";
import OpenAI from "openai";
import { crmToolDefinitions, executeCrmTool } from "@/lib/ai/crm-tools";

const SYSTEM_PROMPT = `You are ExpenseFlow AI, the intelligent assistant for a Final Expense CRM.

You help agency owners, managers, and agents by answering questions about their CRM data — leads, clients, policies, commissions, chargebacks, tasks, appointments, team members, and overall business performance.

You have access to tools that query the CRM database in real-time. Use them whenever the user asks about data, numbers, or statistics. Always call the relevant tool(s) before answering data questions — never guess or make up numbers.

When presenting data:
- Format currency as $X,XXX.XX
- Use percentages where helpful (e.g. conversion rate = sold / total leads)
- Be concise but insightful — offer observations or suggestions when relevant
- If the user asks something you can't answer with the available tools, say so honestly

You are friendly, professional, and knowledgeable about the final expense insurance industry.`;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as SessionUser;
  const agencyId = user.agencyId;
  if (!agencyId) {
    return NextResponse.json({ error: "No agency" }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to your .env file." },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const body = await req.json().catch(() => ({}));
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = body.messages ?? [];

  if (!messages.length) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  try {
    const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    let response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: allMessages,
      tools: crmToolDefinitions,
      tool_choice: "auto",
      max_tokens: 1024,
    });

    let assistantMessage = response.choices[0]?.message;

    // Handle tool calls (loop up to 5 rounds for multi-tool queries)
    let rounds = 0;
    while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && rounds < 5) {
      rounds++;
      allMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const result = await executeCrmTool(toolCall.function.name, agencyId);
        allMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: allMessages,
        tools: crmToolDefinitions,
        tool_choice: "auto",
        max_tokens: 1024,
      });

      assistantMessage = response.choices[0]?.message;
    }

    return NextResponse.json({
      message: assistantMessage?.content ?? "I couldn't generate a response.",
      role: "assistant",
    });
  } catch (error: unknown) {
    console.error("AI chat error:", error);
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
