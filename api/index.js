import { handleRequest } from "../src/server.js";

export default async function vercelHandler(req, res) {
  return handleRequest(req, res);
}
