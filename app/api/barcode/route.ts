import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
    headers: { "User-Agent": "ForgeFuel/0.1 (calorie tracker; local-dev)" },
  });
  const json = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      generic_name?: string;
      brands?: string;
      serving_size?: string;
      nutriments?: Record<string, number | undefined>;
    };
  };

  if (!res.ok || json.status !== 1 || !json.product) {
    return NextResponse.json({ error: "Product not found on Open Food Facts" }, { status: 404 });
  }

  const n = json.product.nutriments ?? {};
  const servingG = Number(String(json.product.serving_size ?? "100").replace(/[^\d.]/g, "")) || 100;
  const factor = servingG / 100;
  const per100 = (key: string) => Number(n[key] ?? 0);

  return NextResponse.json({
    product: {
      barcode: code,
      name:
        [json.product.brands, json.product.product_name || json.product.generic_name]
          .filter(Boolean)
          .join(" · ") || "Unknown product",
      servingG,
      calories: +(per100("energy-kcal_100g") * factor).toFixed(1),
      proteinG: +(per100("proteins_100g") * factor).toFixed(1),
      carbsG: +(per100("carbohydrates_100g") * factor).toFixed(1),
      fatG: +(per100("fat_100g") * factor).toFixed(1),
    },
  });
}
