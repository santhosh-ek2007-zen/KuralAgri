import React from "react";
import { 
  Sprout, 
  ShoppingBag, 
  ShieldCheck, 
  PhoneCall, 
  MapPin, 
  Sparkles, 
  Award, 
  Building2, 
  CheckCircle2, 
  HelpCircle 
} from "lucide-react";

export function Header({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  activeZone,
  setActiveZone,
  onOpenIvr,
  onOpenMap,
  onStartDemoTour,
  backendConnected
}) {
  return (
    <header style={{
      background: "linear-gradient(135deg, #09261c 0%, #0f392b 100%)",
      color: "#ffffff",
      padding: "16px 28px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      position: "sticky",
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px"
      }}>
        {/* Brand & Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "44px",
            height: "44px",
            background: "linear-gradient(135deg, #10b981, #047857)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16,185,129,0.35)",
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            <Sprout size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.03em" }}>
                KuralAgri <span style={{ color: "#34d399", fontSize: "1.1rem", fontWeight: "600" }}>குறள் அக்ரி</span>
              </h1>
              <span style={{
                background: "rgba(52, 211, 153, 0.2)",
                color: "#6ee7b7",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "0.7rem",
                fontWeight: "700",
                border: "1px solid rgba(52, 211, 153, 0.4)"
              }}>
                v1.0 PILOT
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#a7f3d0", fontWeight: "400" }}>
              Aggregated Agricultural Supply Chain • Zero-Vehicle Escrow Marketplace
            </p>
          </div>
        </div>

        {/* Action Tools: IVR Simulator, Hub Map, Pitch Demo Tour */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={onStartDemoTour}
            className="btn-gold"
            style={{ padding: "8px 14px", fontSize: "0.85rem", borderRadius: "9999px" }}
            title="Launch 5-step interactive pitch demo walk-through"
          >
            <Sparkles size={16} /> 5-Step Pitch Demo
          </button>

          <button
            onClick={onOpenIvr}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              padding: "8px 14px",
              fontSize: "0.85rem",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <PhoneCall size={16} color="#6ee7b7" /> IVR Dialpad (Voice Sim)
          </button>

          <button
            onClick={onOpenMap}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              padding: "8px 14px",
              fontSize: "0.85rem",
              borderRadius: "9999px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <MapPin size={16} color="#fcd34d" /> Hub Map
          </button>

          {/* Backend Status Indicator */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(0,0,0,0.3)",
            padding: "6px 12px",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            color: backendConnected ? "#6ee7b7" : "#fbbf24"
          }}>
            <span className="live-dot" style={{ backgroundColor: backendConnected ? "#10b981" : "#f59e0b" }} />
            {backendConnected ? "Backend Online (FastAPI)" : "Local Simulation Mode"}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{
        maxWidth: "1400px",
        margin: "14px auto 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        paddingTop: "12px"
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "farmer", label: "🌾 Farmer Studio & Listings", icon: Sprout },
            { id: "buyer", label: "🛒 Buyer Aggregation Catalog", icon: ShoppingBag },
            { id: "orders", label: "📦 Orders & Escrow Settlement", icon: ShieldCheck },
            { id: "reputation", label: "⭐ Trust & Reputation", icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isSelected ? "#10b981" : "rgba(255, 255, 255, 0.08)",
                  color: isSelected ? "#ffffff" : "#d1fae5",
                  fontWeight: isSelected ? "700" : "500",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: isSelected ? "1px solid #34d399" : "1px solid transparent"
                }}
              >
                <Icon size={17} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Zone Selector Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.85rem" }}>
          <span style={{ color: "#a7f3d0", fontWeight: "600" }}>Active Zone:</span>
          <select
            value={activeZone}
            onChange={(e) => setActiveZone(e.target.value)}
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              color: "#ffffff",
              border: "1px solid rgba(52, 211, 153, 0.5)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <option value="PLAINS_A">Plains Zone A (Thiruvallur / Kanchipuram)</option>
            <option value="HILLS_B">Hills Zone B (Nilgiris / Ooty)</option>
            <option value="COASTAL_C">Coastal Zone C (Cuddalore / Nagapattinam)</option>
          </select>
        </div>
      </div>
    </header>
  );
}
