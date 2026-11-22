"use client";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Activity, Clock3 } from "lucide-react";
import type { Dashboard } from "@/lib/contracts";

function dayLabel(stamp: string, long: boolean) {
  const d = new Date(stamp + "T12:00:00");
  return d.toLocaleDateString(
    "ru-RU",
    long ? { day: "numeric", month: "short" } : { weekday: "short" },
  );
}
export function ActivityChart({
  week,
  month,
}: {
  week: Dashboard;
  month: Dashboard;
}) {
  const [range, setRange] = useState<7 | 30>(7);
  const data = range === 7 ? week : month;
  return (
    <section className="panel activity-card">
      <div className="panel-title">
        <h2>
          <Activity size={20} />
          Учебная активность
        </h2>
        <select
          aria-label="Период активности"
          value={range}
          onChange={(e) => setRange(Number(e.target.value) === 7 ? 7 : 30)}
        >
          <option value={7}>7 дней</option>
          <option value={30}>30 дней</option>
        </select>
      </div>
      <div className="activity-stat">
        <strong>{data.studyMinutes}</strong>
        <span>мин</span>
        <span className="chart-legend">
          <i />
          Время занятий
        </span>
      </div>
      <div
        className="chart"
        role="img"
        aria-label={`Активность за ${range} дней, ${data.studyMinutes} минут`}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 480, height: 95 }}
        >
          <LineChart
            data={data.activity}
            margin={{ left: -22, right: 13, top: 8, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              interval={range === 7 ? 0 : 5}
              tickMargin={9}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickFormatter={(v) => dayLabel(v, range === 30)}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, (max: number) => Math.max(30, max)]}
              tickCount={4}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
            />
            <Tooltip
              labelFormatter={(v) => dayLabel(String(v), true)}
              formatter={(v) => [v + " мин", "Занятия"]}
              contentStyle={{
                background: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: 9,
              }}
            />
            <Line
              dataKey="minutes"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-note">
        <Clock3 size={14} />
        {data.studyMinutes === 0
          ? "В этом периоде пока нет занятий"
          : "Суммарное время учебных занятий за период"}
      </div>
    </section>
  );
}
