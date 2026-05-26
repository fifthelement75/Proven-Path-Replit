import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

const PAD = 10;
const TOOLTIP_WIDTH = 360;
const TOOLTIP_HEIGHT_EST = 230;

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function OnboardingTour() {
  const { currentStep, stepIndex, totalSteps, nextStep, prevStep, dismiss } = useOnboarding();
  const [, navigate] = useLocation();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [ready, setReady] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const measureTarget = useCallback((target: string) => {
    const el = document.querySelector(`[data-onboarding="${target}"]`);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }, []);

  const captureRect = useCallback((target: string) => {
    const el = document.querySelector(`[data-onboarding="${target}"]`);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
    setReady(true);
    return true;
  }, []);

  useEffect(() => {
    if (cancelRef.current) cancelRef.current();
    let cancelled = false;
    cancelRef.current = () => { cancelled = true; };

    if (!currentStep) {
      setReady(false);
      setTargetRect(null);
      return;
    }

    setReady(false);
    setTargetRect(null);

    if (!currentStep.target) {
      const t = setTimeout(() => { if (!cancelled) setReady(true); }, 150);
      return () => { cancelled = true; clearTimeout(t); };
    }

    if (currentStep.page) navigate(currentStep.page);

    const t1 = setTimeout(() => {
      if (cancelled) return;
      measureTarget(currentStep.target!);

      const t2 = setTimeout(() => {
        if (cancelled) return;
        const found = captureRect(currentStep.target!);
        if (!found) {
          const t3 = setTimeout(() => {
            if (!cancelled) {
              captureRect(currentStep.target!) || setReady(true);
            }
          }, 600);
          cancelRef.current = () => { cancelled = true; clearTimeout(t3); };
        }
      }, 600);
      cancelRef.current = () => { cancelled = true; clearTimeout(t2); };
    }, 350);

    return () => { cancelled = true; clearTimeout(t1); };
  }, [currentStep?.id]);

  useEffect(() => {
    if (!ready || !currentStep?.target) return;
    const onResize = () => captureRect(currentStep.target!);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ready, currentStep?.id]);

  if (!currentStep || !ready) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const isCentered = !targetRect;

  const hl = targetRect ? {
    top: targetRect.top - PAD,
    left: targetRect.left - PAD,
    width: targetRect.width + PAD * 2,
    height: targetRect.height + PAD * 2,
    bottom: targetRect.bottom + PAD,
    right: targetRect.right + PAD,
  } : null;

  let tooltipStyle: React.CSSProperties = {};
  if (isCentered) {
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: TOOLTIP_WIDTH,
      zIndex: 10001,
    };
  } else if (hl) {
    const spaceBelow = window.innerHeight - hl.bottom;
    const spaceAbove = hl.top;
    let tooltipTop: number;

    if (currentStep.placement === "top" && spaceAbove >= TOOLTIP_HEIGHT_EST) {
      tooltipTop = hl.top - TOOLTIP_HEIGHT_EST - 8;
    } else if (spaceBelow >= TOOLTIP_HEIGHT_EST || spaceBelow >= spaceAbove) {
      tooltipTop = hl.bottom + 8;
    } else {
      tooltipTop = Math.max(8, hl.top - TOOLTIP_HEIGHT_EST - 8);
    }

    const rawLeft = hl.left + hl.width / 2 - TOOLTIP_WIDTH / 2;
    const tooltipLeft = Math.max(12, Math.min(rawLeft, window.innerWidth - TOOLTIP_WIDTH - 12));

    tooltipStyle = {
      position: "fixed",
      top: tooltipTop,
      left: tooltipLeft,
      width: TOOLTIP_WIDTH,
      zIndex: 10001,
    };
  }

  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const panel = (
    <>
      {hl ? (
        <>
          <div
            className="fixed inset-x-0 top-0 bg-black/60 z-[10000]"
            style={{ height: Math.max(0, hl.top) }}
          />
          <div
            className="fixed inset-x-0 bg-black/60 z-[10000]"
            style={{ top: hl.bottom, bottom: 0 }}
          />
          <div
            className="fixed bg-black/60 z-[10000]"
            style={{ top: hl.top, height: hl.height, left: 0, width: Math.max(0, hl.left) }}
          />
          <div
            className="fixed bg-black/60 z-[10000]"
            style={{ top: hl.top, height: hl.height, left: hl.right, right: 0 }}
          />
          <div
            className="fixed rounded-lg ring-2 ring-primary z-[10000] pointer-events-none"
            style={{ top: hl.top, left: hl.left, width: hl.width, height: hl.height }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/60 z-[10000]" />
      )}

      <div
        style={tooltipStyle}
        className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <MapPin size={11} />
              <span>Step {stepIndex + 1} of {totalSteps}</span>
            </div>
            <button
              onClick={dismiss}
              className="text-gray-300 hover:text-gray-500 transition-colors -mr-1 -mt-1"
              aria-label="Close tour"
            >
              <X size={15} />
            </button>
          </div>

          <h3 className="text-[15px] font-bold text-gray-900 mb-2 leading-snug">{currentStep.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">{currentStep.body}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={dismiss}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="outline" size="sm" onClick={prevStep} className="h-8 px-3">
                  <ChevronLeft size={13} className="mr-0.5" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={nextStep} className="h-8 px-4">
                {isLast ? "Finish" : "Next"}
                {!isLast && <ChevronRight size={13} className="ml-0.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
