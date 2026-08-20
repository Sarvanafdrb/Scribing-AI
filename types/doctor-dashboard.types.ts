export interface DoctorDashboardChartPoint {
  label: string;
  value: number;
}

export interface DoctorDashboardStats {
  totalPatients: number;
  todayPatients: number;
  weekPatients: number;
  monthPatients: number;
  scheduledSurgery: number | null;
  surgeryAvailable: boolean;
  boundaries: {
    todayStart: string;
    weekStart: string;
    monthStart: string;
    weekEnd: string;
  };
  charts: {
    weekTrend: DoctorDashboardChartPoint[];
    todayByHour: DoctorDashboardChartPoint[];
    weekByDay: DoctorDashboardChartPoint[];
    monthTrend: DoctorDashboardChartPoint[];
  };
}
