import type { HardwareCategory } from "./hardware";

/**
 * Categories the consumer-facing Shopping Buddy flow can search across.
 *
 * This is a strict superset of HardwareCategory — the PC-hardware pipeline
 * (`lib/pipeline.ts`, `/api/analyze`) still only ever produces/accepts
 * HardwareCategory values, so nothing about it changes. This wider type
 * exists only where a Product or a search query might legitimately be a
 * non-PC-component item (a laptop, headphones, etc.) that the deterministic
 * hardware-compatibility engine simply has no opinion about.
 */
export type ShopCategory = HardwareCategory | "laptop" | "audio" | "other";