"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteExpense, type ActionResult } from "../actions";

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="eyebrow rounded-full px-2.5 py-1.5 text-ink-soft transition-colors duration-150 hover:bg-vermilion/8 hover:text-vermilion disabled:opacity-50"
    >
      {pending ? "Removing" : "Remove"}
    </button>
  );
}

export function DeleteExpense({ id }: { id: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(deleteExpense, {});

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <RemoveButton />
      {state.error && (
        <span className="sr-only" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
