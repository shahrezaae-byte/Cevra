import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { compatibilityRequestSchema } from "@/lib/validation/schemas";
import { checkCpuMotherboardCompatibility } from "@/lib/compatibility/cpu";
import { checkRamMotherboardCompatibility } from "@/lib/compatibility/ram";
import { checkGpuMotherboardCompatibility } from "@/lib/compatibility/gpu";
import { checkPsuCompatibility } from "@/lib/compatibility/power";
import type { CompatibilityResult } from "@/types/hardware";

interface NamedCheckResult {
  check: string;
  result: CompatibilityResult;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = compatibilityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { cpu, motherboard, ram, gpu, psu } = parsed.data;
  const results: NamedCheckResult[] = [];

  if (cpu && motherboard) {
    results.push({
      check: "cpu-motherboard",
      result: checkCpuMotherboardCompatibility(cpu, motherboard),
    });
  }

  if (ram && motherboard) {
    results.push({
      check: "ram-motherboard",
      result: checkRamMotherboardCompatibility(ram, motherboard),
    });
  }

  if (gpu && motherboard) {
    results.push({
      check: "gpu-motherboard",
      result: checkGpuMotherboardCompatibility(gpu, motherboard),
    });
  }

  if (psu) {
    results.push({
      check: "psu-power-budget",
      result: checkPsuCompatibility(psu, {
        cpuTdpWatts: undefined,
        gpuTdpWatts: gpu?.tdpWatts,
        gpuRecommendedPsuWatts: gpu?.recommendedPsuWatts,
      }),
    });
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: "No comparable component pair was provided (e.g. cpu + motherboard)." },
      { status: 400 }
    );
  }

  const overallCompatible = results.every((r) => r.result.compatible);

  return NextResponse.json({ overallCompatible, results });
}

function formatZodError(error: ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`);
}
