"use client";

import {
  addExpenseTool,
  addFriend,
  completeOnboarding,
  createGroup,
  fixLastEntry,
  getBalances,
  listReceivable,
  logCashSpending,
  markSettled,
  saveProfileField,
} from "@/app/(app)/voice/actions";

/**
 * The bridge between the agent and the ledger (BUILD.MD §8). Every tool is a
 * thin call into a server action, and every one returns a single sentence for
 * the agent to speak. Tool names here must match the tool names configured on
 * the ElevenLabs agent.
 */
export type ToolEvent = { tool: string; result: string };

export function buildClientTools(onResult: (event: ToolEvent) => void) {
  const wrap =
    <P>(name: string, fn: (params: P) => Promise<string>) =>
    async (params: P) => {
      try {
        const result = await fn(params);
        onResult({ tool: name, result });
        return result;
      } catch {
        const message = "Something went wrong saving that. It is not in your ledger.";
        onResult({ tool: name, result: message });
        return message;
      }
    };

  return {
    save_profile_field: wrap("save_profile_field", saveProfileField),
    complete_onboarding: wrap("complete_onboarding", completeOnboarding),
    add_friend: wrap("add_friend", addFriend),
    create_group: wrap("create_group", createGroup),
    add_expense: wrap("add_expense", addExpenseTool),
    get_balances: wrap("get_balances", getBalances),
    mark_settled: wrap("mark_settled", markSettled),
    list_receivable: wrap("list_receivable", listReceivable),
    log_cash_spending: wrap("log_cash_spending", logCashSpending),
    fix_last_entry: wrap("fix_last_entry", fixLastEntry),
  };
}
