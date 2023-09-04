import axios from "axios";

const baseURL = "https://api.open.mp/";

const api = axios.create({
  baseURL,
});

export default api;
