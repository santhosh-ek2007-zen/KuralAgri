import React, { useState } from "react";
import { 
  PhoneCall, 
  PhoneOff, 
  Volume2, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  Sprout, 
  Play,
  RotateCcw
} from "lucide-react";
import { api } from "../api/client";

export function IvrSimulatorModal({ isOpen, onClose, onListingCreated, showNotification }) {
  const [callActive, setCallActive] = useState(false);
  const [currentPromptStep, setCurrentPromptStep] = useState(1);
  const [dialedInput, setDialedInput] = useState("");
  const [cropCode, setCropCode] = useState("1"); // 1=Tomato, 2=Onion, 3=Potato, 4=Carrot, 5=Chilli
  const [quantityInput, setQuantityInput] = useState("120");
  const [priceInput, setPriceInput] = useState("32");
  const [gradeCode, setGradeCode] = useState("1"); // 1=Grade A, 2=Grade B
  const [ivrResponse, setIvrResponse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const startCall = () => {
    setCallActive(true);
    setCurrentPromptStep(1);
    setDialedInput("");
    setIvrResponse(null);
  };

  const endCall = () => {
    setCallActive(false);
    setCurrentPromptStep(1);
    setDialedInput("");
  };

  const handleKeypadPress = (digit) => {
    setDialedInput(prev => prev + digit);

    if (currentPromptStep === 1) {
      // Crop Selection
      if (["1", "2", "3", "4", "5"].includes(digit)) {
        setCropCode(digit);
        setCurrentPromptStep(2);
        setDialedInput("");
      }
    } else if (currentPromptStep === 2) {
      // Quantity input
      if (digit === "#") {
        setCurrentPromptStep(3);
        setDialedInput("");
      }
    } else if (currentPromptStep === 3) {
      // Price input
      if (digit === "#") {
        setCurrentPromptStep(4);
        setDialedInput("");
      }
    } else if (currentPromptStep === 4) {
      // Grade Selection
      if (["1", "2"].includes(digit)) {
        setGradeCode(digit);
        setCurrentPromptStep(5);
        setDialedInput("");
      }
    } else if (currentPromptStep === 5) {
      // Final confirmation
      if (digit === "1") {
        submitIvrListing();
      }
    }
  };

  const submitIvrListing = async () => {
    setIsProcessing(true);
    const payload = {
      farmer_phone: "9840112345",
      crop_code: cropCode,
      quantity_kg: parseFloat(quantityInput || "100"),
      price_per_kg: parseFloat(priceInput || "30"),
      grade_code: gradeCode
    };

    try {
      const res = await api.simulateIvr(payload);
      setIvrResponse(res);
      setCurrentPromptStep(6);
      showNotification(`📞 IVR Listing Received: ${res.crop_name} ${res.quantity_kg}kg auto-assigned to ${res.aggregation_point_name}!`);
      if (onListingCreated) onListingCreated(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const runOneClickAutoDemo = async () => {
    setCallActive(true);
    setIsProcessing(true);
    setCurrentPromptStep(1);
    setCropCode("2"); // Onion
    setQuantityInput("150");
    setPriceInput("34");
    setGradeCode("1");

    setTimeout(async () => {
      setCurrentPromptStep(5);
      const res = await api.simulateIvr({
        farmer_phone: "9840112345",
        crop_code: "2",
        quantity_kg: 150.0,
        price_per_kg: 34.0,
        grade_code: "1"
      });
      setIvrResponse(res);
      setCurrentPromptStep(6);
      setIsProcessing(false);
      showNotification(`📞 IVR Voice Demo: 150kg Onion listed & auto-assigned to Thiruvallur CSC Hub!`);
      if (onListingCreated) onListingCreated(res);
    }, 1500);
  };

  const cropNames = { "1": "Tomato (தக்காளி)", "2": "Onion (வெங்காயம்)", "3": "Potato (உருளைக்கிழங்கு)", "4": "Carrot (கேரட்)", "5": "Green Chilli (மிளகாய்)" };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#ffffff",
          padding: "28px",
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
              <PhoneCall size={22} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", color: "#0f392b" }}>IVR Voice Assistant</h3>
              <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>Feature Phone Crop Listing (No App / Screen Needed)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", fontSize: "1.2rem", color: "#6b7280", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* 1-Click Demo Shortcut */}
        <button
          onClick={runOneClickAutoDemo}
          className="btn-gold"
          style={{ width: "100%", justifyContent: "center", padding: "8px", fontSize: "0.85rem", marginBottom: "16px" }}
        >
          <Sparkles size={16} /> Run 1-Click Fast IVR Call Simulation
        </button>

        {/* Interactive Phone Screen */}
        <div style={{
          background: "#09261c",
          borderRadius: "14px",
          padding: "18px",
          color: "#ffffff",
          marginBottom: "18px",
          border: "2px solid #10b981",
          minHeight: "130px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                {callActive ? <span className="live-dot" /> : null}
                {callActive ? "CALL CONNECTED: 1800-KURAL-AGRI" : "CALL DISCONNECTED"}
              </span>
              <span style={{ fontSize: "0.72rem", color: "#a7f3d0" }}>Farmer: Murugan S.</span>
            </div>

            {/* Voice Prompt Text */}
            <div style={{ fontSize: "0.88rem", lineHeight: "1.4", color: "#f3f4f6" }}>
              {!callActive ? (
                <div style={{ color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
                  Press "Dial 1800-KURAL" below to start the automated voice listing flow.
                </div>
              ) : currentPromptStep === 1 ? (
                <div>
                  <Volume2 size={16} color="#34d399" style={{ display: "inline", marginRight: "6px" }} />
                  <strong>வணக்கம்! Press:</strong> 1 for Tomato, 2 for Onion, 3 for Potato, 4 for Chilli.
                </div>
              ) : currentPromptStep === 2 ? (
                <div>
                  <Volume2 size={16} color="#34d399" style={{ display: "inline", marginRight: "6px" }} />
                  Selected <strong>{cropNames[cropCode]}</strong>. Enter quantity in kg followed by <strong>#</strong> (e.g. 120#).
                  <div style={{ color: "#fcd34d", marginTop: "4px" }}>Dialed: {dialedInput || quantityInput} kg</div>
                </div>
              ) : currentPromptStep === 3 ? (
                <div>
                  <Volume2 size={16} color="#34d399" style={{ display: "inline", marginRight: "6px" }} />
                  Quantity confirmed. Enter price per kg followed by <strong>#</strong> (e.g. 34#).
                  <div style={{ color: "#fcd34d", marginTop: "4px" }}>Dialed: ₹{dialedInput || priceInput}/kg</div>
                </div>
              ) : currentPromptStep === 4 ? (
                <div>
                  <Volume2 size={16} color="#34d399" style={{ display: "inline", marginRight: "6px" }} />
                  Press <strong>1</strong> for Grade A (Premium), or <strong>2</strong> for Grade B.
                </div>
              ) : currentPromptStep === 5 ? (
                <div>
                  <Volume2 size={16} color="#34d399" style={{ display: "inline", marginRight: "6px" }} />
                  Confirm listing of {quantityInput}kg {cropNames[cropCode]} @ ₹{priceInput}/kg? Press <strong>1</strong> to publish.
                </div>
              ) : (
                <div style={{ color: "#6ee7b7" }}>
                  <CheckCircle2 size={18} color="#10b981" style={{ display: "inline", marginRight: "6px" }} />
                  {ivrResponse?.ivr_voice_response || "Listing Published & Auto-Assigned!"}
                </div>
              )}
            </div>
          </div>

          {/* Call Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px" }}>
            {!callActive ? (
              <button
                onClick={startCall}
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <PhoneCall size={14} /> Dial 1800-KURAL
              </button>
            ) : (
              <button
                onClick={endCall}
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <PhoneOff size={14} /> End Call
              </button>
            )}

            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              {isProcessing ? "Processing..." : callActive ? `Step ${currentPromptStep} of 5` : "Offline"}
            </span>
          </div>
        </div>

        {/* Tactile Keypad */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          maxWidth: "280px",
          margin: "0 auto 16px auto"
        }}>
          {[
            { num: "1", sub: "" },
            { num: "2", sub: "ABC" },
            { num: "3", sub: "DEF" },
            { num: "4", sub: "GHI" },
            { num: "5", sub: "JKL" },
            { num: "6", sub: "MNO" },
            { num: "7", sub: "PQRS" },
            { num: "8", sub: "TUV" },
            { num: "9", sub: "WXYZ" },
            { num: "*", sub: "" },
            { num: "0", sub: "+" },
            { num: "#", sub: "ENTER" }
          ].map((key) => (
            <button
              key={key.num}
              onClick={() => handleKeypadPress(key.num)}
              disabled={!callActive}
              style={{
                background: callActive ? "#f8fafc" : "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "10px 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: callActive ? "pointer" : "not-allowed",
                boxShadow: callActive ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
              }}
            >
              <span style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0f392b" }}>{key.num}</span>
              {key.sub && <span style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: "600" }}>{key.sub}</span>}
            </button>
          ))}
        </div>

        {/* Pitch Talking Point */}
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "0.78rem",
          color: "#166534",
          lineHeight: "1.4"
        }}>
          💡 <strong>Demo Talking Point:</strong> "This uses the exact same backend API as the web app. A feature-phone farmer in a remote village can list crops via standard IVR voice call without ever touching a smartphone or computer screen."
        </div>
      </div>
    </div>
  );
}
