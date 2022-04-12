import { screen } from "@testing-library/react";
import StatusCheck from "components/StatusCheck";
import { getStatusNotReady } from "mocks/handlers";
import { server } from "mocks/server";
import { renderWithRouterAndRedux } from "mocks/utils";

test("shows the content when the status is success", async () => {
  renderWithRouterAndRedux(<StatusCheck>content</StatusCheck>, {
    route: "/local",
    path: "/:jobId",
  });

  await screen.findByText("content");
});

test("shows the waiting status when waiting for startup tasks", async () => {
  server.resetHandlers(getStatusNotReady);
  renderWithRouterAndRedux(<StatusCheck>content</StatusCheck>, {
    route: "/local",
    path: "/:jobId",
  });

  await screen.findByText(
    "The startup tasks are still in progress. Grab a coffee and we will auto-refresh for you."
  );
  const content = await screen.queryByText("content");
  expect(content).toBeNull();
});
