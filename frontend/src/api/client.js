const API_BASE = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

// Fallback seed data if backend is offline
const FALLBACK_HUBS = [
  {
    aggregation_point: {
      id: 1,
      name: "Thiruvallur CSC Aggregation Point",
      zone: "PLAINS_A",
      latitude: 13.1438,
      longitude: 79.9082,
      daily_listing_capacity: 500,
      is_active: true
    },
    farmers_count: 3,
    total_quantity_kg: 320.0,
    listings: [
      {
        id: 101,
        farmer_id: 1,
        farmer_name: "Murugan Selvam",
        farmer_phone: "+91 98401 12345",
        farmer_zone: "PLAINS_A",
        crop_name: "Tomato",
        quantity_kg: 150.0,
        harvest_date: "2026-08-16",
        declared_grade: "A",
        ai_grade_estimate: "A (Uniform Crimson, High Brix)",
        suggested_price: 28.0,
        final_price: 26.5,
        zone: "PLAINS_A",
        aggregation_point_id: 1,
        aggregation_point_name: "Thiruvallur CSC Aggregation Point",
        photo_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
        status: "AVAILABLE",
        created_at: new Date().toISOString()
      },
      {
        id: 102,
        farmer_id: 2,
        farmer_name: "Kavitha Rajendran",
        farmer_phone: "+91 98402 23456",
        farmer_zone: "PLAINS_A",
        crop_name: "Onion",
        quantity_kg: 100.0,
        harvest_date: "2026-08-15",
        declared_grade: "A",
        ai_grade_estimate: "A (Firm & Dry Peel)",
        suggested_price: 35.0,
        final_price: 34.0,
        zone: "PLAINS_A",
        aggregation_point_id: 1,
        aggregation_point_name: "Thiruvallur CSC Aggregation Point",
        photo_url: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80",
        status: "AVAILABLE",
        created_at: new Date().toISOString()
      },
      {
        id: 103,
        farmer_id: 3,
        farmer_name: "Arumugam P.",
        farmer_phone: "+91 98403 34567",
        farmer_zone: "PLAINS_A",
        crop_name: "Green Chilli",
        quantity_kg: 70.0,
        harvest_date: "2026-08-16",
        declared_grade: "B",
        ai_grade_estimate: "B (Good pungency, slight curl)",
        suggested_price: 45.0,
        final_price: 42.0,
        zone: "PLAINS_A",
        aggregation_point_id: 1,
        aggregation_point_name: "Thiruvallur CSC Aggregation Point",
        photo_url: "https://images.unsplash.com/photo-1588879460618-9249e7d947d1?w=600&auto=format&fit=crop&q=80",
        status: "AVAILABLE",
        created_at: new Date().toISOString()
      }
    ]
  },
  {
    aggregation_point: {
      id: 2,
      name: "Kanchipuram Central Aggregation Hub",
      zone: "PLAINS_A",
      latitude: 12.8342,
      longitude: 79.7036,
      daily_listing_capacity: 400,
      is_active: true
    },
    farmers_count: 2,
    total_quantity_kg: 210.0,
    listings: [
      {
        id: 104,
        farmer_id: 4,
        farmer_name: "Ganesan M.",
        farmer_phone: "+91 98404 45678",
        farmer_zone: "PLAINS_A",
        crop_name: "Potato",
        quantity_kg: 160.0,
        harvest_date: "2026-08-14",
        declared_grade: "A",
        ai_grade_estimate: "A (Medium-Large Oval)",
        suggested_price: 24.0,
        final_price: 23.0,
        zone: "PLAINS_A",
        aggregation_point_id: 2,
        aggregation_point_name: "Kanchipuram Central Aggregation Hub",
        photo_url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
        status: "AVAILABLE",
        created_at: new Date().toISOString()
      },
      {
        id: 105,
        farmer_id: 5,
        farmer_name: "Vennila S.",
        farmer_phone: "+91 98405 56789",
        farmer_zone: "PLAINS_A",
        crop_name: "Tomato",
        quantity_kg: 50.0,
        harvest_date: "2026-08-16",
        declared_grade: "B",
        ai_grade_estimate: "B (Ripe, Good for catering)",
        suggested_price: 25.0,
        final_price: 24.0,
        zone: "PLAINS_A",
        aggregation_point_id: 2,
        aggregation_point_name: "Kanchipuram Central Aggregation Hub",
        photo_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
        status: "AVAILABLE",
        created_at: new Date().toISOString()
      }
    ]
  }
];

export const api = {
  // Check backend health
  async checkHealth() {
    try {
      const res = await fetch(`${MEDIA_BASE}/`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Auth / Users
  async getFarmers() {
    try {
      const res = await fetch(`${API_BASE}/auth/farmers`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Using mock farmers:", e);
    }
    return [
      { id: 1, name: "Murugan Selvam", phone: "9840112345", zone: "PLAINS_A", latitude: 13.1401, longitude: 79.9100, reputation_score: 14 },
      { id: 2, name: "Kavitha Rajendran", phone: "9840223456", zone: "PLAINS_A", latitude: 13.1480, longitude: 79.9020, reputation_score: 9 },
      { id: 3, name: "Arumugam P.", phone: "9840334567", zone: "PLAINS_A", latitude: 13.1350, longitude: 79.9200, reputation_score: 21 },
      { id: 4, name: "Ganesan M.", phone: "9840445678", zone: "PLAINS_A", latitude: 12.8390, longitude: 79.7100, reputation_score: 12 }
    ];
  },

  async getBuyers() {
    try {
      const res = await fetch(`${API_BASE}/auth/buyers`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Using mock buyers:", e);
    }
    return [
      { id: 1, name: "Anbu Caterers & Events", buyer_type: "CATERER", zone: "PLAINS_A", reputation_score: 18 },
      { id: 2, name: "Sri Krishna College Hostel Mess", buyer_type: "HOSTEL", zone: "PLAINS_A", reputation_score: 25 },
      { id: 3, name: "GreenFresh Organic Mart", buyer_type: "RETAILER", zone: "PLAINS_A", reputation_score: 8 }
    ];
  },

  // Aggregation Points
  async getAggregationPoints(zone = "PLAINS_A") {
    try {
      const res = await fetch(`${API_BASE}/aggregation-points?zone=${zone}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback aggregation points:", e);
    }
    return FALLBACK_HUBS.map(h => h.aggregation_point);
  },

  // Browse Catalog Grouped by Hub
  async browseCatalog(zone = "PLAINS_A", crop = "") {
    try {
      let url = `${API_BASE}/listings/browse?zone=${zone}`;
      if (crop) url += `&crop=${encodeURIComponent(crop)}`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback catalog:", e);
    }
    return FALLBACK_HUBS;
  },

  // Price suggestion
  async getPriceSuggestion(crop, zone = "PLAINS_A", grade = "A") {
    try {
      const res = await fetch(`${API_BASE}/pricing/suggest?crop=${crop}&zone=${zone}&grade=${grade}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback price:", e);
    }
    const baseMap = { Tomato: 26, Onion: 35, Potato: 24, Carrot: 42, Radish: 20, "Green Chilli": 45, Cabbage: 18 };
    const base = baseMap[crop] || 30;
    return {
      crop,
      zone,
      grade,
      mandi_base_price: base,
      demand_multiplier: 1.05,
      suggested_price: Math.round(base * 1.05 * 10) / 10,
      pricing_note: "Based on local mandi demand model"
    };
  },

  // Upload photo with AI grading
  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/listings/upload-photo`, {
        method: "POST",
        body: formData
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback photo upload:", e);
    }
    // Simulation fallback
    return {
      photo_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
      filename: "crop_demo.jpg",
      ai_analysis: {
        estimated_grade: "A",
        confidence: 0.94,
        metrics: {
          color_uniformity: "High Crimson (93%)",
          surface_defects: "Minimal (< 2%)",
          average_diameter_mm: "58mm (Uniform size)"
        },
        recommendation: "Grade A Premium Mandi Ready"
      }
    };
  },

  // Create Listing
  async createListing(listingData) {
    try {
      const res = await fetch(`${API_BASE}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listingData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback listing create:", e);
    }
    return {
      id: Math.floor(Math.random() * 9000) + 1000,
      farmer_id: listingData.farmer_id || 1,
      farmer_name: "Murugan Selvam",
      crop_name: listingData.crop_name,
      quantity_kg: listingData.quantity_kg,
      declared_grade: listingData.declared_grade,
      ai_grade_estimate: listingData.ai_grade_estimate || "A",
      suggested_price: listingData.suggested_price || 28.0,
      final_price: listingData.final_price,
      zone: listingData.zone || "PLAINS_A",
      aggregation_point_id: 1,
      aggregation_point_name: "Thiruvallur CSC Aggregation Point",
      photo_url: listingData.photo_url || "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
      status: "AVAILABLE",
      created_at: new Date().toISOString()
    };
  },

  // Create Multi-Item Order (with single hub resolution)
  async createOrder(orderPayload) {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback order creation:", e);
    }
    const qrToken = `KURAL-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    return {
      id: Math.floor(Math.random() * 800) + 200,
      buyer_id: orderPayload.buyer_id || 1,
      buyer_name: "Anbu Caterers & Events",
      aggregation_point_id: 1,
      aggregation_point_name: "Thiruvallur CSC Aggregation Point",
      aggregation_point_zone: "PLAINS_A",
      status: "CONFIRMED",
      qr_code_token: qrToken,
      total_amount: 1250.0,
      items: orderPayload.items.map((item, idx) => ({
        id: idx + 1,
        listing_id: item.listing_id,
        quantity_kg: item.quantity_kg,
        crop_name: "Produce Item",
        price_per_kg: 28.0,
        item_status: "MATCHED",
        substitute_for: null
      })),
      transaction: {
        id: 501,
        amount: 1250.0,
        escrow_status: "HELD",
        released_at: null
      },
      created_at: new Date().toISOString()
    };
  },

  // Confirm Collection (QR Scan & Escrow Release)
  async confirmCollection(orderId, qrToken) {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/confirm-collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: qrToken })
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback confirm collection:", e);
    }
    return {
      success: true,
      message: "Order # " + orderId + " marked as COLLECTED. Escrow of funds released instantly to farmers.",
      order_id: orderId,
      new_status: "COLLECTED",
      escrow_status: "RELEASED",
      released_at: new Date().toISOString(),
      reputation_awarded: {
        buyer_id: 1,
        farmer_delta: "+1",
        buyer_delta: "+1"
      }
    };
  },

  // Submit Dispute
  async submitDispute(orderId, disputeData) {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disputeData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback dispute:", e);
    }
    return {
      success: true,
      order_id: orderId,
      new_status: "DISPUTED",
      dispute: {
        id: 99,
        reason: disputeData.reason,
        evidence_photo_url: disputeData.evidence_photo_url,
        created_at: new Date().toISOString()
      },
      message: "Dispute logged under review. Escrow held until mediation."
    };
  },

  // IVR Voice Simulation
  async simulateIvr(ivrData) {
    try {
      const res = await fetch(`${API_BASE}/ivr/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ivrData)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback IVR:", e);
    }
    const cropNames = { "1": "Tomato", "2": "Onion", "3": "Potato", "4": "Carrot", "5": "Green Chilli" };
    const cropName = cropNames[ivrData.crop_code] || "Tomato";
    return {
      success: true,
      channel: "IVR_VOICE_CALL",
      farmer_phone: ivrData.farmer_phone,
      farmer_name: "Murugan Selvam",
      crop_name: cropName,
      quantity_kg: ivrData.quantity_kg,
      final_price: ivrData.price_per_kg,
      declared_grade: ivrData.grade_code === "1" ? "A" : "B",
      aggregation_point_id: 1,
      aggregation_point_name: "Thiruvallur CSC Aggregation Point",
      ivr_voice_response: `Vanakkam Murugan. Your ${ivrData.quantity_kg}kg ${cropName} is auto-assigned to Thiruvallur CSC point.`
    };
  },

  // Reputation
  async getReputation(actorType, actorId) {
    try {
      const res = await fetch(`${API_BASE}/reputation/${actorType}/${actorId}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Fallback reputation:", e);
    }
    return {
      actor_type: actorType,
      actor_id: actorId,
      name: actorType === "FARMER" ? "Murugan Selvam" : "Anbu Caterers",
      score: actorType === "FARMER" ? 22 : 19,
      level: "Verified Gold Tier (99.4% Fulfillment)",
      history: [
        { id: 1, event: "COMPLETED", score_delta: 1, notes: "Order #204 picked up on schedule", created_at: "2026-08-16T10:00:00" },
        { id: 2, event: "COMPLETED", score_delta: 1, notes: "Order #201 Grade A produce verified", created_at: "2026-08-15T14:30:00" },
        { id: 3, event: "COMPLETED", score_delta: 1, notes: "Order #198 Timely dropoff at Thiruvallur CSC", created_at: "2026-08-14T09:15:00" }
      ]
    };
  }
};
