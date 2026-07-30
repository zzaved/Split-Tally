"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { respondToRequest, type ActionResult } from "./actions";

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-2">
      <Button type="submit" name="accept" value="true" size="sm" disabled={pending}>
        Accept
      </Button>
      <Button type="submit" name="accept" value="false" size="sm" variant="ghost" disabled={pending}>
        Decline
      </Button>
    </div>
  );
}

export function RequestActions({ id }: { id: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(respondToRequest, {});

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Buttons />
      {state.error && (
        <p className="text-12 text-vermilion" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
