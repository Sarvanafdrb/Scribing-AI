export interface DoctorDashboardChartPoint {
  label: string;
  value: number;
}

export interface DoctorDashboardStats {
  totalPatients: number;
  todayPatients: number;
  weekPatients: number;
  monthPatients: number;
  futureAppointments: number;
  scheduledSurgery: number | null;
  surgeryAvailable: boolean;
  boundaries: {
    selectedDayStart: string;
    periodStart: string;
    periodEnd: string;
    monthStart: string;
  };
  charts: {
    weekTrend: DoctorDashboardChartPoint[];
    todayByHour: DoctorDashboardChartPoint[];
    weekByDay: DoctorDashboardChartPoint[];
    monthTrend: DoctorDashboardChartPoint[];
    appointmentsByDay: DoctorDashboardChartPoint[];
  };
}
