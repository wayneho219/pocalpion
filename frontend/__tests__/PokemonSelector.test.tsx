import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PokemonSelector } from "@/components/PokemonSelector";

// Mock api
jest.mock("@/lib/api", () => ({
  api: {
    searchPokemon: jest.fn().mockResolvedValue([
      { id: 6, name_zh: "噴火龍", name_en: "charizard", name_ja: "リザードン", types: ["fire", "flying"] },
    ]),
  },
}));

describe("PokemonSelector", () => {
  it("calls onSelect when a result is clicked", async () => {
    const onSelect = jest.fn();
    render(
      <PokemonSelector
        id="test"
        label="名稱"
        lang="zh"
        onSelect={onSelect}
      />
    );
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "charizard");
    await waitFor(() => screen.getByText("噴火龍"));
    await userEvent.click(screen.getByText("噴火龍"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 6 })
    );
  });
});
