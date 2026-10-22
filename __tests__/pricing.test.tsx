import { render, screen } from "@testing-library/react";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { getDictionary } from "@/lib/i18n";
import {
  COMMERCIAL_LICENSE_HREF,
  COMMERCIAL_LICENSE_URL,
  HOSTED_ORDER_HREF,
  SELF_HOST_URL,
} from "@/lib/pricing";

describe("pricing plans", () => {
  it("renders the two couple plans with prices and working CTAs", () => {
    render(<PricingPlans dict={getDictionary("en")} />);

    expect(screen.getByRole("heading", { name: "Self-host" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hosted Pro" })).toBeInTheDocument();
    expect(screen.getByText("€0")).toBeInTheDocument();
    expect(screen.getByText("€79")).toBeInTheDocument();
    expect(screen.getByText(/non-commercial use only/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /deploy from github/i })).toHaveAttribute(
      "href",
      SELF_HOST_URL
    );
    expect(screen.getByRole("link", { name: /order by email/i })).toHaveAttribute(
      "href",
      HOSTED_ORDER_HREF
    );
  });

  it("keeps business and license destinations intact", () => {
    expect(SELF_HOST_URL).toMatch(/^https:\/\/github\.com\//);
    expect(HOSTED_ORDER_HREF).toMatch(/^mailto:minidevelopments@gmail\.com\?subject=/);
    expect(COMMERCIAL_LICENSE_HREF).toMatch(/^mailto:/);
    expect(COMMERCIAL_LICENSE_URL).toMatch(/COMMERCIAL\.md$/);
  });

  it("localizes prices without changing them", () => {
    render(<PricingPlans dict={getDictionary("es")} />);
    expect(screen.getByText("79 €")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pedir por correo/i })).toHaveAttribute(
      "href",
      HOSTED_ORDER_HREF
    );
  });
});
