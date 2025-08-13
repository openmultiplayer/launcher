import axios from "axios";

const BASE_URL = "https://api.open.mp/";
const REQUEST_TIMEOUT = 30000; // 30 seconds

const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.warn("Request timeout");
    }
    return Promise.reject(error);
  }
);

export default api;
