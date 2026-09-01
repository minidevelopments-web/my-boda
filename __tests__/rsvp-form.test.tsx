import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RsvpForm from "@/components/rsvp/RsvpForm";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ data: {} }),
  } as Response);
});

describe("RsvpForm", () => {
  it("shows headcount only when attending", async () => {
    render(<RsvpForm />);
    // By default attending is true or toggle exists — headcount hidden when not attending
    // Use role query to avoid matching "Dietary Notes" which contains "no"
    const attendingYes = screen.getByRole("radio", { name: /^yes$/i });
    const attendingNo = screen.getByRole("radio", { name: /^no$/i });

    // Initially attending true → headcount visible
    expect(attendingYes).toBeChecked();
    expect(screen.getByLabelText(/headcount|number of guests/i)).toBeInTheDocument();

    // Switch to not attending → headcount hidden
    fireEvent.click(attendingNo);
    await waitFor(() => {
      expect(screen.queryByLabelText(/headcount|number of guests/i)).not.toBeInTheDocument();
    });

    // Switch back to attending → headcount visible again
    fireEvent.click(attendingYes);
    await waitFor(() => {
      expect(screen.getByLabelText(/headcount|number of guests/i)).toBeInTheDocument();
    });
  });

  it("shows mealChoice only when attending", async () => {
    render(<RsvpForm />);
    const attendingNo = screen.getByRole("radio", { name: /^no$/i });
    fireEvent.click(attendingNo);
    await waitFor(() => {
      expect(screen.queryByLabelText(/meal/i)).not.toBeInTheDocument();
    });
  });

  it("shows plusOneName only when plusOne is checked", async () => {
    render(<RsvpForm />);
    expect(screen.queryByLabelText(/plus one name/i)).not.toBeInTheDocument();
    const plusOneCheckbox = screen.getByLabelText(/^plus one$/i);
    fireEvent.click(plusOneCheckbox);
    await waitFor(() => {
      expect(screen.getByLabelText(/plus one name/i)).toBeInTheDocument();
    });
    fireEvent.click(plusOneCheckbox);
    await waitFor(() => {
      expect(screen.queryByLabelText(/plus one name/i)).not.toBeInTheDocument();
    });
  });

  it("validates required name and submits via fetch", async () => {
    render(<RsvpForm />);
    const submit = screen.getByRole("button", { name: /submit|send rsvp/i });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();

    const nameInput = screen.getByLabelText(/^name/i);
    fireEvent.change(nameInput, { target: { value: "Test Guest" } });
    // Ensure attending is yes
    const attendingYes = screen.getByRole("radio", { name: /^yes$/i });
    if (!attendingYes.checked) fireEvent.click(attendingYes);

    fireEvent.click(submit);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/rsvp",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows success message after successful submit", async () => {
    render(<RsvpForm />);
    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Lena" } });
    fireEvent.click(screen.getByRole("button", { name: /submit|send rsvp/i }));
    await waitFor(() => {
      expect(screen.getByText(/thank you|rsvp.*received|success/i)).toBeInTheDocument();
    });
  });
});
