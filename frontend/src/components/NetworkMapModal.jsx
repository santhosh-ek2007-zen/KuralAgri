import React, { useState } from "react";
import { MapPin, Navigation, Building2, Users, ArrowRight, ShieldCheck } from "lucide-react";

export function NetworkMapModal({ isOpen, onClose, activeZone, setActiveZone }) {
  const [selectedPoint, setSelectedPoint] = useState(null);

  if (!isOpen) return null;

  const points = [
    {
      id: 1,
      name: "Thiruvallur CSC Aggregation Point",
      zone: "PLAINS_A",
      type: "HUB",
      x: 320,
      y: 180,
      farmers: 8,
      capacityKg: 500,
      description: "Panchayat CSC center serving Thiruvallur agricultural cluster"
    },
    {
      id: 2,
      name: "Kanchipuram Central Aggregation Hub",
      zone: "PLAINS_A",
      type: "HUB",
      x: 280,
      y: 260,
      farmers: 6,
      capacityKg: 400,
      description: "Primary distribution center for vegetable and tuber produce"
    },
    {
      id: 3,
      name: "Ooty High-Altitude Cold Aggregator",
      zone: "HILLS_B",
      type: "HUB",
      x: 120,
      y: 320,
      farmers: 12,
      capacityKg: 600,
      description: "Hill-zone carrot, cabbage, and exotic produce aggregator"
    },
    {
      id: 4,
      name: "Cuddalore Coastal Produce Point",
      zone: "COASTAL_C",
      type: "HUB",
      x: 420,
      y: 380,
      farmers: 5,
      capacityKg: 350,
      description: "Coastal belt cashew, groundnut and vegetable pooling point"
    }
  ];

  const farms = [
    { name: "Murugan's Farm", hubId: 1, x: 300, y: 150, crop: "Tomato (150kg)", distance: "1.8 km" },
    { name: "Kavitha's Farm", hubId: 1, x: 350, y: 160, crop: "Onion (100kg)", distance: "2.4 km" },
    { name: "Arumugam's Farm", hubId: 1, x: 340, y: 210, crop: "Chilli (70kg)", distance: "3.1 km" },
    { name: "Ganesan's Farm", hubId: 2, x: 260, y: 290, crop: "Potato (160kg)", distance: "2.8 km" }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "840px",
          background: "#ffffff",
          padding: "24px",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              background: "rgba(16,185,129,0.15)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <MapPin size={22} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", color: "#0f392b" }}>Regional Aggregation Network Map</h3>
              <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Zero Company Vehicles: Farmers drop off at nearest CSC hub; Buyers collect in 1 single trip.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", fontSize: "1.2rem", color: "#6b7280", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Zone Selector */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          {[
            { id: "PLAINS_A", label: "Plains Zone A (Active Demo)" },
            { id: "HILLS_B", label: "Hills Zone B (Nilgiris)" },
            { id: "COASTAL_C", label: "Coastal Zone C" }
          ].map(z => (
            <button
              key={z.id}
              onClick={() => setActiveZone(z.id)}
              style={{
                background: activeZone === z.id ? "#0f392b" : "#f1f5f9",
                color: activeZone === z.id ? "#ffffff" : "#475569",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: "700"
              }}
            >
              {z.label}
            </button>
          ))}
        </div>

        {/* Visual Map Canvas (SVG Schematic) */}
        <div style={{
          position: "relative",
          background: "linear-gradient(135deg, #09261c 0%, #123d2e 100%)",
          borderRadius: "14px",
          border: "2px solid #10b981",
          height: "360px",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <svg width="100%" height="100%" viewBox="0 0 600 450" style={{ position: "absolute", inset: 0 }}>
            {/* Grid Lines */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Connecting Haversine Lines from Farms to Hub 1 */}
            {farms.map((f, i) => (
              <g key={i}>
                <line
                  x1={f.x}
                  y1={f.y}
                  x2={f.hubId === 1 ? 320 : 280}
                  y2={f.hubId === 1 ? 180 : 260}
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  opacity="0.7"
                />
                <circle cx={f.x} cy={f.y} r="5" fill="#f59e0b" />
                <text x={f.x + 8} y={f.y + 3} fill="#fef3c7" fontSize="10" fontWeight="600">
                  {f.name} ({f.distance})
                </text>
              </g>
            ))}

            {/* Aggregation Hub Nodes */}
            {points.map((p) => {
              const isSelected = selectedPoint?.id === p.id;
              const isCurrentZone = p.zone === activeZone;

              return (
                <g
                  key={p.id}
                  onClick={() => setSelectedPoint(p)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer pulse */}
                  {isCurrentZone && (
                    <circle cx={p.x} cy={p.y} r="24" fill="rgba(16, 185, 129, 0.2)" stroke="#34d399" strokeWidth="1.5" />
                  )}
                  {/* Core Node */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="14"
                    fill={isCurrentZone ? "#10b981" : "#64748b"}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={p.x}
                    y={p.y + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="800"
                  >
                    CSC
                  </text>
                  <text
                    x={p.x}
                    y={p.y + 32}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {p.name.split(" ")[0]} Hub
                  </text>
                </g>
              );
            })}

            {/* Buyer Transit Path Route */}
            <path
              d="M 500,200 Q 420,160 320,180"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
            />
            <circle cx="500" cy="200" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
            <text x="470" y="225" fill="#fef3c7" fontSize="11" fontWeight="700">
              Buyer Collection Transit
            </text>
          </svg>
        </div>

        {/* Selected Hub Details */}
        <div style={{
          marginTop: "16px",
          padding: "14px 18px",
          borderRadius: "10px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontWeight: "700", color: "#0f392b", fontSize: "0.95rem" }}>
              {selectedPoint ? selectedPoint.name : "Thiruvallur CSC Aggregation Point (Active Selected)"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
              {selectedPoint ? selectedPoint.description : "8 nearby registered farmers auto-assigned via Haversine shortest distance algorithm"}
            </div>
          </div>
          <span className="badge badge-grade-a">
            Nearest Hub Resolution Active
          </span>
        </div>
      </div>
    </div>
  );
}
