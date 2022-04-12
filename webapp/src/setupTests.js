import "@testing-library/jest-dom/extend-expect";
import { server } from "mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
