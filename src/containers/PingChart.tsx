import {
  CategoryScale,
  ChartData,
  Chart as ChartJS,
  ChartOptions,
  Colors,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { memo, useCallback, useMemo, useRef } from "react";
import { Line } from "react-chartjs-2";
import { StyleProp, View, ViewStyle } from "react-native";
import { useServers } from "../states/servers";
import { useTheme } from "../states/theme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Colors
);

const MAX_PING_ELEMENTS = 25;

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  showLine: true,
  animation: false,
  scales: {
    y: {
      grid: {
        display: true,
        color: "#44444444",
      },
      ticks: { color: "#999", align: "center" },
    },
    x: {
      grid: {
        display: true,
        color: "#44444444",
        circular: true,
        drawTicks: false,
      },
      border: {
        display: false,
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
  },
};

const labels = Array(MAX_PING_ELEMENTS).fill("");

interface ChartProps {
  containerStyle?: StyleProp<ViewStyle>;
}

const Chart = memo<ChartProps>(({ containerStyle }) => {
  const { selected } = useServers();
  const { theme } = useTheme();
  const selectedServerAddr = useRef<string>("");
  const pingList = useRef<number[]>(Array(MAX_PING_ELEMENTS).fill(0));

  const chartStyle = useMemo(
    () => ({
      borderWidth: 2,
      borderColor: theme.primary,
      hoverBackgroundColor: theme.primary,
      hoverBorderColor: theme.primary,
      backgroundColor: theme.primary,
      pointBackgroundColor: "white",
      pointBorderColor: theme.primary,
      pointBorderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 3,
      pointHoverBorderWidth: 2,
      pointHoverBackgroundColor: "white",
      pointHoverBorderColor: theme.primary,
    }),
    [theme.primary]
  );

  const resetPingData = useCallback(() => {
    pingList.current.fill(0);
  }, []);

  const data = useMemo(() => {
    if (selected) {
      const currentServerAddr = `${selected.ip}:${selected.port}`;

      if (selectedServerAddr.current !== currentServerAddr) {
        selectedServerAddr.current = currentServerAddr;
        resetPingData();
      }

      pingList.current.shift();
      pingList.current.push(selected.ping);

      return {
        labels,
        datasets: [
          {
            data: [...pingList.current],
            ...chartStyle,
          },
        ],
      } as ChartData<"line", number[], string>;
    }

    return {
      labels,
      datasets: [
        {
          data: Array(MAX_PING_ELEMENTS).fill(0),
          ...chartStyle,
        },
      ],
    } as ChartData<"line", number[], string>;
  }, [selected?.ping, chartStyle, resetPingData]);

  return (
    <View style={containerStyle}>
      <Line options={chartOptions} data={data} updateMode="active" />
    </View>
  );
});

Chart.displayName = "Chart";

export default Chart;
export { chartOptions as options };
