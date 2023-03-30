import { paths } from "types/generated/generatedTypes";
import { constructApiSearchString } from "./helpers";
import { HTTPExceptionModel } from "types/api";

type CamelCase<SnakeCase> = SnakeCase extends `${infer FirstWord}_${infer Rest}`
  ? `${FirstWord}${Capitalize<CamelCase<Rest>>}`
  : SnakeCase;

const snakeToCamelCase = <T extends string>(s: T) =>
  s.replace(/_(\w)/g, (_, c) => c.toUpperCase()) as CamelCase<T>;

type OperationWithPathParameters<T extends { [key: string]: unknown }> = {
  parameters: { path: T };
};

type OperationWithQueryParameters<T extends { [key: string]: unknown }> = {
  parameters: { query: T };
};

type OperationWithJSONRequestBody<T> = {
  requestBody: { content: { "application/json": T } };
};

type OperationArgs<Operation> = {
  jobId: string;
} & (Operation extends OperationWithPathParameters<infer PathParameters>
  ? { [Key in keyof PathParameters as CamelCase<Key>]: PathParameters[Key] }
  : {}) &
  (Operation extends OperationWithQueryParameters<infer QueryParameters>
    ? { [Key in keyof QueryParameters as CamelCase<Key>]: QueryParameters[Key] }
    : {}) &
  (Operation extends OperationWithJSONRequestBody<infer JSONRequestBody>
    ? { body: JSONRequestBody }
    : { body?: undefined });

type OperationWithJSONResponse<T> = {
  responses: { 200: { content: { "application/json": T } } };
};

export interface TypedResponse<T> extends Response {
  blob(): never;
  json(): Promise<T>;
}

export interface FileResponse extends Response {
  json(): never;
}

type ApiResponse<O> = O extends OperationWithJSONResponse<infer T>
  ? TypedResponse<T>
  : FileResponse;

export const fetchApi =
  <
    Path extends keyof paths,
    Method extends string & keyof paths[Path],
    Operation extends paths[Path][Method]
  >({
    path,
    method,
  }: {
    path: Path;
    method: Method;
  }) =>
  async ({
    body,
    jobId,
    ...rest
  }: OperationArgs<Operation>): Promise<ApiResponse<Operation>> => {
    // `path` comes from the generated types
    // `rest` contains both query and path parameters from generated types
    const parameters = rest as { [key: string]: unknown };
    const p = path.replace(/\{(\w+)\}/g, (_, key) => {
      const camelCaseKey = snakeToCamelCase(key);
      const value = parameters[camelCaseKey];
      // Delete path parameters, leaving only the query parameters.
      delete parameters[camelCaseKey];
      return String(value);
    });
    const fullPath = `/api/${jobId}${p}${constructApiSearchString(parameters)}`;

    const init: RequestInit = { method: method.toUpperCase() };
    if (body) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }

    const response = (await fetch(fullPath, init)) as ApiResponse<Operation>;
    // fetch() might throw if the user is offline, or some unlikely networking error occurs, such a DNS lookup failure.
    // Let's also throw if the status is not OK, so it's uniform.
    if (!response.ok) {
      const { detail: errorMessage } =
        (await response.json()) as HTTPExceptionModel;
      throw Error(errorMessage);
    }
    return response;
  };

export type GetUtterancesQueryState = OperationArgs<
  paths["/dataset_splits/{dataset_split_name}/utterances"]["get"]
>;

export type PatchUtterancesQueryState = OperationArgs<
  paths["/dataset_splits/{dataset_split_name}/utterances"]["patch"]
>;

// There doesn't seem to be a better way to do this:
// https://medium.com/@drevets/you-cant-prompt-a-file-download-with-the-content-disposition-header-using-axios-xhr-sorry-56577aa706d6
const downloadFileFromApi =
  <P>(f: (arg: P) => Promise<FileResponse>) =>
  async (arg: P): Promise<void> => {
    const csvResponse = await f(arg);
    const headers = csvResponse.headers;

    const contentDisposition = headers.get("Content-Disposition");

    const filenameRegex =
      /filename(?=\*=utf-8''(?<utfFilename>.*)|="(?<regFilename>.*)")/i;

    const { utfFilename, regFilename } = contentDisposition?.match(
      filenameRegex
    )?.groups as { utfFilename?: string; regFilename?: string };

    const filename = utfFilename
      ? decodeURIComponent(utfFilename)
      : regFilename;

    const blob = await csvResponse.blob();
    downloadBlob(blob, filename);
  };

async function downloadBlob(blob: Blob, filename?: string) {
  const downloadUrl = window.URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = downloadUrl;
  if (filename) {
    link.setAttribute("download", filename);
  }
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(downloadUrl);
}

export const downloadPerturbationTestingSummary = downloadFileFromApi(
  fetchApi({
    path: "/export/perturbation_testing_summary",
    method: "get",
  })
);

export const downloadPerturbedSet = downloadFileFromApi(
  fetchApi({
    path: "/export/dataset_splits/{dataset_split_name}/perturbed_utterances",
    method: "get",
  })
);

export const downloadDatasetSplit = downloadFileFromApi(
  fetchApi({
    path: "/export/dataset_splits/{dataset_split_name}/utterances",
    method: "get",
  })
);

export const downloadUtteranceProposedActions = downloadFileFromApi(
  fetchApi({
    path: "/export/dataset_splits/{dataset_split_name}/proposed_actions",
    method: "get",
  })
);
