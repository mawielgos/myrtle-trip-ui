import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("UI test harness", () => {
  it("renders with React Testing Library and jest-dom matchers", () => {
    render(<div>Golf Trip Manager test harness ready</div>);

    expect(screen.getByText("Golf Trip Manager test harness ready")).toBeInTheDocument();
  });
});
