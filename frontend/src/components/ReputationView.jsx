import React, { useState, useEffect } from "react";
import { Award, ShieldCheck, TrendingUp, CheckCircle2, AlertTriangle, User, History } from "lucide-react";
import { api } from "../api/client";

export function ReputationView() {
  const [actorType, setActorType] = useState("FARMER");
  const [reputationData, setReputationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRep() {
      setLoading(true);
      const data = await api.getReputation(actorType, 1);
      setReputationData(data);
      setLoading(false);
    }
    loadRep();
  }, [actorType]);

  const auditHistory = [
    { id: 101, event: "COMPLETED", delta: "+1", note: "Order #205 picked up on time at Thiruvallur CSC", date: "Today, 10:45 AM" },
    { id: 102, event: "COMPLETED", delta: "+1", note: "Order #203 Grade A Tomato quality verified", date: "Yesterday, 04:12 PM" },
    { id: 103, event: "COMPLETED", delta: "+1", note: "Order #200 Multi-farmer pool fulfilled", date: "Aug 15, 2026" },
    { id: 104, event: "COMPLETED", delta: "+1", note: "Order #198 Onion lot delivered on schedule", date: "Aug 14, 2026" },
    { id: 105, event: "COMPLETED", delta: "+1", note: "Order #194 Verified CSC kiosk drop-off", date: "Aug 12, 2026" }
  ];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      {/* Top Banner */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "10px" }}>
          <Award color="#f59e0b" /> Trust & Reputation Center
        </h2>
        <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
          Every completed collection logs +1 reputation to both farmer and buyer, creating transparent accountability without manual intermediaries.
        </p>
      </div>

      {/* Role Switcher for Reputation */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setActorType("FARMER")}
          style={{
            background: actorType === "FARMER" ? "#0f392b" : "#ffffff",
            color: actorType === "FARMER" ? "#ffffff" : "#374151",
            border: "1px solid #d1d5db",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "0.9rem"
          }}
        >
          🌾 Farmer Reputation (Murugan Selvam)
        </button>

        <button
          onClick={() => setActorType("BUYER")}
          style={{
            background: actorType === "BUYER" ? "#0f392b" : "#ffffff",
            color: actorType === "BUYER" ? "#ffffff" : "#374151",
            border: "1px solid #d1d5db",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "0.9rem"
          }}
        >
          🛒 Buyer Reputation (Anbu Caterers)
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px" }}>
        {/* Scorecard Profile */}
        <div className="glass-panel" style={{ padding: "24px", height: "fit-content" }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{
              width: "72px",
              height: "72px",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
              boxShadow: "0 8px 16px rgba(245,158,11,0.3)"
            }}>
              <Award size={36} color="#ffffff" />
            </div>
            <h3 style={{ fontSize: "1.25rem", color: "#0f392b" }}>
              {actorType === "FARMER" ? "Murugan Selvam" : "Anbu Caterers & Events"}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {actorType === "FARMER" ? "Plains Zone A Farmer • Thiruvallur" : "Commercial Caterer • Plains Zone A"}
            </span>
          </div>

          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "16px",
            borderRadius: "12px",
            textAlign: "center",
            marginBottom: "18px"
          }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "#166534" }}>
              Current Trust Score
            </div>
            <div style={{ fontSize: "2.4rem", fontWeight: "800", color: "#0f392b" }}>
              {actorType === "FARMER" ? "22" : "19"}<span style={{ fontSize: "1.2rem", color: "#10b981" }}> / 25</span>
            </div>
            <span className="badge badge-grade-a" style={{ marginTop: "4px" }}>
              ✓ Gold Tier Verified (99.2% Fulfillment)
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "#475569" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Completed Pickups:</span>
              <strong>22 orders</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Quality Disputes:</span>
              <strong style={{ color: "#16a34a" }}>0 upheld</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Average Handover Time:</span>
              <strong>14 mins at CSC Point</strong>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1.15rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <History color="#10b981" /> Trust Audit Trail & Settlement Events
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {auditHistory.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "14px 18px",
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    background: "#ecfdf5",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <CheckCircle2 size={20} color="#059669" />
                  </div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#0f392b" }}>
                      {item.note}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {item.date} • Verified via QR Token Check-in
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{
                    background: "#dcfce7",
                    color: "#15803d",
                    padding: "4px 10px",
                    borderRadius: "9999px",
                    fontSize: "0.85rem",
                    fontWeight: "800",
                    border: "1px solid #86efac"
                  }}>
                    {item.delta} Trust Score
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
