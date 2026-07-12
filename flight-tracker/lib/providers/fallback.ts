import type { Aircraft, BBox } from "@/lib/types";
import type { FlightProvider } from "./index";

/**
 * Tries the primary provider; on any failure (quota, network, error) falls back
 * to the secondary so the map never goes blank. `name` reflects whichever
 * provider actually served the most recent request.
 */
export class FallbackProvider implements FlightProvider {
  private lastUsed: string;

  constructor(
    private readonly primary: FlightProvider,
    private readonly secondary: FlightProvider
  ) {
    this.lastUsed = primary.name;
  }

  get name(): string {
    return this.lastUsed;
  }

  async getPositions(bbox: BBox): Promise<Aircraft[]> {
    try {
      const result = await this.primary.getPositions(bbox);
      this.lastUsed = this.primary.name;
      return result;
    } catch (err) {
      console.warn(
        `[provider] ${this.primary.name} failed (${
          err instanceof Error ? err.message : err
        }); falling back to ${this.secondary.name}`
      );
      const result = await this.secondary.getPositions(bbox);
      this.lastUsed = this.secondary.name;
      return result;
    }
  }
}
