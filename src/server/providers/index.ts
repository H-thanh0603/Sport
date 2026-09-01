import type { SportsDataProvider } from "./provider";
import { MockSportsProvider } from "./mock/provider";

let instance: SportsDataProvider | null = null;

/** Choose provider via env SPORTS_PROVIDER. Register new providers here. */
export function sportsProvider(): SportsDataProvider {
  if (!instance) {
    switch (process.env.SPORTS_PROVIDER) {
      case "mock":
      default:
        instance = new MockSportsProvider();
        break;
    }
  }
  return instance;
}
