// Generate a UETR-like identifier (32 hex chars = UUID without dashes)
export function generateUETR(): string {
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join("");
  return hex.slice(0, 32);
}

// Format UETR for display (add dashes like real UETR: 8-4-4-4-12)
export function formatUETR(hex: string): string {
  const h = hex.padEnd(32, "0");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
