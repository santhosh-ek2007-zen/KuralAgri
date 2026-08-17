import React, { useState, useEffect } from "react";
import { 
  Sprout, 
  UploadCloud, 
  Sparkles, 
  MapPin, 
  Building, 
  DollarSign, 
  Calendar, 
  Scale, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  ArrowRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { api } from "../api/client";

export function FarmerPortal({ activeZone, onListingCreated, showNotification }) {
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState(1);
  const [cropName, setCropName] = useState("Tomato");
  const [quantityKg, setQuantityKg] = useState(100);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split("T")[0]);
  const [declaredGrade, setDeclaredGrade] = useState("A");
  const [finalPrice, setFinalPrice] = useState(28.0);
  const [suggestedPrice, setSuggestedPrice] = useState(28.0);
  const [priceNote, setPriceNote] = useState("");
  
  // CSC Assisted Mode
  const [isCscMode, setIsCscMode] = useState(false);
  const [cscOperatorId, setCscOperatorId] = useState("CSC-TN-THIRUVALLUR-04");

  // Photo & AI Grading
  const [photoPreview, setPhotoPreview] = useState("https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80");
  const [aiAnalysis, setAiAnalysis] = useState({
    estimated_grade: "A",
    confidence: 0.95,
    metrics: {
      color_uniformity: "High Crimson (94%)",
      surface_defects: "Minimal (< 1.5%)",
      average_diameter_mm: "62mm (Uniform)"
    },
    recommendation: "Grade A Premium Mandi Ready"
  });
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Aggregation Point
  const [nearestHub, setNearestHub] = useState({
    name: "Thiruvallur CSC Aggregation Point",
    distance_km: 1.8,
    zone: "PLAINS_A"
  });

  // Farmer's listings
  const [myListings, setMyListings] = useState([
    {
      id: 101,
      crop_name: "Tomato",
      quantity_kg: 150.0,
      declared_grade: "A",
      ai_grade_estimate: "A",
      final_price: 26.5,
      aggregation_point_name: "Thiruvallur CSC Aggregation Point",
      status: "AVAILABLE",
      created_at: "Today, 08:30 AM"
    },
    {
      id: 106,
      crop_name: "Green Chilli",
      quantity_kg: 60.0,
      declared_grade: "A",
      ai_grade_estimate: "A",
      final_price: 44.0,
      aggregation_point_name: "Thiruvallur CSC Aggregation Point",
      status: "AVAILABLE",
      created_at: "Yesterday"
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Farmers & Pricing Suggestion on crop/zone change
  useEffect(() => {
    async function init() {
      const fList = await api.getFarmers();
      setFarmers(fList);
      if (fList.length > 0 && !selectedFarmerId) {
        setSelectedFarmerId(fList[0].id);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchPricing() {
      const p = await api.getPriceSuggestion(cropName, activeZone, declaredGrade);
      setSuggestedPrice(p.suggested_price);
      setFinalPrice(p.suggested_price);
      setPriceNote(`Mandi Baseline ₹${p.mandi_base_price}/kg × ${p.demand_multiplier} demand factor`);
    }
    fetchPricing();
  }, [cropName, activeZone, declaredGrade]);

  // Handle Photo Upload
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Local preview URL
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setIsAnalyzingImage(true);

    try {
      const res = await api.uploadPhoto(file);
      if (res.ai_analysis) {
        setAiAnalysis(res.ai_analysis);
        setDeclaredGrade(res.ai_analysis.estimated_grade || "A");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Submit Listing
  const handleCreateListing = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      farmer_id: Number(selectedFarmerId),
      crop_name: cropName,
      quantity_kg: parseFloat(quantityKg),
      harvest_date: harvestDate,
      declared_grade: declaredGrade,
      ai_grade_estimate: aiAnalysis?.estimated_grade || declaredGrade,
      suggested_price: parseFloat(suggestedPrice),
      final_price: parseFloat(finalPrice),
      zone: activeZone,
      photo_url: photoPreview,
      registered_via_csc_operator: isCscMode ? cscOperatorId : null
    };

    const newListing = await api.createListing(payload);

    setMyListings(prev => [newListing, ...prev]);
    setIsSubmitting(false);
    showNotification(`🌾 Listing Created! ${quantityKg}kg ${cropName} auto-assigned to ${newListing.aggregation_point_name || nearestHub.name}`);
    if (onListingCreated) onListingCreated(newListing);
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      {/* Top Banner: Overview */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "rgba(16,185,129,0.15)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Sprout size={28} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "600" }}>Active Farm Produce</div>
            <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0f392b" }}>310 kg</div>
            <div style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "600" }}>Available at CSC Hub</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "rgba(245,158,11,0.15)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <MapPin size={28} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "600" }}>Assigned Aggregation Point</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#0f392b" }}>Thiruvallur CSC Hub</div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>1.8 km (Haversine auto-calculated)</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "rgba(59,130,246,0.15)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <TrendingUp size={28} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "600" }}>Trust Score</div>
            <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#0f392b" }}>22 / 25 ⭐</div>
            <div style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: "600" }}>Tier 1 Verified Producer</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        {/* Left Column: Create Listing Form */}
        <div className="glass-panel" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "10px" }}>
              <Sprout color="#10b981" /> List New Produce for Aggregation
            </h2>
            
            {/* CSC Operator Toggle */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: isCscMode ? "rgba(107, 33, 168, 0.1)" : "rgba(0,0,0,0.04)",
              padding: "6px 12px",
              borderRadius: "20px",
              border: isCscMode ? "1px solid #c084fc" : "1px solid #e5e7eb"
            }}>
              <Building size={16} color={isCscMode ? "#7e22ce" : "#6b7280"} />
              <label style={{ fontSize: "0.8rem", fontWeight: "700", color: isCscMode ? "#7e22ce" : "#4b5563", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isCscMode}
                  onChange={(e) => setIsCscMode(e.target.checked)}
                  style={{ marginRight: "6px" }}
                />
                CSC Operator Assisted Mode
              </label>
            </div>
          </div>

          {isCscMode && (
            <div style={{
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <UserCheck size={20} color="#9333ea" />
              <div style={{ flex: 1, fontSize: "0.82rem", color: "#581c87" }}>
                <strong>CSC Center Booking:</strong> Operator is creating this entry on behalf of the farmer at the local kiosk.
              </div>
              <input
                type="text"
                value={cscOperatorId}
                onChange={(e) => setCscOperatorId(e.target.value)}
                style={{
                  fontSize: "0.8rem",
                  padding: "4px 8px",
                  border: "1px solid #d8b4fe",
                  borderRadius: "4px",
                  background: "#ffffff"
                }}
              />
            </div>
          )}

          <form onSubmit={handleCreateListing}>
            {/* Farmer Selector */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                Select Registered Farmer:
              </label>
              <select
                value={selectedFarmerId}
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem"
                }}
              >
                {farmers.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.phone}) — {f.zone} (Lat: {f.latitude}, Lng: {f.longitude})
                  </option>
                ))}
              </select>
            </div>

            {/* Produce Grid Inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                  Crop Name:
                </label>
                <select
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.95rem"
                  }}
                >
                  <option value="Tomato">Tomato (தக்காளி)</option>
                  <option value="Onion">Onion (வெங்காயம்)</option>
                  <option value="Potato">Potato (உருளைக்கிழங்கு)</option>
                  <option value="Carrot">Carrot (கேரட் - Out of zone)</option>
                  <option value="Radish">Radish (முள்ளங்கி)</option>
                  <option value="Green Chilli">Green Chilli (பச்சை மிளகாய்)</option>
                  <option value="Cabbage">Cabbage (முட்டைக்கோஸ்)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                  Quantity (kg):
                </label>
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.95rem"
                  }}
                  required
                />
              </div>
            </div>

            {/* Harvest Date & Declared Grade */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                  Harvest Date:
                </label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.95rem"
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                  Farmer Declared Grade:
                </label>
                <select
                  value={declaredGrade}
                  onChange={(e) => setDeclaredGrade(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.95rem"
                  }}
                >
                  <option value="A">Grade A (Premium / Firm / Export-grade)</option>
                  <option value="B">Grade B (Standard Market / Catering)</option>
                  <option value="C">Grade C (Processing / Sauce & Puree)</option>
                </select>
              </div>
            </div>

            {/* Pricing Section with Mandi Rule Proxy */}
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "20px"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <DollarSign size={18} color="#16a34a" />
                  <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#166534" }}>
                    Dynamic Mandi Price Suggestion
                  </span>
                </div>
                <span className="badge badge-grade-a">₹{suggestedPrice}/kg Suggested</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#15803d", marginBottom: "12px" }}>
                {priceNote}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#374151" }}>
                  Farmer Final Ask Price (₹/kg):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                  style={{
                    width: "120px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "2px solid #10b981",
                    fontWeight: "800",
                    fontSize: "1rem",
                    color: "#0f392b"
                  }}
                  required
                />
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  (Est. Gross: ₹{(quantityKg * finalPrice).toLocaleString("en-IN")})
                </span>
              </div>
            </div>

            {/* Nearest Aggregation Point Auto-Calculation Callout */}
            <div style={{
              background: "linear-gradient(135deg, #09261c, #164e3b)",
              color: "#ffffff",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <MapPin size={24} color="#34d399" />
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#a7f3d0", textTransform: "uppercase", fontWeight: "700" }}>
                    Haversine Auto-Assignment
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff" }}>
                    {nearestHub.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#d1fae5" }}>
                    Nearest hub to farm coordinates ({nearestHub.distance_km} km away)
                  </div>
                </div>
              </div>
              <span style={{
                background: "rgba(52, 211, 153, 0.2)",
                border: "1px solid #34d399",
                color: "#34d399",
                padding: "4px 10px",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: "700"
              }}>
                Auto-Assigned
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "1.05rem" }}
            >
              {isSubmitting ? "Creating Listing & Assigning Hub..." : "Publish Produce to Aggregation Hub"}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Right Column: AI Photo Grading & Active Listings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* AI Computer Vision Grading Card */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles color="#f59e0b" size={20} /> AI Quality Grading (CV)
              </h3>
              <span className="badge badge-grade-a">
                Grade {aiAnalysis.estimated_grade} Verified
              </span>
            </div>

            {/* Photo Preview */}
            <div style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              height: "170px",
              background: "#f3f4f6",
              marginBottom: "14px",
              border: "1px solid #e5e7eb"
            }}>
              <img
                src={photoPreview}
                alt="Produce Upload"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {isAnalyzingImage && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  gap: "8px"
                }}>
                  <Sparkles size={24} className="live-dot" />
                  <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>Running Computer Vision Analysis...</span>
                </div>
              )}
            </div>

            {/* File Upload Input */}
            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px",
              borderRadius: "8px",
              border: "1px dashed #10b981",
              background: "#ecfdf5",
              color: "#065f46",
              fontSize: "0.85rem",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "14px"
            }}>
              <UploadCloud size={18} />
              <span>Upload Fresh Harvest Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
            </label>

            {/* AI Analysis Metrics */}
            <div style={{
              background: "#f8fafc",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "0.8rem",
              color: "#334155"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Color & Ripeness:</span>
                <strong>{aiAnalysis.metrics.color_uniformity}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Surface Quality:</span>
                <strong>{aiAnalysis.metrics.surface_defects}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Size Uniformity:</span>
                <strong>{aiAnalysis.metrics.average_diameter_mm}</strong>
              </div>
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "6px", marginTop: "6px", color: "#16a34a", fontWeight: "600" }}>
                ✓ {aiAnalysis.recommendation}
              </div>
            </div>
          </div>

          {/* Farmer's Active Listings */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "14px" }}>
              My Active Hub Listings ({myListings.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {myListings.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "#0f392b" }}>
                      {item.crop_name} — {item.quantity_kg} kg
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {item.aggregation_point_name || "Thiruvallur CSC Hub"} • Grade {item.declared_grade}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "800", color: "#10b981" }}>₹{item.final_price}/kg</div>
                    <span className="badge badge-grade-a" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
