import { Logger } from "@/components/logger/Logger";
import { Suspense } from "react";

export default function LogPage() {
  return (
    <Suspense fallback={null}>
      <Logger />
    </Suspense>
  );
}
