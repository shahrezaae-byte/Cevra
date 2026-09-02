import { z } from "zod";

/**
 * Every boundary of the app — API input, and AI output — is validated
 * with these schemas. Nothing unvalidated is trusted downstream.
 */

export const MAX_REQUEST_LENGTH = 500;

export const hardwareCategorySchema = z.enum([
  "cpu",
  "motherboard",
  "ram",
  "gpu",
  "psu",
  "storage",
]);

// ---------------------------------------------------------------------------
// Inbound API request bodies
// ---------------------------------------------------------------------------

export const analyzeRequestSchema = z.object({
  request: z
    .string()
    .trim()
    .min(3, "Tell us a bit more about what you're trying to buy.")
    .max(
      MAX_REQUEST_LENGTH,
      `Requests are limited to ${MAX_REQUEST_LENGTH} characters.`
    ),
});
export type AnalyzeRequestBody = z.infer<typeof analyzeRequestSchema>;

const cpuSocketSchema = z.enum(["LGA1700", "LGA1200", "LGA1851", "AM4", "AM5", "unknown"]);
const memoryGenerationSchema = z.enum(["DDR3", "DDR4", "DDR5", "unknown"]);

const namedCpuSchema = z.object({
  name: z.string().min(1).max(150),
  socket: cpuSocketSchema,
});

const namedMotherboardSchema = z.object({
  name: z.string().min(1).max(150),
  socket: cpuSocketSchema,
  formFactor: z.enum(["ATX", "Micro-ATX", "Mini-ITX", "E-ATX", "unknown"]),
  memoryGeneration: memoryGenerationSchema,
  memorySlots: z.number().int().positive().max(16).optional(),
  maxMemoryGb: z.number().positive().max(4096).optional(),
  pcieX16Slots: z.number().int().min(0).max(8).optional(),
});

const namedRamSchema = z.object({
  name: z.string().min(1).max(150),
  generation: memoryGenerationSchema,
  capacityGb: z.number().positive().max(4096),
  modules: z.number().int().positive().max(16).optional(),
  speedMhz: z.number().positive().max(20000).optional(),
});

const namedGpuSchema = z.object({
  name: z.string().min(1).max(150),
  lengthMm: z.number().positive().max(600).optional(),
  tdpWatts: z.number().positive().max(2000).optional(),
  recommendedPsuWatts: z.number().positive().max(3000).optional(),
});

const namedPsuSchema = z.object({
  name: z.string().min(1).max(150),
  wattage: z.number().positive().max(3000),
});

export const compatibilityRequestSchema = z
  .object({
    cpu: namedCpuSchema.optional(),
    motherboard: namedMotherboardSchema.optional(),
    ram: namedRamSchema.optional(),
    gpu: namedGpuSchema.optional(),
    psu: namedPsuSchema.optional(),
  })
  .refine((body) => Object.keys(body).length >= 2, {
    message: "Provide at least two components to check compatibility between.",
  });
export type CompatibilityRequestBody = z.infer<typeof compatibilityRequestSchema>;

export const researchRequestSchema = z.object({
  query: z.string().trim().min(2).max(200),
  category: hardwareCategorySchema.optional(),
});
export type ResearchRequestBody = z.infer<typeof researchRequestSchema>;

// ---------------------------------------------------------------------------
// Claude requirement-extraction output
// ---------------------------------------------------------------------------

export const existingComponentSchema = z.object({
  category: hardwareCategorySchema,
  name: z.string().min(1).max(120),
});

export const purchaseRequirementsSchema = z.object({
  category: hardwareCategorySchema.optional(),
  budget: z.number().positive().max(1_000_000).optional(),
  currency: z.string().length(3).optional(),
  useCase: z.string().max(200).optional(),
  capacity: z.string().max(50).optional(),
  existingComponents: z.array(existingComponentSchema).max(10).optional(),
  missingInformation: z.array(z.string().max(200)).max(5).optional(),
});
export type PurchaseRequirementsAiOutput = z.infer<
  typeof purchaseRequirementsSchema
>;

// ---------------------------------------------------------------------------
// Claude comparison / recommendation output
// ---------------------------------------------------------------------------

export const priceAssessmentSchema = z.object({
  assessment: z.enum(["GREAT", "GOOD", "FAIR", "POOR", "UNKNOWN"]),
  reason: z.string().min(1).max(300),
});

export const aiRecommendationSchema = z.object({
  summary: z.string().min(1).max(600),
  verdict: z.enum(["BUY", "WAIT", "AVOID"]),
  confidence: z.number().min(0).max(1),
  bestChoice: z
    .object({
      productId: z.string().min(1),
      reason: z.string().min(1).max(400),
    })
    .optional(),
  alternatives: z
    .array(
      z.object({
        productId: z.string().min(1),
        reason: z.string().min(1).max(400),
      })
    )
    .max(5)
    .default([]),
  warnings: z.array(z.string().max(300)).max(10).default([]),
  priceAssessment: priceAssessmentSchema,
});
export type AiRecommendationOutput = z.infer<typeof aiRecommendationSchema>;

// ---------------------------------------------------------------------------
// Shopping Buddy (Phase 2): broader consumer-shopping request/extraction
// ---------------------------------------------------------------------------

/**
 * Superset of hardwareCategorySchema — the shop flow can research things
 * that aren't PC components. This schema is only used by the shop-specific
 * request/extraction boundary; the PC-hardware analyze flow above is
 * untouched and still validates strictly against hardwareCategorySchema.
 */
export const shopCategorySchema = z.enum([
  "cpu",
  "motherboard",
  "ram",
  "gpu",
  "psu",
  "storage",
  "laptop",
  "audio",
  "other",
]);

export const shopRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Tell us a bit more about what you're shopping for.")
    .max(MAX_REQUEST_LENGTH, `Requests are limited to ${MAX_REQUEST_LENGTH} characters.`),
});
export type ShopRequestBody = z.infer<typeof shopRequestSchema>;

export const shopRequirementsSchema = z.object({
  category: shopCategorySchema.optional(),
  /** A specific product name/model mentioned in the query, e.g. "RTX 5070" or "MacBook Air". */
  productHint: z.string().min(1).max(150).optional(),
  budget: z.number().positive().max(1_000_000).optional(),
  currency: z.string().length(3).optional(),
  useCase: z.string().max(200).optional(),
  existingComponents: z.array(existingComponentSchema).max(10).optional(),
  missingInformation: z.array(z.string().max(200)).max(5).optional(),
});
export type ShopRequirementsAiOutput = z.infer<typeof shopRequirementsSchema>;

/**
 * Defensive re-validation of a normalized Product right before the shop
 * pipeline uses it — catches malformed provider/normalization output
 * (missing id/name, negative prices, bad URLs) rather than letting it
 * silently flow into pricing math or the UI. `.passthrough()` allows the
 * richer optional fields (specifications, rawSpecifications, etc.) through
 * without re-describing that whole shape here.
 */
export const productSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    price: z.number().positive().optional(),
    currency: z.string().optional(),
    originalPrice: z.number().positive().optional(),
    shippingCost: z.number().min(0).optional(),
    retailer: z.string().optional(),
    url: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    availability: z.enum(["in_stock", "out_of_stock", "unknown"]).optional(),
    source: z.string().min(1),
    retrievedAt: z.string().min(1),
  })
  .passthrough();
