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
import { useContext, useMemo, useRef } from "react";
import { useServers } from "../states/servers";
import { Line } from "react-chartjs-2";
import { View, StyleProp, ViewStyle } from "react-native";
import { ThemeContext } from "../contexts/theme";

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

export const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  showLine: true,
  scales: {
    y: {
      grid: {
        display: true,
        color: "#555",
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

const labels = Array(40).fill("");

interface IProps {
  containerStyle?: StyleProp<ViewStyle>;
}

const Chart = (props: IProps) => {
  const { selected } = useServers();
  const { theme } = useContext(ThemeContext);
  const selectedServerAddr = useRef<string>("");
  const pingList = useRef<number[]>(Array(40).fill(0));

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
            borderWidth: 2,
            data: pingList.current,
            borderColor: theme.primary,
            backgroundColor: theme.primary,
            pointBackgroundColor: "transparent",
            pointBorderColor: "transparent",
          },
        ],
      } as ChartData<"line", number[], string>;
    }

    return {
      labels: labels,
      datasets: [
        {
          borderWidth: 2,
          data: Array(40).fill(0),
          borderColor: theme.primary,
          backgroundColor: theme.primary,
          pointBackgroundColor: "transparent",
          pointBorderColor: "transparent",
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
