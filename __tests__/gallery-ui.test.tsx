import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { resizeForUpload } from "@/components/gallery/GalleryUpload";
import en from "@/i18n/dictionaries/en.json";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: push }) }));

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
