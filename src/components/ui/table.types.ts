import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (row: T) => ReactNode;
}

export type RenderCell<T> = (row: T) => ReactNode;
export type Align = TableColumn<unknown>["align"];
