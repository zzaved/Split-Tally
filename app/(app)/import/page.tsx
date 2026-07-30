import type { Metadata } from "next";
import { SectionHeading } from "@/components/ink/Card";
import { getMyProfile } from "@/lib/data";
import { ImportFlow } from "./ImportFlow";

export const metadata: Metadata = { title: "Snap a statement" };

export default async function ImportPage() {
  const profile = await getMyProfile();
  if (!profile) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <SectionHeading eyebrow="Statement snap" title="Read it, don't type it" />
      <ImportFlow userId={profile.id} currency={profile.currency} />
    </div>
  );
}
