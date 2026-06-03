import { render, screen } from "@testing-library/react";
import { TypeBadge } from "@/components/TypeBadge";

describe("TypeBadge", () => {
  it("renders the type name", () => {
    render(<TypeBadge type="fire" label="火" />);
    expect(screen.getByText("火")).toBeInTheDocument();
  });

  it("applies fire background color", () => {
    const { container } = render(<TypeBadge type="fire" label="火" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe("rgb(229, 107, 44)");
  });

  it("renders english label without overflow", () => {
    render(<TypeBadge type="electric" label="Electric" />);
    const badge = screen.getByText("Electric");
    expect(badge).toHaveStyle({ whiteSpace: "nowrap" });
  });
});
