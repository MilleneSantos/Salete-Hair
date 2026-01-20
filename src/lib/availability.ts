import { supabase } from "@/lib/supabase";
import {
  SLOT_INTERVAL_MINUTES,
  TIME_ZONE_OFFSET,
  formatTime,
  timeToMinutes,
  toDateWithOffset,
} from "@/lib/datetime";

type BusinessHoursRow = Record<string, unknown>;

type BusinessHours = {
  open: string;
  close: string;
};

type Interval = {
  start: Date;
  end: Date;
};

function readDayIndex(row: BusinessHoursRow) {
  const raw =
    row.day_of_week ??
    row.weekday ??
    row.day ??
    row.day_index ??
    row.week_day;

  if (raw === null || raw === undefined) {
    return null;
  }

  const day = Number(raw);
  if (Number.isNaN(day)) {
    return null;
  }

  if (day >= 0 && day <= 6) {
    return day;
  }

  if (day >= 1 && day <= 7) {
    return day % 7;
  }

  return null;
}

function readTime(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const hours = value.getHours().toString().padStart(2, "0");
    const minutes = value.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  if (typeof value === "string") {
    return value.trim().slice(0, 5);
  }

  return null;
}

function isClosed(row: BusinessHoursRow) {
  return Boolean(
    row.is_closed ||
      row.closed ||
      row.is_open === false ||
      row.active === false,
  );
}

export function getBusinessHoursForDate(
  date: Date,
  rows: BusinessHoursRow[] | null | undefined,
): BusinessHours | null {
  const dayIndex = date.getDay();
  const fallbackOpen = dayIndex >= 2 && dayIndex <= 6 ? "08:00" : null;
  const fallbackClose = dayIndex >= 2 && dayIndex <= 6 ? "20:00" : null;

  const row = rows?.find((item) => readDayIndex(item) === dayIndex);

  if (!row) {
    if (!fallbackOpen || !fallbackClose) {
      return null;
    }

    return { open: fallbackOpen, close: fallbackClose };
  }

  if (isClosed(row)) {
    return null;
  }

  const open =
    readTime(row.opens_at) ??
    readTime(row.open_time) ??
    readTime(row.start_time) ??
    readTime(row.opens) ??
    readTime(row.open);
  const close =
    readTime(row.closes_at) ??
    readTime(row.close_time) ??
    readTime(row.end_time) ??
    readTime(row.closes) ??
    readTime(row.close);

  if (!open || !close) {
    if (!fallbackOpen || !fallbackClose) {
      return null;
    }

    return { open: fallbackOpen, close: fallbackClose };
  }

  if (timeToMinutes(open) >= timeToMinutes(close)) {
    return null;
  }

  return { open, close };
}

export function toIntervals(
  rows: Array<{ starts_at?: string | null; ends_at?: string | null }>,
) {
  return rows
    .map((row) => ({
      start: row.starts_at ? new Date(row.starts_at) : null,
      end: row.ends_at ? new Date(row.ends_at) : null,
    }))
    .filter((item): item is Interval => Boolean(item.start && item.end));
}

export function buildAvailableSlots(options: {
  dateKey: string;
  durationMinutes: number;
  hours: BusinessHours | null;
  appointments: Interval[];
  blocks: Interval[];
}) {
  const { dateKey, durationMinutes, hours, appointments, blocks } = options;

  if (!hours || durationMinutes <= 0) {
    return [];
  }

  const startOfDay = toDateWithOffset(dateKey, hours.open);
  const endOfDay = toDateWithOffset(dateKey, hours.close);
  const slotDurationMs = durationMinutes * 60 * 1000;
  const stepMs = SLOT_INTERVAL_MINUTES * 60 * 1000;
  const intervals = [...appointments, ...blocks];

  const slots: string[] = [];

  for (
    let time = startOfDay.getTime();
    time + slotDurationMs <= endOfDay.getTime();
    time += stepMs
  ) {
    const slotStart = new Date(time);
    const slotEnd = new Date(time + slotDurationMs);
    const overlaps = intervals.some(
      (interval) => slotStart < interval.end && slotEnd > interval.start,
    );

    if (overlaps) {
      continue;
    }

    slots.push(formatTime(slotStart));
  }

  return slots;
}

export async function getAvailableSlots(
  professionalId: string,
  serviceId: string,
  dateKey: string,
) {
  if (!professionalId || !serviceId || !dateKey) {
    return [];
  }

  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes,duration")
    .eq("id", serviceId)
    .maybeSingle();

  const durationMinutes =
    service?.duration_minutes ?? service?.duration ?? 0;

  if (!durationMinutes) {
    return [];
  }

  const { data: hoursRows } = await supabase
    .from("business_hours")
    .select("*");

  const date = new Date(`${dateKey}T00:00:00${TIME_ZONE_OFFSET}`);
  const hours = getBusinessHoursForDate(date, hoursRows);

  if (!hours) {
    return [];
  }

  const dayStart = new Date(
    `${dateKey}T00:00:00${TIME_ZONE_OFFSET}`,
  ).toISOString();
  const dayEnd = new Date(
    `${dateKey}T23:59:59${TIME_ZONE_OFFSET}`,
  ).toISOString();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("starts_at,ends_at")
    .eq("professional_id", professionalId)
    .eq("status", "confirmed")
    .lt("starts_at", dayEnd)
    .gt("ends_at", dayStart);

  const { data: blocks } = await supabase
    .from("blocks")
    .select("starts_at,ends_at,professional_id")
    .or(`professional_id.eq.${professionalId},professional_id.is.null`)
    .lt("starts_at", dayEnd)
    .gt("ends_at", dayStart);

  return buildAvailableSlots({
    dateKey,
    durationMinutes,
    hours,
    appointments: toIntervals(appointments ?? []),
    blocks: toIntervals(blocks ?? []),
  });
}
