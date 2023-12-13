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
import { useMemo, useRef } from "react";
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

export const options: ChartOptions<"line"> = {
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

const chartStyle = (theme: any) => {
  return {
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
  };
};

const labels = Array(MAX_PING_ELEMENTS).fill("");

interface IProps {
  containerStyle?: StyleProp<ViewStyle>;
}

const Chart = (props: IProps) => {
  const { selected } = useServers();
  const { theme } = useTheme();
  const selectedServerAddr = useRef<string>("");
  const pingList = useRef<number[]>(Array(MAX_PING_ELEMENTS).fill(0));

  const data = useMemo(() => {
    if (selected) {
      if (selectedServerAddr.current !== `${selected.ip}:${selected.port}`) {
        selectedServerAddr.current = `${selected.ip}:${selected.port}`;
        pingList.current.fill(0);
      }

      pingList.current.shift();
      pingList.current.push(selected.ping);

      return {
        labels: labels,
        datasets: [
          {
            data: pingList.current,
            ...chartStyle(theme),
          },
        ],
      } as ChartData<"line", number[], string>;
    }

    return {
      labels: labels,
      datasets: [
        {
          data: Array(MAX_PING_ELEMENTS).fill(0),
          ...chartStyle(theme),
        },
      ],
    } as ChartData<"line", number[], string>;
  }, [selected?.ping]);

  return (
    <View style={props.containerStyle}>
      <Line options={options} data={data} updateMode="active" />
    </View>
  );
};

export default Chart;
