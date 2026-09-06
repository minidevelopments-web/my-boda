import { render, screen } from "@testing-library/react";
import RsvpForm from "@/components/rsvp/RsvpForm";
import { getDictionary } from "@/lib/i18n";
test("spanish form shows translated send button", () => {
  render(<RsvpForm messages={getDictionary("es").rsvp} />);
  expect(screen.getByRole("button", { name: /enviar/i })).toBeInTheDocument();
});
