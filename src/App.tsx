import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import NavBar from "./containers/NavBar";
import MainView from "./containers/MainBody";
import { ThemeContext } from "./contexts/theme";
import { darkThemeColors, lightThemeColors } from "./constants/theme";
import { ListType } from "./utils/types";
import { fetchInternetServers } from "./utils/helpers";

const App = () => {
  const [themeType, setTheme] = useState<"light" | "dark">("light");
  const [currentListType, setCurrentListType] = useState<ListType>("favorites");

  useEffect(() => {
    fetchInternetServers();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeType,
        theme: themeType === "dark" ? darkThemeColors : lightThemeColors,
        setTheme,
      }}
    >
      <View style={styles.app}>
        <NavBar onListChange={(type) => setCurrentListType(type)} />
        <MainView listType={currentListType} />
      </View>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  app: {
    // @ts-ignore
    height: "100vh",
    // @ts-ignore
    width: "100vw",
  },
});

export default App;
