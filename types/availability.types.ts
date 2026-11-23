export type AvailabilityUserType = "doctor" | "staff";

export type WorkingSession = {
  startTime: string;
  endTime: string;
};

export type DayBreak = {
  startTime: string;
  endTime: string;
};

export type WeeklyDaySchedule = {
  dayOfWeek: number;
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
  workingSessions?: WorkingSession[];
  breaks?: DayBreak[];
};

export type AvailabilityExceptionType =
  | "unavailable_full"
  | "unavailable_partial"
  | "custom_hours"
  | "leave_partial";

export type AvailabilityException = {
  _id: string;
  organizationId: string;
  userId: string;
  userType: AvailabilityUserType;
  date: string;
  exceptionType: AvailabilityExceptionType;
  workingSessions?: WorkingSession[];
  blockedStartTime?: string;
  blockedEndTime?: string;
  reason?: string;
  status: "active" | "cancelled";
};

export type LeaveRecord = {
  _id: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  doctorId?: string;
  staffId?: string;
};

export type DoctorSchedule = {
  timeZone?: string;
  consultationMinutes?: number;
  bufferMinutes?: number;
  weekly: WeeklyDaySchedule[];
  isActive?: boolean;
};

export type StaffSchedule = {
  timeZone?: string;
  weekly: WeeklyDaySchedule[];
  isActive?: boolean;
};

export type ScheduleChangeWarning = {
  appointmentId: string;
  appointmentCode?: string;
  scheduledStart: string;
  scheduledEnd: string;
  message: string;
};

export type ResolvedDayAvailability = {
  date: string;
  isOnFullDayLeave: boolean;
  unavailableFull: boolean;
  isWorking: boolean;
  isBookable: boolean;
  sessions: WorkingSession[];
  breaks: DayBreak[];
  partialBlocks: Array<{
    startTime: string;
    endTime: string;
    exceptionType: string;
  }>;
  source: string;
};

export type SelfAvailabilityResponse = {
  userType: AvailabilityUserType;
  schedule: DoctorSchedule | StaffSchedule | null;
};

export type AdminAvailabilityUserRow = {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleId?: { name?: string };
    qualifications?: string;
    specialization?: string;
    departmentId?: { name?: string };
  };
  schedule: DoctorSchedule | StaffSchedule | null;
  day?: ResolvedDayAvailability;
};