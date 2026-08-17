import React, { useState } from "react";
import { 
  ShieldCheck, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  FileText,
  AlertTriangle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { api } from "../api/client";

export function OrderEscrowView({ orders, setOrders, showNotification }) {
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || 201);
  const [isScanning, setIsScanning] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("Grade mismatch: Tomatoes were bruised upon inspection at Thiruvallur hub.");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  // Handle QR Confirmation & Instant Escrow Release
  const handleConfirmCollection = async () => {
    if (!activeOrder) return;
    setIsScanning(true);

    try {
      const res = await api.confirmCollection(activeOrder.id, activeOrder.qr_code_token);
      
      // Update local state
      setOrders(prev => prev.map(o => {
        if (o.id === activeOrder.id) {
          return {
            ...o,
            status: "COLLECTED",
            transaction: {
              ...o.transaction,
              escrow_status: "RELEASED",
              released_at: new Date().toISOString()
            }
          };
        }
        return o;
      }));

      // Trigger Celebration Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      showNotification(`🎉 QR Code Verified! Order #${activeOrder.id} COLLECTED. ₹${activeOrder.total_amount} Escrow released instantly to farmers!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Dispute Submission
  const handleFileDispute = async (e) => {
    e.preventDefault();
    if (!activeOrder) return;
    setIsSubmittingDispute(true);

    try {
      await api.submitDispute(activeOrder.id, {
        reason: disputeReason,
        evidence_photo_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600"
      });

      setOrders(prev => prev.map(o => {
        if (o.id === activeOrder.id) {
          return {
            ...o,
            status: "DISPUTED",
            dispute: {
              reason: disputeReason,
              created_at: new Date().toISOString()
            }
          };
        }
        return o;
      }));

      setDisputeModalOpen(false);
      showNotification(`⚠️ Dispute filed for Order #${activeOrder.id}. Escrow held pending quality mediation.`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  if (!activeOrder) {
    return (
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "60px 24px", textAlign: "center", color: "#6b7280" }}>
        <ShieldCheck size={48} style={{ margin: "0 auto 16px auto", opacity: 0.3 }} />
        <h3 style={{ fontSize: "1.3rem", color: "#0f392b" }}>No Orders Placed Yet</h3>
        <p>Browse the Aggregation Hub catalog and place a multi-item order to see live Escrow and QR verification.</p>
      </div>
    );
  }

  const isCollected = activeOrder.status === "COLLECTED";
  const isDisputed = activeOrder.status === "DISPUTED";
  const isEscrowReleased = activeOrder.transaction?.escrow_status === "RELEASED";

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      {/* Top Banner */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldCheck color="#10b981" /> Orders, QR Handover & Escrow Settlement
        </h2>
        <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
          Buyer travels to the assigned aggregation hub, presents the QR code, and escrow is released immediately upon physical verification.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px" }}>
        {/* Left Column: Orders List */}
        <div className="glass-panel" style={{ padding: "20px", height: "fit-content" }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: "14px" }}>
            All Active & Past Orders ({orders.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {orders.map((o) => {
              const isSelected = o.id === selectedOrderId;
              return (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: isSelected ? "#f0fdf4" : "#ffffff",
                    border: isSelected ? "2px solid #10b981" : "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "#0f392b" }}>
                      Order #{o.id}
                    </span>
                    <span className={`badge ${
                      o.status === "COLLECTED" ? "badge-escrow-released" :
                      o.status === "DISPUTED" ? "badge-grade-c" : "badge-escrow-held"
                    }`}>
                      {o.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                    Hub: {o.aggregation_point_name || "Thiruvallur CSC Point"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.85rem", fontWeight: "700", color: "#10b981" }}>
                    <span>{o.items?.length || 1} produce items</span>
                    <span>₹{o.total_amount?.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Order Details, QR Code & Handover Scanner */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Main Order Card */}
          <div className="glass-panel" style={{ padding: "28px" }}>
            {/* Header / Status Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              paddingBottom: "18px",
              borderBottom: "1px solid #e5e7eb",
              marginBottom: "20px"
            }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: "700" }}>
                  Escrow-Protected Order
                </span>
                <h3 style={{ fontSize: "1.4rem", color: "#0f392b" }}>
                  Order #{activeOrder.id}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  Buyer: <strong>{activeOrder.buyer_name || "Anbu Caterers"}</strong> • Placed {new Date(activeOrder.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Status Badges */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`badge ${
                  isCollected ? "badge-escrow-released" :
                  isDisputed ? "badge-grade-c" : "badge-escrow-held"
                }`} style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                  {isCollected ? "✓ COLLECTED & SETTLED" :
                   isDisputed ? "⚠️ DISPUTED" : "⏳ CONFIRMED (AWAITING PICKUP)"}
                </span>
              </div>
            </div>

            {/* Step Timeline Indicator */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginBottom: "24px",
              background: "#f8fafc",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={20} color="#10b981" />
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#0f392b" }}>1. Order Placed</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>Escrow ₹{activeOrder.total_amount} locked</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isCollected ? <CheckCircle2 size={20} color="#10b981" /> : <Clock size={20} color="#f59e0b" />}
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#0f392b" }}>2. Hub Handover</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>Single-trip pickup</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isEscrowReleased ? <CheckCircle2 size={20} color="#10b981" /> : <ShieldCheck size={20} color="#6b7280" />}
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "700", color: isEscrowReleased ? "#16a34a" : "#6b7280" }}>
                    3. Instant Payout
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                    {isEscrowReleased ? "Funds released to farmers" : "Awaiting QR scan"}
                  </div>
                </div>
              </div>
            </div>

            {/* Resolved Hub Information */}
            <div style={{
              background: "linear-gradient(135deg, #09261c, #134e3a)",
              color: "#ffffff",
              padding: "16px 20px",
              borderRadius: "10px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <MapPin size={28} color="#34d399" />
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#a7f3d0", textTransform: "uppercase", fontWeight: "700" }}>
                    Resolved Collection Aggregation Point
                  </div>
                  <div style={{ fontSize: "1.15rem", fontWeight: "800" }}>
                    {activeOrder.aggregation_point_name || "Thiruvallur CSC Aggregation Point"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#d1fae5" }}>
                    Plains Zone A • All items aggregated at this physical location for 1-trip collection
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code and Collection Handover Section */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr",
              gap: "24px",
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "24px"
            }}>
              {/* QR Code */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px",
                background: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0"
              }}>
                <QRCodeSVG
                  value={activeOrder.qr_code_token || "KURAL-DEMO-TOKEN-2026"}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginTop: "6px", letterSpacing: "0.05em" }}>
                  {activeOrder.qr_code_token || "KURAL-DEMO-TOKEN"}
                </span>
                <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Present at CSC Point</span>
              </div>

              {/* Handover Simulator Controls */}
              <div>
                <h4 style={{ fontSize: "1.1rem", color: "#0f392b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <QrCode color="#10b981" /> Hub Manager Collection Scanner
                </h4>
                <p style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "16px" }}>
                  When the buyer arrives at the CSC point, the hub manager scans this token to physically verify the items and immediately disburse the escrow payout.
                </p>

                {isCollected ? (
                  <div style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    color: "#065f46",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <CheckCircle2 size={22} color="#059669" />
                    <div>
                      <strong>Collection Complete & Escrow Settled:</strong> Payment of ₹{activeOrder.total_amount} disbursed directly to farmer accounts. +1 Trust score logged.
                    </div>
                  </div>
                ) : isDisputed ? (
                  <div style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    color: "#991b1b",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <AlertTriangle size={22} color="#dc2626" />
                    <div>
                      <strong>Dispute Under Review:</strong> Escrow is temporarily frozen while CSC operators mediate produce grade inspection.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      onClick={handleConfirmCollection}
                      disabled={isScanning}
                      className="btn-primary"
                      style={{ padding: "10px 20px" }}
                    >
                      <QrCode size={18} />
                      {isScanning ? "Verifying Token..." : "Simulate QR Scan & Release Escrow"}
                    </button>

                    <button
                      onClick={() => setDisputeModalOpen(true)}
                      className="btn-secondary"
                      style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                    >
                      <AlertCircle size={16} /> Raise Quality Dispute
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Escrow Vault Details */}
            <div style={{
              background: isEscrowReleased ? "#f0fdf4" : "rgba(245, 158, 11, 0.08)",
              border: isEscrowReleased ? "1px solid #bbf7d0" : "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "10px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ShieldCheck size={28} color={isEscrowReleased ? "#16a34a" : "#d97706"} />
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: isEscrowReleased ? "#166534" : "#92400e" }}>
                    Escrow Vault Ledger
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: isEscrowReleased ? "#15803d" : "#b45309" }}>
                    {isEscrowReleased ? "STATUS: RELEASED (INSTANT PAYOUT)" : "STATUS: HELD IN ESCROW"}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Escrow Amount</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f392b" }}>
                  ₹{activeOrder.total_amount?.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="modal-overlay" onClick={() => setDisputeModalOpen(false)}>
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "480px", background: "#ffffff", padding: "24px", borderRadius: "16px" }}
          >
            <h3 style={{ fontSize: "1.2rem", color: "#991b1b", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={22} color="#dc2626" /> File Produce Quality Dispute
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "16px" }}>
              If physical produce grade at the aggregation hub does not match the farmer's listing, file a dispute to hold escrow.
            </p>

            <form onSubmit={handleFileDispute}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>
                  Reason for Dispute:
                </label>
                <textarea
                  rows="3"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.85rem" }}
                  required
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>
                  Evidence Photo:
                </label>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  Simulated photo attachment attached automatically.
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute}
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "0.9rem"
                  }}
                >
                  {isSubmittingDispute ? "Filing Dispute..." : "Freeze Escrow & Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
