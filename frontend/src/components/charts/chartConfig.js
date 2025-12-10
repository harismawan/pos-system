/**
 * Chart.js configuration and registration
 * Import this file before using any Chart.js components
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// Default chart options for consistent styling
export const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          family: "'Inter', sans-serif",
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      titleFont: {
        family: "'Inter', sans-serif",
        size: 13,
      },
      bodyFont: {
        family: "'Inter', sans-serif",
        size: 12,
      },
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
      ticks: {
        font: {
          family: "'Inter', sans-serif",
          size: 11,
        },
      },
    },
  },
};

// Color palettes
export const colors = {
  primary: {
    main: "#6366f1",
    light: "rgba(99, 102, 241, 0.2)",
  },
  secondary: {
    main: "#8b5cf6",
    light: "rgba(139, 92, 246, 0.2)",
  },
  success: {
    main: "#10b981",
    light: "rgba(16, 185, 129, 0.2)",
  },
  warning: {
    main: "#f59e0b",
    light: "rgba(245, 158, 11, 0.2)",
  },
  gray: {
    main: "#6b7280",
    light: "rgba(107, 114, 128, 0.2)",
  },
};

export default ChartJS;
