import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { DemoPitchBar } from "./components/DemoPitchBar";
import { FarmerPortal } from "./components/FarmerPortal";
import { BuyerCatalog } from "./components/BuyerCatalog";
import { OrderEscrowView } from "./components/OrderEscrowView";
import { ReputationView } from "./components/ReputationView";
import { IvrSimulatorModal } from "./components/IvrSimulatorModal";
import { NetworkMapModal } from "./components/NetworkMapModal";
import { api } from "./api/client";

export default function App() {
  const [activeTab, setActiveTab] = useState("farmer");
  const [activeRole, setActiveRole] = useState("FARMER");
  const [activeZone, setActiveZone] = useState("PLAINS_A");
  
  // Modals & Tour
  const [ivrModalOpen, setIvrModalOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [pitchStep, setPitchStep] = useState(1);

  // Cart & Orders State
  const [cart, setCart] = useState([
    {
      listing: {
        id: 101,
        crop_name: "Tomato",
        quantity_kg: 150.0,
        final_price: 26.5,
        declared_grade: "A",
        aggregation_point_name: "Thiruvallur CSC Aggregation Point",
        photo_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80"
      },
      hub: {
        id: 1,
        name: "Thiruvallur CSC Aggregation Point"
      },
      quantity_kg: 20.0
    },
    {
      listing: {
        id: 102,
        crop_name: "Onion",
        quantity_kg: 100.0,
        final_price: 34.0,
        declared_grade: "A",
        aggregation_point_name: "Thiruvallur CSC Aggregation Point",
        photo_url: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80"
      },
      hub: {
        id: 1,
        name: "Thiruvallur CSC Aggregation Point"
      },
      quantity_kg: 15.0
    }
  ]);

  const [orders, setOrders] = useState([
    {
      id: 201,
      buyer_id: 1,
      buyer_name: "Anbu Caterers & Events",
      aggregation_point_id: 1,
      aggregation_point_name: "Thiruvallur CSC Aggregation Point",
      status: "CONFIRMED",
      qr_code_token: "KURAL-THIRU-8924",
      total_amount: 1040.0,
      items: [
        { id: 1, crop_name: "Tomato", quantity_kg: 20.0, price_per_kg: 26.5, item_status: "MATCHED" },
        { id: 2, crop_name: "Onion", quantity_kg: 15.0, price_per_kg: 34.0, item_status: "MATCHED" }
      ],
      transaction: {
        id: 501,
        amount: 1040.0,
        escrow_status: "HELD",
        released_at: null
      },
      created_at: new Date().toISOString()
    }
  ]);

  // Notifications Toast
  const [notification, setNotification] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    async function checkBackend() {
      const isUp = await api.checkHealth();
      setBackendConnected(isUp);
    }
    checkBackend();
    const timer = setInterval(checkBackend, 5000);
    return () => clearInterval(timer);
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Handlers for Live Pitch Tour
  const handleTriggerPitchStep = (tabName, stepNumber) => {
    setActiveTab(tabName);
    setPitchStep(stepNumber);
    if (stepNumber === 1) {
      showNotification("🌾 Step 1: Farmer lists produce (or via IVR) → Auto-assigned to nearest CSC point via Haversine logic!");
    } else if (stepNumber === 2) {
      showNotification("🛒 Step 2: Buyer views single-hub catalog with produce pooled from multiple farmers!");
    } else if (stepNumber === 3) {
      showNotification("📦 Step 3: Multi-item order resolves to single hub for 1-trip pickup (zero company logistics needed)!");
    } else if (stepNumber === 4) {
      showNotification("🔐 Step 4: Buyer presents QR token at hub → 1-click scan verifies items and releases Escrow funds instantly!");
    } else if (stepNumber === 5) {
      showNotification("⭐ Step 5: +1 Trust reputation score logged on both sides!");
    }
  };

  const handleResetDemo = () => {
    setOrders([
      {
        id: 201,
        buyer_id: 1,
        buyer_name: "Anbu Caterers & Events",
        aggregation_point_id: 1,
        aggregation_point_name: "Thiruvallur CSC Aggregation Point",
        status: "CONFIRMED",
        qr_code_token: "KURAL-THIRU-8924",
        total_amount: 1040.0,
        items: [
          { id: 1, crop_name: "Tomato", quantity_kg: 20.0, price_per_kg: 26.5, item_status: "MATCHED" },
          { id: 2, crop_name: "Onion", quantity_kg: 15.0, price_per_kg: 34.0, item_status: "MATCHED" }
        ],
        transaction: {
          id: 501,
          amount: 1040.0,
          escrow_status: "HELD",
          released_at: null
        },
        created_at: new Date().toISOString()
      }
    ]);
    setPitchStep(1);
    setActiveTab("farmer");
    showNotification("🔄 Demo state reset to fresh pilot benchmark!");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        activeZone={activeZone}
        setActiveZone={setActiveZone}
        onOpenIvr={() => setIvrModalOpen(true)}
        onOpenMap={() => setMapModalOpen(true)}
        onStartDemoTour={() => {
          setActiveTab("farmer");
          setPitchStep(1);
          showNotification("✨ 5-Step Pitch Tour Started! Follow along each step in the top tour bar.");
        }}
        backendConnected={backendConnected}
      />

      {/* 5-Step Guided Pitch Bar */}
      <DemoPitchBar
        currentStep={pitchStep}
        setCurrentStep={setPitchStep}
        onTriggerStep={handleTriggerPitchStep}
        onResetDemo={handleResetDemo}
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "linear-gradient(135deg, #09261c, #0f392b)",
          color: "#ffffff",
          padding: "14px 22px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          border: "1px solid #10b981",
          zIndex: 9999,
          fontSize: "0.9rem",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          animation: "fadeIn 0.3s ease"
        }}>
          <span>{notification}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <main style={{ flex: 1, paddingBottom: "40px" }}>
        {activeTab === "farmer" && (
          <FarmerPortal
            activeZone={activeZone}
            onListingCreated={(newListing) => {
              // Optionally switch to buyer catalog to see it live
            }}
            showNotification={showNotification}
          />
        )}

        {activeTab === "buyer" && (
          <BuyerCatalog
            activeZone={activeZone}
            cart={cart}
            setCart={setCart}
            onOrderCreated={(newOrder) => {
              setOrders(prev => [newOrder, ...prev]);
              setActiveTab("orders");
              setPitchStep(4);
            }}
            showNotification={showNotification}
          />
        )}

        {activeTab === "orders" && (
          <OrderEscrowView
            orders={orders}
            setOrders={setOrders}
            showNotification={showNotification}
          />
        )}

        {activeTab === "reputation" && (
          <ReputationView />
        )}
      </main>

      {/* Modals */}
      <IvrSimulatorModal
        isOpen={ivrModalOpen}
        onClose={() => setIvrModalOpen(false)}
        onListingCreated={(listing) => {
          showNotification(`📞 Phone Voice Listing Received: ${listing.crop_name} assigned to ${listing.aggregation_point_name}`);
        }}
        showNotification={showNotification}
      />

      <NetworkMapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        activeZone={activeZone}
        setActiveZone={setActiveZone}
      />

      {/* Footer */}
      <footer style={{
        background: "#081d15",
        color: "#9ca3af",
        padding: "20px 28px",
        fontSize: "0.8rem",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        marginTop: "auto"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <strong>KuralAgri (குறள் அக்ரி)</strong> • Agricultural Aggregation with Escrow Settlement & AI Quality Grading
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <span>Architecture: FastAPI + React + Haversine Geo</span>
            <span>Zero-Vehicle Aggregated Supply Chain</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
