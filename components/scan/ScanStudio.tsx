"use client";

import { addMeal } from "@/lib/actions";
import { Button, Card, Field, Segmented, Select } from "@/components/ui";
import { MEAL_KEY, useT } from "@/lib/i18n";
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
  const tr = useT();
  const [mode, setMode] = useState<Mode>("photo");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FoodVisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<BarcodeProduct | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) confirmRef.current?.querySelector("button")?.focus();
  }, [result]);

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
      if (!res.ok || !json.result) throw new Error(json.error || tr("scan.analyzeFailed"));
      setResult(json.result);
      if (json.demo) showToast(tr("scan.demo"));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("scan.analyzeFailed"));
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
      mealType: useUi.getState().selectedMeal,
      source: "ai_vision",
      photoDataUrl: preview ?? undefined,
      items: result.items.map(toLogItem),
    });
    showToast(tr("scan.plateLogged"));
    setResult(null);
    setPreview(null);
  }

  async function confirmBarcode() {
    if (!barcodeProduct) return;
    await addMeal({
      localDate: date,
      mealType: useUi.getState().selectedMeal,
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
    showToast(tr("scan.barcodeLogged"));
    setBarcodeProduct(null);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">{tr("scan.title")}</h1>
        <p className="text-sm text-ff-dim">{tr("scan.subtitle")}</p>
      </header>

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "photo", label: tr("scan.photo") },
          { value: "barcode", label: tr("scan.barcode") },
        ]}
      />

      <Field label={tr("scan.logAs")}>
        <Select value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>
          {MEALS.map((m) => (
            <option key={m} value={m}>
              {tr(MEAL_KEY[m])}
            </option>
          ))}
        </Select>
      </Field>

      {mode === "photo" ? (
        <>
          <div className="overflow-hidden rounded-sheet border border-ff-border bg-ff-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={tr("scan.previewAlt")} className="h-56 w-full object-cover" />
            ) : (
              <div className="grid h-56 place-items-center text-ff-dim">
                <div className="text-center">
                  <Camera className="mx-auto mb-2" />
                  <p className="text-sm">{tr("scan.point")}</p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onFile(file);
            }}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onFile(file);
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" onClick={() => cameraRef.current?.click()}>
              <Camera size={16} /> {tr("scan.camera")}
            </Button>
            <Button type="button" variant="soft" onClick={() => libraryRef.current?.click()}>
              <ImagePlus size={16} /> {tr("scan.library")}
            </Button>
          </div>
          {busy && <p className="text-center text-sm text-ff-dim">{tr("scan.reading")}</p>}
          {error && <p className="text-sm text-ff-danger">{error}</p>}
          {result && (
            <Card className="space-y-3">
              <p className="font-semibold">{result.meal_summary}</p>
              <p className="text-xs text-ff-dim">
                {tr("scan.confidence", {
                  pct: Math.round(result.confidence * 100),
                  kcal: Math.round(result.totals.calories),
                })}
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
              <div ref={confirmRef}>
                <Button className="w-full" type="button" onClick={confirmVision}>
                  {tr("scan.addTo", { meal: tr(MEAL_KEY[meal]) })}
                </Button>
              </div>
            </Card>
          )}
        </>
      ) : (
        <BarcodePane
          product={barcodeProduct}
          notFoundLabel={tr("scan.notFound")}
          cameraOffLabel={tr("scan.cameraOff")}
          scanningLabel={tr("scan.scanning")}
          openCameraLabel={tr("scan.openCamera")}
          typeBarcodeLabel={tr("scan.typeBarcode")}
          barcodePh={tr("scan.barcodePh")}
          lookupLabel={tr("scan.lookup")}
          addToLabel={tr("scan.addTo", { meal: tr(MEAL_KEY[meal]) })}
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
  notFoundLabel,
  cameraOffLabel,
  scanningLabel,
  openCameraLabel,
  typeBarcodeLabel,
  barcodePh,
  lookupLabel,
  addToLabel,
  onProduct,
  onConfirm,
}: {
  product: BarcodeProduct | null;
  notFoundLabel: string;
  cameraOffLabel: string;
  scanningLabel: string;
  openCameraLabel: string;
  typeBarcodeLabel: string;
  barcodePh: string;
  lookupLabel: string;
  addToLabel: string;
  onProduct: (p: BarcodeProduct | null) => void;
  onConfirm: () => void;
}) {
  const hostId = "ff-barcode-reader";
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (product) addRef.current?.querySelector("button")?.focus();
  }, [product]);

  async function lookup(code: string) {
    setError(null);
    const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`);
    const json = (await res.json()) as { product?: BarcodeProduct; error?: string };
    if (!res.ok || !json.product) {
      setError(json.error || notFoundLabel);
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
      setError(cameraOffLabel);
    }
  }

  return (
    <div className="space-y-3">
      <div id={hostId} className="overflow-hidden rounded-sheet bg-black" />
      <Button type="button" className="w-full" onClick={startScan} disabled={scanning}>
        <ScanBarcode size={16} /> {scanning ? scanningLabel : openCameraLabel}
      </Button>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) void lookup(manual.trim());
        }}
      >
        <Field label={typeBarcodeLabel}>
          <input
            className="w-full rounded-ff border border-ff-border bg-ff-muted px-3 py-2.5"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={barcodePh}
            inputMode="numeric"
          />
        </Field>
        <Button variant="soft" className="w-full" type="submit" disabled={!manual.trim()}>
          {lookupLabel}
        </Button>
      </form>
      {error && <p className="text-sm text-ff-danger">{error}</p>}
      {product && (
        <Card className="space-y-2">
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm text-ff-dim">
            {product.servingG}g · {Math.round(product.calories)} kcal · P{Math.round(product.proteinG)} C
            {Math.round(product.carbsG)} F{Math.round(product.fatG)}
          </p>
          <div ref={addRef}>
            <Button className="w-full" type="button" onClick={onConfirm}>
              {addToLabel}
            </Button>
          </div>
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
