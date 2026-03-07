import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KpiCard } from "../KpiCard";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

describe("KpiCard", () => {
  it("renders label and value correctly", () => {
    render(<KpiCard label="Total Balance" value="$1,234,567" />);

    expect(screen.getByText("Total Balance")).toBeInTheDocument();
    expect(screen.getByText("$1,234,567")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <KpiCard
        label="Revenue"
        value="$500,000"
        subtitle="This month"
      />
    );

    expect(screen.getByText("This month")).toBeInTheDocument();
  });

  it("renders change indicator with up trend", () => {
    render(
      <KpiCard
        label="Balance"
        value="$1,000"
        change={{ value: "+2.1%", trend: "up", icon: ArrowUpRight }}
      />
    );

    expect(screen.getByText("+2.1%")).toBeInTheDocument();
    const changeElement = screen.getByText("+2.1%").closest('div.text-emerald-500');
    expect(changeElement).toBeInTheDocument();
  });

  it("renders change indicator with down trend", () => {
    render(
      <KpiCard
        label="Expenses"
        value="$500"
        change={{ value: "-3.1%", trend: "down", icon: ArrowDownRight }}
      />
    );

    expect(screen.getByText("-3.1%")).toBeInTheDocument();
    const changeElement = screen.getByText("-3.1%").closest('div.text-rose-500');
    expect(changeElement).toBeInTheDocument();
  });

  it("renders change indicator with neutral trend", () => {
    render(
      <KpiCard
        label="Runway"
        value="8.3 months"
        change={{ value: "Stable", trend: "neutral" }}
      />
    );

    expect(screen.getByText("Stable")).toBeInTheDocument();
    const changeElement = screen.getByText("Stable").closest('div.text-indigo-500');
    expect(changeElement).toBeInTheDocument();
  });

  it("applies custom dot color", () => {
    const { container } = render(
      <KpiCard
        label="Test"
        value="100"
        dotColor="bg-emerald-500"
      />
    );

    const dot = container.querySelector(".bg-emerald-500");
    expect(dot).toBeInTheDocument();
  });

  it("applies gradient when provided", () => {
    const { container } = render(
      <KpiCard
        label="Test"
        value="100"
        gradient="bg-gradient-to-br from-blue-50/50"
      />
    );

    const card = container.querySelector(".bg-gradient-to-br");
    expect(card).toBeInTheDocument();
  });

  it("renders without optional props", () => {
    render(<KpiCard label="Simple" value="123" />);

    expect(screen.getByText("Simple")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(screen.queryByText("Subtitle")).not.toBeInTheDocument();
  });

  it("handles numeric values", () => {
    render(<KpiCard label="Count" value={42} />);

    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("handles string values", () => {
    render(<KpiCard label="Status" value="Active" />);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
