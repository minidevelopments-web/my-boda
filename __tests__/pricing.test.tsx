import { render, screen } from "@testing-library/react";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { getDictionary } from "@/lib/i18n";
import {
  COMMERCIAL_LICENSE_HREF,
  COMMERCIAL_LICENSE_URL,
  HOSTED_ORDER_HREF,
  PREMIUM_ORDER_HREF,
  SELF_HOST_URL,
} from "@/lib/pricing";

describe("pricing plans", () => {
  it("renders the three couple plans with prices and working CTAs", () => {
    render(<PricingPlans dict={getDictionary("en")} />);

    expect(screen.getByRole("heading", { name: "Self-host" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hosted Pro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hosted Premium" })).toBeInTheDocument();
    expect(screen.getByText("€0")).toBeInTheDocument();
    expect(screen.getByText("€79")).toBeInTheDocument();
    expect(screen.getByText("€149")).toBeInTheDocument();
    expect(screen.getByText(/non-commercial use only/i)).toBeInTheDocument();
    expect(screen.getByText(/99.9% monthly uptime sla/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /deploy from github/i })).toHaveAttribute(
      "href",
      SELF_HOST_URL
    );
    const orderLinks = screen.getAllByRole("link", { name: /order by email/i });
    expect(orderLinks).toHaveLength(2);
    expect(orderLinks[0]).toHaveAttribute("href", HOSTED_ORDER_HREF);
    expect(orderLinks[1]).toHaveAttribute("href", PREMIUM_ORDER_HREF);
  });

  it("keeps business and license destinations intact", () => {
    expect(SELF_HOST_URL).toMatch(/^https:\/\/github\.com\//);
    expect(HOSTED_ORDER_HREF).toMatch(/^mailto:minidevelopments@gmail\.com\?subject=/);
    expect(PREMIUM_ORDER_HREF).toMatch(/^mailto:/);
    expect(COMMERCIAL_LICENSE_HREF).toMatch(/^mailto:/);
    expect(COMMERCIAL_LICENSE_URL).toMatch(/COMMERCIAL\.md$/);
  });

  it("localizes prices without changing them", () => {
    render(<PricingPlans dict={getDictionary("es")} />);
    expect(screen.getByText("79 €")).toBeInTheDocument();
    expect(screen.getByText("149 €")).toBeInTheDocument();
  });
});
