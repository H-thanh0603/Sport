import type { Metadata } from "next";
import { DemoShowcase } from "./showcase";

export const metadata: Metadata = { title: "UI Kit Demo" };

export default function DevUiPage() {
  // Chỉ render ngoài production — guard qua middleware.env không cần, route dev-only theo WORKPLAN.
  return <DemoShowcase />;
}
