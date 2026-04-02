// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  PropRow,
  PropSection,
  PropText,
  PropNumber,
  PropSlider,
  PropToggle,
  PropSelect,
  PropColor,
  PropReadOnly,
} from "@/components/editor/properties/prop-controls";

// ── PropRow ──────────────────────────────────────────

describe("PropRow", () => {
  it("renders label and children", () => {
    render(<PropRow label="Test Label"><span data-testid="child">Content</span></PropRow>);
    expect(screen.getByText("Test Label")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("shows hint as title attribute", () => {
    render(<PropRow label="L" hint="My hint"><span>X</span></PropRow>);
    expect(screen.getByText("L")).toHaveAttribute("title", "My hint");
  });
});

// ── PropSection ──────────────────────────────────────

describe("PropSection", () => {
  it("shows content by default (defaultOpen=true)", () => {
    render(
      <PropSection title="Section A">
        <span data-testid="content">Hello</span>
      </PropSection>
    );
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("hides content when defaultOpen=false", () => {
    render(
      <PropSection title="Section B" defaultOpen={false}>
        <span data-testid="hidden-content">Hidden</span>
      </PropSection>
    );
    expect(screen.getByText("Section B")).toBeInTheDocument();
    expect(screen.queryByTestId("hidden-content")).not.toBeInTheDocument();
  });

  it("toggles content on button click", () => {
    render(
      <PropSection title="Toggle Me">
        <span data-testid="toggle-content">Toggled</span>
      </PropSection>
    );
    // Initially visible
    expect(screen.getByTestId("toggle-content")).toBeInTheDocument();
    // Click to collapse
    fireEvent.click(screen.getByText("Toggle Me"));
    expect(screen.queryByTestId("toggle-content")).not.toBeInTheDocument();
    // Click to expand
    fireEvent.click(screen.getByText("Toggle Me"));
    expect(screen.getByTestId("toggle-content")).toBeInTheDocument();
  });
});

// ── PropText ─────────────────────────────────────────

describe("PropText", () => {
  it("renders input with value", () => {
    const onChange = vi.fn();
    render(<PropText label="Name" value="Hello" onChange={onChange} />);
    const input = screen.getByDisplayValue("Hello");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("renders textarea when multiline", () => {
    const onChange = vi.fn();
    render(<PropText label="Text" value="Multi" onChange={onChange} multiline />);
    const textarea = screen.getByDisplayValue("Multi");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("calls onChange on blur when value changed", () => {
    const onChange = vi.fn();
    render(<PropText label="Name" value="Old" onChange={onChange} />);
    const input = screen.getByDisplayValue("Old");
    fireEvent.change(input, { target: { value: "New" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("New");
  });

  it("does not call onChange on blur when value unchanged", () => {
    const onChange = vi.fn();
    render(<PropText label="Name" value="Same" onChange={onChange} />);
    const input = screen.getByDisplayValue("Same");
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is disabled when disabled prop is true", () => {
    const onChange = vi.fn();
    render(<PropText label="Name" value="X" onChange={onChange} disabled />);
    expect(screen.getByDisplayValue("X")).toBeDisabled();
  });
});

// ── PropNumber ───────────────────────────────────────

describe("PropNumber", () => {
  it("renders number input with value", () => {
    const onChange = vi.fn();
    render(<PropNumber label="Size" value={24} onChange={onChange} />);
    expect(screen.getByDisplayValue("24")).toBeInTheDocument();
  });

  it("shows unit text", () => {
    const onChange = vi.fn();
    render(<PropNumber label="Size" value={24} unit="px" onChange={onChange} />);
    expect(screen.getByText("px")).toBeInTheDocument();
  });

  it("clamps to min/max on blur", () => {
    const onChange = vi.fn();
    render(<PropNumber label="V" value={50} min={0} max={100} onChange={onChange} />);
    const input = screen.getByDisplayValue("50");
    fireEvent.change(input, { target: { value: "200" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it("handles NaN input by reverting to original value", () => {
    const onChange = vi.fn();
    render(<PropNumber label="V" value={50} onChange={onChange} />);
    const input = screen.getByDisplayValue("50");
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);
    // Should not call onChange since value reverts to 50
    expect(onChange).not.toHaveBeenCalled();
  });

  it("respects step attribute", () => {
    const onChange = vi.fn();
    render(<PropNumber label="V" value={1} step={0.1} onChange={onChange} />);
    const input = screen.getByDisplayValue("1");
    expect(input).toHaveAttribute("step", "0.1");
  });
});

// ── PropSlider ───────────────────────────────────────

describe("PropSlider", () => {
  it("renders range input with value", () => {
    const onChange = vi.fn();
    render(<PropSlider label="Opacity" value={75} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("75");
  });

  it("calls onChange on input change", () => {
    const onChange = vi.fn();
    render(<PropSlider label="Vol" value={50} min={0} max={100} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "80" } });
    expect(onChange).toHaveBeenCalledWith(80);
  });

  it("shows display value with unit", () => {
    const onChange = vi.fn();
    render(<PropSlider label="X" value={42} unit="%" onChange={onChange} />);
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("is disabled when disabled prop is set", () => {
    const onChange = vi.fn();
    render(<PropSlider label="X" value={0} onChange={onChange} disabled />);
    expect(screen.getByRole("slider")).toBeDisabled();
  });
});

// ── PropToggle ───────────────────────────────────────

describe("PropToggle", () => {
  it("renders toggle button", () => {
    const onChange = vi.fn();
    render(<PropToggle label="Lock" value={false} onChange={onChange} />);
    expect(screen.getByText("Lock")).toBeInTheDocument();
  });

  it("calls onChange with inverted value on click", () => {
    const onChange = vi.fn();
    render(<PropToggle label="Lock" value={false} onChange={onChange} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange(false) when value is true", () => {
    const onChange = vi.fn();
    render(<PropToggle label="Lock" value={true} onChange={onChange} />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(<PropToggle label="Lock" value={false} onChange={onChange} disabled />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ── PropSelect ───────────────────────────────────────

describe("PropSelect", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
    { value: "c", label: "Gamma" },
  ];

  it("renders select with options", () => {
    const onChange = vi.fn();
    render(<PropSelect label="Choice" value="a" options={options} onChange={onChange} />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("a");
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("calls onChange when selection changes", () => {
    const onChange = vi.fn();
    render(<PropSelect label="Choice" value="a" options={options} onChange={onChange} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("is disabled when disabled prop is set", () => {
    const onChange = vi.fn();
    render(<PropSelect label="Choice" value="a" options={options} onChange={onChange} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});

// ── PropColor ────────────────────────────────────────

describe("PropColor", () => {
  it("renders color input with value", () => {
    const onChange = vi.fn();
    render(<PropColor label="Color" value="#ff0000" onChange={onChange} />);
    expect(screen.getByDisplayValue("#ff0000")).toBeInTheDocument();
  });

  it("shows hex value as text", () => {
    const onChange = vi.fn();
    render(<PropColor label="Color" value="#00ff00" onChange={onChange} />);
    expect(screen.getByText("#00ff00")).toBeInTheDocument();
  });

  it("calls onChange on color change", () => {
    const onChange = vi.fn();
    render(<PropColor label="Color" value="#ff0000" onChange={onChange} />);
    const input = screen.getByDisplayValue("#ff0000");
    fireEvent.change(input, { target: { value: "#0000ff" } });
    expect(onChange).toHaveBeenCalledWith("#0000ff");
  });
});

// ── PropReadOnly ─────────────────────────────────────

describe("PropReadOnly", () => {
  it("renders label and value", () => {
    render(<PropReadOnly label="Type" value="video-clip" />);
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("video-clip")).toBeInTheDocument();
  });
});
