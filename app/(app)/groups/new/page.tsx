import type { Metadata } from "next";
import { Card } from "@/components/ink/Card";
import { getFriendships, getMyProfile, getProfileMap } from "@/lib/data";
import { NewGroupForm } from "./NewGroupForm";

export const metadata: Metadata = { title: "New group" };

export default async function NewGroupPage() {
  const [profile, friendships, profiles] = await Promise.all([
    getMyProfile(),
    getFriendships(),
    getProfileMap(),
  ]);
  if (!profile) return null;

  const friendIds = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => (f.requester === profile.id ? f.addressee : f.requester))
    .filter((id) => id !== profile.id);

  const friends = [...new Set(friendIds)]
    .map((id) => profiles.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div>
        <p className="eyebrow text-cobalt">A new place to share costs</p>
        <h1 className="mt-4 font-display text-40 font-medium text-navy">New group</h1>
      </div>

      <Card className="p-6 md:p-8">
        <NewGroupForm friends={friends} defaultCurrency={profile.currency} />
      </Card>
    </div>
  );
}
