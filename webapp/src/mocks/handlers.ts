import { rest } from "msw";
import { StatusResponse } from "types/api";

export const baseUrl = "http://localhost/api/local";

export const getStatusReady = rest.get(`${baseUrl}/status`, (req, res, ctx) => {
  const statusResponse: StatusResponse = {
    startupTasksReady: true,
    startupTasksStatus: {},
  };
  return res(ctx.json(statusResponse));
});

export const getStatusNotReady = rest.get(
  `${baseUrl}/status`,
  (req, res, ctx) => {
    const statusResponse: StatusResponse = {
      startupTasksReady: false,
      startupTasksStatus: {},
    };
    return res(ctx.json(statusResponse));
  }
);

export const handlers = [getStatusReady];
