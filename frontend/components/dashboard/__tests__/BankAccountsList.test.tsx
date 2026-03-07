import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BankAccountsList } from "../BankAccountsList";

const mockAccounts = [
  { nameEn: "Main Account", nameAr: "الحساب الرئيسي", balance: 500000, share: 0.5 },
  { nameEn: "Savings Account", nameAr: "حساب التوفير", balance: 300000, share: 0.3 },
  { nameEn: "Operations Account", nameAr: "حساب العمليات", balance: 200000, share: 0.2 },
];

describe("BankAccountsList", () => {
  const defaultProps = {
    accounts: mockAccounts,
    currency: "SAR",
    isAr: false,
    title: "Bank Balances",
    showAllLabel: "Show All",
    showLessLabel: "Show Less",
    ofTotalLabel: "of total",
    cashPositioningLabel: "Cash Positioning",
    visibleCount: 2,
  };

  it("renders title correctly", () => {
    render(<BankAccountsList {...defaultProps} />);

    expect(screen.getByText("Bank Balances")).toBeInTheDocument();
  });

  it("displays visible accounts only by default", () => {
    render(<BankAccountsList {...defaultProps} />);

    expect(screen.getByText("Main Account")).toBeInTheDocument();
    expect(screen.getByText("Savings Account")).toBeInTheDocument();
    expect(screen.queryByText("Operations Account")).not.toBeInTheDocument();
  });

  it("shows all accounts when toggle is clicked", () => {
    render(<BankAccountsList {...defaultProps} />);

    const toggleButton = screen.getByText(/Show All/);
    fireEvent.click(toggleButton);

    expect(screen.getByText("Main Account")).toBeInTheDocument();
    expect(screen.getByText("Savings Account")).toBeInTheDocument();
    expect(screen.getByText("Operations Account")).toBeInTheDocument();
  });

  it("hides accounts when show less is clicked", () => {
    render(<BankAccountsList {...defaultProps} />);

    const toggleButton = screen.getByText(/Show All/);
    fireEvent.click(toggleButton);
    
    const showLessButton = screen.getByText(/Show Less/);
    fireEvent.click(showLessButton);

    expect(screen.getByText("Main Account")).toBeInTheDocument();
    expect(screen.getByText("Savings Account")).toBeInTheDocument();
    expect(screen.queryByText("Operations Account")).not.toBeInTheDocument();
  });

  it("displays account balances with currency", () => {
    render(<BankAccountsList {...defaultProps} />);

    expect(screen.getByText(/SAR 500,000/)).toBeInTheDocument();
    expect(screen.getByText(/SAR 300,000/)).toBeInTheDocument();
  });

  it("displays account share percentages", () => {
    render(<BankAccountsList {...defaultProps} />);

    expect(screen.getByText("50% of total")).toBeInTheDocument();
    expect(screen.getByText("30% of total")).toBeInTheDocument();
  });

  it("renders in Arabic when isAr is true", () => {
    render(<BankAccountsList {...defaultProps} isAr={true} />);

    expect(screen.getByText("الحساب الرئيسي")).toBeInTheDocument();
    expect(screen.getByText("حساب التوفير")).toBeInTheDocument();
  });

  it("shows cash positioning link", () => {
    render(<BankAccountsList {...defaultProps} />);

    const link = screen.getByText(/Cash Positioning/);
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/app/cash-positioning");
  });

  it("does not show toggle when accounts <= visibleCount", () => {
    const fewAccounts = mockAccounts.slice(0, 2);
    render(<BankAccountsList {...defaultProps} accounts={fewAccounts} />);

    expect(screen.queryByText(/Show All/)).not.toBeInTheDocument();
  });

  it("displays total account count in toggle button", () => {
    render(<BankAccountsList {...defaultProps} />);

    expect(screen.getByText(/Show All \(3\)/)).toBeInTheDocument();
  });

  it("renders progress bars for each account", () => {
    const { container } = render(<BankAccountsList {...defaultProps} />);

    const progressBars = container.querySelectorAll(".bg-indigo-500");
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("handles empty accounts array", () => {
    render(<BankAccountsList {...defaultProps} accounts={[]} />);

    expect(screen.getByText("Bank Balances")).toBeInTheDocument();
    expect(screen.queryByText("Main Account")).not.toBeInTheDocument();
  });
});
