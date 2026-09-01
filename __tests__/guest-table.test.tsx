import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { GuestTable } from "@/components/admin/GuestTable";

const mockGuests = [
  {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
    category: "family",
    plusOne: false,
    rsvp: { attending: true, mealChoice: "vegetarian", respondedAt: "2026-01-01T00:00:00.000Z" },
  },
  {
    id: "2",
    name: "Bob",
    email: "bob@example.com",
    category: "friends",
    plusOne: true,
    rsvp: { attending: false, mealChoice: null, respondedAt: "2026-01-02T00:00:00.000Z" },
  },
  {
    id: "3",
    name: "Carol",
    category: "colleagues",
    plusOne: false,
    rsvp: null,
  },
];

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => "blob:mock");
global.URL.revokeObjectURL = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { id: "1", category: "friends" } }),
    blob: async () => new Blob(["csv"], { type: "text/csv" }),
  } as unknown as Response);
});

describe("GuestTable", () => {
  it("renders guest rows with expected columns", () => {
    render(<GuestTable guests={mockGuests as any} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    // headers
    expect(screen.getByText(/Name/)).toBeInTheDocument();
    expect(screen.getByText(/Category/)).toBeInTheDocument();
    expect(screen.getByText(/Plus One/)).toBeInTheDocument();
    expect(screen.getByText(/Attending/)).toBeInTheDocument();
    expect(screen.getByText(/Meal Choice/)).toBeInTheDocument();
    expect(screen.getByText(/Responded At/)).toBeInTheDocument();
  });

  it("filters by search", async () => {
    render(<GuestTable guests={mockGuests as any} />);
    const search = screen.getByLabelText(/Search guests/i);
    fireEvent.change(search, { target: { value: "alice" } });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol")).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("filters by category via CategoryFilter", () => {
    render(<GuestTable guests={mockGuests as any} />);
    const select = screen.getByLabelText(/Filter by category/i);
    fireEvent.change(select, { target: { value: "friends" } });
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol")).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: "all" } });
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("allows inline category edit (PATCH)", async () => {
    render(<GuestTable guests={mockGuests as any} />);
    // click edit button for Alice
    const editBtn = screen.getByLabelText("Edit category for Alice");
    fireEvent.click(editBtn);
    const select = screen.getByLabelText("Edit category");
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "friends" } });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/guests/1",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  it("downloads CSV via blob", async () => {
    render(<GuestTable guests={mockGuests as any} />);
    const btn = screen.getByRole("button", { name: /Export CSV/i });
    // mock appendChild/click to avoid DOM errors
    const createElSpy = jest.spyOn(document, "createElement");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(["a,b\n1,2"], { type: "text/csv" }),
    } as unknown as Response);

    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/guests/export");
    });
    createElSpy.mockRestore();
  });

  it("sorts by name when header clicked", () => {
    render(<GuestTable guests={mockGuests as any} />);
    // initial asc: Alice, Bob, Carol
    let rows = screen.getAllByRole("row");
    // rows[0] header, then data rows
    expect(within(rows[1]).getByText("Alice")).toBeInTheDocument();
    const nameHeader = screen.getByText(/Name/).closest("th")!;
    fireEvent.click(nameHeader); // toggle desc
    rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Carol")).toBeInTheDocument();
  });
});
