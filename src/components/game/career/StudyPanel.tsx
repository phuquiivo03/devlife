"use client";

import { SIM_CATALOG } from "@/game/career/content";
import type { PlayerStudyCompletion, StudyActivity } from "@/game/career/types";
import { canStudyCourse, studyBlockReason } from "@/game/knowledge/logic";
import { energyCost } from "@/game/life/logic";
import { useGameStore } from "@/game/state/store";
import { formatVnd } from "@/lib/format-currency";
import { Button, PixelButton } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PixelIcon } from "../PixelIcon";
import { BlockedButton } from "./BlockedButton";

export function StudyPanel({ iconFiles }: { iconFiles: readonly string[] }) {
  const money = useGameStore((s) => s.career.players.money);
  const energy = useGameStore((s) => s.career.players.energy);
  const completions = useGameStore((s) => s.career.player_study_completions);
  const workStreak = useGameStore((s) => s.career.life.workStreak);
  const buyCourse = useGameStore((s) => s.buyCourse);
  const open = SIM_CATALOG.studyActivities.filter((activity) =>
    canStudyCourse(activity, completions),
  );
  const done = completions.flatMap((completion) => {
    const activity = SIM_CATALOG.studyActivities.find(
      (row) => row.id === completion.activity_id,
    );
    return activity ? [{ activity, completion }] : [];
  });

  return (
    <Tabs defaultValue="open" className="flex flex-col gap-3">
      <TabsList className="grid h-11 w-full grid-cols-2">
        <TabsTrigger value="open" data-testid="courses-tab-open">
          Khóa học
        </TabsTrigger>
        <TabsTrigger value="done" data-testid="courses-tab-done">
          Đã học
        </TabsTrigger>
      </TabsList>
      <TabsContent value="open" data-testid="courses-open">
        {open.length === 0 ? (
          <CourseEmpty
            testId="courses-empty-open"
            label="Không còn khóa để học."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {open.map((activity, index) => (
              <CourseOffer
                key={activity.id}
                activity={activity}
                index={index}
                money={money}
                energy={energy}
                workStreak={workStreak}
                iconFiles={iconFiles}
                onBuy={buyCourse}
              />
            ))}
          </ul>
        )}
      </TabsContent>
      <TabsContent value="done" data-testid="courses-done">
        {done.length === 0 ? (
          <CourseEmpty testId="courses-empty-done" label="Chưa học khóa nào." />
        ) : (
          <ul className="flex flex-col gap-2">
            {done.map(({ activity, completion }, index) => (
              <CourseRecord
                key={activity.id}
                activity={activity}
                completion={completion}
                index={index}
                iconFiles={iconFiles}
              />
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

function CourseEmpty({ label, testId }: { label: string; testId: string }) {
  return (
    <p
      data-testid={testId}
      className="py-6 text-center font-galmuri-9 text-galmuri-body text-[var(--muted-foreground)]"
    >
      {label}
    </p>
  );
}

function CourseOffer({
  activity,
  index,
  money,
  energy,
  workStreak,
  iconFiles,
  onBuy,
}: {
  activity: StudyActivity;
  index: number;
  money: number;
  energy: number;
  workStreak: number;
  iconFiles: readonly string[];
  onBuy: (activityId: string, force?: boolean) => void;
}) {
  const skill = SIM_CATALOG.skills.find((row) => row.id === activity.skill_id);
  const xp = SIM_CATALOG.studyActivityXp
    .filter((row) => row.activity_id === activity.id)
    .reduce((sum, row) => sum + row.xp, 0);
  const cost = energyCost(activity.energy, workStreak);
  const reason = studyBlockReason(money, energy, {
    price: activity.price,
    energy: cost,
  });
  const canForce = money >= activity.price && energy < cost;
  return (
    <li
      data-testid={`course-card-${activity.id}`}
      className="card-slide flex items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--panel-border)] bg-white/50 p-2"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <PixelIcon name={activity.icon} size={44} alt="" files={iconFiles} />
      <div className="min-w-0 flex-1">
        <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
          {activity.name}
        </p>
        <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
          {skill?.name} · {formatVnd(activity.price)} · {activity.hours} giờ ·{" "}
          {Math.ceil(cost)} năng lượng · {xp} XP
        </p>
      </div>
      {reason ? (
        <div className="flex flex-col gap-1">
          {canForce ? (
            <PixelButton
              type="button"
              data-testid={`course-force-${activity.id}`}
              onClick={() => onBuy(activity.id, true)}
            >
              Cố học
            </PixelButton>
          ) : (
            <BlockedButton
              label="Học"
              reason={reason}
              testId={`course-buy-${activity.id}`}
            />
          )}
        </div>
      ) : (
        <PixelButton
          type="button"
          data-testid={`course-buy-${activity.id}`}
          onClick={() => onBuy(activity.id)}
        >
          Học
        </PixelButton>
      )}
    </li>
  );
}

function CourseRecord({
  activity,
  completion,
  index,
  iconFiles,
}: {
  activity: StudyActivity;
  completion: PlayerStudyCompletion;
  index: number;
  iconFiles: readonly string[];
}) {
  const skill = SIM_CATALOG.skills.find(
    (row) => row.id === completion.skill_id,
  );
  return (
    <li
      data-testid={`course-done-${activity.id}`}
      className="card-slide flex items-center gap-3 rounded-[var(--radius-panel)] border border-[var(--panel-border)] bg-white/50 p-2"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <PixelIcon name={activity.icon} size={44} alt="" files={iconFiles} />
      <div className="min-w-0 flex-1">
        <p className="font-galmuri-9 text-galmuri-body text-[var(--foreground)]">
          {activity.name}
        </p>
        <p className="font-galmuri-7 text-galmuri-small text-[var(--muted-foreground)]">
          {skill?.name} · {completion.xp_gained} XP · Ngày{" "}
          {completion.completed_day}
        </p>
      </div>
    </li>
  );
}
