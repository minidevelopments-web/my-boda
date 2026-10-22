import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GalleryUpload, resizeForUpload } from "@/components/gallery/GalleryUpload";
import en from "@/i18n/dictionaries/en.json";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: push }) }));

beforeEach(() => {
  push.mockClear();
  Object.defineProperty(URL, "createObjectURL", {
    value: jest.fn(() => "blob:preview"),
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: jest.fn(),
    configurable: true,
  });
});

const photo = {
  id: "p1", caption: "Sunset", uploaderName: "Ana", width: 2048, height: 1365,
  createdAt: new Date().toISOString(), canDelete: true,
};

it("renders thumbnails and deletes after confirmation", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
  jest.spyOn(window, "confirm").mockReturnValue(true);

  render(<GalleryGrid photos={[photo]} lang="en" messages={en.gallery} />);
  expect(screen.getByAltText("Sunset")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: en.gallery.delete }));
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith("/api/v1/gallery/p1", { method: "DELETE" })
  );
  expect(push).toHaveBeenCalled();
});

it("shows the empty state", () => {
  render(<GalleryGrid photos={[]} lang="en" messages={en.gallery} />);
  expect(screen.getByText(en.gallery.empty)).toBeInTheDocument();
});

it("falls back to the original file when the browser cannot decode it", async () => {
  const file = new File(["not-an-image"], "a.heic", { type: "image/heic" });
  expect(await resizeForUpload(file)).toBe(file);
});

function selectFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

it("keeps only the failed file after a partial batch and refreshes once", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ data: [{}], failures: [{ index: 1, code: "invalid_image" }] }),
  } as Response);

  const { container } = render(<GalleryUpload messages={en.gallery} />);
  selectFiles(container, [
    new File(["good"], "good.jpg", { type: "image/jpeg" }),
    new File(["bad"], "bad.jpg", { type: "image/jpeg" }),
  ]);
  fireEvent.click(screen.getByRole("button", { name: en.gallery.upload }));

  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(en.gallery.errors.invalidType)
  );
  expect(push).toHaveBeenCalled();
  expect(screen.getAllByRole("button", { name: en.gallery.delete })).toHaveLength(1);
});

it("shows a retryable error when the upload request itself fails", async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error("network"));

  const { container } = render(<GalleryUpload messages={en.gallery} />);
  selectFiles(container, [new File(["photo"], "a.jpg", { type: "image/jpeg" })]);
  fireEvent.click(screen.getByRole("button", { name: en.gallery.upload }));

  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(en.gallery.errors.uploadFailed)
  );
  expect(push).not.toHaveBeenCalled();
  expect(screen.getAllByRole("button", { name: en.gallery.delete })).toHaveLength(1);
});
