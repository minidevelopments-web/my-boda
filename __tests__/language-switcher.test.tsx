import { render, screen } from "@testing-library/react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

jest.mock("next/navigation", () => ({
  usePathname: () => "/es/info",
}));

test("renders 5 locales and marks current", () => {
  render(<LanguageSwitcher lang="es" />);
  expect(screen.getByLabelText(/idioma|language|langue/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /english/i })).toHaveAttribute("href", expect.stringContaining("/en"));
});
