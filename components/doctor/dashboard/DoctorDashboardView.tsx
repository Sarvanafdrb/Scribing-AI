"use client";

import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DoctorDashboardChartPoint,
  DoctorDashboardStats,
} from "@/types/doctor-dashboard.types";
import { useDoctorChartTheme } from "./useDoctorChartTheme";

interface StatCardConfig {
  key: keyof Pick<
    DoctorDashboardStats,
    "totalPatients" | "todayPatients" | "weekPatients" | "monthPatients"
  >;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  chartColor: string;
  chartType: "area" | "bar" | "line";
  dataKey: keyof DoctorDashboardStats["charts"];
}

interface DoctorDashboardViewProps {
  stats: DoctorDashboardStats;
  cards: StatCardConfig[];
}

function pct(value: number, total: number) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function MiniChart({
  data,
  color,
  type,
}: {
  data: DoctorDashboardChartPoint[];
  color: string;
  type: "area" | "bar" | "line";
}) {
  const theme = useDoctorChartTheme();
  const chartData = data.length ? data : [{ label: "-", value: 0 }];

  return (
    <div className="mt-4 h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={chartData} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: theme.axis, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: theme.tooltipBg,
                border: `1px solid ${theme.tooltipBorder}`,
                borderRadius: 12,
                color: theme.tooltipText,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        ) : type === "line" ? (
          <LineChart data={chartData} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: theme.axis, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: theme.tooltipBg,
                border: `1px solid ${theme.tooltipBorder}`,
                borderRadius: 12,
                color: theme.tooltipText,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        ) : (
          <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id={`area-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: theme.axis, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: theme.tooltipBg,
                border: `1px solid ${theme.tooltipBorder}`,
                borderRadius: 12,
                color: theme.tooltipText,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#area-${color})`}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function StatChartCard({
  card,
  value,
  chartData,
}: {
  card: StatCardConfig;
  value: number;
  chartData: DoctorDashboardChartPoint[];
}) {
  const Icon = card.icon;

  return (
    <Card className="glass border-border/50 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm",
              card.iconClass,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <MiniChart data={chartData} color={card.chartColor} type={card.chartType} />
      </CardContent>
    </Card>
  );
}

function FutureAppointmentsCard({ stats }: { stats: DoctorDashboardStats }) {
  const theme = useDoctorChartTheme();
  const chartData = stats.charts.appointmentsByDay?.length
    ? stats.charts.appointmentsByDay
    : [{ label: "-", value: 0 }];
  const total = stats.futureAppointments ?? 0;

  return (
    <Card className="glass h-full border-border/50 shadow-none">
      <CardContent className="flex h-full flex-col gap-6 p-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            Future Appointments
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            {total}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scheduled visits in the selected period (appointments, not sessions)
          </p>
        </div>

        <div className="h-36 w-full min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: theme.axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} tick={{ fill: theme.axis, fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: theme.tooltipBg,
                  border: `1px solid ${theme.tooltipBorder}`,
                  borderRadius: 12,
                  color: theme.tooltipText,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="value"
                fill={theme.colors.blue}
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientsSummaryCard({ stats, cards }: DoctorDashboardViewProps) {
  const breakdown = cards.map((card) => ({
    ...card,
    value: stats[card.key],
    percentage: pct(stats[card.key], stats.totalPatients || 1),
  }));

  const donutData = breakdown.map((item) => ({
    name: item.title,
    value: item.value || 0.001,
    color: item.chartColor,
  }));

  return (
    <Card className="glass border-border/50 shadow-none">
      <CardContent className="flex flex-col gap-6 p-5 lg:flex-row lg:items-center">
        <div className="relative mx-auto h-52 w-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={2}
                stroke="none"
              >
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">
              {stats.totalPatients}
            </span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          {breakdown.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="rounded-2xl border border-border/50 bg-background/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-white",
                      item.iconClass,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{item.title}</p>
                    <p className="text-xl font-bold text-foreground">{item.value}</p>
                  </div>
                  <span className="ml-auto text-sm font-medium text-muted-foreground">
                    {item.percentage}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendOverviewCard({ data }: { data: DoctorDashboardChartPoint[] }) {
  const theme = useDoctorChartTheme();

  return (
    <Card className="glass h-full border-border/50 shadow-none">
      <CardContent className="p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Trend Overview</p>
          <p className="text-xs text-muted-foreground">(Selected period)</p>
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.length ? data : [{ label: "-", value: 0 }]}
              margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.colors.blue} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={theme.colors.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: theme.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: theme.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: theme.tooltipBg,
                  border: `1px solid ${theme.tooltipBorder}`,
                  borderRadius: 12,
                  color: theme.tooltipText,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={theme.colors.blue}
                strokeWidth={2.5}
                fill="url(#trend-area)"
                dot={{ r: 3, fill: theme.colors.blue }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function DoctorDashboardView({ stats, cards }: DoctorDashboardViewProps) {
  const topRow = cards.slice(0, 3);
  const monthCard = cards[3];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {topRow.map((card) => (
          <StatChartCard
            key={card.key}
            card={card}
            value={stats[card.key]}
            chartData={stats.charts[card.dataKey]}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {monthCard ? (
          <StatChartCard
            card={monthCard}
            value={stats[monthCard.key]}
            chartData={stats.charts[monthCard.dataKey]}
          />
        ) : null}
        <FutureAppointmentsCard stats={stats} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PatientsSummaryCard stats={stats} cards={cards} />
        </div>
        <TrendOverviewCard data={stats.charts.weekByDay} />
      </div>
    </div>
  );
}

export type { StatCardConfig };
