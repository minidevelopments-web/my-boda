import { render, screen } from "@testing-library/react";
import Checklist from "@/components/onboarding/Checklist";
it("checklist renders progress + empty CTA", () => {
  render(<Checklist responded={3} total={10} codesSent={2} labels={{ title: "Setup", cta: "Add guests" }} />);
  expect(screen.getByText("Setup")).toBeInTheDocument();
  expect(screen.getByText("Add guests")).toBeInTheDocument();
});
