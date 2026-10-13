/**
 * Shalom Kerala Stores - Main Application Orchestrator
 * Gorakhpur, Uttar Pradesh | UPI: 7379325499@ybl
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    currentCategory: 'all', // 'all', 'kerala-food', 'church-articles', 'stationery'
    currentSubCategory: 'all',
    searchQuery: '',
    sortBy: 'featured',
    onlyInStock: false,
    page: 1,
    pageSize: 36,
    currentView: 'catalog', // 'catalog', 'billing', 'upi', 'invoice'
    selectedDelivery: shalomCart.selectedDelivery || 'upto5km'
  };

  // DOM Elements Cache
  const elements = {
    productsGrid: document.getElementById('productsGrid'),
    categoryTabs: document.getElementById('categoryTabs'),
    subCategoryPills: document.getElementById('subCategoryPills'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    stockFilterToggle: document.getElementById('stockFilterToggle'),
    productCount: document.getElementById('productCount'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    
    // Header & Navigation
    cartTriggerBtn: document.getElementById('cartTriggerBtn'),
    cartBadgeCount: document.getElementById('cartBadgeCount'),
    cartNavTotal: document.getElementById('cartNavTotal'),
    navOrdersBtn: document.getElementById('navOrdersBtn'),
    brandLogoBtn: document.getElementById('brandLogoBtn'),
    mainCategoryMenuBar: document.getElementById('mainCategoryMenuBar'),
    mainCategoryItemsTrack: document.getElementById('mainCategoryItemsTrack'),
    allCatsMenuTrigger: document.getElementById('allCatsMenuTrigger'),
    allCatsBtn: document.getElementById('allCatsBtn'),
    allCatsDropdown: document.getElementById('allCatsDropdown'),
    
    // Cart Drawer

    cartDrawer: document.getElementById('cartDrawer'),
    cartDrawerBackdrop: document.getElementById('cartDrawerBackdrop'),
    closeCartDrawerBtn: document.getElementById('closeCartDrawerBtn'),
    cartDrawerItems: document.getElementById('cartDrawerItems'),
    cartDrawerSubtotal: document.getElementById('cartDrawerSubtotal'),
    cartDrawerGrandTotal: document.getElementById('cartDrawerGrandTotal'),
    cartDrawerDiscount: document.getElementById('cartDrawerDiscount'),
    cartDrawerDiscountRow: document.getElementById('cartDrawerDiscountRow'),
    cartDrawerGst: document.getElementById('cartDrawerGst'),
    cartDrawerDelivery: document.getElementById('cartDrawerDelivery'),
    deliverySelectDrawer: document.getElementById('deliverySelectDrawer'),
    couponInput: document.getElementById('couponInput'),
    applyCouponBtn: document.getElementById('applyCouponBtn'),
    couponFeedback: document.getElementById('couponFeedback'),
    activeCouponTag: document.getElementById('activeCouponTag'),
    proceedToCheckoutBtn: document.getElementById('proceedToCheckoutBtn'),
    
    // Views
    catalogView: document.getElementById('catalogView'),
    billingView: document.getElementById('billingView'),
    upiPaymentView: document.getElementById('upiPaymentView'),
    invoiceView: document.getElementById('invoiceView'),

    // Billing Form
    billingForm: document.getElementById('billingForm'),
    areaSelect: document.getElementById('areaSelect'),
    deliveryOptionsContainer: document.getElementById('deliveryOptionsContainer'),
    addressGroup: document.getElementById('addressGroup'),
    billingSubtotal: document.getElementById('billingSubtotal'),
    billingDiscount: document.getElementById('billingDiscount'),
    billingDiscountRow: document.getElementById('billingDiscountRow'),
    billingDelivery: document.getElementById('billingDelivery'),
    billingGst: document.getElementById('billingGst'),
    billingGrandTotal: document.getElementById('billingGrandTotal'),
    backToCatalogBtn: document.getElementById('backToCatalogBtn'),
    payUpiBtn: document.getElementById('payUpiBtn'),
    
    // UPI Elements
    upiQrContainer: document.getElementById('upiQrContainer'),
    upiAmountDisplay: document.getElementById('upiAmountDisplay'),
    upiTimerDisplay: document.getElementById('upiTimerDisplay'),
    upiOrderIdDisplay: document.getElementById('upiOrderIdDisplay'),
    upiVpaText: document.getElementById('upiVpaText'),
    copyUpiVpaBtn: document.getElementById('copyUpiVpaBtn'),
    simulatePaymentBtn: document.getElementById('simulatePaymentBtn'),
    manualVerifyBtn: document.getElementById('manualVerifyBtn'),
    utrInput: document.getElementById('utrInput'),
    backToBillingBtn: document.getElementById('backToBillingBtn'),

    // Invoice View
    invoiceContainer: document.getElementById('invoiceContainer'),
    printInvoiceBtn: document.getElementById('printInvoiceBtn'),
    downloadInvoiceBtn: document.getElementById('downloadInvoiceBtn'),
    backToShopBtn: document.getElementById('backToShopBtn'),

    // Quick View Modal
    quickViewModal: document.getElementById('quickViewModal'),
    quickViewBackdrop: document.getElementById('quickViewBackdrop'),
    closeQuickViewBtn: document.getElementById('closeQuickViewBtn'),
    quickViewBody: document.getElementById('quickViewBody'),

    // Orders Modal
    ordersModal: document.getElementById('ordersModal'),
    ordersModalBackdrop: document.getElementById('ordersModalBackdrop'),
    closeOrdersModalBtn: document.getElementById('closeOrdersModalBtn'),
    ordersListContainer: document.getElementById('ordersListContainer'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  /**
   * Initialize Application
   */
  function init() {
    loadStockOverrides();
    populateGorakhpurAreas();
    renderMainMenu();
    renderCategories();
    renderProducts();
    bindEvents();
    
    // Subscribe to cart
    shalomCart.subscribe(updateCartUI);
    updateCartUI(shalomCart);
  }

  /**
   * Populate Gorakhpur Localities
   */
  function populateGorakhpurAreas() {
    if (!elements.areaSelect) return;
    elements.areaSelect.innerHTML = '<option value="">Select Gorakhpur Locality</option>';
    GORAKHPUR_AREAS.forEach(area => {
      const opt = document.createElement('option');
      opt.value = area;
      opt.textContent = area;
      if (area.includes('Chargawan')) opt.selected = true;
      elements.areaSelect.appendChild(opt);
    });
  }

  /**
   * Unified Category & Subcategory Selection
   */
  function selectCategory(categoryId, subCategory = 'all') {
    state.currentCategory = categoryId;
    state.currentSubCategory = subCategory;
    state.page = 1;

    // Close any open dropdowns
    if (elements.allCatsDropdown) {
      elements.allCatsDropdown.classList.remove('open');
    }
    document.querySelectorAll('.category-dropdown-panel').forEach(panel => {
      panel.classList.remove('open');
    });

    // Update main menu active states
    if (elements.mainCategoryItemsTrack) {
      elements.mainCategoryItemsTrack.querySelectorAll('.main-menu-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === categoryId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Switch to catalog view if currently in another view
    if (state.currentView !== 'catalog') {
      switchView('catalog');
    }

    renderCategories();
    renderSubCategories();
    renderProducts();

    // Smooth scroll to catalog section
    const catalogSection = document.getElementById('productsCatalogSection');
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Render Main Category Menus with Pictures and Dropdowns
   */
  function renderMainMenu() {
    if (!elements.mainCategoryItemsTrack) return;

    // 1. Populate All Categories Dropdown
    if (elements.allCatsDropdown) {
      elements.allCatsDropdown.innerHTML = `
        <div class="all-cats-grid">
          ${SHALOM_CATEGORIES.map(cat => `
            <div class="all-cats-card" data-cat="${cat.id}">
              <img src="${cat.image}" alt="${cat.name}" class="all-cats-card-img" loading="lazy" />
              <div class="all-cats-card-content">
                <div class="all-cats-card-title">${cat.name}</div>
                <div class="all-cats-card-malayalam">${cat.malayalam}</div>
                <div class="all-cats-card-count">${cat.totalCount} items in store</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      elements.allCatsDropdown.querySelectorAll('.all-cats-card').forEach(card => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          const catId = card.getAttribute('data-cat');
          selectCategory(catId, 'all');
        });
      });

      // Toggle click for trigger button
      if (elements.allCatsBtn) {
        elements.allCatsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          elements.allCatsDropdown.classList.toggle('open');
        });
      }
    }

    // 2. Populate Main Category Items Track (Category picture + Name + Dropdown Items)
    elements.mainCategoryItemsTrack.innerHTML = SHALOM_CATEGORIES.map(cat => `
      <div class="main-menu-item" data-category-id="${cat.id}">
        <button type="button" class="main-menu-btn ${state.currentCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
          <img src="${cat.image}" alt="${cat.name}" class="main-menu-cat-pic" loading="lazy" />
          <span class="main-menu-cat-name">${cat.name}</span>
          <span class="menu-caret">▾</span>
        </button>

        <!-- Dropdown panel under main category -->
        <div class="category-dropdown-panel" data-cat-dropdown="${cat.id}">
          <div class="dropdown-header">
            <img src="${cat.image}" alt="${cat.name}" class="dropdown-header-pic" />
            <div class="dropdown-header-info">
              <h4 class="dropdown-cat-title">${cat.name}</h4>
              <div class="dropdown-cat-malayalam">${cat.malayalam}</div>
              <p class="dropdown-cat-desc">${cat.description}</p>
              <span class="dropdown-item-count-badge">${cat.totalCount} items</span>
            </div>
            <button type="button" class="btn btn-primary dropdown-view-all-btn" data-cat="${cat.id}">
              View All ${cat.name} →
            </button>
          </div>

          <div class="dropdown-content-grid">
            <div class="dropdown-subcats-col">
              <div class="dropdown-section-heading">Subcategories & Varieties</div>
              <ul class="dropdown-subcats-list">
                <li>
                  <a href="#productsCatalogSection" class="dropdown-subcat-link ${state.currentCategory === cat.id && state.currentSubCategory === 'all' ? 'active' : ''}" data-cat="${cat.id}" data-subcat="all">
                    <span class="subcat-link-bullet">●</span>
                    <span class="subcat-name">All ${cat.name}</span>
                    <span class="subcat-qty">(${cat.totalCount})</span>
                  </a>
                </li>
                ${cat.subCategories.map(sc => `
                  <li>
                    <a href="#productsCatalogSection" class="dropdown-subcat-link ${state.currentCategory === cat.id && state.currentSubCategory === sc.name ? 'active' : ''}" data-cat="${cat.id}" data-subcat="${sc.name}">
                      <span class="subcat-link-bullet">›</span>
                      <span class="subcat-name">${sc.name}</span>
                      <span class="subcat-qty">(${sc.count})</span>
                    </a>
                  </li>
                `).join('')}
              </ul>
            </div>

            <div class="dropdown-featured-col">
              <div class="dropdown-section-heading">Popular Items</div>
              <div class="dropdown-featured-grid">
                ${cat.featuredItems.filter(item => item.stock > 0).map(item => `
                  <div class="dropdown-product-chip" data-product-id="${item.id}" data-cat="${cat.id}">
                    <div class="chip-info">
                      <span class="chip-name" title="${item.name}">${item.name}</span>
                      <div class="chip-price-row">
                        <span class="chip-price">₹${item.price}</span>
                        ${item.mrp > item.price ? `<span class="chip-mrp">₹${item.mrp}</span>` : ''}
                      </div>
                    </div>
                    <button type="button" class="chip-add-btn" data-id="${item.id}" title="Quick Add">
                      + Add
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Bind Category Menu Buttons
    elements.mainCategoryItemsTrack.querySelectorAll('.main-menu-item').forEach(itemWrap => {
      const catBtn = itemWrap.querySelector('.main-menu-btn');
      const dropdown = itemWrap.querySelector('.category-dropdown-panel');
      const catId = itemWrap.getAttribute('data-category-id');

      // Click on main category button
      catBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.innerWidth < 992) {
          dropdown.classList.toggle('open');
        } else {
          selectCategory(catId, 'all');
        }
      });

      // View All button inside dropdown
      const viewAllBtn = itemWrap.querySelector('.dropdown-view-all-btn');
      if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectCategory(catId, 'all');
        });
      }

      // Subcategory links inside dropdown
      itemWrap.querySelectorAll('.dropdown-subcat-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const subcat = link.getAttribute('data-subcat');
          selectCategory(catId, subcat);
        });
      });

      // Product Chip Quick Add
      itemWrap.querySelectorAll('.chip-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const prodId = btn.getAttribute('data-id');
          const prod = SHALOM_PRODUCTS.find(p => p.id === prodId);
          if (prod) {
            shalomCart.addItem(prod, 1);
            showToast(`Added ${prod.name} (₹${prod.price}) to Kart!`, 'success');
          }
        });
      });

      // Product Chip Click -> quick view
      itemWrap.querySelectorAll('.dropdown-product-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          if (e.target.closest('.chip-add-btn')) return;
          const prodId = chip.getAttribute('data-product-id');
          const prod = SHALOM_PRODUCTS.find(p => p.id === prodId);
          if (prod) {
            openQuickView(prod);
          }
        });
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.main-category-menu-bar')) {
        if (elements.allCatsDropdown) elements.allCatsDropdown.classList.remove('open');
        document.querySelectorAll('.category-dropdown-panel').forEach(p => p.classList.remove('open'));
      }
    });
  }

  /**
   * Render Category Pills in Catalog Section
   */
  function renderCategories() {
    if (!elements.categoryTabs) return;

    const inStockTotal = SHALOM_PRODUCTS.filter(p => p.inStock && p.stock > 0).length;
    const allPill = {
      id: 'all',
      name: 'All Items',
      totalCount: inStockTotal,
      image: 'images/hero.jpg'
    };

    const categories = [allPill, ...SHALOM_CATEGORIES.map(c => {
      const availableCount = SHALOM_PRODUCTS.filter(p => p.category === c.id && p.inStock && p.stock > 0).length;
      return { ...c, totalCount: availableCount };
    })];

    elements.categoryTabs.innerHTML = categories.map(cat => `
      <button class="category-pill ${state.currentCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
        <img src="${cat.image}" alt="${cat.name}" class="cat-pill-thumb" loading="lazy" />
        <span class="pill-label">${cat.name} (${cat.totalCount})</span>
      </button>
    `).join('');

    elements.categoryTabs.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-category');
        selectCategory(catId, 'all');
      });
    });

    renderSubCategories();
  }

  /**
   * Render Sub-Category Filter Pills
   */
  function renderSubCategories() {
    if (!elements.subCategoryPills) return;

    let subCats = [];
    if (state.currentCategory === 'all') {
      subCats = [
        'All Items',
        'In Stock Ready',
        'Snacks',
        'Masalas & Spices',
        'Rice Items',
        'Church Articles',
        'Kerala Clothing',
        'Fish & Meat',
        'Books & Bibles',
        'Edible Oils & Ghee',
        'Healthcare Items',
        'Electronics'
      ];
    } else {
      const catObj = SHALOM_CATEGORIES.find(c => c.id === state.currentCategory);
      if (catObj && catObj.subCategories) {
        subCats = [`All ${catObj.name}`, ...catObj.subCategories.map(sc => sc.name)];
      } else {
        subCats = ['All Items'];
      }
    }

    elements.subCategoryPills.innerHTML = subCats.map(sc => {
      const isActive = state.currentSubCategory === sc || 
        (state.currentSubCategory === 'all' && (sc === 'All Items' || sc.startsWith('All ')));
      return `
        <button class="sub-pill ${isActive ? 'active' : ''}" data-subcat="${sc}">
          ${sc}
        </button>
      `;
    }).join('');

    elements.subCategoryPills.querySelectorAll('.sub-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        elements.subCategoryPills.querySelectorAll('.sub-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scVal = btn.getAttribute('data-subcat');
        state.currentSubCategory = (scVal === 'All Items' || scVal.startsWith('All ')) ? 'all' : scVal;
        state.page = 1;
        renderProducts();
      });
    });
  }

  /**
   * Filter and Sort Products
   */
  function getFilteredProducts() {
    // Only available in-stock items are shown on store index page (sold-out items are hidden)
    let result = SHALOM_PRODUCTS.filter(p => p.inStock && p.stock > 0);

    // Filter by Main Category
    if (state.currentCategory !== 'all') {
      result = result.filter(p => p.category === state.currentCategory);
    }

    // Filter by Sub Category
    if (state.currentSubCategory !== 'all' && !state.currentSubCategory.startsWith('All')) {
      const sc = state.currentSubCategory.toLowerCase();
      if (sc === 'in stock ready') {
        result = result.filter(p => p.inStock);
      } else if (state.currentCategory === 'all') {
        result = result.filter(p => 
          p.categoryName.toLowerCase().includes(sc) || 
          p.subCategory.toLowerCase().includes(sc) || 
          p.name.toLowerCase().includes(sc)
        );
      } else {
        result = result.filter(p => 
          p.subCategory.toLowerCase() === sc || 
          p.subCategory.toLowerCase().includes(sc) || 
          p.name.toLowerCase().includes(sc)
        );
      }
    }

    // In Stock Only toggle
    if (state.onlyInStock) {
      result = result.filter(p => p.inStock);
    }

    // Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.subCategory.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sort
    if (state.sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (state.sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (state.sortBy === 'stock') {
      result = [...result].sort((a, b) => b.stock - a.stock);
    } else if (state.sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }

  /**
   * Render Product Cards with Pagination / Load More
   */
  function renderProducts(append = false) {
    const allFiltered = getFilteredProducts();
    const totalCount = allFiltered.length;

    if (elements.productCount) {
      elements.productCount.textContent = `Showing ${Math.min(state.page * state.pageSize, totalCount)} of ${totalCount} Shalom items`;
    }

    if (totalCount === 0) {
      elements.productsGrid.innerHTML = `
        <div class="empty-products-placeholder">
          <div class="empty-icon">🍃</div>
          <h3>No items found</h3>
          <p>Try searching for banana chips, spices, bibles, cables or clear your search.</p>
          <button class="btn btn-outline" id="resetCatalogBtn">View All 1,281 Items</button>
        </div>
      `;
      document.getElementById('resetCatalogBtn')?.addEventListener('click', () => {
        state.currentCategory = 'all';
        state.currentSubCategory = 'all';
        state.searchQuery = '';
        state.onlyInStock = false;
        if (elements.searchInput) elements.searchInput.value = '';
        if (elements.stockFilterToggle) elements.stockFilterToggle.checked = false;
        renderCategories();
        renderProducts();
      });
      if (elements.loadMoreContainer) elements.loadMoreContainer.style.display = 'none';
      return;
    }

    const visibleItems = allFiltered.slice(0, state.page * state.pageSize);

    const cardsHtml = visibleItems.map(product => {
      const discountPercentage = product.mrp > product.price 
        ? Math.round(((product.mrp - product.price) / product.mrp) * 100) 
        : 0;

      const isStockAvailable = product.inStock;
      const badgeType = ['church-articles', 'books-bibles', 'kerala-clothing'].includes(product.category) 
        ? 'badge-heritage' 
        : (['grains-flours', 'healthcare-items', 'raw-items-produce', 'rice-items'].includes(product.category) ? 'badge-nature' : 'badge-hot');

      return `
        <div class="product-card text-only-card ${!isStockAvailable ? 'item-out-of-stock' : ''}" data-product-id="${product.id}">
          <div class="card-top-bar">
            <span class="card-cat-badge ${badgeType}">
              ${product.subCategory}
            </span>
            <div class="card-badges-right">
              ${discountPercentage > 0 ? `<span class="card-discount-pill">${discountPercentage}% OFF</span>` : ''}
              <span class="card-stock-pill ${isStockAvailable ? 'stock-pill-in' : 'stock-pill-out'}">
                ${isStockAvailable ? `In Stock (${product.stock})` : 'Sold Out'}
              </span>
            </div>
          </div>

          <div class="card-body-content">
            <div class="card-sku-row">
              <span class="card-sku-code">SKU: ${product.code}</span>
              <span class="card-cat-name">${product.categoryName}</span>
            </div>

            <h3 class="product-title" title="${product.name}">${product.name}</h3>

            <div class="card-meta-row">
              <span class="card-unit-badge">📦 ${product.unit || 'Pack'}</span>
              <span class="origin-pin">📍 Gorakhpur</span>
            </div>
          </div>

          <!-- Price & Action -->
          <div class="product-footer-row">
            <div class="product-price-box">
              <span class="current-price">₹${product.price}</span>
              ${product.mrp > product.price ? `<span class="original-price">₹${product.mrp}</span>` : ''}
            </div>
            <div class="product-actions">
              <button type="button" class="btn btn-outline btn-sm quick-view-btn" data-id="${product.id}" title="View Specs & Details">
                Specs
              </button>
              <button type="button" class="btn btn-primary btn-sm add-to-cart-btn" data-id="${product.id}">
                + Add
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    elements.productsGrid.innerHTML = cardsHtml;

    // Load More Button Visibility
    if (elements.loadMoreContainer) {
      if (visibleItems.length < totalCount) {
        elements.loadMoreContainer.style.display = 'block';
        elements.loadMoreContainer.innerHTML = `
          <button class="btn btn-outline btn-large" id="loadMoreBtn">
            Load More Shalom Items (${totalCount - visibleItems.length} more) ↓
          </button>
        `;
        document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
          state.page += 1;
          renderProducts();
        });
      } else {
        elements.loadMoreContainer.style.display = 'none';
      }
    }

    // Bind Add to Cart Buttons
    elements.productsGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = btn.getAttribute('data-id');
        const product = SHALOM_PRODUCTS.find(p => p.id === prodId);
        if (!product) return;
        
        shalomCart.addItem(product, 1);
        showToast(`Added ${product.name} (₹${product.price}) to Kart!`, 'success');

        btn.classList.add('added-pulse');
        setTimeout(() => btn.classList.remove('added-pulse'), 500);
      });
    });

    // Bind Quick View Buttons
    elements.productsGrid.querySelectorAll('.quick-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prodId = btn.getAttribute('data-id');
        const product = SHALOM_PRODUCTS.find(p => p.id === prodId);
        if (product) openQuickView(product);
      });
    });
  }

  /**
   * Update Cart UI
   */
  function updateCartUI(cart) {
    const totals = cart.getTotals();
    
    // Header Badges
    if (elements.cartBadgeCount) {
      elements.cartBadgeCount.textContent = totals.itemCount;
      elements.cartBadgeCount.classList.remove('bounce-badge');
      void elements.cartBadgeCount.offsetWidth;
      elements.cartBadgeCount.classList.add('bounce-badge');
    }
    if (elements.cartNavTotal) {
      elements.cartNavTotal.textContent = `₹${totals.grandTotal.toLocaleString('en-IN')}`;
    }

    // Drawer Delivery Radio Sync
    if (elements.deliverySelectDrawer) {
      const radios = elements.deliverySelectDrawer.querySelectorAll('input[name="drawerDelivery"]');
      radios.forEach(r => {
        r.checked = (r.value === cart.selectedDelivery);
      });
    }

    // Cart Drawer Items List
    if (elements.cartDrawerItems) {
      if (cart.items.length === 0) {
        elements.cartDrawerItems.innerHTML = `
          <div class="cart-empty-view">
            <div class="empty-pot-icon">🛒</div>
            <h4>Your Shalom Kart is Empty</h4>
            <p>Browse our authentic Kerala groceries, church devotional articles, and stationery.</p>
            <button class="btn btn-primary" id="drawerShopBtn">Browse Store</button>
          </div>
        `;
        document.getElementById('drawerShopBtn')?.addEventListener('click', closeCartDrawer);
        if (elements.proceedToCheckoutBtn) elements.proceedToCheckoutBtn.disabled = true;
      } else {
        if (elements.proceedToCheckoutBtn) elements.proceedToCheckoutBtn.disabled = false;
        elements.cartDrawerItems.innerHTML = cart.items.map(item => `
          <div class="cart-item-card text-only-cart-item" data-cart-id="${item.cartItemId}">
            <div class="cart-item-details">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-meta">${item.categoryName} • SKU: ${item.code || 'SK'}</div>
              <div class="cart-item-price">₹${item.unitPrice} each</div>
              
              <div class="cart-item-controls">
                <div class="qty-stepper">
                  <button class="qty-btn" data-action="decrease" data-id="${item.cartItemId}">−</button>
                  <span class="qty-count">${item.quantity}</span>
                  <button class="qty-btn" data-action="increase" data-id="${item.cartItemId}">+</button>
                </div>
                <div class="cart-item-subtotal">₹${item.unitPrice * item.quantity}</div>
                <button class="item-delete-btn" data-action="delete" data-id="${item.cartItemId}" title="Remove">🗑️</button>
              </div>
            </div>
          </div>
        `).join('');

        elements.cartDrawerItems.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            const cartItemId = btn.getAttribute('data-id');
            if (action === 'increase') cart.updateQuantity(cartItemId, 1);
            else if (action === 'decrease') cart.updateQuantity(cartItemId, -1);
            else if (action === 'delete') {
              cart.removeItem(cartItemId);
              showToast('Item removed', 'info');
            }
          });
        });
      }
    }

    // Totals in Drawer
    if (elements.cartDrawerSubtotal) elements.cartDrawerSubtotal.textContent = `₹${totals.subtotal.toLocaleString('en-IN')}`;
    if (elements.cartDrawerGst) elements.cartDrawerGst.textContent = `₹${totals.gst.toLocaleString('en-IN')}`;
    if (elements.cartDrawerDelivery) {
      elements.cartDrawerDelivery.textContent = totals.deliveryFee === 0 ? 'FREE (Pick from Store)' : `₹${totals.deliveryFee}`;
    }
    if (elements.cartDrawerGrandTotal) elements.cartDrawerGrandTotal.textContent = `₹${totals.grandTotal.toLocaleString('en-IN')}`;

    // Coupon Tag
    if (elements.cartDrawerDiscountRow && elements.cartDrawerDiscount) {
      if (totals.discount > 0) {
        elements.cartDrawerDiscountRow.style.display = 'flex';
        elements.cartDrawerDiscount.textContent = `- ₹${totals.discount.toLocaleString('en-IN')}`;
      } else {
        elements.cartDrawerDiscountRow.style.display = 'none';
      }
    }

    if (elements.activeCouponTag) {
      if (cart.appliedCoupon) {
        elements.activeCouponTag.innerHTML = `
          <div class="coupon-chip">
            <span>🏷️ <strong>${cart.appliedCoupon.code}</strong> applied</span>
            <button type="button" class="remove-coupon-btn" id="removeCouponBtn">✕</button>
          </div>
        `;
        document.getElementById('removeCouponBtn')?.addEventListener('click', () => {
          cart.removeCoupon();
          showToast('Coupon removed', 'info');
          if (elements.couponFeedback) elements.couponFeedback.textContent = '';
        });
      } else {
        elements.activeCouponTag.innerHTML = '';
      }
    }

    updateBillingSummary();
  }

  /**
   * Update Summary on Billing Page
   */
  function updateBillingSummary() {
    const totals = shalomCart.getTotals();
    if (elements.billingSubtotal) elements.billingSubtotal.textContent = `₹${totals.subtotal.toLocaleString('en-IN')}`;
    if (elements.billingGst) elements.billingGst.textContent = `₹${totals.gst.toLocaleString('en-IN')}`;
    if (elements.billingDelivery) {
      elements.billingDelivery.textContent = totals.deliveryFee === 0 ? 'FREE (Pick from Store)' : `₹${totals.deliveryFee}`;
    }
    if (elements.billingGrandTotal) elements.billingGrandTotal.textContent = `₹${totals.grandTotal.toLocaleString('en-IN')}`;

    if (elements.billingDiscountRow && elements.billingDiscount) {
      if (totals.discount > 0) {
        elements.billingDiscountRow.style.display = 'flex';
        elements.billingDiscount.textContent = `- ₹${totals.discount.toLocaleString('en-IN')}`;
      } else {
        elements.billingDiscountRow.style.display = 'none';
      }
    }

    // Toggle address requirement based on pickup
    if (elements.addressGroup) {
      if (shalomCart.selectedDelivery === 'pickup') {
        elements.addressGroup.style.display = 'none';
      } else {
        elements.addressGroup.style.display = 'block';
      }
    }
  }

  /**
   * View Management
   */
  function switchView(viewName) {
    state.currentView = viewName;
    elements.catalogView.style.display = 'none';
    elements.billingView.style.display = 'none';
    elements.upiPaymentView.style.display = 'none';
    elements.invoiceView.style.display = 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewName === 'catalog') {
      elements.catalogView.style.display = 'block';
    } else if (viewName === 'billing') {
      elements.billingView.style.display = 'block';
      updateBillingSummary();
    } else if (viewName === 'upi') {
      elements.upiPaymentView.style.display = 'block';
    } else if (viewName === 'invoice') {
      elements.invoiceView.style.display = 'block';
    }
  }

  function openCartDrawer() {
    elements.cartDrawer.classList.add('open');
    elements.cartDrawerBackdrop.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    elements.cartDrawer.classList.remove('open');
    elements.cartDrawerBackdrop.classList.remove('visible');
    document.body.style.overflow = '';
  }

  /**
   * Quick View Modal
   */
  function openQuickView(product) {
    const isStockAvailable = product.inStock;
    const discountPercentage = product.mrp > product.price 
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100) 
      : 0;
    const badgeType = ['church-articles', 'books-bibles', 'kerala-clothing'].includes(product.category) 
      ? 'badge-heritage' 
      : (['grains-flours', 'healthcare-items', 'raw-items-produce', 'rice-items'].includes(product.category) ? 'badge-nature' : 'badge-hot');

    elements.quickViewBody.innerHTML = `
      <div class="quickview-text-modal">
        <div class="quickview-modal-header">
          <div class="quickview-badges-row">
            <span class="card-cat-badge ${badgeType}">${product.subCategory}</span>
            <span class="card-stock-pill ${isStockAvailable ? 'stock-pill-in' : 'stock-pill-out'}">
              ${isStockAvailable ? `In Stock (${product.stock} units in Gorakhpur)` : 'Re-ordering / Out of Stock'}
            </span>
            ${discountPercentage > 0 ? `<span class="card-discount-pill">${discountPercentage}% OFF</span>` : ''}
          </div>
          <div class="origin-tag">📍 Shalom Kerala Stores • Gorakhpur, UP</div>
          <h2 class="quickview-title">${product.name}</h2>
          <div class="quickview-sku-meta">
            <span>SKU: <strong>${product.code}</strong></span> • 
            <span>Category: <strong>${product.categoryName}</strong></span> • 
            <span>Pack / Unit: <strong>${product.unit || 'Standard'}</strong></span>
          </div>
        </div>

        <div class="quickview-info-body">
          <div class="quickview-desc-section">
            <h4 class="specs-section-title">Item Specification & Description</h4>
            <p class="quickview-desc">${product.description || 'Authentic store catalog item from Shalom Kerala Stores, Gorakhpur.'}</p>
          </div>

          <div class="quickview-meta-box">
            <div><strong>🏬 Store Address:</strong> Chargawan, Near Little Flower School, Medical College Road, Gorakhpur, UP</div>
            <div><strong>⚡ Instant Payment:</strong> Official UPI <strong>7379325499@ybl</strong> (PhonePe, GPay, Paytm)</div>
            <div><strong>🛵 Gorakhpur Delivery:</strong> Up to 5 Km: ₹50 • Up to 10 Km: ₹100 • Store Pickup: FREE</div>
          </div>

          <div class="quickview-action-bar">
            <div class="quickview-price-display">
              <span class="quick-current-price">₹${product.price}</span>
              ${product.mrp > product.price ? `<span class="quick-original-price">₹${product.mrp}</span>` : ''}
            </div>
            <button type="button" class="btn btn-primary btn-large" id="modalAddToCartBtn">
              Add to Kart (₹${product.price})
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modalAddToCartBtn')?.addEventListener('click', () => {
      shalomCart.addItem(product, 1);
      showToast(`Added ${product.name} (₹${product.price})!`, 'success');
      closeQuickView();
    });

    elements.quickViewModal.classList.add('open');
    elements.quickViewBackdrop.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    elements.quickViewModal.classList.remove('open');
    elements.quickViewBackdrop.classList.remove('visible');
    document.body.style.overflow = '';
  }

  /**
   * Orders Modal
   */
  function openOrdersModal() {
    const orders = shalomBilling.pastOrders;
    if (orders.length === 0) {
      elements.ordersListContainer.innerHTML = `
        <div class="empty-orders-view">
          <div class="empty-box-icon">📦</div>
          <h4>No previous orders yet</h4>
          <p>Orders paid via UPI (7379325499@ybl) and official GST invoices will appear here.</p>
        </div>
      `;
    } else {
      elements.ordersListContainer.innerHTML = orders.map(order => `
        <div class="order-history-card">
          <div class="order-hist-header">
            <div>
              <span class="order-hist-id">Order #${order.orderId}</span>
              <span class="order-hist-date">${order.formattedDate} at ${order.formattedTime}</span>
            </div>
            <span class="order-hist-status">PAID ₹${order.totals.grandTotal}</span>
          </div>
          <div class="order-hist-items">
            ${order.items.map(it => `
              <div class="order-hist-item-row">
                <span>${it.name} × ${it.quantity}</span>
                <span>₹${it.unitPrice * it.quantity}</span>
              </div>
            `).join('')}
          </div>
          <div class="order-hist-footer">
            <span class="order-hist-utr">UPI Ref: ${order.payment.utr}</span>
            <button class="btn btn-outline btn-sm view-saved-invoice-btn" data-order-id="${order.orderId}">
              View & Print Bill
            </button>
          </div>
        </div>
      `).join('');

      elements.ordersListContainer.querySelectorAll('.view-saved-invoice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const oId = btn.getAttribute('data-order-id');
          const found = shalomBilling.pastOrders.find(o => o.orderId === oId);
          if (found) {
            closeOrdersModal();
            displayInvoice(found);
          }
        });
      });
    }

    elements.ordersModal.classList.add('open');
    elements.ordersModalBackdrop.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeOrdersModal() {
    elements.ordersModal.classList.remove('open');
    elements.ordersModalBackdrop.classList.remove('visible');
    document.body.style.overflow = '';
  }

  /**
   * Launch UPI Payment Screen
   */
  function startUpiPaymentFlow(order) {
    switchView('upi');

    const grandTotal = order.totals.grandTotal;
    const upiUri = shalomUpi.generateUpiUri(order.orderId, grandTotal, order.customer.name);

    if (elements.upiAmountDisplay) {
      elements.upiAmountDisplay.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
    }
    if (elements.upiOrderIdDisplay) {
      elements.upiOrderIdDisplay.textContent = order.orderId;
    }
    if (elements.upiVpaText) {
      elements.upiVpaText.textContent = "7379325499@ybl";
    }

    // Render Dynamic QR Code
    shalomUpi.renderQrCode(elements.upiQrContainer, upiUri, grandTotal);

    // Setup UPI Apps deep links
    const upiApps = ['appGpay', 'appPhonepe', 'appPaytm', 'appBhim'];
    upiApps.forEach(appId => {
      const btn = document.getElementById(appId);
      if (btn) {
        btn.onclick = () => {
          window.location.href = upiUri;
          showToast(`Opening UPI Application to pay ₹${grandTotal}...`, 'info');
        };
      }
    });

    // Copy actions
    if (elements.copyUpiVpaBtn) {
      elements.copyUpiVpaBtn.onclick = () => {
        navigator.clipboard.writeText("7379325499@ybl").then(() => {
          showToast('UPI VPA copied: 7379325499@ybl', 'success');
        });
      };
    }

    // 10 min countdown
    shalomUpi.startPaymentTimer(elements.upiTimerDisplay, () => {
      showToast('UPI session expired. Please generate a new order.', 'error');
      switchView('billing');
    });
  }

  /**
   * Finalize Payment & Display Invoice
   */
  function finalizePaymentAndShowInvoice(utrNumber = null) {
    shalomUpi.clearInterval();
    const completedOrder = shalomBilling.completePayment(utrNumber);
    if (!completedOrder) return;

    // Deduct stock in real-time
    deductStockOnOrder(completedOrder);

    shalomCart.clear();
    shalomCart.removeCoupon();
    shalomUpi.playSuccessSound();

    displayInvoice(completedOrder);
    showToast(`Payment of ₹${completedOrder.totals.grandTotal} Verified to 7379325499@ybl!`, 'success');
  }

  function displayInvoice(order) {
    switchView('invoice');
    elements.invoiceContainer.innerHTML = shalomBilling.renderTaxInvoiceHTML(order);
  }

  /**
   * Toast helper
   */
  function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-bubble toast-${type}`;

    let icon = '🔔';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';
    if (type === 'info') icon = '🌴';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  /**
   * Bind DOM Events
   */
  function bindEvents() {
    // Search
    let searchTimeout;
    elements.searchInput?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        state.page = 1;
        renderProducts();
      }, 200);
    });

    // Sort
    elements.sortSelect?.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      state.page = 1;
      renderProducts();
    });

    // Stock Filter Toggle
    elements.stockFilterToggle?.addEventListener('change', (e) => {
      state.onlyInStock = e.target.checked;
      state.page = 1;
      renderProducts();
    });

    // Cart Drawer triggers
    elements.cartTriggerBtn?.addEventListener('click', openCartDrawer);
    elements.closeCartDrawerBtn?.addEventListener('click', closeCartDrawer);
    elements.cartDrawerBackdrop?.addEventListener('click', closeCartDrawer);
    elements.brandLogoBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('catalog');
    });

    // Drawer Delivery Radio change
    if (elements.deliverySelectDrawer) {
      elements.deliverySelectDrawer.querySelectorAll('input[name="drawerDelivery"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          shalomCart.setDeliveryOption(e.target.value);
        });
      });
    }

    // Checkout Delivery Radio change
    if (elements.deliveryOptionsContainer) {
      elements.deliveryOptionsContainer.querySelectorAll('input[name="checkoutDelivery"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          shalomCart.setDeliveryOption(e.target.value);
        });
      });
    }

    // Apply Coupon
    elements.applyCouponBtn?.addEventListener('click', () => {
      const code = elements.couponInput?.value;
      const res = shalomCart.applyCouponCode(code);
      if (elements.couponFeedback) {
        elements.couponFeedback.textContent = res.message;
        elements.couponFeedback.className = `coupon-feedback ${res.success ? 'text-success' : 'text-danger'}`;
      }
      if (res.success) {
        showToast(res.message, 'success');
        if (elements.couponInput) elements.couponInput.value = '';
      } else {
        showToast(res.message, 'error');
      }
    });

    // Proceed to Checkout
    elements.proceedToCheckoutBtn?.addEventListener('click', () => {
      if (shalomCart.items.length === 0) {
        showToast('Your kart is empty. Please add items first.', 'error');
        return;
      }
      closeCartDrawer();
      switchView('billing');
    });

    // Back buttons
    elements.backToCatalogBtn?.addEventListener('click', () => switchView('catalog'));
    elements.backToBillingBtn?.addEventListener('click', () => switchView('billing'));
    elements.backToShopBtn?.addEventListener('click', () => switchView('catalog'));

    // Billing Form Submission
    elements.billingForm?.addEventListener('submit', (e) => {
      e.preventDefault();

      if (shalomCart.items.length === 0) {
        showToast('Your kart is empty! Please add items to order.', 'error');
        switchView('catalog');
        return;
      }

      const formData = {
        customerName: document.getElementById('billingName')?.value,
        phone: document.getElementById('billingPhone')?.value,
        email: document.getElementById('billingEmail')?.value,
        address: document.getElementById('billingAddress')?.value,
        area: elements.areaSelect?.value,
        landmark: document.getElementById('billingLandmark')?.value,
        pincode: document.getElementById('billingPincode')?.value,
        notes: document.getElementById('billingNotes')?.value
      };

      const validation = shalomBilling.validateBillingDetails(formData, shalomCart.selectedDelivery);

      document.querySelectorAll('.field-error-msg').forEach(el => el.textContent = '');
      document.querySelectorAll('.input-control').forEach(el => el.classList.remove('has-error'));

      if (!validation.isValid) {
        Object.entries(validation.errors).forEach(([field, msg]) => {
          const errEl = document.getElementById(`${field}Error`);
          const inputEl = document.getElementById(`billing${field.charAt(0).toUpperCase() + field.slice(1)}`) ||
                          document.getElementById(`${field}Select`) ||
                          document.getElementById(field);
          if (errEl) errEl.textContent = msg;
          if (inputEl) inputEl.classList.add('has-error');
        });
        showToast('Please check the required billing details.', 'error');
        return;
      }

      const order = shalomBilling.createOrder(formData, shalomCart);
      startUpiPaymentFlow(order);
    });

    // Simulate UPI Payment Button
    elements.simulatePaymentBtn?.addEventListener('click', () => {
      elements.simulatePaymentBtn.disabled = true;
      elements.simulatePaymentBtn.innerHTML = `
        <span class="spinner-inline"></span>
        <span>Simulating Bank UPI Approval for 7379325499@ybl...</span>
      `;

      setTimeout(() => {
        elements.simulatePaymentBtn.disabled = false;
        elements.simulatePaymentBtn.innerHTML = `
          <span>✓ Instant UPI Simulation (One Click)</span>
        `;
        finalizePaymentAndShowInvoice();
      }, 1300);
    });

    // Manual Verify UTR Button
    elements.manualVerifyBtn?.addEventListener('click', () => {
      const utr = (elements.utrInput?.value || '').trim();
      if (utr.length < 6) {
        showToast('Please enter a valid 12-digit UPI UTR / Ref number from your bank app.', 'error');
        return;
      }
      finalizePaymentAndShowInvoice(utr);
    });

    // Print & Download buttons
    elements.printInvoiceBtn?.addEventListener('click', () => window.print());
    elements.downloadInvoiceBtn?.addEventListener('click', () => window.print());

    // Orders modal
    elements.navOrdersBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      openOrdersModal();
    });

    // Modal close events
    elements.closeQuickViewBtn?.addEventListener('click', closeQuickView);
    elements.quickViewBackdrop?.addEventListener('click', closeQuickView);
    elements.closeOrdersModalBtn?.addEventListener('click', closeOrdersModal);
    elements.ordersModalBackdrop?.addEventListener('click', closeOrdersModal);
  }

  // =========================================================================
  // INVENTORY MANAGEMENT LOGIC
  // =========================================================================

  const STOCK_STORAGE_KEY = 'shalom_live_stock_v1';

  function loadStockOverrides() {
    try {
      const saved = localStorage.getItem(STOCK_STORAGE_KEY);
      if (!saved) return;
      const overrides = JSON.parse(saved);
      SHALOM_PRODUCTS.forEach(p => {
        if (overrides[p.id] !== undefined) {
          p.stock = overrides[p.id];
          p.inStock = p.stock > 0;
        }
      });
    } catch (e) {
      console.warn('Failed to load stock overrides', e);
    }
  }

  function saveStockOverrides() {
    try {
      const overrides = {};
      SHALOM_PRODUCTS.forEach(p => {
        overrides[p.id] = p.stock;
      });
      localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Failed to save stock overrides', e);
    }
  }

  function deductStockOnOrder(order) {
    if (!order || !order.items) return;
    let anyChanged = false;

    order.items.forEach(orderItem => {
      const p = SHALOM_PRODUCTS.find(prod => prod.id === orderItem.id || prod.name === orderItem.name);
      if (p) {
        const qty = orderItem.quantity || 1;
        p.stock = Math.max(0, p.stock - qty);
        p.inStock = p.stock > 0;
        anyChanged = true;
      }
    });

    if (anyChanged) {
      saveStockOverrides();
      renderProducts();
      console.log('Real-time inventory updated for order:', order.orderId);
    }
  }

  init();

});
