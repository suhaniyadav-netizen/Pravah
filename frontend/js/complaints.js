// =====================
// CONFIGURATION
// =====================
const IMGBB_API_KEY = "3c160e8872e502914dbb4568c01e3d19"; 

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('complaintForm');
    const fileInput = document.getElementById('complaintImage');
    const fileNameLabel = document.getElementById('fileName');

    // 1. Populate Dropdown Logic (Preserved)
    window.populateFormDropdown = function(wardsData) {
        const select = document.getElementById('wardSelect');
        if (!select) return;
        select.innerHTML = '<option value="">Select your ward</option>';
        
        // Sort alphabetical
        const features = wardsData.features.sort((a,b) => a.properties.name.localeCompare(b.properties.name));
        
        features.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.properties.id;
            opt.innerText = w.properties.name;
            select.appendChild(opt);
        });
    };

    // 2. File Input UI Logic (New)
    if(fileInput && fileNameLabel) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                fileNameLabel.textContent = this.files[0].name;
                fileNameLabel.style.color = "var(--text-main)";
            } else {
                fileNameLabel.textContent = "Choose an image...";
                fileNameLabel.style.color = "var(--text-muted)";
            }
        });
    }

    // 3. Form Submission Logic
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const wardSelect = document.getElementById('wardSelect');
            const description = document.getElementById('description');
            const severityInput = document.querySelector('input[name="severity"]:checked');

            // Validation
            if (!wardSelect.value || !severityInput) {
                Utils.showToast('Validation Error', 'Please select a ward and severity.', 'error');
                return;
            }

            const btn = form.querySelector('.btn-submit');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ri-loader-4-line spin"></i> Processing...';
            btn.disabled = true;

            try {
                let imageUrl = "";

                // A. Upload Image to ImgBB (if selected)
                const imageFile = fileInput?.files[0];
                if (imageFile) {
                    btn.innerHTML = '<i class="ri-upload-cloud-line"></i> Uploading Image...';
                    
                    const formData = new FormData();
                    formData.append("image", imageFile);

                    const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                        method: "POST",
                        body: formData
                    });

                    const result = await uploadRes.json();
                    
                    if (result.success) {
                        imageUrl = result.data.url;
                    } else {
                        throw new Error("Image upload failed");
                    }
                }

                // B. Prepare Payload
                btn.innerHTML = '<i class="ri-send-plane-fill"></i> Sending...';
                
                const payload = {
                    ward_id: wardSelect.value,
                    severity: severityInput.value,
                    description: description ? description.value : "",
                    image_url: imageUrl, // Add URL to payload
                    timestamp: new Date().toISOString()
                };

                // Ensure API_BASE is defined
                const baseUrl = (typeof API_BASE !== 'undefined') ? API_BASE : "https://pravah-br0g.onrender.com";

                // C. Send to Backend
                const res = await fetch(`${baseUrl}/api/complaints`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    Utils.showToast('Submitted', 'Complaint registered successfully', 'success');
                    form.reset();
                    if(fileNameLabel) {
                        fileNameLabel.textContent = "Choose an image...";
                        fileNameLabel.style.color = "var(--text-muted)";
                    }
                    
                    // Refresh dashboard stats if function exists
                    if(typeof fetchDashboardData === 'function') fetchDashboardData();
                } else {
                    throw new Error('Server error');
                }

            } catch (err) {
                console.error(err);
                Utils.showToast('Error', err.message || 'Failed to connect to server', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});