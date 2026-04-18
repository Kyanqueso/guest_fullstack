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

    document.addEventListener("DOMContentLoaded", () => {
        initPage();
    });

    async function initPage() {
        // GET ID FROM URL
        const params = new URLSearchParams(window.location.search);
        const shoeId = params.get("id");

        // Get prev and next btn
        const prevBtn = document.getElementById("prevBtn");
        const nextBtn = document.getElementById("nextBtn");

        // Fetch all shoes (uses cache if available)
        const allShoes = await fetchAllShoes();
        
        // Show main content and hide loader after data is ready
        const loader = document.getElementById("pageLoader");
        const mainContent = document.getElementById("mainContent");

        //Used for PDF generation
        let dataPoints = []

        if (!allShoes) {
            loader.innerHTML = "<p>Failed to load data.</p>";
            return;
        }

        // Reject if id is missing or contains any non-digit character
        if (!shoeId || !/^\d+$/.test(shoeId)) {
            window.location.replace('/error404.html');
            return;
        }

        const shoeIdNum = parseInt(shoeId, 10);
        const shoeIds = allShoes.map(s => s.shoe_catalog_id).sort((a, b) => a - b);
        let currentIndex = shoeIds.findIndex(id => id === shoeIdNum);

        if (currentIndex === -1) {
            window.location.replace('/error404.html');
            return;
        }

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
        // Reveal UI only after everything is ready
        loader.classList.add("d-none");
        mainContent.classList.remove("d-none");

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

        const MATERIAL_COLORS = {
            Helga: [
                { code: 'H01', hex: '#1C1C1C', name: 'Black' },
                { code: 'H02', hex: '#6B2B2B', name: 'Maroon' },
                { code: 'H03', hex: '#B5522A', name: 'Rust' },
                { code: 'H04', hex: '#8B6040', name: 'Brown' },
                { code: 'H05', hex: '#C4A878', name: 'Tan' },
                { code: 'H06', hex: '#F0E8D8', name: 'Cream' },
                { code: 'H07', hex: '#E8C4BC', name: 'Blush' },
                { code: 'H08', hex: '#C89898', name: 'Mauve' },
                { code: 'H09', hex: '#A090B0', name: 'Lavender' },
                { code: 'H10', hex: '#A0A0A0', name: 'Gray' },
                { code: 'H11', hex: '#A07860', name: 'Taupe' },
                { code: 'H12', hex: '#C4904C', name: 'Caramel' },
                { code: 'H13', hex: '#D4A828', name: 'Mustard' },
            ],
            Snake: [
                { code: 'S01', hex: '#1A1A1A', name: 'Black' },
                { code: 'S02', hex: '#C4A060', name: 'Rose Gold' },
                { code: 'S03', hex: '#7A1820', name: 'Burgundy' },
                { code: 'S04', hex: '#2C1848', name: 'Deep Purple' },
                { code: 'S05', hex: '#1C2878', name: 'Cobalt Blue' },
                { code: 'S06', hex: '#D0BC78', name: 'Champagne' },
                { code: 'S07', hex: '#C0C8D0', name: 'Silver' },
                { code: 'S08', hex: '#B0C0D8', name: 'Periwinkle' },
                { code: 'S09', hex: '#D0B898', name: 'Beige' },
                { code: 'S10', hex: '#D4A8A8', name: 'Blush Pink' },
            ],
            Patent: [
                { code: 'P01', hex: '#E8C8A8', name: 'Nude' },
                { code: 'P02', hex: '#C0C0C8', name: 'Silver' },
                { code: 'P03', hex: '#787878', name: 'Gunmetal' },
                { code: 'P04', hex: '#8B4828', name: 'Cognac' },
                { code: 'P05', hex: '#1C2858', name: 'Navy' },
                { code: 'P06', hex: '#F0B4BC', name: 'Light Pink' },
                { code: 'P07', hex: '#C8A0A8', name: 'Rose Gold' },
                { code: 'P08', hex: '#CC1818', name: 'Red' },
                { code: 'P09', hex: '#E03030', name: 'Bright Red' },
                { code: 'P10', hex: '#D4A818', name: 'Mustard' },
                { code: 'P11', hex: '#40B8B0', name: 'Teal' },
                { code: 'P12', hex: '#A8D0E8', name: 'Sky Blue' },
                { code: 'P13', hex: '#7858A0', name: 'Purple' },
                { code: 'P14', hex: '#5A3020', name: 'Dark Brown' },
                { code: 'P15', hex: '#D87858', name: 'Coral' },
                { code: 'P16', hex: '#F5F0E8', name: 'Ivory' },
                { code: 'P17', hex: '#D87028', name: 'Orange' },
            ],
            Tanya: [
                { code: 'T01', hex: '#1C1C1C', name: 'Black' },
                { code: 'T02', hex: '#4A2C1C', name: 'Dark Brown' },
                { code: 'T03', hex: '#C8A080', name: 'Rose Gold' },
                { code: 'T04', hex: '#F5F5F0', name: 'White' },
                { code: 'T05', hex: '#C0B8B0', name: 'Taupe' },
                { code: 'T06', hex: '#C05030', name: 'Rust' },
                { code: 'T07', hex: '#D89020', name: 'Mustard' },
                { code: 'T08', hex: '#4A6040', name: 'Olive' },
                { code: 'T09', hex: '#C82020', name: 'Red' },
                { code: 'T10', hex: '#781830', name: 'Wine' },
            ],
        };

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

        const overlaySwatches = document.getElementById("overlaySwatches");

        infoButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const text = btn.dataset.text;
                const img = btn.dataset.img;
                const material = btn.dataset.material;

                overlayText.textContent = text;
                overlayImage.src = img;

                // Render color swatches
                overlaySwatches.innerHTML = '';
                const colors = MATERIAL_COLORS[material] || [];
                colors.forEach(color => {
                    const item = document.createElement('button');
                    item.className = 'color-swatch-item';
                    item.title = `${color.code} — ${color.name} (${color.hex})`;

                    const circle = document.createElement('div');
                    circle.className = 'color-swatch-circle';
                    circle.style.backgroundColor = color.hex;

                    const code = document.createElement('span');
                    code.className = 'color-swatch-code';
                    code.textContent = color.code;

                    const name = document.createElement('span');
                    name.className = 'color-swatch-name';
                    name.textContent = color.name;

                    item.appendChild(circle);
                    item.appendChild(code);
                    item.appendChild(name);

                    // Click swatch → fill color input and close overlay
                    item.addEventListener('click', () => {
                        colorInput.value = color.code;
                        colorInput.dispatchEvent(new Event('input'));
                        materialOverlay.classList.add('d-none');
                    });

                    overlaySwatches.appendChild(item);
                });

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

        // Close overlay and go to the Viber button on the contact page
        closeBtn.addEventListener("click", () => {
            overlay.classList.add("d-none");
            window.location.href = 'contact.html#viber-cta';
        });
    };