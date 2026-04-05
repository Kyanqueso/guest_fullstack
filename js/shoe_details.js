// Pinned to exact version to prevent supply-chain attacks via auto-updates
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getCache, setCache } from './cache.js';
import { generateClientOrderPDF} from "./pdf_service.js";

const supabaseUrl = "https://dohhnithtdwtwkfwccag.supabase.co"
const supabaseKey = "sb_publishable_Tn2EFv2bbXbD9E6OxEwiLQ_VECvXrPr"
const supabase = createClient(supabaseUrl, supabaseKey)

// Fetch all shoes (with images) and cache them, shared with catalog page
async function fetchAllShoes() {
    let shoes = getCache();

    if (!shoes) {
        const { data, error } = await supabase
            .from("shoe_catalog")
            .select("*, shoe_images(*)")

        if (error) {
            console.error("Error fetching shoes:", error);
            return null;
        }

        shoes = data;
        setCache(shoes);
    }

    return shoes;
}

document.addEventListener("DOMContentLoaded", async () => {

    // GET ID FROM URL
    const params = new URLSearchParams(window.location.search);
    const shoeId = params.get("id");

    // Get prev and next btn
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    // Fetch all shoes (uses cache if available)
    const allShoes = await fetchAllShoes();

    //Used for PDF generation
    let dataPoints = []

    if (!allShoes) return;

    const shoeIdNum = parseInt(shoeId, 10);
    const shoeIds = allShoes.map(s => s.shoe_catalog_id).sort((a, b) => a - b);
    let currentIndex = shoeIds.findIndex(id => id === shoeIdNum);

    if (currentIndex === -1) currentIndex = 0;

    function goToShoe(index) {
        const newId = shoeIds[index];
        // Update URL without reloading page
        window.history.replaceState(null, '', `?id=${newId}`);
        // Reload the page so existing fetchShoeDetails() runs
        fetchShoeDetails(newId);
        currentIndex = index;
    }

    // Event listeners
    prevBtn.addEventListener("click", () => {
        const newIndex = (currentIndex - 1 + shoeIds.length) % shoeIds.length;
        goToShoe(newIndex);
    });

    nextBtn.addEventListener("click", () => {
        const newIndex = (currentIndex + 1) % shoeIds.length;
        goToShoe(newIndex);
    });

    // Elements
    // Only allow image URLs from trusted domains to prevent malicious content
    const TRUSTED_DOMAINS = ['dohhnithtdwtwkfwccag.supabase.co', 'placehold.co', 'via.placeholder.com'];
    const isTrustedUrl = (url) => {
        try { return TRUSTED_DOMAINS.includes(new URL(url).hostname); }
        catch { return false; }
    };
    const FALLBACK_IMG = "https://via.placeholder.com/400x400?text=No+Image";

    const shoeImage = document.getElementById("shoeImage");
    const thumbnailContainer = document.getElementById("thumbnailContainer");
    const shoeName = document.getElementById("shoeName");
    const shoePrice = document.getElementById("shoePrice");

    function fetchShoeDetails(id = shoeId) {

        if (!id) return;

        // Look up shoe from the already-fetched (and cached) list
        const shoe = allShoes.find(s => s.shoe_catalog_id === Number(id));

        if (!shoe) {
            console.error("Shoe not found:", id);
            return;
        }

        // Populate name and price
        shoeName.textContent = shoe.model_name;
        shoePrice.textContent = `₱${shoe.price}`;

        // Sort images by display_order
        const images = shoe.shoe_images || [];
        images.sort((a, b) => a.display_order - b.display_order);

        if (images.length === 0) {
            shoeImage.src = "https://via.placeholder.com/400x400?text=No+Image";
            thumbnailContainer.innerHTML = '';
            return;
        }

        // Set main image to first (validated against trusted domains)
        shoeImage.src = isTrustedUrl(images[0].image_url) ? images[0].image_url : FALLBACK_IMG;

        // Build thumbnail strip
        thumbnailContainer.innerHTML = '';
        images.forEach((img, index) => {
            const thumb = document.createElement('img');
            thumb.src = isTrustedUrl(img.image_url) ? img.image_url : FALLBACK_IMG;
            thumb.alt = `${shoe.model_name} view ${index + 1}`;
            thumb.classList.add('gallery-thumbnail');
            if (index === 0) thumb.classList.add('active');

            thumb.addEventListener('click', () => {
                shoeImage.src = isTrustedUrl(img.image_url) ? img.image_url : FALLBACK_IMG;
                thumbnailContainer.querySelectorAll('.gallery-thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });

            thumbnailContainer.appendChild(thumb);
        });
    }

    fetchShoeDetails();

    // ---- Lightbox ----
    const lbEl      = document.getElementById('imageLightbox');
    const lbImg     = document.getElementById('lightboxImg');
    const lbClose   = document.getElementById('lightboxClose');
    let lbScale = 1, lbTx = 0, lbTy = 0;
    let lbDragging = false, lbStartX = 0, lbStartY = 0;
    const LB_MIN = 0.5, LB_MAX = 5;

    const lbApply = () => {
        lbImg.style.transform = `translate(calc(-50% + ${lbTx}px), calc(-50% + ${lbTy}px)) scale(${lbScale})`;
    };

    const lbOpen = (src) => {
        lbImg.src = src;
        lbScale = 1; lbTx = 0; lbTy = 0;
        lbApply();
        lbEl.classList.remove('d-none');
        document.body.style.overflow = 'hidden';
    };

    const lbCloseHandler = () => {
        lbEl.classList.add('d-none');
        document.body.style.overflow = '';
    };

    // Zoom toward cursor on wheel
    lbEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const newScale = Math.min(LB_MAX, Math.max(LB_MIN, lbScale * factor));
        const cx = e.clientX - window.innerWidth / 2;
        const cy = e.clientY - window.innerHeight / 2;
        lbTx = cx - (cx - lbTx) * (newScale / lbScale);
        lbTy = cy - (cy - lbTy) * (newScale / lbScale);
        lbScale = newScale;
        lbApply();
    }, { passive: false });

    // Mouse pan
    lbImg.addEventListener('mousedown', (e) => {
        lbDragging = true;
        lbStartX = e.clientX - lbTx;
        lbStartY = e.clientY - lbTy;
        lbImg.classList.add('dragging');
        e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (!lbDragging) return;
        lbTx = e.clientX - lbStartX;
        lbTy = e.clientY - lbStartY;
        lbApply();
    });
    window.addEventListener('mouseup', () => {
        if (!lbDragging) return;
        lbDragging = false;
        lbImg.classList.remove('dragging');
    });

    // Touch: pan + pinch-zoom
    let lbLastDist = 0;
    lbImg.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            lbDragging = true;
            lbStartX = e.touches[0].clientX - lbTx;
            lbStartY = e.touches[0].clientY - lbTy;
        } else if (e.touches.length === 2) {
            lbDragging = false;
            lbLastDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: false });
    lbImg.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && lbDragging) {
            lbTx = e.touches[0].clientX - lbStartX;
            lbTy = e.touches[0].clientY - lbStartY;
            lbApply();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const newScale = Math.min(LB_MAX, Math.max(LB_MIN, lbScale * (dist / lbLastDist)));
            const cx = midX - window.innerWidth / 2;
            const cy = midY - window.innerHeight / 2;
            lbTx = cx - (cx - lbTx) * (newScale / lbScale);
            lbTy = cy - (cy - lbTy) * (newScale / lbScale);
            lbScale = newScale;
            lbLastDist = dist;
            lbApply();
        }
    }, { passive: false });
    lbImg.addEventListener('touchend', (e) => {
        if (e.touches.length < 1) lbDragging = false;
        if (e.touches.length < 2) lbLastDist = 0;
    });

    // Close on backdrop click, button, or Escape
    lbEl.addEventListener('click', (e) => { if (e.target === lbEl) lbCloseHandler(); });
    lbClose.addEventListener('click', lbCloseHandler);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !lbEl.classList.contains('d-none')) lbCloseHandler();
    });

    shoeImage.addEventListener('click', () => lbOpen(shoeImage.src));
    // ---- End Lightbox ----

    // SELECT DOM ELEMENTS
    const submitButton = document.getElementById("submitBtn");

    const materialBtns = document.querySelectorAll(".material-btn");
    const moldBtns = document.querySelectorAll(".mold-btn");
    const heelBtns = document.querySelectorAll(".heel-btn");
    
    // Dropdowns
    const shoeSizeDropdownBtn = document.getElementById("shoeSizeDropdown");
    const heelHeightDropdownBtn = document.getElementById("heelHeightDropdown");

    const colorInput = document.getElementById("colorInput");
    const quantityInput = document.getElementById("quantityInput");

    const buckleRadios = document.querySelectorAll('input[name="buckle"]');
    const flatformRadios = document.querySelectorAll('input[name="flatform"]');
    const slingbackRadios = document.querySelectorAll('input[name="slingback"]');

    const overlay = document.getElementById("selectionOverlay");
    const closeBtn = document.querySelector(".overlay-close");
    const selectionList = document.getElementById("selectionList");
    const photoCheckbox = document.getElementById("photoTakenCheckbox");

    // MATERIAL INFO OVERLAY ELEMENTS
    const materialOverlay = document.getElementById("materialOverlay");
    const overlayText = document.getElementById("overlayText");
    const overlayImage = document.getElementById("overlayImage");
    const overlayClose1 = document.getElementById("overlayClose1");

    // MATERIAL INFO ICON BUTTONS
    const infoButtons = document.querySelectorAll(".no-design");

    // Function to handle Single Selection Button Groups
    const setupButtonGroup = (buttons) => {
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all buttons in this group
                buttons.forEach(b => b.classList.remove('active'));
                // Activate clicked button
                btn.classList.add('active');
                // Check form validity immediately
                checkForm();
            });
        });
    };

    // Initialize Button Groups
    setupButtonGroup(materialBtns);
    setupButtonGroup(moldBtns);
    setupButtonGroup(heelBtns);

    infoButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const text = btn.dataset.text;
            const img = btn.dataset.img;

            overlayText.textContent = text;
            overlayImage.src = img;

            materialOverlay.classList.remove("d-none");
        });
    });

    overlayClose1.addEventListener("click", () => {
        materialOverlay.classList.add("d-none");
    });

    // Function to handle Dropdowns (Update Text on Click)
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                // Find the toggle button associated with this menu
                const toggleBtn = this.closest('.dropdown').querySelector('.dropdown-toggle');
                toggleBtn.textContent = this.textContent;
            });
        });
    });

    // Utility: check if at least one button in group is active
    const isBtnGroupSelected = (btns) => {
        return Array.from(btns).some(btn => btn.classList.contains('active'));
    };

    // Utility: check if radio group has a selection
    const isRadioSelected = (radios) => {
        return Array.from(radios).some(r => r.checked);
    };

    const checkForm = () => {
        const materialSelected = isBtnGroupSelected(materialBtns);
        const moldSelected = isBtnGroupSelected(moldBtns);
        const heelSelected = isBtnGroupSelected(heelBtns);
        const colorFilled = colorInput.value.trim() !== "";
        // Quantity must be a whole number between 1 and 1000 (inclusive)
        const qty = parseInt(quantityInput.value, 10);
        const quantityFilled = !isNaN(qty) && qty >= 1 && qty <= 1000;
        const buckleSelected = isRadioSelected(buckleRadios);
        const flatformSelected = isRadioSelected(flatformRadios);
        const slingbackSelected = isRadioSelected(slingbackRadios);

        // Check all conditions
        if (materialSelected && moldSelected && heelSelected && colorFilled && quantityFilled && buckleSelected && flatformSelected && slingbackSelected) {
            submitButton.disabled = false;
        } else {
            submitButton.disabled = true;
        }
    };

    // Remove char if not letter, number, or space
    colorInput.addEventListener("input", () => {
        colorInput.value = colorInput.value.replace(/[^a-zA-Z0-9\s]/g, '');
        checkForm();
    });
    
    quantityInput.addEventListener("input", () => {
        // Remove non-digit characters
        quantityInput.value = quantityInput.value.replace(/\D/g, '');

        // Clamp value to 1-1000
        if (quantityInput.value !== "") {
            let val = parseInt(quantityInput.value, 10);
            if (val > 1000) val = 1000;
            if (val < 1) val = 1;
            quantityInput.value = val;
        }

        checkForm(); // update submit button
    });
    buckleRadios.forEach(r => r.addEventListener("change", checkForm));
    flatformRadios.forEach(r => r.addEventListener("change", checkForm));
    slingbackRadios.forEach(r => r.addEventListener("change", checkForm));

    // Disable button by default on load
    submitButton.disabled = true;

    submitButton.addEventListener("click", () => {
        // Clear previous list
        selectionList.innerHTML = "";

        // Gather Data helper
        const getText = (btns) => Array.from(btns).find(b => b.classList.contains('active'))?.textContent || "-";
        const getRadio = (radios) => {
            const checked = Array.from(radios).find(r => r.checked);
            return checked ? checked.nextElementSibling.textContent : "-";
        };

        // Create an Array of Objects (Label + Value)
        dataPoints = [
            { label: "Material",    value: getText(materialBtns) },
            { label: "Color Code",  value: colorInput.value },
            { label: "Shoe Mold",   value: getText(moldBtns) },
            { label: "Shoe Heel",   value: getText(heelBtns) },
            { label: "Shoe Size",   value: shoeSizeDropdownBtn.textContent.trim() },
            { label: "Heel Height",   value: heelHeightDropdownBtn.textContent.trim() },
            { label: "Quantity",    value: quantityInput.value },
            { label: "Buckle",      value: getRadio(buckleRadios) },
            { label: "Flatform",    value: getRadio(flatformRadios) },
            { label: "Slingback",   value: getRadio(slingbackRadios) }
        ];

        // Build the Stylish List
        dataPoints.forEach(item => {
            // Create list item container
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center bg-transparent px-0";
            
            // Create Label Span
            const labelSpan = document.createElement("span");
            labelSpan.className = "text-muted small text-uppercase fw-bold"; // Grey, small, caps
            labelSpan.textContent = item.label;

            // Create Value Span
            const valueSpan = document.createElement("span");
            valueSpan.className = "fw-bold text-dark text-end"; // Darker, bold, aligned right
            valueSpan.textContent = item.value;

            // Append to LI, then to List
            li.appendChild(labelSpan);
            li.appendChild(valueSpan);
            selectionList.appendChild(li);
        });

        // Reset checkbox and disable close button each time overlay opens
        photoCheckbox.checked = false;
        closeBtn.disabled = true;

        // Show overlay
        overlay.classList.remove("d-none");
    });

    const downloadPdfBtn = document.getElementById("downloadPdfBtn");
    downloadPdfBtn.addEventListener("click", () => {
        const customerName = document.getElementById("customerName").value.trim()
        const customerContact = document.getElementById("customerContact").value.trim()

        generateClientOrderPDF(shoeImage.src, dataPoints, customerName, customerContact);
    });

    // Enable close button only when checkbox is checked
    photoCheckbox.addEventListener("change", () => {
        closeBtn.disabled = !photoCheckbox.checked;
    });

    // Close overlay
    closeBtn.addEventListener("click", () => {
        overlay.classList.add("d-none");
    });
});