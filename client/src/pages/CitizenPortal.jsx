import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Waves, AlertTriangle, Send, MapPin, CheckCircle2, Clock, Shield,
  Crosshair, PhoneCall, Navigation, Camera, X, UploadCloud
} from 'lucide-react';
import { submitComplaint, listComplaints, getWardsGeoJSON } from '../services/api';
import { subscribeToTelemetry } from '../services/socket';

/** Distance helper for GPS nearest-ward resolution */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CitizenPortal() {
  const [wards, setWards] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locatingMsg, setLocatingMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [formData, setFormData] = useState({
    wardId: 'W056',
    address: '',
    description: '',
    severity: 'MEDIUM',
    waterDepthCm: 30,
    latitude: 28.636,
    longitude: 77.225,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(null);
  const fileInputRef = useRef(null);

  // Load initial wards and complaints
  useEffect(() => {
    getWardsGeoJSON()
      .then((data) => {
        const sorted = (data.features || []).map((f) => f.properties).sort((a, b) =>
          (a.ward_name || a.name || '').localeCompare(b.ward_name || b.name || '')
        );
        setWards(sorted);
      })
      .catch((err) => console.error('[CitizenPortal] Failed to load wards:', err));

    listComplaints({ limit: 6 })
      .then((data) => {
        const list = data.complaints || (Array.isArray(data) ? data : []);
        setRecentComplaints(list);
      })
      .catch((err) => console.error('[CitizenPortal] Failed to load complaints:', err));

    const unsubscribe = subscribeToTelemetry('complaint:new', (newComplaint) => {
      setRecentComplaints((prev) => [newComplaint, ...prev.slice(0, 5)]);
    });

    return () => unsubscribe();
  }, []);

  // Handle Ward selection
  const handleWardChange = (e) => {
    const code = e.target.value;
    const selected = wards.find((w) => (w.ward_code || w.id) === code);
    if (selected && selected.centroid) {
      setFormData((prev) => ({
        ...prev,
        wardId: code,
        latitude: selected.centroid.latitude,
        longitude: selected.centroid.longitude,
      }));
    } else {
      setFormData((prev) => ({ ...prev, wardId: code }));
    }
  };

  // Browser Geolocation auto-detection
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocatingMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocatingMsg('Acquiring high-accuracy GPS coordinates…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        // Find nearest ward
        let nearestWard = null;
        let minDistance = Infinity;

        wards.forEach((w) => {
          if (w.centroid && w.centroid.latitude && w.centroid.longitude) {
            const dist = getDistanceKm(latitude, longitude, w.centroid.latitude, w.centroid.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              nearestWard = w;
            }
          }
        });

        const assignedCode = nearestWard?.ward_code || nearestWard?.id || formData.wardId;
        const wardLabel = nearestWard?.ward_name || nearestWard?.name || assignedCode;

        setFormData((prev) => ({
          ...prev,
          wardId: assignedCode,
          latitude,
          longitude,
        }));

        setLocatingMsg(`GPS Acquired: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (Nearest: ${wardLabel})`);
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocatingMsg('Unable to retrieve GPS. You can select your municipal ward from the list.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [wards, formData.wardId]);

  // Image selection and removal handlers
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    setImageError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image exceeds 5MB limit. Please select a smaller file.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const payload = {
        longitude: formData.longitude,
        latitude: formData.latitude,
        address: formData.address || undefined,
        description: imageFile?.name
          ? `${formData.description} [Photo: ${imageFile.name}]`
          : formData.description,
        severity: formData.severity,
        waterDepthCm: parseFloat(formData.waterDepthCm),
        imageUrl: imagePreview || undefined,
      };

      const res = await submitComplaint(payload);

      const assignedWardCode = res.complaint?.assignedWard?.wardCode || formData.wardId;
      setSuccessMsg(`Waterlogging report successfully lodged for Ward ${assignedWardCode}. Municipal dewatering crews alerted.`);
      setFormData((prev) => ({
        ...prev,
        address: '',
        description: '',
        severity: 'MEDIUM',
        waterDepthCm: 30,
      }));
      handleRemoveImage();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit report. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Depth preset quick-picks
  const depthPresets = [
    { label: 'Ankle', depth: 15, sub: 'Passable' },
    { label: 'Knee', depth: 45, sub: 'Caution' },
    { label: 'Waist', depth: 80, sub: 'Hazardous' },
    { label: 'Submerged', depth: 120, sub: 'Impassable' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter space-y-8 font-inter">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-1.5 text-center sm:text-left border-b border-[var(--border)] pb-5">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[var(--brand)] uppercase tracking-wider mb-1">
          <Shield className="w-4 h-4" />
          <span>MCD Citizen Incident Desk</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] tracking-tight">
          Report Waterlogging in Your Ward
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
          Submit geotagged reports of flooded roadways, choked culverts, or stranded vehicles. Verified reports update municipal flood risk scores and route emergency mobile pump squads.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Form Container (7 Cols) ────────────────────────────────────────── */}
        <div className="lg:col-span-7 surface-card p-6 sm:p-7 border border-[var(--border)] space-y-6">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-[var(--border)]">
            <Waves className="w-5 h-5 text-[var(--brand)]" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Waterlogging Incident Form
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Direct submission to MCD Control Room
              </p>
            </div>
          </div>

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field 1: Ward & GPS Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Municipal Ward
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="text-xs font-semibold text-[var(--brand)] hover:underline inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span>{locating ? 'Locating…' : 'Use Current GPS'}</span>
                </button>
              </div>

              <select
                value={formData.wardId}
                onChange={handleWardChange}
                className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] cursor-pointer"
              >
                {wards.map((w) => {
                  const code = w.ward_code || w.id;
                  const name = w.ward_name || w.name;
                  return (
                    <option key={code} value={code}>
                      {name} ({code}) {w.zone ? `· ${w.zone}` : ''}
                    </option>
                  );
                })}
              </select>

              {locatingMsg && (
                <div className="text-[11px] text-[var(--brand)] font-mono flex items-center space-x-1.5 pt-0.5">
                  <Navigation className="w-3 h-3" />
                  <span>{locatingMsg}</span>
                </div>
              )}
            </div>

            {/* Field 2: Specific Location / Landmark */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)] block">
                Specific Landmark or Intersection
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Minto Bridge underpass, outer ring road junction near metro gate"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--surface-soft)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                />
              </div>
            </div>

            {/* Field 3: Severity Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)] block">
                Severity Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { lvl: 'LOW', label: 'Low', desc: 'Slow runoff' },
                  { lvl: 'MEDIUM', label: 'Medium', desc: 'Caution' },
                  { lvl: 'HIGH', label: 'High', desc: 'Vehicles stalled' },
                  { lvl: 'CRITICAL', label: 'Critical', desc: 'Impassable' },
                ].map(({ lvl, label, desc }) => {
                  const isSelected = formData.severity === lvl;
                  const colorClasses =
                    lvl === 'CRITICAL'
                      ? isSelected ? 'bg-rose-500 text-white border-rose-500' : 'hover:border-rose-500/50 text-[var(--text-secondary)]'
                      : lvl === 'HIGH'
                      ? isSelected ? 'bg-orange-500 text-white border-orange-500' : 'hover:border-orange-500/50 text-[var(--text-secondary)]'
                      : lvl === 'MEDIUM'
                      ? isSelected ? 'bg-amber-500 text-white border-amber-500' : 'hover:border-amber-500/50 text-[var(--text-secondary)]'
                      : isSelected ? 'bg-emerald-500 text-white border-emerald-500' : 'hover:border-emerald-500/50 text-[var(--text-secondary)]';

                  return (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setFormData({ ...formData, severity: lvl })}
                      className={`p-2 text-center border transition-all cursor-pointer bg-[var(--surface-soft)] ${colorClasses}`}
                    >
                      <div className="text-xs font-bold">{label}</div>
                      <div className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                        {desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 4: Water Depth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">
                  Estimated Standing Water Depth
                </span>
                <span className="font-bold font-mono text-[var(--brand)] text-sm">
                  {formData.waterDepthCm} cm
                </span>
              </div>

              {/* Depth Preset Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {depthPresets.map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => setFormData({ ...formData, waterDepthCm: p.depth })}
                    className={`py-1.5 px-2 text-xs border transition-colors cursor-pointer text-center ${
                      formData.waterDepthCm === p.depth
                        ? 'border-[var(--brand)] bg-[var(--brand)]/15 text-[var(--brand)] font-bold'
                        : 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div>{p.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">{p.depth} cm</div>
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={formData.waterDepthCm}
                onChange={(e) => setFormData({ ...formData, waterDepthCm: parseInt(e.target.value, 10) })}
                className="w-full accent-[var(--brand)] cursor-pointer mt-1"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                <span>5 cm (Puddles)</span>
                <span>60 cm (Axle level)</span>
                <span>180 cm (Fully Submerged)</span>
              </div>
            </div>

            {/* Field 5: Problem Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)] block">
                Description of Waterlogging &amp; Conditions
              </label>
              <textarea
                rows="3"
                required
                minLength={5}
                placeholder="Describe standing water depth, blocked stormwater drains, or stuck vehicles…"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--surface-soft)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] leading-relaxed"
              />
            </div>

            {/* Field 6: Photo Evidence / Image Proof */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center space-x-1.5">
                  <Camera className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span>Photo Evidence / Image Proof</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-normal">(Optional)</span>
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-[11px] text-rose-400 hover:underline inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="incident-photo-upload"
              />

              {!imagePreview ? (
                <label
                  htmlFor="incident-photo-upload"
                  className="border-2 border-dashed border-[var(--border)] hover:border-[var(--brand)] bg-[var(--surface-soft)] p-4 text-center cursor-pointer transition-colors block group"
                >
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <div className="p-2 rounded-full bg-[var(--surface)] text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-medium text-[var(--text-primary)]">
                      Upload waterlogging photo or proof
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Supports JPG, PNG, WebP up to 5MB. Visual evidence speeds municipal crew dispatch.
                    </p>
                  </div>
                </label>
              ) : (
                <div className="border border-[var(--border)] bg-[var(--surface-soft)] p-2.5 flex items-center space-x-3">
                  <div className="w-16 h-16 shrink-0 bg-black/40 rounded overflow-hidden border border-[var(--border)]">
                    <img
                      src={imagePreview}
                      alt="Incident Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-medium text-[var(--text-primary)] truncate">
                      {imageFile?.name || 'Waterlogging_Proof.jpg'}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                      {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : 'Image attached'} · Photo verified
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium flex items-center space-x-1 mt-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Ready to transmit with incident report</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {imageError && (
                <p className="text-[11px] text-rose-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{imageError}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[var(--brand)] hover:opacity-90 text-white font-semibold text-xs transition-opacity cursor-pointer flex items-center justify-center space-x-2 shadow-sm disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Submitting to MCD Control Room…' : 'Submit Waterlogging Report'}</span>
            </button>
          </form>
        </div>

        {/* ── Right Column: Live Feed & Emergency Contacts (5 Cols) ─────────── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Recent Reports */}
          <div className="surface-card p-5 sm:p-6 border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[var(--brand)]" />
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight">
                  Recent Citizen Reports
                </h3>
              </div>
              <span className="flex items-center space-x-1 text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Stream</span>
              </span>
            </div>

            <div className="space-y-3">
              {recentComplaints.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                  No recent waterlogging reports lodged.
                </div>
              ) : (
                recentComplaints.slice(0, 4).map((item, idx) => {
                  const severityClass =
                    item.severity === 'CRITICAL'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : item.severity === 'HIGH'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                      : item.severity === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-[var(--surface-soft)] border border-[var(--border)] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--text-primary)] flex items-center space-x-1 font-mono">
                          <MapPin className="w-3 h-3 text-[var(--brand)]" />
                          <span>Ward {item.wardId || item.assignedWard?.wardCode || 'W001'}</span>
                        </span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase ${severityClass}`}>
                          {item.severity || 'MEDIUM'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {item.description || item.address || 'Waterlogging report.'}
                      </p>
                      {item.imageUrl && (
                        <div className="pt-1 flex items-center space-x-2">
                          <img
                            src={item.imageUrl}
                            alt="Incident proof"
                            className="w-10 h-10 object-cover rounded border border-[var(--border)] shrink-0"
                          />
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                            <Camera className="w-3 h-3" />
                            <span>Photo proof verified</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                        <span>Depth: <b className="text-[var(--text-primary)] font-mono">{item.waterDepthCm || 0} cm</b></span>
                        <span className="font-mono">
                          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Emergency Helplines Card */}
          <div className="surface-card p-5 border border-[var(--border)] space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Emergency Municipal Contacts
              </h3>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              For life-threatening emergencies, submerged vehicles with passengers trapped, or immediate electrocution hazards:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">MCD Central Flood Control Room</div>
                  <div className="text-[10px] text-[var(--text-muted)]">24x7 Municipal Inundation Line</div>
                </div>
                <span className="font-mono font-bold text-sm text-[var(--brand)]">1916</span>
              </div>

              <div className="p-2.5 bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">Delhi Disaster Management (DDMA)</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Emergency Response Dispatch</div>
                </div>
                <span className="font-mono font-bold text-sm text-emerald-400">1077</span>
              </div>

              <div className="p-2.5 bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">Unified Emergency Services</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Police, Fire &amp; Ambulance</div>
                </div>
                <span className="font-mono font-bold text-sm text-rose-400">112</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
