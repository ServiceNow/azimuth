import { fireEvent, screen, waitFor } from "@testing-library/react";
import FilterSelector from "components/Controls/FilterSelector";
import { renderWithTheme } from "mocks/utils";
import { PIPELINE_REQUIRED_TIP } from "utils/const";

test("display loading state", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      isFetching
      isSuccess={false}
    />
  );

  await screen.findByText("type");
  expect(screen.queryByLabelText(PIPELINE_REQUIRED_TIP)).toBeNull();
  await screen.findByRole("progressbar");
  expect(await screen.queryByRole("figure")).toBeNull();
  expect(screen.getByLabelText("collapse-type")).toBeDisabled();
});

test("display reloading state", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type1",
        },
      ]}
      isFetching
      isSuccess={false}
    />
  );

  await screen.findByText("type");
  expect(screen.queryByLabelText(PIPELINE_REQUIRED_TIP)).toBeNull();
  await screen.findByRole("progressbar");
  expect(screen.getByRole("figure").parentElement!.parentElement).toHaveStyle({
    opacity: 0.38,
  });
  expect(screen.getByLabelText("collapse-type")).not.toBeDisabled();
});

test("display null state", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      isFetching={false}
      isSuccess
    />
  );

  await screen.findByText("type");
  const label = screen.getByLabelText(PIPELINE_REQUIRED_TIP);
  expect(await screen.queryByRole("progressbar")).toBeNull();
  expect(await screen.queryByRole("figure")).toBeNull();
  expect(screen.getByLabelText("collapse-type")).toBeDisabled();

  fireEvent.mouseOver(label);
  await screen.findByText(PIPELINE_REQUIRED_TIP);
});

test("display error state", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type1",
        },
      ]}
      isFetching={false}
      isSuccess={false}
    />
  );

  screen.getByText("type");
  expect(screen.queryByLabelText(PIPELINE_REQUIRED_TIP)).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.getByRole("figure").parentElement!.parentElement).toHaveStyle({
    opacity: 0.38,
  });
  expect(screen.getByLabelText("collapse-type")).not.toBeDisabled();
});

test("empty outcome count", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type1",
        },
      ]}
      isFetching={false}
      isSuccess
    />
  );

  await screen.findByText("type");
  const items = await screen.findAllByRole("listitem");
  expect(items).toHaveLength(1);

  const distribution = await screen.findByRole("figure");
  expect(distribution).toHaveStyle("width: 0%");
  expect(distribution.parentElement!.parentElement).not.toHaveStyle({
    opacity: 0.38,
  });

  expect(screen.getByLabelText("type1")).not.toBeDisabled();
});

test("collapsible filter", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type1",
        },
      ]}
      isFetching={false}
      isSuccess
    />
  );

  const typeElement = await screen.findByLabelText("collapse-type");
  await screen.findByText("type1");
  fireEvent.click(typeElement);
  expect(await screen.queryByText("type1")).toBeNull();
  fireEvent.click(typeElement);
  expect(await screen.queryByText("type1")).toBeVisible();
});

test("multi filter order", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={20}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 5,
            CorrectAndRejected: 5,
            IncorrectAndPredicted: 5,
            IncorrectAndRejected: 5,
          },
          utteranceCount: 20,
          filterValue: "type2",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 12,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 12,
          filterValue: "type1",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 10,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 10,
          filterValue: "type3",
        },
      ]}
      isFetching={false}
      isSuccess
    />
  );

  await screen.findByText("type");
  const items = await screen.findAllByRole("listitem");
  expect(items).toHaveLength(3);

  const expectedOrder = ["type2", "type1", "type3"];
  items.forEach((item, index) => {
    expect(item.textContent).toBe(expectedOrder[index]);
  });

  const distributions = await screen.findAllByRole("figure");
  const expectedProportions = [
    ["25%", "25%", "25%", "25%"],
    ["100%", "0%", "0%", "0%"],
    ["0%", "0%", "0%", "100%"],
  ];
  await waitFor(() => {
    distributions.forEach((distribution, distributionIndex) => {
      const proportions = distribution.childNodes;
      proportions.forEach((proportion, proportionIndex) => {
        expect(proportion).toHaveStyle(
          `width: ${expectedProportions[distributionIndex][proportionIndex]}`
        );
      });
    });
  });
});

test("see more", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      filters={Array.from(Array(11), (_, i) => ({
        outcomeCount: {
          CorrectAndPredicted: 0,
          CorrectAndRejected: 0,
          IncorrectAndPredicted: 0,
          IncorrectAndRejected: 0,
        },
        utteranceCount: 0,
        filterValue: `type${i + 1}`,
      }))}
      isFetching={false}
      isSuccess
    />
  );

  const list = await screen.findByRole("list");
  await waitFor(() => {
    expect(list).toHaveStyle({ "max-height": `${5 * 28}px` });
  });
  let seeMoreButton = await screen.findByText("See more (6)");

  fireEvent.click(seeMoreButton);
  await waitFor(() => {
    expect(list).toHaveStyle({ "max-height": `${11 * 28}px` });
  });
  // TODO This doesn't test what we intend. Improve test.
  expect(await screen.queryByText("See more")).toBeNull();
});

test("see more long list", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={() => {}}
      filters={Array.from(Array(21), (_, i) => ({
        outcomeCount: {
          CorrectAndPredicted: 0,
          CorrectAndRejected: 0,
          IncorrectAndPredicted: 0,
          IncorrectAndRejected: 0,
        },
        utteranceCount: 0,
        filterValue: `type${i + 1}`,
      }))}
      isFetching={false}
      isSuccess
    />
  );

  const list = await screen.findByRole("list");
  await waitFor(() => {
    expect(list).toHaveStyle({ "max-height": `${5 * 28}px` });
  });
  let seeMoreButton = await screen.findByText("See more (15)");

  fireEvent.click(seeMoreButton);
  await waitFor(() => {
    expect(list).toHaveStyle({ "max-height": `${20 * 28}px` });
  });
  seeMoreButton = await screen.findByText("See more (1)");

  fireEvent.click(seeMoreButton);
  await waitFor(() => {
    expect(list).toHaveStyle({ "max-height": `${21 * 28}px` });
  });
  // TODO This doesn't test what we intend. Improve test.
  expect(await screen.queryByText("See more")).toBeNull();
});

test("selected options", async () => {
  const handleValueChange = jest.fn();

  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={["type2"]}
      handleValueChange={handleValueChange}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type1",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type2",
        },
      ]}
      isFetching={false}
      isSuccess
    />
  );

  const selectAll = screen.getByLabelText("type");

  expect(screen.getByLabelText("type1")).not.toBeChecked();
  expect(screen.getByLabelText("type2")).toBeChecked();
  expect(selectAll).toBeChecked();
  expect(selectAll).toHaveAttribute("data-indeterminate", "true");

  selectAll.click();

  expect(handleValueChange).toBeCalledWith([]);
});

test("select all options", async () => {
  const handleValueChange = jest.fn();

  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={[]}
      handleValueChange={handleValueChange}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type1",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type2",
        },
      ]}
      isFetching={false}
      isSuccess
    />
  );

  const selectAll = screen.getByLabelText("type");

  expect(screen.getByLabelText("type1")).not.toBeChecked();
  expect(screen.getByLabelText("type2")).not.toBeChecked();
  expect(selectAll).not.toBeChecked();
  expect(selectAll).toHaveAttribute("data-indeterminate", "false");

  selectAll.click();

  expect(handleValueChange).toBeCalledWith(["type1", "type2"]);
});

test("unselect all options", async () => {
  const handleValueChange = jest.fn();

  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue=""
      selectedOptions={["type1", "type2"]}
      handleValueChange={handleValueChange}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type1",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type2",
        },
      ]}
      isFetching={false}
      isSuccess
    />
  );

  const selectAll = screen.getByLabelText("type");

  expect(screen.getByLabelText("type1")).toBeChecked();
  expect(screen.getByLabelText("type2")).toBeChecked();
  expect(selectAll).toBeChecked();
  expect(selectAll).toHaveAttribute("data-indeterminate", "false");

  selectAll.click();

  expect(handleValueChange).toBeCalledWith([]);
});

test("filter by search", async () => {
  renderWithTheme(
    <FilterSelector
      label="type"
      maxCount={0}
      searchValue="category"
      selectedOptions={[]}
      handleValueChange={() => {}}
      filters={[
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type1",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type2",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "type3",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "category1",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "category2",
        },
        {
          outcomeCount: {
            CorrectAndPredicted: 0,
            CorrectAndRejected: 0,
            IncorrectAndPredicted: 0,
            IncorrectAndRejected: 0,
          },
          utteranceCount: 0,
          filterValue: "category3",
        },
      ]}
      isFetching={false}
      isSuccess
    />
  );

  let items = await screen.findAllByRole("listitem");
  expect(items).toHaveLength(3);

  const expectedOrder = ["category1", "category2", "category3"];
  items.forEach((item, index) => {
    expect(item.textContent).toBe(expectedOrder[index]);
  });
});
