// Types for Missions & Stamps customer-facing API

export type MissionRequirementType =
  | "purchase_count"
  | "purchase_amount"
  | "specific_item"
  | "referral"
  | "event_checkin"
  | "reusable_cup"
  | string;

export type MissionStatus = "active" | "inactive" | string;

export type CustomerMissionStatus = "pending" | "in_progress" | "completed" | string;

export type Mission = {
  id: number;
  name: string;
  description?: string | null;
  requirement_type: MissionRequirementType;
  target_value: number;
  reward_points?: number | null;
  reward_description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: MissionStatus;
  icon?: string | null;
  // injected progress when fetched via /customer/missions
  my_progress?: CustomerMissionProgress | null;
};

export type CustomerMissionProgress = {
  id?: number;
  progress: number;
  status: CustomerMissionStatus;
  accepted_at?: string | null;
  completed_at?: string | null;
};

export type CustomerMission = {
  id: number;
  mission: Mission;
  progress: number;
  status: CustomerMissionStatus;
  accepted_at?: string | null;
  completed_at?: string | null;
};

export type StampCategory = "drink" | "event" | "referral" | "achievement" | "seasonal" | string;

export type Stamp = {
  id: number;
  stamp_name: string;
  category?: StampCategory | null;
  description?: string | null;
  icon?: string | null;
  trigger_condition?: string | null;
  bonus_points?: number | null;
};

export type CustomerStamp = {
  id: number;
  stamp: Stamp;
  earned_at?: string | null;
  source?: string | null;
};
