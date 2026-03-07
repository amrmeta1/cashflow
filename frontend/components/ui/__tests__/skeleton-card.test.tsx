import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  SkeletonCard,
  SkeletonKpiCard,
  SkeletonTable,
  SkeletonChart,
} from "../skeleton-card";

describe("SkeletonCard", () => {
  it("renders with default props", () => {
    const { container } = render(<SkeletonCard />);

    expect(container.querySelector(".shadow-sm")).toBeInTheDocument();
  });

  it("renders header when showHeader is true", () => {
    const { container } = render(<SkeletonCard showHeader={true} />);

    const header = container.querySelector(".pb-2");
    expect(header).toBeInTheDocument();
  });

  it("does not render header when showHeader is false", () => {
    const { container } = render(<SkeletonCard showHeader={false} />);

    const header = container.querySelector("header");
    expect(header).not.toBeInTheDocument();
  });

  it("renders specified number of rows", () => {
    const { container } = render(<SkeletonCard rows={3} />);

    const skeletons = container.querySelectorAll(".h-20");
    expect(skeletons.length).toBe(3);
  });

  it("applies custom className", () => {
    const { container } = render(<SkeletonCard className="custom-class" />);

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("applies custom header height", () => {
    const { container } = render(<SkeletonCard headerHeight="h-8" />);

    const headerSkeleton = container.querySelector(".h-8");
    expect(headerSkeleton).toBeInTheDocument();
  });

  it("applies custom content height", () => {
    const { container } = render(<SkeletonCard contentHeight="h-32" />);

    const contentSkeleton = container.querySelector(".h-32");
    expect(contentSkeleton).toBeInTheDocument();
  });
});

describe("SkeletonKpiCard", () => {
  it("renders KPI card skeleton structure", () => {
    const { container } = render(<SkeletonKpiCard />);

    expect(container.querySelector(".shadow-sm")).toBeInTheDocument();
    expect(container.querySelector(".p-4")).toBeInTheDocument();
  });

  it("renders multiple skeleton elements", () => {
    const { container } = render(<SkeletonKpiCard />);

    const skeletons = container.querySelectorAll("[class*='h-']");
    expect(skeletons.length).toBeGreaterThan(2);
  });

  it("has correct spacing", () => {
    const { container } = render(<SkeletonKpiCard />);

    expect(container.querySelector(".space-y-2")).toBeInTheDocument();
  });
});

describe("SkeletonTable", () => {
  it("renders with default rows and columns", () => {
    const { container } = render(<SkeletonTable />);

    const rows = container.querySelectorAll(".p-4");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("renders specified number of rows", () => {
    const { container } = render(<SkeletonTable rows={3} />);

    // Header + 3 rows = 4 total
    const allRows = container.querySelectorAll(".p-4");
    expect(allRows.length).toBe(4);
  });

  it("renders header row with border", () => {
    const { container } = render(<SkeletonTable />);

    const header = container.querySelector(".border-b");
    expect(header).toBeInTheDocument();
  });

  it("renders correct number of columns in header", () => {
    const { container } = render(<SkeletonTable columns={6} />);

    const headerRow = container.querySelector(".border-b");
    const columns = headerRow?.querySelectorAll("[class*='h-']");
    expect(columns?.length).toBe(6);
  });

  it("renders correct number of columns in body rows", () => {
    const { container } = render(<SkeletonTable rows={2} columns={5} />);

    const bodyRows = container.querySelectorAll(".p-4");
    // Skip header, check first body row
    const firstBodyRow = bodyRows[1];
    const columns = firstBodyRow?.querySelectorAll("[class*='h-']");
    expect(columns?.length).toBe(5);
  });
});

describe("SkeletonChart", () => {
  it("renders with default height", () => {
    const { container } = render(<SkeletonChart />);

    expect(container.querySelector(".h-\\[300px\\]")).toBeInTheDocument();
  });

  it("renders with custom height", () => {
    const { container } = render(<SkeletonChart height="h-[500px]" />);

    expect(container.querySelector(".h-\\[500px\\]")).toBeInTheDocument();
  });

  it("has rounded corners", () => {
    const { container } = render(<SkeletonChart />);

    expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
  });

  it("takes full width", () => {
    const { container } = render(<SkeletonChart />);

    expect(container.querySelector(".w-full")).toBeInTheDocument();
  });

  it("renders different heights correctly", () => {
    const heights = ["h-[200px]", "h-[400px]", "h-[600px]"];

    heights.forEach((height) => {
      const { container } = render(<SkeletonChart height={height} />);
      const escapedHeight = height.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
      expect(container.querySelector(`.${escapedHeight}`)).toBeInTheDocument();
    });
  });
});
