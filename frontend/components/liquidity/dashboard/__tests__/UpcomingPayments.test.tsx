import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UpcomingPayments } from "../UpcomingPayments";

const mockPayments = [
  {
    id: "1",
    descEn: "Payroll",
    descAr: "الرواتب",
    amount: 89000,
    daysUntil: 2,
    severity: "danger" as const,
  },
  {
    id: "2",
    descEn: "Supplier Payment",
    descAr: "دفعة المورد",
    amount: 28000,
    daysUntil: 5,
    severity: "warning" as const,
  },
  {
    id: "3",
    descEn: "Utility Bills",
    descAr: "فواتير المرافق",
    amount: 4500,
    daysUntil: 10,
    severity: "normal" as const,
  },
];

describe("UpcomingPayments", () => {
  const defaultProps = {
    payments: mockPayments,
    currency: "SAR",
    isAr: false,
    title: "Upcoming Payments",
    dueInLabel: "Due in",
    daysLabel: "days",
  };

  it("renders title correctly", () => {
    render(<UpcomingPayments {...defaultProps} />);

    expect(screen.getByText("Upcoming Payments")).toBeInTheDocument();
  });

  it("displays all payments", () => {
    render(<UpcomingPayments {...defaultProps} />);

    expect(screen.getByText("Payroll")).toBeInTheDocument();
    expect(screen.getByText("Supplier Payment")).toBeInTheDocument();
    expect(screen.getByText("Utility Bills")).toBeInTheDocument();
  });

  it("displays payment amounts with currency", () => {
    render(<UpcomingPayments {...defaultProps} />);

    expect(screen.getByText(/-SAR 89,000/)).toBeInTheDocument();
    expect(screen.getByText(/-SAR 28,000/)).toBeInTheDocument();
    expect(screen.getByText(/-SAR 4,500/)).toBeInTheDocument();
  });

  it("displays days until payment", () => {
    render(<UpcomingPayments {...defaultProps} />);

    expect(screen.getByText("Due in 2 days")).toBeInTheDocument();
    expect(screen.getByText("Due in 5 days")).toBeInTheDocument();
    expect(screen.getByText("Due in 10 days")).toBeInTheDocument();
  });

  it("applies danger styling for urgent payments", () => {
    const { container } = render(<UpcomingPayments {...defaultProps} />);

    const dangerCard = container.querySelector(".border-rose-200");
    expect(dangerCard).toBeInTheDocument();
  });

  it("applies warning styling for soon payments", () => {
    const { container } = render(<UpcomingPayments {...defaultProps} />);

    const warningCard = container.querySelector(".border-amber-200");
    expect(warningCard).toBeInTheDocument();
  });

  it("applies normal styling for regular payments", () => {
    const { container } = render(<UpcomingPayments {...defaultProps} />);

    const normalCards = container.querySelectorAll(".border-border\\/50");
    expect(normalCards.length).toBeGreaterThan(0);
  });

  it("renders in Arabic when isAr is true", () => {
    render(<UpcomingPayments {...defaultProps} isAr={true} />);

    expect(screen.getByText("الرواتب")).toBeInTheDocument();
    expect(screen.getByText("دفعة المورد")).toBeInTheDocument();
    expect(screen.getByText("فواتير المرافق")).toBeInTheDocument();
  });

  it("displays AlertTriangle icon for danger severity", () => {
    const { container } = render(<UpcomingPayments {...defaultProps} />);

    const dangerIcon = container.querySelector(".text-rose-500");
    expect(dangerIcon).toBeInTheDocument();
  });

  it("displays Clock icon for warning severity", () => {
    const { container } = render(<UpcomingPayments {...defaultProps} />);

    const warningIcon = container.querySelector(".text-amber-500");
    expect(warningIcon).toBeInTheDocument();
  });

  it("displays Calendar icon for normal severity", () => {
    const { container } = render(<UpcomingPayments {...defaultProps} />);

    const normalIcon = container.querySelector(".text-muted-foreground");
    expect(normalIcon).toBeInTheDocument();
  });

  it("handles empty payments array", () => {
    render(<UpcomingPayments {...defaultProps} payments={[]} />);

    expect(screen.getByText("Upcoming Payments")).toBeInTheDocument();
    expect(screen.queryByText("Payroll")).not.toBeInTheDocument();
  });

  it("formats large amounts correctly", () => {
    const largePayment = [
      {
        id: "large",
        descEn: "Large Payment",
        descAr: "دفعة كبيرة",
        amount: 1234567,
        daysUntil: 3,
        severity: "danger" as const,
      },
    ];

    render(<UpcomingPayments {...defaultProps} payments={largePayment} />);

    expect(screen.getByText(/-SAR 1,234,567/)).toBeInTheDocument();
  });
});
