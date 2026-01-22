import { supabase } from "@/lib/supabase";
import {
  SERVICE_GAP_MINUTES,
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

type PackageItem = {
  service_id: string;
  professional_id: string;
  duration_minutes: number;
};

export type PackageStep = PackageItem & {
  starts_at: Date;
  ends_at: Date;
  order_index: number;
};

export function getLunchInterval(dateKey: string): Interval {
  return {
    start: toDateWithOffset(dateKey, "12:00"),
    end: toDateWithOffset(dateKey, "13:00"),
  };
}

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

function groupIntervalsByProfessional(
  rows: Array<{
    professional_id?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
  }>,
) {
  const map = new Map<string, Interval[]>();

  rows.forEach((row) => {
    const professionalId = row.professional_id ?? "";
    const start = row.starts_at ? new Date(row.starts_at) : null;
    const end = row.ends_at ? new Date(row.ends_at) : null;
    if (!professionalId || !start || !end) {
      return;
    }
    const list = map.get(professionalId) ?? [];
    list.push({ start, end });
    map.set(professionalId, list);
  });

  return map;
}

function groupBlocks(
  rows: Array<{
    professional_id?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
  }>,
) {
  const byProfessional = new Map<string, Interval[]>();
  const general: Interval[] = [];

  rows.forEach((row) => {
    const start = row.starts_at ? new Date(row.starts_at) : null;
    const end = row.ends_at ? new Date(row.ends_at) : null;
    if (!start || !end) {
      return;
    }
    if (!row.professional_id) {
      general.push({ start, end });
      return;
    }
    const list = byProfessional.get(row.professional_id) ?? [];
    list.push({ start, end });
    byProfessional.set(row.professional_id, list);
  });

  return { byProfessional, general };
}

export function buildPackageSchedule(options: {
  dateKey: string;
  startTime: string;
  items: PackageItem[];
  gapMinutes?: number;
}) {
  const { dateKey, startTime, items, gapMinutes = SERVICE_GAP_MINUTES } =
    options;
  let cursor = toDateWithOffset(dateKey, startTime);
  const gapMs = gapMinutes * 60 * 1000;

  const steps = items.map((item, index) => {
    const startsAt = new Date(cursor);
    const endsAt = new Date(
      cursor.getTime() + item.duration_minutes * 60 * 1000,
    );
    cursor = new Date(endsAt.getTime() + gapMs);
    return {
      ...item,
      starts_at: startsAt,
      ends_at: endsAt,
      order_index: index,
    };
  });

  const startsAt = steps[0]?.starts_at ?? null;
  const endsAt = steps[steps.length - 1]?.ends_at ?? null;

  return { steps, startsAt, endsAt };
}

function overlapsInterval(start: Date, end: Date, intervals: Interval[]) {
  return intervals.some(
    (interval) => start < interval.end && end > interval.start,
  );
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
  const intervals = [...appointments, ...blocks, getLunchInterval(dateKey)];

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

export async function getAvailablePackageSlots(options: {
  dateKey: string;
  items: PackageItem[];
}) {
  const { dateKey, items } = options;

  if (!dateKey || items.length === 0) {
    return [];
  }

  const durationMinutes = items.reduce(
    (total, item) => total + item.duration_minutes,
    0,
  );
  const gapMinutes = SERVICE_GAP_MINUTES * Math.max(items.length - 1, 0);
  const totalMinutes = durationMinutes + gapMinutes;

  if (totalMinutes <= 0) {
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

  const professionalIds = Array.from(
    new Set(items.map((item) => item.professional_id).filter(Boolean)),
  );

  const [{ data: appointments }, { data: appointmentServices }, { data: blocks }] =
    await Promise.all([
      professionalIds.length
        ? supabase
            .from("appointments")
            .select("professional_id,starts_at,ends_at")
            .eq("status", "confirmed")
            .in("professional_id", professionalIds)
            .lt("starts_at", dayEnd)
            .gt("ends_at", dayStart)
        : Promise.resolve({ data: [] }),
      professionalIds.length
        ? supabase
            .from("appointment_services")
            .select("professional_id,starts_at,ends_at")
            .in("professional_id", professionalIds)
            .lt("starts_at", dayEnd)
            .gt("ends_at", dayStart)
        : Promise.resolve({ data: [] }),
      supabase
        .from("blocks")
        .select("professional_id,starts_at,ends_at")
        .lt("starts_at", dayEnd)
        .gt("ends_at", dayStart),
    ]);

  const appointmentMap = groupIntervalsByProfessional(
    (appointments ?? []) as Array<{
      professional_id?: string | null;
      starts_at?: string | null;
      ends_at?: string | null;
    }>,
  );
  const appointmentServiceMap = groupIntervalsByProfessional(
    (appointmentServices ?? []) as Array<{
      professional_id?: string | null;
      starts_at?: string | null;
      ends_at?: string | null;
    }>,
  );
  const { byProfessional: blockMap, general: generalBlocks } = groupBlocks(
    (blocks ?? []) as Array<{
      professional_id?: string | null;
      starts_at?: string | null;
      ends_at?: string | null;
    }>,
  );

  const intervalsByProfessional = new Map<string, Interval[]>();
  professionalIds.forEach((id) => {
    const intervals = [
      ...(appointmentMap.get(id) ?? []),
      ...(appointmentServiceMap.get(id) ?? []),
      ...(blockMap.get(id) ?? []),
      ...generalBlocks,
    ];
    intervalsByProfessional.set(id, intervals);
  });

  const lunchInterval = getLunchInterval(dateKey);
  const startOfDay = toDateWithOffset(dateKey, hours.open);
  const endOfDay = toDateWithOffset(dateKey, hours.close);
  const stepMs = SLOT_INTERVAL_MINUTES * 60 * 1000;
  const totalMs = totalMinutes * 60 * 1000;
  const gapMs = SERVICE_GAP_MINUTES * 60 * 1000;

  const slots: string[] = [];

  for (
    let time = startOfDay.getTime();
    time + totalMs <= endOfDay.getTime();
    time += stepMs
  ) {
    let cursor = time;
    let isValid = true;

    for (const item of items) {
      const stepStart = new Date(cursor);
      const stepEnd = new Date(
        cursor + item.duration_minutes * 60 * 1000,
      );

      if (stepStart < lunchInterval.end && stepEnd > lunchInterval.start) {
        isValid = false;
        break;
      }

      const intervals = intervalsByProfessional.get(item.professional_id) ?? [];
      if (overlapsInterval(stepStart, stepEnd, intervals)) {
        isValid = false;
        break;
      }

      cursor = stepEnd.getTime() + gapMs;
    }

    if (isValid) {
      slots.push(formatTime(new Date(time)));
    }
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
    .select("duration_minutes")
    .eq("id", serviceId)
    .maybeSingle();

  const durationMinutes = service?.duration_minutes ?? 0;

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
