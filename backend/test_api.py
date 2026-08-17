import httpx

def test_api():
    client = httpx.Client(base_url="http://127.0.0.1:8000/api")
    
    # 1. Root check
    r = httpx.get("http://127.0.0.1:8000/")
    print("0. Root check:", r.json())
    
    # 2. Browse Plains catalog
    b = client.get("/listings/browse?zone=PLAINS_A")
    print(f"1. Browse Plains A catalog: Status {b.status_code}, Found {len(b.json())} aggregation hubs.")
    for hub in b.json():
        print(f"   Hub: {hub['aggregation_point']['name']} — {len(hub['listings'])} listings from {hub['farmers_count']} farmers, Total {hub['total_quantity_kg']}kg")

    # 3. Create a listing
    first_listing = b.json()[0]['listings'][0]
    farmer_id = first_listing['farmer_id']
    new_listing = client.post("/listings", json={
        "farmer_id": farmer_id,
        "crop_name": "Tomato",
        "quantity_kg": 75.0,
        "declared_grade": "A",
        "final_price": 28.5
    })
    print(f"2. Create Listing: Status {new_listing.status_code}, Auto-assigned Hub: {new_listing.json()['aggregation_point_name']}, AI Grade: {new_listing.json()['ai_grade_estimate']}")

    # 4. IVR Listing Simulation
    ivr_res = client.post("/ivr/simulate", json={
        "farmer_phone": "9840112345",
        "crop_code": "2", # Onion
        "quantity_kg": 120.0,
        "price_per_kg": 34.0,
        "grade_code": "1"
    })
    print(f"3. IVR Voice Simulation: Status {ivr_res.status_code}, Crop: {ivr_res.json()['crop_name']}, Hub: {ivr_res.json()['aggregation_point_name']}")

    # 5. Place Multi-item Order (Buyer)
    order_res = client.post("/orders", json={
        "items": [
            {"listing_id": first_listing['id'], "quantity_kg": 15.0},
            {"listing_id": new_listing.json()['id'], "quantity_kg": 20.0}
        ]
    })
    order_data = order_res.json()
    print(f"4. Placed Multi-Item Order: ID #{order_data['id']}, Token: {order_data['qr_code_token']}, Collection Hub: {order_data['aggregation_point_name']}, Amount: ₹{order_data['total_amount']}, Escrow: {order_data['transaction']['escrow_status']}")

    # 6. QR Code Handover & Escrow Settlement
    collect_res = client.post(f"/orders/{order_data['id']}/confirm-collection", json={
        "qr_token": order_data['qr_code_token']
    })
    c_data = collect_res.json()
    print(f"5. QR Handover & Settlement: Success={c_data['success']}, Status={c_data['new_status']}, Escrow={c_data['escrow_status']}, Message='{c_data['message']}'")

    # 7. Check Reputation Score
    rep_res = client.get(f"/reputation/FARMER/{farmer_id}")
    print(f"6. Farmer #{farmer_id} Reputation: Score {rep_res.json()['score']}, Events count {len(rep_res.json()['history'])}")

if __name__ == "__main__":
    test_api()
