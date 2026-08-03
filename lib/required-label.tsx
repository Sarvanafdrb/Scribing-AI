import * as React from "react";

/**
 * Wraps required-field asterisks (*) in a red/destructive span.
 * Preserves surrounding text and does not alter optional-field labels.
 */
export function highlightRequiredAsterisks(
  children: React.ReactNode,
): React.ReactNode {
  if (!containsAsterisk(children)) return children;

  const highlighted = mapAsterisks(children);

  // Label uses `display: flex` + gap; keep one flex child so spacing/layout
  // between the text and "*" does not change.
  return <span className="inline">{highlighted}</span>;
}

function containsAsterisk(node: React.ReactNode): boolean {
  let found = false;

  React.Children.forEach(node, (child) => {
    if (found) return;
    if (typeof child === "string" || typeof child === "number") {
      if (String(child).includes("*")) found = true;
      return;
    }
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      if (containsAsterisk(child.props.children)) found = true;
    }
  });

  return found;
}

function mapAsterisks(node: React.ReactNode): React.ReactNode {
  return React.Children.map(node, (child, index) => {
    if (typeof child === "string" || typeof child === "number") {
      return colorAsterisksInText(String(child), index);
    }

    if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      if (child.props.children == null) return child;
      return React.cloneElement(child, {
        ...child.props,
        children: mapAsterisks(child.props.children),
      });
    }

    return child;
  });
}

function colorAsterisksInText(text: string, keyPrefix: number): React.ReactNode {
  if (!text.includes("*")) return text;

  const parts = text.split(/(\*)/g);
  return parts.map((part, i) => {
    if (part === "*") {
      return (
        <span
          key={`req-asterisk-${keyPrefix}-${i}`}
          className="text-destructive"
          aria-hidden="true"
        >
          *
        </span>
      );
    }
    return part ? (
      <React.Fragment key={`req-text-${keyPrefix}-${i}`}>{part}</React.Fragment>
    ) : null;
  });
}
