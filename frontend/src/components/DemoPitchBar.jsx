import React from "react";
import { Sparkles, ChevronRight, CheckCircle2, ArrowRightCircle, RefreshCw } from "lucide-react";

export function DemoPitchBar({
  currentStep,
  setCurrentStep,
  onTriggerStep,
  onResetDemo
}) {
  const steps = [
    {
      num: 1,
      title: "1. Farmer Lists Crop",
      desc: "Auto-assigned to nearest CSC point via Haversine logic (or via IVR dialpad).",
      tab: "farmer"
    },
    {
      num: 2,
      title: "2. Buyer Hub Catalog",
      desc: "Multiple farmers' produce pooled at one point; out-of-zone stockist indicators.",
      tab: "buyer"
    },
    {
      num: 3,
      title: "3. Single-Trip Order",
      desc: "Multi-item order resolves to single hub; buyer travels once; escrow held securely.",
      tab: "buyer"
    },
    {
      num: 4,
      title: "4. QR Pickup & Escrow",
      desc: "Buyer presents QR at hub; 1-click scan flips status and releases instant payout.",
      tab: "orders"
    },
    {
      num: 5,
      title: "5. Trust Reputation",
      desc: "+1 score logged on both sides; transparent transaction audit trail.",
      tab: "reputation"
    }
  ];

  return (
    <div style={{
      background: "linear-gradient(90deg, #09261c, #134e3a)",
      borderBottom: "2px solid #10b981",
      color: "#ffffff",
      padding: "12px 24px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.12)"
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px"
      }}>
        {/* Left: Banner info */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#ffffff",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: "800",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            letterSpacing: "0.05em"
          }}>
            <Sparkles size={14} /> LIVE PITCH TOUR
          </span>
          <span style={{ fontSize: "0.85rem", color: "#d1fae5", fontWeight: "500" }}>
            Click any step to demonstrate the full loop live:
          </span>
        </div>

        {/* Step buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {steps.map((step) => {
            const isActive = currentStep === step.num;
            return (
              <button
                key={step.num}
                onClick={() => {
                  setCurrentStep(step.num);
                  onTriggerStep(step.tab, step.num);
                }}
                style={{
                  background: isActive ? "#f59e0b" : "rgba(255, 255, 255, 0.1)",
                  color: isActive ? "#000000" : "#ffffff",
                  fontWeight: isActive ? "800" : "600",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  border: isActive ? "1px solid #fde68a" : "1px solid rgba(255,255,255,0.15)",
                  boxShadow: isActive ? "0 0 12px rgba(245,158,11,0.5)" : "none"
                }}
                title={step.desc}
              >
                <span>{step.title}</span>
                {isActive && <ArrowRightCircle size={14} />}
              </button>
            );
          })}
        </div>

        {/* Reset */}
        <button
          onClick={onResetDemo}
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#a7f3d0",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "5px 12px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
          title="Reset sample cart and orders to fresh state"
        >
          <RefreshCw size={13} /> Reset Demo State
        </button>
      </div>

      {/* Script Quote for Presenter */}
      <div style={{
        maxWidth: "1400px",
        margin: "8px auto 0 auto",
        background: "rgba(0,0,0,0.25)",
        padding: "6px 14px",
        borderRadius: "8px",
        fontSize: "0.82rem",
        color: "#fef3c7",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        borderLeft: "3px solid #f59e0b"
      }}>
        <span style={{ fontWeight: "700", color: "#f59e0b" }}>🗣️ Presenter Script:</span>
        <em>"{steps[currentStep - 1]?.desc}"</em>
      </div>
    </div>
  );
}
