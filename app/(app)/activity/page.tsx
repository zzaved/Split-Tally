import type { Metadata } from "next";
import { ActivityItem } from "@/components/app/ActivityItem";
import { Card, SectionHeading } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { formatDayHeading } from "@/lib/format";
import { getActivity, getProfileMap } from "@/lib/data";
import type { Activity } from "@/lib/types";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const [activity, profiles] = await Promise.all([getActivity(200), getProfileMap()]);

  // Grouped by day, so the feed reads as a diary rather than a log.
  const days = new Map<string, Activity[]>();
  for (const item of activity) {
    const key = item.created_at.slice(0, 10);
    days.set(key, [...(days.get(key) ?? []), item]);
  }

  return (
    <div className="flex flex-col gap-10">
      <SectionHeading eyebrow="Everything, in order" title="Activity" />

      {activity.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing tallied yet"
            copy="Expenses, settlements, sales and weekly tallies all land here so you can retrace the story of your money."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-10">
          {[...days.entries()].map(([day, items]) => (
            <section key={day}>
              <p className="eyebrow text-cobalt">{formatDayHeading(day)}</p>
              <Card className="mt-4 px-6">
                <ul>
                  {items.map((item) => (
                    <ActivityItem key={item.id} item={item} profiles={profiles} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
