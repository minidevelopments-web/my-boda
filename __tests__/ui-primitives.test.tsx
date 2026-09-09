import { render, screen } from "@testing-library/react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

describe("ui primitives (#40)", () => {
  it("Input wires label + error accessibly and shares Button states", () => {
    render(<Input label="Name" error="Name is required" required placeholder="Your name" />);
    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", expect.stringContaining("error"));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(input.className).toMatch(/disabled:opacity-50/);
    expect(input.className).toMatch(/focus-visible:ring-2/);
  });

  it("Input loading disables the field", () => {
    render(<Input label="Email" loading placeholder="a@b.c" />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-busy", "true");
  });

  it("Card renders a unified surface", () => {
    render(<Card data-testid="card">hello</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveTextContent("hello");
    expect(card.className).toMatch(/rounded/);
    expect(card.className).toMatch(/shadow-sm/);
  });

  it("Badge renders status variants", () => {
    const { rerender } = render(<Badge variant="success">Yes</Badge>);
    expect(screen.getByText("Yes").className).toMatch(/green/);
    rerender(<Badge variant="warning">Pending</Badge>);
    expect(screen.getByText("Pending").className).toMatch(/amber/);
  });
});
