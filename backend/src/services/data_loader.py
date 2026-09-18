import csv
import os
import random
import shutil
from tempfile import NamedTemporaryFile
from src.config import settings
from src.services.risk_engine import calculate_risk, classify_risk
from src.models import ComplaintCreate

# Global In-Memory State (The "Hot" Cache)
DB_WARDS = []
DB_COMPLAINTS = []

def load_initial_data():
    global DB_WARDS, DB_COMPLAINTS
    
    # 1. Load Base Ward Data
    if os.path.exists(settings.WARDS_FILE):
        print(f"📂 Loading Wards from {settings.WARDS_FILE}...")
        DB_WARDS = load_wards_csv(settings.WARDS_FILE)
    else:
        print("⚠️ wards.csv not found. Generating Mock Wards...")
        DB_WARDS = generate_mock_delhi_wards()

    # 2. Merge Rainfall
    if os.path.exists(settings.RAINFALL_FILE):
        print(f"🔹 Merging Rainfall from {settings.RAINFALL_FILE}...")
        merge_csv_data(settings.RAINFALL_FILE, "rainfall", float)
    
    # 3. Merge Drainage
    if os.path.exists(settings.DRAINAGE_FILE):
        print(f"🔹 Merging Drainage from {settings.DRAINAGE_FILE}...")
        merge_csv_data(settings.DRAINAGE_FILE, "drainageCapacity", int)

    # 4. Load Complaints
    if os.path.exists(settings.COMPLAINTS_FILE):
        print(f"🔹 Loading History from {settings.COMPLAINTS_FILE}...")
        load_complaints_csv(settings.COMPLAINTS_FILE)

    # 5. Final Intelligence Pass
    print("⚙️ Running Risk Engine on merged data...")
    recalculate_all_risks()
    return DB_WARDS

def load_wards_csv(path):
    wards = []
    try:
        with open(path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                wards.append({
                    "type": "Feature",
                    "properties": {
                        "id": row['ward_id'],
                        "name": row['ward_name'],
                        "zone": row['zone'],
                        "drainageCapacity": 50, # Default
                        "rainfall": 0.0,       # Default
                        "activeComplaints": 0,
                        "riskScore": 0,
                        "riskLevel": "Low"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [float(row['longitude']), float(row['latitude'])]
                    }
                })
    except Exception as e:
        print(f"❌ Error loading wards CSV: {e}")
    return wards

def merge_csv_data(path, property_key, data_type=str):
    try:
        with open(path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            data_map = {}
            for row in reader:
                val = None
                if property_key == 'rainfall' and 'rainfall' in row:
                    val = row['rainfall']
                elif property_key == 'drainageCapacity' and 'drainage_capacity' in row:
                    val = row['drainage_capacity']
                
                if val is not None:
                    data_map[row['ward_id']] = data_type(val)
            
            # Update Main DB
            for ward in DB_WARDS:
                wid = ward['properties']['id']
                if wid in data_map:
                    ward['properties'][property_key] = data_map[wid]
                    
    except Exception as e:
        print(f"❌ Error merging {path}: {e}")

def load_complaints_csv(path):
    global DB_COMPLAINTS
    DB_COMPLAINTS = [] 
    try:
        with open(path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not row.get('ward_id') or not row.get('severity'):
                    continue
                    
                complaint = ComplaintCreate(
                    ward_id=row['ward_id'],
                    severity=row['severity'],
                    description=row.get('description', ''),
                    timestamp=row.get('timestamp'),
                    image_url=row.get('image_url') # ✅ Load image URL from CSV
                )
                DB_COMPLAINTS.append(complaint)
    except Exception as e:
        print(f"❌ Error loading complaints: {e}")

def save_complaint_to_csv(complaint: ComplaintCreate):
    """
    Appends a new complaint to the live CSV file safely.
    """
    file_exists = os.path.exists(settings.COMPLAINTS_FILE)
    
    # Check if we need to insert a newline character first
    prepend_newline = False
    if file_exists:
        try:
            with open(settings.COMPLAINTS_FILE, 'rb') as f:
                f.seek(-1, 2) # Move to the last byte
                last_char = f.read(1)
                if last_char != b'\n' and last_char != b'\r':
                    prepend_newline = True
        except OSError:
            # File might be empty
            pass

    with open(settings.COMPLAINTS_FILE, mode='a', newline='', encoding='utf-8') as f:
        if prepend_newline:
            f.write('\n')
            
        writer = csv.writer(f)
        if not file_exists:
            # ✅ Header now includes image_url
            writer.writerow(['ward_id', 'severity', 'description', 'timestamp', 'image_url'])
        
        # ✅ Row now includes image_url
        writer.writerow([
            complaint.ward_id, 
            complaint.severity, 
            complaint.description, 
            complaint.timestamp,
            complaint.image_url
        ])
    
    # Update Memory and Recalculate
    DB_COMPLAINTS.append(complaint)
    recalculate_all_risks()

def update_drainage_in_csv(ward_id: str, new_capacity: int):
    temp_file = NamedTemporaryFile(mode='w', newline='', encoding='utf-8', delete=False)
    updated = False
    try:
        with open(settings.DRAINAGE_FILE, 'r', encoding='utf-8') as csvfile, temp_file:
            reader = csv.DictReader(csvfile)
            fieldnames = reader.fieldnames
            writer = csv.DictWriter(temp_file, fieldnames=fieldnames)
            writer.writeheader()
            
            for row in reader:
                if row['ward_id'] == ward_id:
                    row['drainage_capacity'] = str(new_capacity)
                    updated = True
                writer.writerow(row)
                
        shutil.move(temp_file.name, settings.DRAINAGE_FILE)
    except Exception as e:
        print(f"❌ Error updating drainage CSV: {e}")
        return False
    
    # Update Memory
    for ward in DB_WARDS:
        if ward['properties']['id'] == ward_id:
            ward['properties']['drainageCapacity'] = new_capacity
            break
    
    recalculate_all_risks()
    return updated

def recalculate_all_risks():
    """
    Updates risk scores based on current state (complaints + rain + drainage)
    """
    for ward in DB_WARDS:
        props = ward['properties']
        
        # Count live complaints for this ward
        active_complaints = sum(1 for c in DB_COMPLAINTS if c.ward_id == props['id'])
        props['activeComplaints'] = active_complaints
        
        # Recalculate Risk
        score = calculate_risk(props)
        props['riskScore'] = score
        props['riskLevel'] = classify_risk(score)

def generate_mock_delhi_wards():
    """Fallback if CSVs are missing."""
    wards = []
    base_lat, base_lng = 28.6139, 77.2090
    ward_names = ["Connaught Place", "Karol Bagh", "Shahdara", "Mayur Vihar", "Dwarka", "Rohini", "Janakpuri"]
    
    for i, name in enumerate(ward_names):
        lat = base_lat + (random.uniform(-0.05, 0.05))
        lng = base_lng + (random.uniform(-0.05, 0.05))
        feature = {
            "type": "Feature",
            "properties": {
                "id": f"W0{i+1}",
                "name": name,
                "zone": "Central" if i < 2 else "West",
                "drainageCapacity": 50,
                "rainfall": 20.0,
                "activeComplaints": 0,
                "riskScore": 20,
                "riskLevel": "Low"
            },
            "geometry": {"type": "Point", "coordinates": [lng, lat]}
        }
        wards.append(feature)
    return wards