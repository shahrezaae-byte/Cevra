import type { ExistingComponent } from "@/types/research";
import type { CompatibilityIssue } from "@/types/recommendation";
import type { Product } from "@/types/product";
import { checkCpuMotherboardCompatibility } from "@/lib/compatibility/cpu";
import { checkRamMotherboardCompatibility } from "@/lib/compatibility/ram";
import { checkGpuMotherboardCompatibility } from "@/lib/compatibility/gpu";
import { resolveKnownCpuSpec, resolveKnownMotherboardSpec } from "@/lib/compatibility/knownHardware";

/**
 * Checks compatibility strictly among components the user says they
 * ALREADY OWN — meant to run before any new research, so a broken existing
 * setup (e.g. a CPU/motherboard socket mismatch) is caught and surfaced
 * before recommending anything new to add to it. Shared by both the
 * PC-hardware pipeline (`lib/pipeline.ts`) and the Shopping Buddy pipeline
 * (`lib/shop/pipeline.ts`) so this rule only lives in one place.
 */
export function checkExistingComponentCompatibility(
  existingComponents: ExistingComponent[] = []
): CompatibilityIssue[] {
  const cpu = existingComponents.find((c) => c.category === "cpu");
  const motherboard = existingComponents.find((c) => c.category === "motherboard");
  const issues: CompatibilityIssue[] = [];

  if (cpu && motherboard) {
    const cpuSpec = resolveKnownCpuSpec(cpu.name);
    const moboSpec = resolveKnownMotherboardSpec(motherboard.name);
    const result = checkCpuMotherboardCompatibility(
      { name: cpu.name, ...cpuSpec },
      { name: motherboard.name, ...moboSpec }
    );
    issues.push({ involving: [cpu.name, motherboard.name], result });
  }

  return issues;
}

/**
 * Checks NEW candidate products (things the user is about to buy) against
 * whatever motherboard they say they already own. Covers RAM (generation/
 * slots/capacity) and GPU (PCIe slot) — the two categories most likely to
 * be shopped for against an existing board.
 */
export function checkNewProductsAgainstExistingMotherboard(
  products: Product[],
  existingComponents: ExistingComponent[] = []
): CompatibilityIssue[] {
  const motherboard = existingComponents.find((c) => c.category === "motherboard");
  if (!motherboard) return [];

  const moboSpec = resolveKnownMotherboardSpec(motherboard.name);
  const issues: CompatibilityIssue[] = [];

  for (const product of products) {
    if (product.category === "ram" && product.specifications?.category === "ram") {
      const result = checkRamMotherboardCompatibility(
        { name: product.name, ...product.specifications },
        { name: motherboard.name, ...moboSpec }
      );
      issues.push({ involving: [product.id, motherboard.name], result });
    }

    if (product.category === "gpu") {
      const gpuSpec = product.specifications?.category === "gpu" ? product.specifications : {};
      const result = checkGpuMotherboardCompatibility(
        { name: product.name, ...gpuSpec },
        { name: motherboard.name, ...moboSpec }
      );
      issues.push({ involving: [product.id, motherboard.name], result });
    }
  }

  return issues;
}
