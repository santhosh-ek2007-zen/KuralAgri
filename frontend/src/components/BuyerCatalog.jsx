import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  MapPin, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight,
  Filter,
  PackageCheck
} from "lucide-react";
import { api } from "../api/client";

export function BuyerCatalog({ 
  activeZone, 
  onOrderCreated, 
  cart, 
  setCart, 
  showNotification 
}) {
  const [hubs, setHubs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCropFilter, setSelectedCropFilter] = useState("ALL");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      setIsLoading(true);
      const data = await api.browseCatalog(activeZone, selectedCropFilter === "ALL" ? "" : selectedCropFilter);
      setHubs(data);
      setIsLoading(false);
    }
    loadCatalog();
  }, [activeZone, selectedCropFilter]);

  // Add to cart
  const handleAddToCart = (listing, hub) => {
    setCart((prev) => {
      const existing = prev.find(item => item.listing.id === listing.id);
      if (existing) {
        return prev.map(item =>
          item.listing.id === listing.id
            ? { ...item, quantity_kg: Math.min(item.quantity_kg + 10, listing.quantity_kg) }
            : item
        );
      }
      return [...prev, { listing, hub, quantity_kg: 15.0 }];
    });
    setIsCartOpen(true);
    showNotification(`🛒 Added ${listing.crop_name} (${listing.aggregation_point_name || hub.name}) to cart!`);
  };

  // Update cart item quantity
  const updateQuantity = (listingId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.listing.id === listingId) {
        const newQty = Math.max(5, Math.min(item.quantity_kg + delta, item.listing.quantity_kg));
        return { ...item, quantity_kg: newQty };
      }
      return item;
    }));
  };

  // Remove from cart
  const removeFromCart = (listingId) => {
    setCart(prev => prev.filter(item => item.listing.id !== listingId));
  };

  // Cart summary calculations
  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity_kg * item.listing.final_price), 0);
  const totalWeightKg = cart.reduce((sum, item) => sum + item.quantity_kg, 0);

  // Group cart items by hub to show resolution
  const resolvedHubs = Array.from(new Set(cart.map(i => i.hub?.name || i.listing.aggregation_point_name)));
  const isSingleHub = resolvedHubs.length <= 1;

  // Checkout with Escrow lock
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    const orderPayload = {
      buyer_id: 1, // Anbu Caterers
      items: cart.map(item => ({
        listing_id: item.listing.id,
        quantity_kg: item.quantity_kg
      }))
    };

    const newOrder = await api.createOrder(orderPayload);
    setIsCheckingOut(false);
    setIsCartOpen(false);
    setCart([]);
    showNotification(`🎉 Order #${newOrder.id} Placed! Escrow funds held securely. Single pickup hub: ${newOrder.aggregation_point_name}`);
    if (onOrderCreated) onOrderCreated(newOrder);
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      {/* Top Header & Filter Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <ShoppingBag color="#10b981" /> Browse Produce by Aggregation Point
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            Produce from multiple local farmers pooled into nearby CSC hubs — Collect everything in a single trip.
          </p>
        </div>

        {/* Crop Filters & View Cart Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={16} color="#6b7280" />
            <select
              value={selectedCropFilter}
              onChange={(e) => setSelectedCropFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "0.85rem",
                fontWeight: "600",
                background: "#ffffff"
              }}
            >
              <option value="ALL">All Available Crops</option>
              <option value="Tomato">Tomato (தக்காளி)</option>
              <option value="Onion">Onion (வெங்காயம்)</option>
              <option value="Potato">Potato (உருளைக்கிழங்கு)</option>
              <option value="Green Chilli">Green Chilli (பச்சை மிளகாய்)</option>
              <option value="Carrot">Carrot (Out of zone)</option>
            </select>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="btn-primary"
            style={{ position: "relative" }}
          >
            <ShoppingBag size={18} />
            <span>View Cart ({cart.length})</span>
            {cart.length > 0 && (
              <span style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                background: "#f59e0b",
                color: "#ffffff",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                fontSize: "0.75rem",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
              }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Out of zone banner note if carrot or hill crop is selected */}
      {selectedCropFilter === "Carrot" && activeZone === "PLAINS_A" && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fef3c7",
          padding: "14px 20px",
          borderRadius: "10px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          color: "#92400e"
        }}>
          <AlertTriangle size={22} color="#f59e0b" />
          <div style={{ fontSize: "0.85rem" }}>
            <strong>Regional Stockist Notice:</strong> Carrots are predominantly grown in <em>Hills Zone B (Nilgiris)</em>. For Plains Zone A, items are fulfilled from regional stockist partners instead of creating false artificial local logistics. Alternatively, consider locally aggregated <strong>Radish</strong>.
          </div>
        </div>
      )}

      {/* Aggregation Hubs Grid */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
          <Sparkles size={32} className="live-dot" style={{ margin: "0 auto 12px auto" }} />
          <div>Loading Aggregation Hub Catalogs...</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {hubs.map((hubData) => {
            const hub = hubData.aggregation_point;
            const listings = hubData.listings || [];

            return (
              <div
                key={hub.id}
                className="glass-panel"
                style={{ padding: "24px", borderTop: "4px solid #10b981" }}
              >
                {/* Hub Header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "18px",
                  paddingBottom: "14px",
                  borderBottom: "1px solid #e5e7eb"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <MapPin size={22} color="#0f392b" />
                      <h3 style={{ fontSize: "1.25rem", color: "#0f392b" }}>
                        {hub.name}
                      </h3>
                      <span className="badge badge-csc">CSC Collection Hub</span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "4px" }}>
                      Coordinates: {hub.latitude}° N, {hub.longitude}° E • Capacity: {hub.daily_listing_capacity} kg/day
                    </p>
                  </div>

                  {/* Hub Stats */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <Users size={16} color="#059669" />
                      <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#065f46" }}>
                        {hubData.farmers_count} Farmers Pooled
                      </span>
                    </div>

                    <div style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <PackageCheck size={16} color="#16a34a" />
                      <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#166534" }}>
                        {hubData.total_quantity_kg} kg Ready
                      </span>
                    </div>
                  </div>
                </div>

                {/* Produce Cards in this Hub */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "18px"
                }}>
                  {listings.map((listing) => (
                    <div
                      key={listing.id}
                      style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease"
                      }}
                    >
                      {/* Image Preview */}
                      <div style={{ position: "relative", height: "140px", background: "#f3f4f6" }}>
                        <img
                          src={listing.photo_url || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80"}
                          alt={listing.crop_name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <span
                          className={`badge ${listing.declared_grade === "A" ? "badge-grade-a" : "badge-grade-b"}`}
                          style={{ position: "absolute", top: "10px", right: "10px" }}
                        >
                          Grade {listing.declared_grade}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                            <h4 style={{ fontSize: "1.1rem", color: "#0f392b" }}>
                              {listing.crop_name}
                            </h4>
                            <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "#10b981" }}>
                              ₹{listing.final_price}<span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: "400" }}>/kg</span>
                            </span>
                          </div>

                          <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "4px" }}>
                            Farmer: <strong>{listing.farmer_name || "Local Farmer"}</strong>
                          </div>

                          <div style={{
                            background: "#f8fafc",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            color: "#475569",
                            marginTop: "8px"
                          }}>
                            ✨ AI Grade: <strong>{listing.ai_grade_estimate || "A"}</strong>
                          </div>
                        </div>

                        {/* Available & Add to Cart */}
                        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: "600" }}>
                            {listing.quantity_kg} kg available
                          </span>

                          <button
                            onClick={() => handleAddToCart(listing, hub)}
                            className="btn-primary"
                            style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                          >
                            <Plus size={15} /> Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shopping Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShoppingBag color="#10b981" /> Multi-Item Cart & Escrow Lock
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                style={{ background: "transparent", fontSize: "1.2rem", color: "#6b7280", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>
                <ShoppingBag size={40} style={{ margin: "0 auto 10px auto", opacity: 0.3 }} />
                <p>Your cart is empty. Add produce from an aggregation hub!</p>
              </div>
            ) : (
              <div>
                {/* Single Trip Resolution Banner */}
                <div style={{
                  background: isSingleHub ? "#f0fdf4" : "#fffbeb",
                  border: isSingleHub ? "1px solid #bbf7d0" : "1px solid #fde68a",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  {isSingleHub ? <ShieldCheck size={20} color="#16a34a" /> : <AlertTriangle size={20} color="#d97706" />}
                  <div style={{ fontSize: "0.8rem", color: isSingleHub ? "#166534" : "#92400e" }}>
                    {isSingleHub ? (
                      <>
                        <strong>Single-Trip Hub Resolution:</strong> All {cart.length} items can be picked up together at <strong>{resolvedHubs[0]}</strong>.
                      </>
                    ) : (
                      <>
                        <strong>Multi-Hub Warning:</strong> Items span {resolvedHubs.length} hubs. We recommend ordering items from one hub for single-trip pickup.
                      </>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                  {cart.map((item) => (
                    <div
                      key={item.listing.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#0f392b" }}>
                          {item.listing.crop_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          ₹{item.listing.final_price}/kg • {item.listing.aggregation_point_name || item.hub?.name}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ffffff", padding: "2px 6px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                          <button
                            onClick={() => updateQuantity(item.listing.id, -5)}
                            style={{ background: "transparent", color: "#64748b", padding: "2px" }}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontSize: "0.85rem", fontWeight: "700", minWidth: "45px", textAlign: "center" }}>
                            {item.quantity_kg} kg
                          </span>
                          <button
                            onClick={() => updateQuantity(item.listing.id, 5)}
                            style={{ background: "transparent", color: "#64748b", padding: "2px" }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <span style={{ fontWeight: "800", color: "#10b981", fontSize: "0.95rem", minWidth: "65px", textAlign: "right" }}>
                          ₹{(item.quantity_kg * item.listing.final_price).toLocaleString("en-IN")}
                        </span>

                        <button
                          onClick={() => removeFromCart(item.listing.id)}
                          style={{ background: "transparent", color: "#ef4444", padding: "4px" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total & Escrow Lock info */}
                <div style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "14px",
                  marginBottom: "16px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem", color: "#6b7280" }}>
                    <span>Total Weight:</span>
                    <strong>{totalWeightKg} kg</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "1.1rem", fontWeight: "800", color: "#0f392b" }}>
                    <span>Total Order Value:</span>
                    <span style={{ color: "#10b981" }}>₹{totalAmount.toLocaleString("en-IN")}</span>
                  </div>

                  <div style={{
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    color: "#b45309",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <ShieldCheck size={16} />
                    <span>Payment will be held in <strong>Escrow</strong> until QR scan at collection point.</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "1rem" }}
                >
                  {isCheckingOut ? "Locking Escrow & Generating QR..." : `Lock Escrow & Confirm Order (₹${totalAmount.toLocaleString("en-IN")})`}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
