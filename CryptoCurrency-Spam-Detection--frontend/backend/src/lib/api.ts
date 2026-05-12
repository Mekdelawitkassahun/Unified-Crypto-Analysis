import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL

export const api = axios.create({
  baseURL,
  timeout: 30_000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err)
  },
)

