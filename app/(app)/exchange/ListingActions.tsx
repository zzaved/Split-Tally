"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { FormMessage } from "@/components/ink/Field";
import { buyListing, withdrawListing, type ActionResult } from "./actions";

function Pending({ label, pendingLabel, ...rest }: { label: string; pendingLabel: string } & Record<string, unknown>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} {...rest}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * Buying is behind one confirmation that says plainly that no money moves.
 * The ledger movement behind it is real (BUILD.MD §5.7).
 */
export function BuyButton({
  id,
  price,
  faceValue,
  debtorName,
}: {
  id: string;
  price: string;
  faceValue: string;
  debtorName: string;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(buyListing, {});
  const [confirming, setConfirming] = useState(false);

  if (state.ok) {
    return <FormMessage tone="notice">{state.ok}</FormMessage>;
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={() => setConfirming(true)}>
          Buy this tally
        </Button>
        {state.error && <FormMessage>{state.error}</FormMessage>}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      <div className="rounded-card border border-cobalt/30 bg-cobalt/5 p-5">
        <p className="eyebrow text-cobalt">Demo settlement — no real money moves</p>
        <p className="mt-3 text-14 text-navy">
          You pay {price} now. {debtorName} then owes you {faceValue} instead of the seller. The
          payment itself is simulated for this demo; everything it does to the ledger is real.
        </p>
      </div>

      {state.error && <FormMessage>{state.error}</FormMessage>}

      <div className="flex flex-wrap gap-2">
        <Pending label={`Confirm — pay ${price}`} pendingLabel="Buying…" />
        <Button type="button" variant="ghost" size="lg" onClick={() => setConfirming(false)}>
          Not now
        </Button>
      </div>
    </form>
  );
}

export function WithdrawButton({ id }: { id: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(withdrawListing, {});

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <WithdrawSubmit />
      {state.error && (
        <p className="text-12 text-vermilion" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

function WithdrawSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? "Withdrawing…" : "Withdraw"}
    </Button>
  );
}
