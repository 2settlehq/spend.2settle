import axios from "axios";
const apiURL = process.env.NEXT_PUBLIC_API_URL || "";

export default axios.create({
  baseURL: apiURL,
  timeout: 15000,
});
