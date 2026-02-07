import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = "https://dohhnithtdwtwkfwccag.supabase.co"
const supabaseKey = "sb_publishable_Tn2EFv2bbXbD9E6OxEwiLQ_VECvXrPr"
const supabase = createClient(supabaseUrl, supabaseKey)

document.addEventListener("DOMContentLoaded", async () => {

    // GET ID FROM URL
    const params = new URLSearchParams(window.location.search);
    const shoeId = params.get("id");

    // Get prev and next btn
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    // Fetch all shoe IDs from Supabase
    const { data: shoes, error } = await supabase
        .from("shoe_catalog")
        .select("shoe_catalog_id")
        .order("shoe_catalog_id", { ascending: true }); // optional sort

    if (error) {
        console.error("Error fetching shoe IDs:", error);
        return;
    }

    const shoeIds = shoes.map(s => s.shoe_catalog_id); // store IDs in array
    let currentIndex = shoeIds.findIndex(id => id == shoeId);

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
    const shoeImage = document.getElementById("shoeImage");
    const shoeName = document.getElementById("shoeName");
    const shoePrice = document.getElementById("shoePrice");

    async function fetchShoeDetails(id = shoeId) {

        if (!id) return;

        const { data: shoe, error } = await supabase
            .from("shoe_catalog")
            .select("*")
            .eq("shoe_catalog_id", id)
            .single();

        if (error) {
            console.error("Error fetching shoe:", error);
            return;
        }
        
        // Populate UI
        shoeImage.src = shoe.image_url || "https://via.placeholder.com/400x300?text=No+Image";
        shoeName.textContent = shoe.model_name;
        shoePrice.textContent = `₱${shoe.price}`;
    }

    fetchShoeDetails();
    
    // SELECT DOM ELEMENTS
    const submitButton = document.querySelector(".btn-dark");
    const materialBtns = document.querySelectorAll(".material-btn");
    const moldBtns = document.querySelectorAll(".mold-btn");
    const heelBtns = document.querySelectorAll(".heel-btn");
    
    // Dropdowns
    const shoeSizeDropdownBtn = document.querySelector("#dropdownMenuButton");
    
    // Note: the heel dropdown is in the next column, but doesn't have a unique ID. 
    const heelSizeDropdownBtn = shoeSizeDropdownBtn.closest('.col-6').nextElementSibling.querySelector('.dropdown-toggle');

    const colorInput = document.querySelector("#formControlInput"); // First input (Color)
    // Note: querySelectorAll returns a NodeList. We need to be specific.
    const allInputs = document.querySelectorAll("#formControlInput");
    const quantityInput = allInputs[1] ? allInputs[1] : document.querySelector('input[type="number"]'); // Fallback to type check if IDs are duplicated

    const buckleRadios = document.querySelectorAll('input[name="buckle"]');
    const platformRadios = document.querySelectorAll('input[name="platform"]');
    const slingbackRadios = document.querySelectorAll('input[name="slingback"]');

    const overlay = document.getElementById("selectionOverlay");
    const closeBtn = document.querySelector(".overlay-close");
    const selectionList = document.getElementById("selectionList");

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
        const quantityFilled = quantityInput.value.trim() !== "";
        const buckleSelected = isRadioSelected(buckleRadios);
        const platformSelected = isRadioSelected(platformRadios);
        const slingbackSelected = isRadioSelected(slingbackRadios);

        // Check all conditions
        if (materialSelected && moldSelected && heelSelected && colorFilled && quantityFilled && buckleSelected && platformSelected && slingbackSelected) {
            submitButton.disabled = false;
        } else {
            submitButton.disabled = true;
        }
    };

    // Add event listeners for Inputs and Radios
    colorInput.addEventListener("input", checkForm);
    quantityInput.addEventListener("input", checkForm);
    buckleRadios.forEach(r => r.addEventListener("change", checkForm));
    platformRadios.forEach(r => r.addEventListener("change", checkForm));
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
        const dataPoints = [
            { label: "Material",    value: getText(materialBtns) },
            { label: "Color Code",  value: colorInput.value },
            { label: "Shoe Mold",   value: getText(moldBtns) },
            { label: "Shoe Heel",   value: getText(heelBtns) },
            { label: "Shoe Size",   value: shoeSizeDropdownBtn.textContent.trim() },
            { label: "Heel Size",   value: heelSizeDropdownBtn.textContent.trim() },
            { label: "Quantity",    value: quantityInput.value },
            { label: "Buckle",      value: getRadio(buckleRadios) },
            { label: "Platform",    value: getRadio(platformRadios) },
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

        // Show overlay
        overlay.classList.remove("d-none");
    });

    // Close overlay
    closeBtn.addEventListener("click", () => {
        overlay.classList.add("d-none");
    });
});