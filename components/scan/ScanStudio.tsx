"use client";

import { addMeal } from "@/lib/actions";
import { Button, Card, Field, Segmented, Select } from "@/components/ui";
import { useUi } from "@/store/useUi";
import type { FoodVisionItem, FoodVisionResult, MealType } from "@/types";
import { MEALS } from "@/types";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, ImagePlus, ScanBarcode } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Mode = "photo" | "barcode";

export function ScanStudio() {
  const date = useUi((s) => s.selectedDate);
  const meal = useUi((s) => s.selectedMeal);
  const setMeal = useUi((s) => s.setMeal);
  const showToast = useUi((s) => s.showToast);
  const [mode, setMode] = useState<Mode>("photo");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FoodVisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<BarcodeProduct | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyze(dataUrl: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const json = (await res.json()) as { result?: FoodVisionResult; error?: string; demo?: boolean };
      if (!res.ok || !json.result) throw new Error(json.error || "Analyze failed");
      setResult(json.result);
      if (json.demo) showToast("Demo estimate — add an API key for live vision");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyze failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    const dataUrl = await readFile(file);
    setPreview(dataUrl);
    await analyze(dataUrl);
  }

  async function confirmVision() {
    if (!result) return;
    await addMeal({
      localDate: date,
      mealType: meal,
      source: "ai_vision",
      photoDataUrl: preview ?? undefined,
      items: result.items.map(toLogItem),
    });
    showToast("Plate logged · +10 XP");
    setResult(null);
    setPreview(null);
  }

  async function confirmBarcode() {
    if (!barcodeProduct) return;
    await addMeal({
      localDate: date,
      mealType: meal,
      source: "barcode",
      items: [
        {
          name: barcodeProduct.name,
          grams: barcodeProduct.servingG,
          calories: barcodeProduct.calories,
          proteinG: barcodeProduct.proteinG,
          carbsG: barcodeProduct.carbsG,
          fatG: barcodeProduct.fatG,
          barcode: barcodeProduct.barcode,
        },
      ],
    });
    showToast("Barcode logged · +10 XP");
    setBarcodeProduct(null);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Scan</h1>
        <p className="text-sm text-ff-dim">Photo vision or Open Food Facts barcode.</p>
      </header>

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "photo", label: "AI plate" },
          { value: "barcode", label: "Barcode" },
        ]}
      />

      <Field label="Log as">
        <Select value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
          {MEALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </Field>

      {mode === "photo" ? (
        <>
          <div className="overflow-hidden rounded-sheet border border-ff-border bg-ff-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Meal preview" className="h-56 w-full object-cover" />
            ) : (
              <div className="grid h-56 place-items-center text-ff-dim">
                <div className="text-center">
                  <Camera className="mx-auto mb-2" />
                  <p className="text-sm">Point at the plate or upload a photo</p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => fileRef.current?.click()}>
              <Camera size={16} /> Camera
            </Button>
            <Button variant="soft" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={16} /> Library
            </Button>
          </div>
          {busy && <p className="text-center text-sm text-ff-dim">Reading the plate…</p>}
          {error && <p className="text-sm text-ff-danger">{error}</p>}
          {result && (
            <Card className="space-y-3">
              <p className="font-semibold">{result.meal_summary}</p>
              <p className="text-xs text-ff-dim">
                Confidence {Math.round(result.confidence * 100)}% · {Math.round(result.totals.calories)} kcal
              </p>
              <ul className="space-y-2 text-sm">
                {result.items.map((item) => (
                  <li key={item.name} className="flex justify-between gap-2">
                    <span>
                      {item.name}
                      <span className="block text-xs text-ff-dim">{item.estimated_grams}g</span>
                    </span>
                    <span>{Math.round(item.calories)}</span>
                  </li>
                ))}
              </ul>
              {result.assumptions.length > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-xs text-ff-dim">
                  {result.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
              <Button className="w-full" onClick={confirmVision}>
                Confirm log
              </Button>
            </Card>
          )}
        </>
      ) : (
        <BarcodePane
          product={barcodeProduct}
          onProduct={setBarcodeProduct}
          onConfirm={confirmBarcode}
        />
      )}
    </div>
  );
}

function toLogItem(item: FoodVisionItem) {
  return {
    name: item.name,
    grams: item.estimated_grams,
    calories: item.calories,
    proteinG: item.protein_g,
    carbsG: item.carbs_g,
    fatG: item.fat_g,
    fiberG: item.fiber_g,
    micros: item.micros ?? {},
    confidence: item.confidence,
  };
}

interface BarcodeProduct {
  barcode: string;
  name: string;
  servingG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

function BarcodePane({
  product,
  onProduct,
  onConfirm,
}: {
  product: BarcodeProduct | null;
  onProduct: (p: BarcodeProduct | null) => void;
  onConfirm: () => void;
}) {
  const hostId = "ff-barcode-reader";
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  async function lookup(code: string) {
    setError(null);
    const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`);
    const json = (await res.json()) as { product?: BarcodeProduct; error?: string };
    if (!res.ok || !json.product) {
      setError(json.error || "Product not found");
      onProduct(null);
      return;
    }
    onProduct(json.product);
  }

  async function startScan() {
    setScanning(true);
    setError(null);
    try {
      const scanner = new Html5Qrcode(hostId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 140 } },
        (decoded) => {
          void scanner.stop();
          setScanning(false);
          void lookup(decoded);
        },
        () => undefined,
      );
    } catch {
      setScanning(false);
      setError("Camera unavailable. Type the barcode instead.");
    }
  }

  return (
    <div className="space-y-3">
      <div id={hostId} className="overflow-hidden rounded-sheet bg-black" />
      <Button className="w-full" onClick={startScan} disabled={scanning}>
        <ScanBarcode size={16} /> {scanning ? "Scanning…" : "Open camera"}
      </Button>
      <Field label="Or type a barcode">
        <input
          className="w-full rounded-ff border border-ff-border bg-ff-muted px-3 py-2.5"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="e.g. 3017620422003"
        />
      </Field>
      <Button variant="soft" className="w-full" onClick={() => lookup(manual)} disabled={!manual.trim()}>
        Look up Open Food Facts
      </Button>
      {error && <p className="text-sm text-ff-danger">{error}</p>}
      {product && (
        <Card className="space-y-2">
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm text-ff-dim">
            {product.servingG}g · {Math.round(product.calories)} kcal · P{Math.round(product.proteinG)} C
            {Math.round(product.carbsG)} F{Math.round(product.fatG)}
          </p>
          <Button className="w-full" onClick={onConfirm}>
            Log serving
          </Button>
        </Card>
      )}
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
