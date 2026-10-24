export type GameEvent =
  | {
      type: "skillXpGained";
      skillId: string;
      amount: number;
      level: number;
      xp: number;
    }
  | {
      type: "skillLevelUp";
      skillId: string;
      level: number;
      rankId: string;
    }
  | {
      type: "studyCompleted";
      activityId: string;
      skillId: string;
      xp: number;
    }
  | {
      type: "jobBoardRefreshed";
      day: number;
      jobIds: string[];
    }
  | {
      type: "jobAccepted";
      jobId: string;
      templateId: string;
    }
  | {
      type: "jobCompleted";
      jobId: string;
      templateId: string;
      pay: number;
    }
  | {
      type: "milestoneReached";
      milestoneId: string;
      freelanceCompleted: number;
    }
  | {
      type: "moneyChanged";
      delta: number;
      money: number;
    }
  | {
      type: "energyChanged";
      delta: number;
      energy: number;
    }
  | {
      type: "healthChanged";
      delta: number;
      health: number;
    }
  | {
      type: "moodChanged";
      delta: number;
      mood: number;
    }
  | {
      type: "fullnessChanged";
      delta: number;
      fullness: number;
    }
  | {
      type: "taskStarted";
      jobId: string;
      templateId: string;
    }
  | {
      type: "ticketChosen";
      jobId: string;
      choice: "correct" | "wrong" | "ask";
    }
  | {
      type: "buildChoice";
      jobId: string;
      choice: "careful" | "rushed";
    }
  | {
      type: "randomEventFired";
      jobId: string;
      eventId: string;
    }
  | {
      type: "bugCaught";
      jobId: string;
      caught: number;
      total: number;
    }
  | {
      type: "bugEscaped";
      jobId: string;
      escaped: number;
    }
  | {
      type: "taskSucceeded";
      jobId: string;
      templateId: string;
      pay: number;
    }
  | {
      type: "taskFailed";
      jobId: string;
      templateId: string;
      final: boolean;
      reputationDelta: number;
    }
  | {
      type: "taskRetried";
      jobId: string;
      energy: number;
    };

export type GameEventType = GameEvent["type"];

export type GameEventOf<T extends GameEventType> = Extract<GameEvent, { type: T }>;
