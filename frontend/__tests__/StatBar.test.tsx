import { render } from "@testing-library/react";
import { StatBar } from "@/components/StatBar";

describe("StatBar", () => {
  it("renders label and value", () => {
    const { getByText } = render(<StatBar label="HP" value={78} maxValue={255} color="#ef4444" />);
    expect(getByText("HP")).toBeInTheDocument();
    expect(getByText("78")).toBeInTheDocument();
  });

  it("bar width reflects value proportion", () => {
    const { container } = render(<StatBar label="HP" value={255} maxValue={255} color="#ef4444" />);
    const bar = container.querySelector("[data-testid='stat-bar-fill']") as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });
});
