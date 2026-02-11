import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCache, setCache } from './cache.js'

// Initialize Supabase
// CAUTION: In a real browser app, use your ANON public key here.
// Do not put your SERVICE_ROLE (admin) key in frontend code.
const supabaseUrl = "https://dohhnithtdwtwkfwccag.supabase.co"
const supabaseKey = "sb_publishable_Tn2EFv2bbXbD9E6OxEwiLQ_VECvXrPr";
const supabase = createClient(supabaseUrl, supabaseKey)

// Function to fetch and render
async function fetchAndRenderShoes(sortOrder = 'asc') {
    const container = document.getElementById('shoe-container');

    // Try cache first
    let shoes = getCache();

    if (!shoes) {
        const { data, error } = await supabase
            .from('shoe_catalog')
            .select('*, shoe_images(*)')

        if (error) {
            console.error('Error fetching shoes:', error);
            container.innerHTML = `<p class="text-danger text-center">Error loading catalog. Please try again later.</p>`;
            return;
        }

        shoes = data;
        setCache(shoes);
    }

    // Sort client-side
    shoes = [...shoes].sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);

    // Clear the "Loading..." text
    container.innerHTML = '';

    // Show message if no shoes exist
    if (!shoes || shoes.length === 0) {
        container.innerHTML = `
            <div class="text-center w-100">
                <h5 class="text-muted">No shoes available for display yet.</h5>
            </div>
        `;
        return;
    }

    // Generate HTML for each shoe
    shoes.forEach(shoe => {
        // Pick the primary image (lowest display_order)
        const images = shoe.shoe_images || [];
        images.sort((a, b) => a.display_order - b.display_order);
        const primaryImage = images.length > 0 ? images[0].image_url : 'https://via.placeholder.com/400x300?text=No+Image';

        const cardHtml = `
            <div class="col">
                <a href="shoe_details.html?id=${shoe.shoe_catalog_id}" class="text-decoration-none text-dark">
                    <div class="h-100 border-0">
                        <div class="image-wrapper box-drop-shadow rounded">
                            <img src="${primaryImage}"
                                alt="${shoe.model_name}"
                                class="shoe-img">
                        </div>
                        <div class="d-flex flex-column p-3 text-center">
                            <h3 class="fw-bold   mb-1">${shoe.model_name}</h3>
                            <p class="text-muted small mb-0">₱${shoe.price}</p>
                        </div>
                    </div>
                </a>
            </div>
        `;
        container.innerHTML += cardHtml;
    });
}

// Execute on load
fetchAndRenderShoes('asc');

let currentSort = 'most-expensive'; // default

function setActiveDropdownItem(sortType) {
    document.querySelectorAll('.dropdown-item').forEach(item => {
        if (item.getAttribute('data-sort') === sortType) {
            item.classList.add('active'); // highlight selected
        } else {
            item.classList.remove('active'); // remove highlight from others
        }
    });
}

// Event listeners for sorting
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const sortType = e.target.getAttribute('data-sort');

        if (sortType === 'most-expensive') {
            fetchAndRenderShoes('asc');
        } else if (sortType === 'least-expensive') {
            fetchAndRenderShoes('desc');
        }

        // Set active highlight
        currentSort = sortType;
        setActiveDropdownItem(sortType);
    });
});

// Initialize default active item
setActiveDropdownItem(currentSort);

