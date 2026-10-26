import { useEffect, useRef } from "react";
import { Chart, Filler, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

/** Gráfico semanal com a configuração do gráfico de peso do design system, sobre o media card stone-900. */
export function WeeklyChart({ labels, created, completed }: { labels: string[]; created: number[]; completed: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const peak = completed.indexOf(Math.max(...completed));
    const chart = new Chart(ref.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Concluídas",
            data: completed,
            tension: 0.38,
            borderColor: "#fef3c7",
            backgroundColor: "rgba(251, 191, 36, 0.15)",
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderWidth: 2,
            pointBackgroundColor: completed.map((_, i) => (i === peak ? "#f59e0b" : "#e5e7eb")),
            pointBorderColor: "#f59e0b",
            fill: true,
          },
          {
            label: "Criadas",
            data: created,
            tension: 0.38,
            borderColor: "rgba(231,229,228,0.45)",
            borderDash: [4, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { ticks: { color: "#e7e5e4", font: { weight: 500 } }, grid: { color: "rgba(231,229,228,0.08)" } },
          y: {
            beginAtZero: true,
            ticks: { color: "#e7e5e4", font: { weight: 500 }, precision: 0 },
            grid: { color: "rgba(231,229,228,0.08)" },
          },
        },
        plugins: {
          tooltip: { backgroundColor: "#111827", titleColor: "#fff", bodyColor: "#e5e7eb", displayColors: false },
        },
      },
    });
    return () => chart.destroy();
  }, [labels, created, completed]);
  return <canvas ref={ref} className="h-full w-full" />;
}
