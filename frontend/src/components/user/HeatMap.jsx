import React, { useMemo } from "react";
import HeatMap from "@uiw/react-heat-map";

const PANEL_COLORS = {
  0: "#161b22",
  1: "#0e4429",
  5: "#006d32",
  15: "#26a641",
  30: "#39d353",
};

const generateActivityData = (startDate, endDate) => {
  const data = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    data.push({
      date: current.toISOString().split("T")[0],
      count: Math.floor(Math.random() * 40),
    });
    current.setDate(current.getDate() + 1);
  }

  return data;
};

const HeatMapProfile = () => {
  const endDate = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = new Date(endDate);
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }, [endDate]);

  const activityData = useMemo(
    () => generateActivityData(startDate, endDate),
    [startDate, endDate]
  );

  return (
    <HeatMap
      style={{ width: "100%", color: "var(--text-secondary)" }}
      value={activityData}
      weekLabels={["", "Mon", "", "Wed", "", "Fri", ""]}
      startDate={startDate}
      endDate={endDate}
      rectSize={12}
      space={3}
      rectProps={{ rx: 2 }}
      panelColors={PANEL_COLORS}
    />
  );
};

export default HeatMapProfile;