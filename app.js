/**
 * THIẾT KẾ ĐỒNG PHỤC MRS LINH - 3D ONLINE DESIGNER
 * Cốt lõi Engine xử lý Canvas Render, Xoay 360 và AI Gợi Ý
 */

(function () {
    'use strict';
    // UI State Management
    const state = {
        theme: 'dark',
        product: 'ao-polo',     // ao-polo, ao-thun, ao-bao-ho, quan-bao-ho
        style: 'polo-nam',       // polo-nam, polo-nu, polo-congty, polo-thethao, etc.
        form: 'nam',            // nam, nu
        angle: 'front',         // front, left, back, right
        isProMode: false,
        
        // Colors for each customizable component
        colors: {
            than: '#0f172a',       // body color
            tay: '#0f172a',        // sleeves color
            co: '#1e293b',         // collar color
            'bo-tay': '#1e293b',   // cuffs color
            'tru-co': '#1e293b',   // placket/button stands
            'vien-co': '#fbbf24',  // collar trim/edge
            tui: '#0f172a',        // pocket color
            'nap-tui': '#1e293b',  // pocket flap color
            'phan-quang': '#2dd4bf', // reflective tape tint
            nut: '#ffffff',         // button color
            'chan-co': '#1e293b'   // collar stand color
        },
        textures: {
            than: false,
            tay: false,
            co: false,
            'bo-tay': false,
            'tru-co': false,
            'vien-co': false,
            tui: false,
            'nap-tui': false,
            'phan-quang': false,
            nut: false,
            'chan-co': false
        },

        // Pocket Configuration
        pockets: {
            left: false,
            right: false,
            sleeve: false,
            sleeveRight: false,
            flap: false
        },

        // Reflective tape configuration
        reflective: {
            chest: false,
            shoulders: false,
            sleeves: false,
            width: 5, // cm
            color: '#2dd4bf',
            yOffset: 0
        },

        // Uploaded Logo & Graphic state
        logo: {
            file: null,
            imgElement: null,
            position: 'nguc-trai', // nguc-trai, nguc-phai, sau-lung, tay-trai, tay-phai
            scale: 100, // percentage
            opacity: 100, // percentage
            xOffset: 0,
            yOffset: 0,
            printStyle: 'chuyen-nhiet'
        },
        logos: [], // Array of custom draggable logo objects
        activeDragLogoId: null,
        dragOffsetX: 0,
        dragOffsetY: 0,

        patterns: {
            front: { file: null, imgElement: null, x: 0, y: 0, scale: 100, rotate: 0, opacity: 95, blendMode: 'normal', printType: 'chuyen-nhiet', realism: 85, coverage: { than: true, tay: false, co: false, tui: false } },
            back: { file: null, imgElement: null, x: 0, y: 0, scale: 100, rotate: 0, opacity: 95, blendMode: 'normal', printType: 'chuyen-nhiet', realism: 85, coverage: { than: true, tay: false, co: false, tui: false } },
            left: { file: null, imgElement: null, x: 0, y: 0, scale: 100, rotate: 0, opacity: 95, blendMode: 'normal', printType: 'chuyen-nhiet', realism: 85, coverage: { than: true, tay: false, co: false, tui: false } },
            right: { file: null, imgElement: null, x: 0, y: 0, scale: 100, rotate: 0, opacity: 95, blendMode: 'normal', printType: 'chuyen-nhiet', realism: 85, coverage: { than: true, tay: false, co: false, tui: false } }
        },
        activePatternSelected: false,
        activePatternResizeHandle: null,
        activePatternRotating: false,
        activePatternDragging: false,

        isDirty: false,
        size: 'M',
        price: 'Liên hệ xưởng báo giá gốc',
        hasViewedBack: false
    };

    // Images Cache
    const imgCache = {};
    
    // Tint Cache — LRU với giới hạn 80 entries để tránh memory leak
    const tintCache = {};
    const tintCacheKeys = [];
    const MAX_TINT_CACHE = 80;
    
    function clearTintCache() {
        for (const key in tintCache) delete tintCache[key];
        tintCacheKeys.length = 0;
    }

    function setTintCache(key, value) {
        if (tintCache[key]) return; // Already exists, no update needed
        if (tintCacheKeys.length >= MAX_TINT_CACHE) {
            const oldest = tintCacheKeys.shift();
            delete tintCache[oldest];
        }
        tintCache[key] = value;
        tintCacheKeys.push(key);
    }
    
    // Canvas settings
    const canvas = document.getElementById('product-canvas');
    const ctx = canvas.getContext('2d');
    const canvasWrapper = document.getElementById('div-canvas-wrapper');

    // ── requestAnimationFrame scheduler ─────────────────────────────────────
    // Tránh gọi drawCanvas() trực tiếp nhiều lần liên tiếp khi kéo slider
    let _rAFPending = false;
    function scheduleRedraw() {
        if (_rAFPending) return;
        _rAFPending = true;
        requestAnimationFrame(() => {
            _rAFPending = false;
            drawCanvas();
        });
    }

    // ── Debounce cho thay đổi màu sắc (120ms) ───────────────────────────────
    // Tránh clearTintCache + redraw quá nhiều khi click nhanh qua nhiều swatch
    let _colorDebounceTimer = null;
    function scheduleColorRedraw() {
        clearTimeout(_colorDebounceTimer);
        _colorDebounceTimer = setTimeout(() => {
            clearTintCache();
            scheduleRedraw();
        }, 120);
    }

    // Color Swatches Configuration
    const CORPORATE_COLORS = [
        { name: 'Trắng', hex: '#ffffff' },
        { name: 'Đen', hex: '#111827' },
        { name: 'Navy', hex: '#1e3a8a' },
        { name: 'Xanh bích', hex: '#1d4ed8' },
        { name: 'Royal Blue', hex: '#2563eb' },
        { name: 'Xanh da trời', hex: '#38bdf8' },
        { name: 'Xanh ngọc', hex: '#06b6d4' },
        { name: 'Xanh lá cây', hex: '#059669' },
        { name: 'Xanh rêu', hex: '#3f6212' },
        { name: 'Đỏ tươi', hex: '#dc2626' },
        { name: 'Đỏ đô', hex: '#7f1d1d' },
        { name: 'Cam', hex: '#f97316' },
        { name: 'Vàng', hex: '#eab308' },
        { name: 'Vàng đồng', hex: '#b45309' },
        { name: 'Xám ghi', hex: '#4b5563' },
        { name: 'Xám khói', hex: '#9ca3af' },
        { name: 'Kem', hex: '#fef3c7' },
        { name: 'Hồng', hex: '#ec4899' },
        { name: 'Tím', hex: '#7c3aed' },
        { name: 'Nâu đất', hex: '#78350f' }
    ];

    const SPORTY_COLORS = [];
    const WORKWEAR_COLORS = [
        { name: 'Trắng (Vải Kaki)', hex: '#ffffff', hasTexture: true, textureType: 'kaki' },
        { name: 'Kem (Vải Kaki)', hex: '#faf5e6', hasTexture: true, textureType: 'kaki' },
        { name: 'Ghi sáng (Vải Kaki)', hex: '#cbd5e1', hasTexture: true, textureType: 'kaki' },
        { name: 'Ghi trung (Vải Kaki)', hex: '#94a3b8', hasTexture: true, textureType: 'kaki' },
        { name: 'Ghi đậm (Vải Kaki)', hex: '#475569', hasTexture: true, textureType: 'kaki' },
        { name: 'Xám chì (Vải Kaki)', hex: '#2c353f', hasTexture: true, textureType: 'kaki' },
        { name: 'Đen (Vải Kaki)', hex: '#111827', hasTexture: true, textureType: 'kaki' },
        { name: 'Navy (Vải Kaki)', hex: '#1e3a8a', hasTexture: true, textureType: 'kaki' },
        { name: 'Xanh đen (Vải Kaki)', hex: '#0f172a', hasTexture: true, textureType: 'kaki' },
        { name: 'Xanh bích (Vải Kaki)', hex: '#1d4ed8', hasTexture: true, textureType: 'kaki' },
        { name: 'Xanh công nhân (Vải Kaki)', hex: '#2b509e', hasTexture: true, textureType: 'kaki' },
        { name: 'Xanh da trời (Vải Kaki)', hex: '#38bdf8', hasTexture: true, textureType: 'kaki' },
        { name: 'Xanh rêu (Vải Kaki)', hex: '#4d6b38', hasTexture: true, textureType: 'kaki' },
        { name: 'Xanh quân đội (Vải Kaki)', hex: '#40513b', hasTexture: true, textureType: 'kaki' },
        { name: 'Xanh ngọc (Vải Kaki)', hex: '#06b6d4', hasTexture: true, textureType: 'kaki' },
        { name: 'Đỏ tươi (Vải Kaki)', hex: '#dc2626', hasTexture: true, textureType: 'kaki' },
        { name: 'Đỏ đô (Vải Kaki)', hex: '#7f1d1d', hasTexture: true, textureType: 'kaki' },
        { name: 'Cam (Vải Kaki)', hex: '#f97316', hasTexture: true, textureType: 'kaki' },
        { name: 'Cam đất (Vải Kaki)', hex: '#b85124', hasTexture: true, textureType: 'kaki' },
        { name: 'Vàng (Vải Kaki)', hex: '#eab308', hasTexture: true, textureType: 'kaki' },
        { name: 'Vàng đồng (Vải Kaki)', hex: '#b45309', hasTexture: true, textureType: 'kaki' },
        { name: 'Vàng nghệ (Vải Kaki)', hex: '#caa023', hasTexture: true, textureType: 'kaki' },
        { name: 'Nâu đất (Vải Kaki)', hex: '#653818', hasTexture: true, textureType: 'kaki' },
        { name: 'Khaki (Vải Kaki)', hex: '#d6c597', hasTexture: true, textureType: 'kaki' }
    ];
    const TEXTURED_COLORS = [
        { name: 'Trắng (Vân thun cá sấu)', hex: '#ffffff', hasTexture: true, textureType: 'pique' },
        { name: 'Đen (Vân thun cá sấu)', hex: '#111827', hasTexture: true, textureType: 'pique' },
        { name: 'Navy (Vân thun cá sấu)', hex: '#1e3a8a', hasTexture: true, textureType: 'pique' },
        { name: 'Xanh bích (Vân thun cá sấu)', hex: '#1d4ed8', hasTexture: true, textureType: 'pique' },
        { name: 'Royal Blue (Vân thun cá sấu)', hex: '#2563eb', hasTexture: true, textureType: 'pique' },
        { name: 'Xanh da trời (Vân thun cá sấu)', hex: '#38bdf8', hasTexture: true, textureType: 'pique' },
        { name: 'Xanh ngọc (Vân thun cá sấu)', hex: '#06b6d4', hasTexture: true, textureType: 'pique' },
        { name: 'Xanh lá cây (Vân thun cá sấu)', hex: '#059669', hasTexture: true, textureType: 'pique' },
        { name: 'Xanh rêu (Vân thun cá sấu)', hex: '#3f6212', hasTexture: true, textureType: 'pique' },
        { name: 'Đỏ tươi (Vân thun cá sấu)', hex: '#dc2626', hasTexture: true, textureType: 'pique' },
        { name: 'Đỏ đô (Vân thun cá sấu)', hex: '#7f1d1d', hasTexture: true, textureType: 'pique' },
        { name: 'Cam (Vân thun cá sấu)', hex: '#f97316', hasTexture: true, textureType: 'pique' },
        { name: 'Vàng (Vân thun cá sấu)', hex: '#eab308', hasTexture: true, textureType: 'pique' },
        { name: 'Vàng đồng (Vân thun cá sấu)', hex: '#b45309', hasTexture: true, textureType: 'pique' },
        { name: 'Xám ghi (Vân thun cá sấu)', hex: '#4b5563', hasTexture: true, textureType: 'pique' },
        { name: 'Xám khói (Vân thun cá sấu)', hex: '#9ca3af', hasTexture: true, textureType: 'pique' },
        { name: 'Kem (Vân thun cá sấu)', hex: '#fef3c7', hasTexture: true, textureType: 'pique' },
        { name: 'Hồng (Vân thun cá sấu)', hex: '#ec4899', hasTexture: true, textureType: 'pique' },
        { name: 'Tím (Vân thun cá sấu)', hex: '#7c3aed', hasTexture: true, textureType: 'pique' },
        { name: 'Nâu đất (Vân thun cá sấu)', hex: '#78350f', hasTexture: true, textureType: 'pique' }
    ];

    const POLO_BUTTON_COLORS = [
        { name: 'Trắng', hex: '#FFFFFF' },
        { name: 'Trắng sữa', hex: '#F5F5F0' },
        { name: 'Kem', hex: '#EFE6D6' },
        { name: 'Xám nhạt', hex: '#D9D9D9' },
        { name: 'Xám ghi', hex: '#A8A8A8' },
        { name: 'Xám đậm', hex: '#666666' },
        { name: 'Đen', hex: '#111111' },
        { name: 'Navy', hex: '#1B2A49' },
        { name: 'Xanh đen', hex: '#102A43' },
        { name: 'Royal Blue', hex: '#1E5EFF' },
        { name: 'Xanh bích', hex: '#0088CC' },
        { name: 'Xanh ngọc', hex: '#00B5AD' },
        { name: 'Đỏ tươi', hex: '#E53935' },
        { name: 'Đỏ đô', hex: '#7B1E1E' },
        { name: 'Cam', hex: '#F57C00' },
        { name: 'Vàng', hex: '#FBC02D' },
        { name: 'Vàng đồng', hex: '#C99700' }
    ];

    const WORKWEAR_PLASTIC_BUTTONS = [
        { name: 'Nút nhựa Trắng', hex: '#ffffff', isPlastic: true },
        { name: 'Nút nhựa Ghi sáng', hex: '#cbd5e1', isPlastic: true },
        { name: 'Nút nhựa Ghi đậm', hex: '#475569', isPlastic: true },
        { name: 'Nút nhựa Đen', hex: '#111827', isPlastic: true },
        { name: 'Nút nhựa Navy', hex: '#1e3a8a', isPlastic: true },
        { name: 'Nút nhựa Xanh công nhân', hex: '#2b509e', isPlastic: true },
        { name: 'Nút nhựa Xanh rêu', hex: '#4d6b38', isPlastic: true },
        { name: 'Nút nhựa Vàng', hex: '#eab308', isPlastic: true },
        { name: 'Nút nhựa Cam', hex: '#f97316', isPlastic: true },
        { name: 'Nút nhựa Đỏ đô', hex: '#7f1d1d', isPlastic: true }
    ];

    const WORKWEAR_METAL_BUTTONS = [
        { name: 'Nút kim loại Xi bạc', hex: '#c0c0c0', isMetal: true, metalType: 'silver' },
        { name: 'Nút kim loại Xi niken', hex: '#a8a9ad', isMetal: true, metalType: 'nickel' },
        { name: 'Nút kim loại Xi đồng', hex: '#d4af37', isMetal: true, metalType: 'bronze' },
        { name: 'Nút kim loại Đồng giả cổ', hex: '#6b532a', isMetal: true, metalType: 'antique' },
        { name: 'Nút kim loại Sơn đen nhám', hex: '#1e1e1e', isMetal: true, metalType: 'matte' }
    ];

    // Snap Anchor Coordinates on 800x800 Canvas based on product & form
    const LOGO_ANCHORS = {
        'ao-polo': {
            'front': {
                'nguc-trai': { x: 320, y: 280, scale: 0.12 },
                'nguc-phai': { x: 480, y: 280, scale: 0.12 },
                'tay-trai': { x: 195, y: 310, scale: 0.09 },
                'tay-phai': { x: 605, y: 310, scale: 0.09 }
            },
            'back': {
                'sau-lung': { x: 400, y: 280, scale: 0.22 },
                'tay-trai': { x: 605, y: 310, scale: 0.09 }, // Flipped back
                'tay-phai': { x: 195, y: 310, scale: 0.09 }
            },
            'left': {
                'tay-trai': { x: 400, y: 320, scale: 0.18 },
                'nguc-trai': { x: 490, y: 300, scale: 0.08 }
            },
            'right': {
                'tay-phai': { x: 400, y: 320, scale: 0.18 },
                'nguc-phai': { x: 310, y: 300, scale: 0.08 }
            }
        },
        'ao-thun': {
            'front': {
                'nguc-trai': { x: 320, y: 270, scale: 0.12 },
                'nguc-phai': { x: 480, y: 270, scale: 0.12 },
                'tay-trai': { x: 200, y: 290, scale: 0.09 },
                'tay-phai': { x: 600, y: 290, scale: 0.09 }
            },
            'back': {
                'sau-lung': { x: 400, y: 280, scale: 0.22 },
                'tay-trai': { x: 600, y: 290, scale: 0.09 },
                'tay-phai': { x: 200, y: 290, scale: 0.09 }
            },
            'left': {
                'tay-trai': { x: 400, y: 310, scale: 0.18 }
            },
            'right': {
                'tay-phai': { x: 400, y: 310, scale: 0.18 }
            }
        },
        'ao-bao-ho': {
            'front': {
                'nguc-trai': { x: 315, y: 290, scale: 0.13 },
                'nguc-phai': { x: 485, y: 290, scale: 0.13 },
                'tay-trai': { x: 180, y: 330, scale: 0.09 },
                'tay-phai': { x: 620, y: 330, scale: 0.09 }
            },
            'back': {
                'sau-lung': { x: 400, y: 270, scale: 0.24 },
                'tay-trai': { x: 620, y: 330, scale: 0.09 },
                'tay-phai': { x: 180, y: 330, scale: 0.09 }
            },
            'left': {
                'tay-trai': { x: 400, y: 320, scale: 0.18 }
            },
            'right': {
                'tay-phai': { x: 400, y: 320, scale: 0.18 }
            }
        },
        'quan-bao-ho': {
            'front': {
                'nguc-trai': { x: 330, y: 450, scale: 0.1 }, // snap on thighs
                'nguc-phai': { x: 470, y: 450, scale: 0.1 }
            },
            'back': {
                'sau-lung': { x: 400, y: 450, scale: 0.15 } // snap back pockets
            },
            'left': {
                'tay-trai': { x: 400, y: 450, scale: 0.15 }
            },
            'right': {
                'tay-phai': { x: 400, y: 450, scale: 0.15 }
            }
        }
    };

    // Map Product Angles to folder path inside /public/
    function getProductFolder(product, form, angle) {
        if (product === 'ao-polo') {
            const formPath = form === 'nam' ? 'ao-polo-nam' : 'ao-polo-nu';
            let anglePath = '';
            if (angle === 'front') anglePath = 'phia-truoc-ao-polo';
            else if (angle === 'back') anglePath = 'phia-sau-ao-polo';
            else if (angle === 'left') anglePath = form === 'nam' ? 'ben-trai-ao-polo' : 'phia-trai-ao-polo';
            else if (angle === 'right') anglePath = form === 'nam' ? 'ben-phai-ao-polo' : 'phia-phai-ao-polo';
            return `public/${formPath}/${anglePath}`;
        }
        
        if (product === 'ao-thun') {
            const formPath = form === 'nam' ? 'ao-thun-nam' : 'ao-thun-nu';
            let anglePath = '';
            if (angle === 'front') anglePath = form === 'nam' ? 'ao-thun-nam-phia-truoc' : 'ao-thun-nu-phia-truoc';
            else if (angle === 'back') anglePath = form === 'nam' ? 'ao-thun-nam-phia-sau' : 'ao-thun-nu-phia-sau';
            else if (angle === 'left') anglePath = form === 'nam' ? 'ao-thun-nam-nhin-ben-trai' : 'ao-thun-nu-nhin-ngan-trai';
            else if (angle === 'right') anglePath = form === 'nam' ? 'ao-thun-nam-nhin-ben-phai' : 'ao-thun-nu-nhin-ngan-phai';
            return `public/${formPath}/${anglePath}`;
        }

        if (product === 'ao-bao-ho') {
            let anglePath = '';
            if (angle === 'front') anglePath = 'phia-truoc';
            else if (angle === 'back') anglePath = 'phia-sau';
            else if (angle === 'left') anglePath = 'ben-trai';
            else if (angle === 'right') anglePath = 'ben-phai';
            return `public/quan-ao-bao-ho-lao-dong/ao-bao-ho-lao-dong/${anglePath}`;
        }

        if (product === 'quan-bao-ho') {
            let anglePath = '';
            if (angle === 'front') anglePath = 'phia-truoc';
            else if (angle === 'back') anglePath = 'phia-sau';
            else if (angle === 'left') anglePath = 'ben-trai';
            else if (angle === 'right') anglePath = 'ben-phai';
            return `public/quan-ao-bao-ho-lao-dong/quan-bao-ho-lao-dong/${anglePath}`;
        }
    }

    // Get layer definitions based on active parameters
    function getLayersConfig() {
        const folder = getProductFolder(state.product, state.form, state.angle);
        const list = [];
        
        if (state.product === 'ao-polo') {
            if (state.form === 'nam') {
                if (state.angle === 'front') {
                    list.push({ id: 'than', name: 'Thân Áo', file: 'than-ao-polo-nam-phia-truoc.png', colorizable: true });
                    list.push({ id: 'tay-phai', name: 'Tay Phai', file: 'tay-phai-ao-polo-nam-phia-truoc.png', colorizable: true, group: 'tay' });
                    list.push({ id: 'tay-trai', name: 'Tay Trai', file: 'tay-trai-ao-polo-nam-phia-truoc.png', colorizable: true, group: 'tay' });
                    list.push({ id: 'bo-tay-phai', name: 'Bo Tay Phai', file: 'bo-tay-phai-ao-polo-phia-truoc.png', colorizable: true, group: 'bo-tay' });
                    list.push({ id: 'bo-tay-trai', name: 'Bo Tay Trai', file: 'bo-tay-trai-ao-polo-phia-truoc.png', colorizable: true, group: 'bo-tay' });
                    list.push({ id: 'co-trong', name: 'Chân Cổ Trong', file: 'mat-trong-chan-co-ao-polo-nam.png', colorizable: true, group: 'than' });
                    list.push({ id: 'co', name: 'Cổ Áo', file: 'co-ao-polo-nam.png', colorizable: true });
                    list.push({ id: 'tru-co', name: 'Trụ Cổ', file: 'tru-co-ao-polo-nam.png', colorizable: true });
                    list.push({ id: 'vien-co', name: 'Viền Cổ', file: 'vien-co-ao-polo-nam.png', colorizable: true });
                    list.push({ id: 'nut', name: 'Khuy Nút', file: 'nut-ao-polo-nam.png', colorizable: true });
                } else if (state.angle === 'back') {
                    list.push({ id: 'than', name: 'Thân Sau', file: 'than-ao-polo-nam-phia-sau.png', colorizable: true });
                    list.push({ id: 'tay-phai', name: 'Tay Phai Sau', file: 'tay-phai-ao-polo-phia-sau.png', colorizable: true, group: 'tay' });
                    list.push({ id: 'tay-trai', name: 'Tay Trai Sau', file: 'tay-trai-ao-polo-phia-sau.png', colorizable: true, group: 'tay' });
                    list.push({ id: 'bo-tay-phai', name: 'Bo Tay Phai', file: 'bo-tay-phai-ao-polo-phia-sau.png', colorizable: true, group: 'bo-tay' });
                    list.push({ id: 'bo-tay-trai', name: 'Bo Tay Trai', file: 'bo-tay-trai-ao-polo-phia-sau.png', colorizable: true, group: 'bo-tay' });
                    list.push({ id: 'co', name: 'Cổ Áo Sau', file: 'co-ao-polo-nam-phia-sau.png', colorizable: true });
                } else { // Left/Right nam
                    const side = state.angle === 'left' ? 'trai' : 'phai';
                    const sideName = state.angle === 'left' ? 'Trái' : 'Phải';
                    list.push({ id: 'than', name: `Thân ${sideName}`, file: `than-ao-polo-nam-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'tay', name: `Tay ${sideName}`, file: `tay-ao-polo-nam-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'bo-tay', name: `Bo Tay ${sideName}`, file: `bo-tay-ao-polo-nam-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'co', name: `Cổ Áo ${sideName}`, file: `co-ao-polo-nam-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'tru-co', name: `Trụ Cổ ${sideName}`, file: `tru-co-ao-polo-nam-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'nut', name: `Khuy Nút ${sideName}`, file: `nut-ao-polo-nam-nhin-ngan-${side}.png`, colorizable: true });
                }
            } else { // Form Nữ Polo
                if (state.angle === 'front') {
                    list.push({ id: 'than', name: 'Thân Áo', file: 'than-ao-polo-nu-phia-truoc.png', colorizable: true });
                    list.push({ id: 'tay-phai', name: 'Tay Phai', file: 'tay-phai-ao-polo-nu-phia-truoc.png', colorizable: true, group: 'tay' });
                    list.push({ id: 'tay-trai', name: 'Tay Trai', file: 'tay-trai-ao-polo-nu-phia-truoc.png', colorizable: true, group: 'tay' });
                    list.push({ id: 'bo-tay-phai', name: 'Bo Tay Phai', file: 'bo-tay-phai-ao-polo-nu.png', colorizable: true, group: 'bo-tay' });
                    list.push({ id: 'bo-tay-trai', name: 'Bo Tay Trai', file: 'bo-tay-trai-ao-polo-nu.png', colorizable: true, group: 'bo-tay' });
                    list.push({ id: 'co-trong', name: 'Chân Cổ Trong', file: 'mat-trong-chan-co-ao-polo-nu.png', colorizable: true, group: 'than' });
                    list.push({ id: 'co', name: 'Cổ Áo', file: 'co-ao-polo-nu-phia-truoc.png', colorizable: true });
                    list.push({ id: 'tru-co', name: 'Trụ Cổ', file: 'tru-co-ao-polo-nu.png', colorizable: true });
                    list.push({ id: 'vien-co', name: 'Viền Cổ', file: 'vien-co-ao-polo-nu.png', colorizable: true });
                    list.push({ id: 'nut', name: 'Khuy Nút', file: 'nut-ao-polo-nu.png', colorizable: true });
                } else if (state.angle === 'back') {
                    list.push({ id: 'than', name: 'Thân Sau', file: 'than-ao-polo-nu-phia-sau.png', colorizable: true });
                    list.push({ id: 'tay-phai', name: 'Tay Phai Sau', file: 'tay-phai-ao-polo-nu-phia-sau.png', colorizable: true, group: 'tay' });
                    list.push({ id: 'tay-trai', name: 'Tay Trai Sau', file: 'tay-trai-ao-polo-nu-phia-sau.png', colorizable: true, group: 'tay' });
                    list.push({ id: 'bo-tay-phai', name: 'Bo Tay Phai', file: 'bo-tay-phai-ao-polo-nu-phia-sau.png', colorizable: true, group: 'bo-tay' });
                    list.push({ id: 'bo-tay-trai', name: 'Bo Tay Trai', file: 'bo-tay-trai-ao-polo-nu-phia-sau.png', colorizable: true, group: 'bo-tay' });
                    list.push({ id: 'co', name: 'Cổ Áo Sau', file: 'co-ao-polo-nu-phia-sau.png', colorizable: true });
                } else { // Left/Right nu
                    const side = state.angle === 'left' ? 'trai' : 'phai';
                    const sideName = state.angle === 'left' ? 'Trái' : 'Phải';
                    list.push({ id: 'than', name: `Thân ${sideName}`, file: `than-ao-polo-nu-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'tay', name: `Tay ${sideName}`, file: `tay-ao-polo-nu-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'bo-tay', name: `Bo Tay ${sideName}`, file: `bo-tay-ao-polo-nu-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'co', name: `Cổ Áo ${sideName}`, file: `co-ao-polo-nu-nhin-ngan-${side}.png`, colorizable: true });
                    list.push({ id: 'tru-co', name: `Trụ Cổ ${sideName}`, file: `tru-co-ao-polo-nu-nhin-ngan-${side}.png`, colorizable: true });
                }
            }
        }

        if (state.product === 'ao-thun') {
            const sideSfx = state.form === 'nam' ? 'nam' : 'nu';
            if (state.angle === 'front') {
                list.push({ id: 'than', name: 'Thân Áo', file: `than-ao-thun-${sideSfx}-phia-truoc.png`, colorizable: true });
                list.push({ id: 'tay-phai', name: 'Tay Phai', file: `tay-ao-thun-${sideSfx}-phia-truoc-ben-phai.png`, colorizable: true, group: 'tay' });
                list.push({ id: 'tay-trai', name: 'Tay Trai', file: `tay-ao-thun-${sideSfx}-phia-truoc-ben-trai.png`, colorizable: true, group: 'tay' });
                list.push({ id: 'bo-tay-phai', name: 'Bo Tay Phai', file: `bo-tay-ao-thun-${sideSfx}-phia-truoc-ben-phai.png`, colorizable: true, group: 'bo-tay' });
                list.push({ id: 'bo-tay-trai', name: 'Bo Tay Trai', file: `bo-tay-ao-thun-${sideSfx}-phia-truoc-ben-trai.png`, colorizable: true, group: 'bo-tay' });
                list.push({ id: 'co', name: 'Bo Cổ', file: `co-ao-thun-${sideSfx}-phia-truoc.png`, colorizable: true });
                list.push({ id: 'chan-co', name: 'Chân Cổ', file: `chan-co-ao-thun-${sideSfx}-phia-truoc.png`, colorizable: true });
                if (state.form === 'nam') {
                    list.push({ id: 'co-trong', name: 'Chân Cổ Trong', file: 'mat-trong-chan-co-ao-thun-nam.png', colorizable: true, group: 'than' });
                } else {
                    list.push({ id: 'co-trong', name: 'Chân Cổ Trong', file: 'mat-trong-chan-co-ao-thun-nu.png', colorizable: true, group: 'than' });
                }
            } else if (state.angle === 'back') {
                list.push({ id: 'than', name: 'Thân Sau', file: `than-ao-thun-${sideSfx}-phia-sau.png`, colorizable: true });
                list.push({ id: 'tay-phai', name: 'Tay Phai Sau', file: `tay-ao-thun-${sideSfx}-phia-sau-ben-phai.png`, colorizable: true, group: 'tay' });
                list.push({ id: 'tay-trai', name: 'Tay Trai Sau', file: `tay-ao-thun-${sideSfx}-phia-sau-ben-trai.png`, colorizable: true, group: 'tay' });
                list.push({ id: 'bo-tay-phai', name: 'Bo Tay Phai', file: `bo-tay-ao-thun-${sideSfx}-phia-sau-ben-phai.png`, colorizable: true, group: 'bo-tay' });
                list.push({ id: 'bo-tay-trai', name: 'Bo Tay Trai', file: `bo-tay-ao-thun-${sideSfx}-phia-sau-ben-trai.png`, colorizable: true, group: 'bo-tay' });
                list.push({ id: 'co', name: 'Bo Cổ Sau', file: `co-ao-thun-${sideSfx}-phia-sau.png`, colorizable: true });
            } else { // Left/Right side T-shirt
                const isLeft = state.angle === 'left';
                const fileDir = isLeft ? 'trai' : 'phai';
                const txt = isLeft ? 'Trái' : 'Phải';
                
                if (state.form === 'nam') {
                    list.push({ id: 'than', name: `Thân ${txt}`, file: `than-ao-thun-nam-nhin-ben-${fileDir}.png`, colorizable: true });
                    list.push({ id: 'tay', name: `Tay ${txt}`, file: isLeft ? `tay-ao-thun-nam-nhin-ben-trai.png` : `tay-ao-thun-nam-nhin-ngan-ben-phai.png`, colorizable: true });
                    list.push({ id: 'bo-tay', name: `Bo Tay ${txt}`, file: `bo-tay-ao-thun-nam-nhin-ben-${fileDir}.png`, colorizable: true });
                    list.push({ id: 'co', name: `Bo Cổ ${txt}`, file: `co-ao-thun-nam-nhin-ben-${fileDir}.png`, colorizable: true });
                } else { // Nu Left/Right
                    list.push({ id: 'than', name: `Thân ${txt}`, file: `than-ao-nu-nhin-ngan-${fileDir}.png`, colorizable: true });
                    list.push({ id: 'tay', name: `Tay ${txt}`, file: `tay-ao-nu-nhin-ngan-${fileDir}.png`, colorizable: true });
                    list.push({ id: 'bo-tay', name: `Bo Tay ${txt}`, file: `bo-tay-ao-nu-nhin-ngan-${fileDir}.png`, colorizable: true });
                    list.push({ id: 'co', name: `Bo Cổ ${txt}`, file: `co-ao-thun-nu-nhin-ngan-${fileDir}.png`, colorizable: true });
                }
            }
        }

        if (state.product === 'ao-bao-ho') {
            if (state.angle === 'front') {
                list.push({ id: 'than-phai', name: 'Thân Phải', file: 'than-ao-bhld-phia-truoc-ben-phai.png', colorizable: true, group: 'than' });
                list.push({ id: 'than-trai', name: 'Thân Trái', file: 'than-ao-bhld-phia-truoc-ben-trai.png', colorizable: true, group: 'than' });
                list.push({ id: 'nguc-phai', name: 'Ngực Phải', file: 'nguc-ao-bhld-phia-truoc-ben-phai.png', colorizable: true });
                list.push({ id: 'nguc-trai', name: 'Ngực Trái', file: 'nguc-ao-bhld-phia-truoc-ben-trai.png', colorizable: true });
                list.push({ id: 'tay-phai', name: 'Tay Phải', file: 'tay-ao-bhld-phia-truoc-ben-phai.png', colorizable: true, group: 'tay' });
                list.push({ id: 'tay-trai', name: 'Tay Trái', file: 'tay-ao-bhld-phia-truoc-ben-trai.png', colorizable: true, group: 'tay' });
                list.push({ id: 'bo-tay-phai', name: 'Cổ Tay Phải', file: 'co-tay-ao-bhld-phia-truoc-ben-phai.png', colorizable: true, group: 'bo-tay' });
                list.push({ id: 'bo-tay-trai', name: 'Cổ Tay Trái', file: 'co-tay-ao-bhld-phia-truoc-ben-trai.png', colorizable: true, group: 'bo-tay' });
                list.push({ id: 'co', name: 'Cổ Áo', file: 'co-ao-bhld-truoc.png', colorizable: true });
                list.push({ id: 'vien-co', name: 'Viền Cổ', file: 'vien-co-ao-bhld-truoc.png', colorizable: true });
                list.push({ id: 'tru-co', name: 'Nẹp Áo', file: 'nep-ao-bhld-truoc.png', colorizable: true });
                list.push({ id: 'co-ao-bhld-truoc-1', name: 'Cổ Phụ 1', file: 'ao-bhld-truoc-1.png', colorizable: true, optional: true });
                list.push({ id: 'bo-tay', name: 'Đai Áo', file: 'dai-ao-bhld-truoc.png', colorizable: true });
                
                // Pockets (Toggles)
                if (state.pockets.left) {
                    list.push({ id: 'tui', name: 'Túi Ngực Trái', file: 'tui-ao-bhld-trai-truoc.png', colorizable: true });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui', name: 'Nắp Túi Trái', file: 'nap-tui-ao-bhld-trai-truoc.png', colorizable: true });
                        list.push({ id: 'nut-tui', name: 'Nút Nắp Trái', file: 'nut-nap-ao-bhld-trai-truoc.png', colorizable: true, group: 'nut' });
                    }
                }
                if (state.pockets.right) {
                    list.push({ id: 'tui', name: 'Túi Ngực Phải', file: 'tui-ao-bhld-phai-truoc.png', colorizable: true });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui', name: 'Nắp Túi Phải', file: 'nap-tui-ao-bhld-phai-truoc.png', colorizable: true });
                        list.push({ id: 'nut-tui', name: 'Nút Nắp Phải', file: 'nut-nap-ao-bhld-phai-truoc.png', colorizable: true, group: 'nut' });
                    }
                }
                if (state.pockets.sleeve) {
                    list.push({ id: 'tui-tay-phai', name: 'Túi Tay Phải', file: 'tui-tay-ao-bhld-phai-truoc.png', colorizable: true, group: 'tui' });
                    list.push({ id: 'tui-tay-trai', name: 'Túi Tay Trái', file: 'tui-tay-ao-bhld-trai-truoc.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui-tay-phai', name: 'Nắp Túi Tay Phải', file: 'nap-tui-tay-ao-bhld-phai-truoc.png', colorizable: true, group: 'nap-tui' });
                        list.push({ id: 'nap-tui-tay-trai', name: 'Nắp Túi Tay Trái', file: 'nap-tui-tay-ao-bhld-trai-truoc.png', colorizable: true, group: 'nap-tui' });
                    }
                }

                list.push({ id: 'nut', name: 'Nút Thân Áo', file: 'nut-than-ao-bhld-truoc.png', colorizable: true });
                
                // Reflective strips (Front view)
                if (state.reflective.chest) {
                    list.push({ id: 'phan-quang', name: 'Dải Phản Quang Ngực', file: 'day-phan-quan-nguc-ao-bhld-truoc.png', colorizable: true });
                    list.push({ id: 'phan-quang-dai', name: 'Dải Phản Quang Đai', file: 'day-phan-quang-dai-ao-bhld-truoc.png', colorizable: true, group: 'phan-quang' });
                }
                if (state.reflective.shoulders) {
                    list.push({ id: 'phan-quang-vai-phai', name: 'Dải Phản Quang Vai Phải', file: 'day-phan-quan-vai-ao-bhld-phai-truoc.png', colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-vai-trai', name: 'Dải Phản Quang Vai Trái', file: 'day-phan-quan-vai-ao-bhld-trai-truoc.png', colorizable: true, group: 'phan-quang' });
                }
                if (state.reflective.sleeves) {
                    list.push({ id: 'phan-quang-tay-phai', name: 'Dải Phản Quang Tay Phải', file: 'day-phan-quan-tay-ao-bhld-phai-truoc.png', colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-tay-trai', name: 'Dải Phản Quang Tay Trái', file: 'day-phan-quan-tay-ao-bhld-trai-truoc.png', colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-co-tay-phai', name: 'Dải Phản Quang Cổ Tay Phải', file: 'day-phan-quan-co-tay-ao-bhld-phai-truoc.png', colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-co-tay-trai', name: 'Dải Phản Quang Cổ Tay Trái', file: 'day-phan-quang-co-tay-ao-bhld-trai-truoc.png', colorizable: true, group: 'phan-quang' });
                }

            } else if (state.angle === 'back') {
                list.push({ id: 'than-duoi', name: 'Lưng Dưới', file: 'lung-duoi-ao-bhld-phia-sau.png', colorizable: true, group: 'than' });
                list.push({ id: 'than-tren', name: 'Lưng Trên', file: 'lung-tren-ao-bhld-phia-sau.png', colorizable: true, group: 'than' });
                list.push({ id: 'tay-phai', name: 'Tay Phải', file: 'tay-ao-bhld-phai-sau.png', colorizable: true, group: 'tay' });
                list.push({ id: 'tay-trai', name: 'Tay Trái', file: 'tay-ao-bhld-trai-sau.png', colorizable: true, group: 'tay' });
                list.push({ id: 'bo-tay-phai', name: 'Cổ Tay Phải', file: 'co-tay-ao-bhld-phai-sau.png', colorizable: true, group: 'bo-tay' });
                list.push({ id: 'bo-tay-trai', name: 'Cổ Tay Trái', file: 'co-tay-ao-bhld-trai-sau.png', colorizable: true, group: 'bo-tay' });
                list.push({ id: 'co', name: 'Cổ Áo Sau', file: 'co-ao-bhld-phia-sau.png', colorizable: true });
                list.push({ id: 'bo-tay', name: 'Đai Áo Sau', file: 'dai-ao-bhld-sau.png', colorizable: true });
                list.push({ id: 'vien-sau', name: 'Viền Sau', file: 'vien-ao-bhld-phia-sau.png', colorizable: true });
                
                if (state.pockets.sleeve) {
                    list.push({ id: 'tui-tay-phai', name: 'Túi Tay Phải', file: 'tui-tay-ao-bhld-phai-sau.png', colorizable: true, group: 'tui' });
                    list.push({ id: 'tui-tay-trai', name: 'Túi Tay Trái', file: 'tui-tay-ao-bhld-trai-sau.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui-tay-phai', name: 'Nắp Túi Tay Phải', file: 'nap-tui-tay-ao-bhld-phai-sau.png', colorizable: true, group: 'nap-tui' });
                        list.push({ id: 'nap-tui-tay-trai', name: 'Nắp Túi Tay Trái', file: 'nap-tui-tay-ao-bhld-trai-sau.png', colorizable: true, group: 'nap-tui' });
                    }
                }

                // Cuff buttons (Back view)
                list.push({ id: 'nut-co-tay', name: 'Nút Cổ Tay Áo', file: 'nut-co-tay-ao-bhld-sau.png', colorizable: true, group: 'nut' });

                // Reflective strips (Back view)
                if (state.reflective.chest) {
                    list.push({ id: 'phan-quang', name: 'Dải Phản Quang Lưng', file: 'day-phan-quang-lung-ao-bhld-sau.png', colorizable: true });
                    list.push({ id: 'phan-quang-dai', name: 'Dải Phản Quang Đai Sau', file: 'day-phan-quang-dai-ao-bhld-sau.png', colorizable: true, group: 'phan-quang' });
                }
                if (state.reflective.shoulders) {
                    list.push({ id: 'phan-quang-vai-phai', name: 'Dải Phản Quang Vai Phải', file: 'day-phan-quang-vai-ao-bhld-phai-sau.png', colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-vai-trai', name: 'Dải Phản Quang Vai Trái', file: 'day-phan-quang-vai-ao-bhld-trai-sau.png', colorizable: true, group: 'phan-quang' });
                }
                if (state.reflective.sleeves) {
                    list.push({ id: 'phan-quang-tay-phai', name: 'Dải Phản Quang Tay Phải', file: 'day-phan-quang-tay-ao-bhld-phai-sau.png', colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-tay-trai', name: 'Dải Phản Quang Tay Trái', file: 'day-phan-quang-tay-ao-bhld-trai-sau.png', colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-co-tay-phai', name: 'Dải Phản Quang Cổ Tay Phải', file: 'day-phan-quang-co-tay-ao-bhld-phia-sau-ben-phai.png', colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-co-tay-trai', name: 'Dải Phản Quang Cổ Tay Trái', file: 'day-phan-quang-co-tay-ao-bhld-phia-sau-ben-trai.png', colorizable: true, group: 'phan-quang' });
                }
            } else { // Left/Right Workwear Jacket
                const isLeft = state.angle === 'left';
                const s = isLeft ? 'trai' : 'phai';
                const sTxt = isLeft ? 'Trái' : 'Phải';
                
                list.push({ id: 'than-truoc', name: `Thân Trước ${sTxt}`, file: 'than-truoc-ao-bhld-nhin-ngan.png', colorizable: true, group: 'than' });
                list.push({ id: 'than-duoi', name: `Lưng Dưới ${sTxt}`, file: `lung-duoi-ao-bhld-nhin-ngan-${s}.png`, colorizable: true, group: 'than' });
                list.push({ id: 'than-tren', name: `Lưng Trên ${sTxt}`, file: `lung-tren-ao-bhld-nhin-ngan-${s}.png`, colorizable: true, group: 'than' });
                list.push({ id: `nguc-${s}`, name: `Ngực ${sTxt}`, file: `nguc-ao-bhld-nhin-ngan-${s}.png`, colorizable: true });
                list.push({ id: 'tay', name: `Tay ${sTxt}`, file: `tay-ao-bhld-nhin-ngan-${s}.png`, colorizable: true });
                list.push({ id: 'bo-tay', name: `Cổ Tay ${sTxt}`, file: `co-tay-ao-bhld-nhin-ngan-${s}.png`, colorizable: true });
                list.push({ id: 'co', name: `Cổ Áo ${sTxt}`, file: `co-ao-bhld-${s}.png`, colorizable: true });
                list.push({ id: 'dai-ao', name: `Đai Áo ${sTxt}`, file: `dai-lung-duoi-ao-bhld-nhin-ngan-${s}.png`, colorizable: true, group: 'bo-tay' });
                list.push({ id: 'vien-lung', name: `Viền Lưng ${sTxt}`, file: `vien-lung-ao-bhld-nhin-ngan-${s}.png`, colorizable: true });

                if (isLeft && state.pockets.left) {
                    list.push({ id: 'tui', name: 'Túi Ngực Trái', file: 'tui-ao-bhld-nhin-ngan-trai.png', colorizable: true });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui', name: 'Nắp Túi Trái', file: 'nap-tui-ao-nhin-ngan-trai.png', colorizable: true });
                        list.push({ id: 'nut-tui', name: 'Cúc Nắp Trái', file: 'nut-nap-ao-bhld-nhin-ngan-trai.png', colorizable: true, group: 'nut' });
                    }
                } else if (!isLeft && state.pockets.right) {
                    list.push({ id: 'tui', name: 'Túi Ngực Phải', file: 'tui-ao-bhld-nhin-ngan-phai.png', colorizable: true });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui', name: 'Nắp Túi Phải', file: 'nap-tui-ao-nhin-ngan-phai.png', colorizable: true });
                        list.push({ id: 'nut-tui', name: 'Cúc Nắp Phải', file: 'nut-nap-ao-bhld-nhin-ngan-phai.png', colorizable: true, group: 'nut' });
                    }
                }

                if (state.pockets.sleeve) {
                    list.push({ id: 'tui-tay', name: `Túi Tay ${sTxt}`, file: `tui-tay-ao-bhld-ngan-${s}.png`, colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui-tay', name: `Nắp Túi Tay ${sTxt}`, file: `nap-tui-tay-ao-bhld-ngan-${s}.png`, colorizable: true, group: 'nap-tui' });
                    }
                }

                list.push({ id: 'nut-dai', name: 'Cúc Đai Áo', file: `nut-dai-lung-duoi-ao-bhld-nhin-ngan-${s}.png`, colorizable: false });

                // Cuff button (Side views)
                list.push({ id: 'nut-co-tay', name: 'Nút Cổ Tay Áo', file: `nut-co-tay-ao-bhld-nhin-ngan-${s}.png`, colorizable: true, group: 'nut' });

                // Reflective strips (Side views)
                if (state.reflective.chest) {
                    list.push({ id: 'phan-quang', name: `Dải Phản Quang Lưng ${sTxt}`, file: `day-phan-quang-lung-ao-bhld-nhin-ngan-${s}.png`, colorizable: true });
                    list.push({ id: 'phan-quang-dai', name: `Dải Phản Quang Đai ${sTxt}`, file: `day-phan-quang-dai-lung-duoi-ao-bhld-nhin-ngan-${s}.png`, colorizable: true, group: 'phan-quang' });
                }
                if (state.reflective.shoulders) {
                    list.push({ id: 'phan-quang-vai', name: `Dải Phản Quang Vai ${sTxt}`, file: `day-phan-quang-vai-ao-bhld-ngan-${s}.png`, colorizable: true, group: 'phan-quang' });
                }
                if (state.reflective.sleeves) {
                    list.push({ id: 'phan-quang-tay', name: `Dải Phản Quang Tay ${sTxt}`, file: `day-phan-quang-tay-ao-bhld-ngan-${s}.png`, colorizable: true, group: 'phan-quang' });
                    list.push({ id: 'phan-quang-co-tay', name: `Dải Phản Quang Cổ Tay ${sTxt}`, file: `day-phan-quang-co-tay-ao-bhld-ngan-${s}.png`, colorizable: true, group: 'phan-quang' });
                }
            }
        }

        if (state.product === 'quan-bao-ho') {
            const side = state.angle;
            
            if (side === 'front') {
                list.push({ id: 'than', name: 'Thân Quần', file: 'quan-bhld-khong-tui-phia-truoc.png', colorizable: true });
                list.push({ id: 'nut', name: 'Nút Quần', file: 'nut-quan-bhld-truoc.png', colorizable: true });
                
                if (state.pockets.left) {
                    list.push({ id: 'tui-trai-1', name: 'Túi Trái Trên', file: 'tui1-quan-bhld-phia-truoc-ben-trai.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-trai-1', name: 'Nắp Túi Trái Trên', file: 'nap1-tui-quan-bhld-truoc-ben-trai.png', colorizable: true, group: 'nap-tui' });
                        list.push({ id: 'nut-trai-1', name: 'Cúc Túi Trái Trên', file: 'nut1-tui-quan-bhld-truoc-ben-trai.png', colorizable: true, group: 'nut' });
                    }
                }
                if (state.pockets.right) {
                    list.push({ id: 'tui-phai-1', name: 'Túi Phải Trên', file: 'tui1-quan-bhld-phia-truoc-ben-phai.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-phai-1', name: 'Nắp Túi Phải Trên', file: 'nap1-tui-quan-bhld-truoc-ben-phai.png', colorizable: true, group: 'nap-tui' });
                        list.push({ id: 'nut-phai-1', name: 'Cúc Túi Phải Trên', file: 'nut1-tui-quan-bhld-truoc-ben-phai.png', colorizable: true, group: 'nut' });
                    }
                }
                if (state.pockets.sleeve) { // Map to lower left thigh pocket
                    list.push({ id: 'tui-trai-2', name: 'Túi Hộp Trái Đùi', file: 'tui2-quan-bhld-phia-truoc-ben-trai.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-trai-2', name: 'Nắp Túi Trái Đùi', file: 'nap2-tui-quan-bhld-truoc-ben-trai.png', colorizable: true, group: 'nap-tui' });
                    }
                }
                if (state.pockets.sleeveRight) { // Map to lower right thigh pocket
                    list.push({ id: 'tui-phai-2', name: 'Túi Hộp Phải Đùi', file: 'tui2-quan-bhld-phia-truoc-ben-phai.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-phai-2', name: 'Nắp Túi Phải Đùi', file: 'nap2-tui-quan-bhld-truoc-ben-phai.png', colorizable: true, group: 'nap-tui' });
                    }
                }
            } else if (side === 'back') {
                list.push({ id: 'than', name: 'Thân Quần Sau', file: 'quan-bhld-phia-sau.png', colorizable: true });
                list.push({ id: 'tui-mac-dinh-sau', name: 'Túi Mông Mặc Định', file: 'tui-quan-bhld-phia-sau.png', colorizable: true, group: 'tui' });
                list.push({ id: 'nap-tui-mac-dinh-sau', name: 'Nắp Túi Mông Mặc Định', file: 'nap-tui-quan-bhld-phia-sau.png', colorizable: true, group: 'nap-tui' });
                
                if (state.pockets.left) {
                    list.push({ id: 'tui-trai-1', name: 'Túi Mông Trái', file: 'tui1-quan-bhld-phia-sau-trai.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-trai-1', name: 'Nắp Túi Mông Trái', file: 'nap1-tui-quan-bhld-phia-sau-trai.png', colorizable: true, group: 'nap-tui' });
                        list.push({ id: 'nut-trai-1', name: 'Nút Nắp Trái', file: 'nut-tui-quan-bhld-phia-sau-trai.png', colorizable: true, group: 'nut' });
                    }
                }
                if (state.pockets.right) {
                    list.push({ id: 'tui-phai-1', name: 'Túi Mông Phải', file: 'tui1-quan-bhld-phia-sau-phai.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-phai-1', name: 'Nắp Túi Mông Phải', file: 'nap1-tui-quan-bhld-phia-sau-phai.png', colorizable: true, group: 'nap-tui' });
                    }
                }
                if (state.pockets.sleeve) {
                    list.push({ id: 'tui-trai-2', name: 'Túi Hộp Trái Đùi Sau', file: 'tui2-quan-bhld-phia-sau-trai.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-trai-2', name: 'Nắp Đùi Trái Sau', file: 'nap2-tui-quan-bhld-phia-sau-trai.png', colorizable: true, group: 'nap-tui' });
                    }
                }
                if (state.pockets.sleeveRight) {
                    list.push({ id: 'tui-phai-2', name: 'Túi Hộp Phải Đùi Sau', file: 'tui2-quan-bhld-phia-sau-phai.png', colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-phai-2', name: 'Nắp Đùi Phải Sau', file: 'nap2-tui-quan-bhld-phia-sau-phai.png', colorizable: true, group: 'nap-tui' });
                    }
                }
            } else { // Left/Right side pants
                const isL = side === 'left';
                const sideText = isL ? 'trai' : 'phai';
                list.push({ id: 'than', name: `Thân Quần ${isL ? 'Trái' : 'Phải'}`, file: `quan-bhld-nhin-ngan-${sideText}.png`, colorizable: true });
                
                // 1. Dải túi mặc định phía sau quần nhìn nghiêng (hiển thị mặc định)
                list.push({ id: 'tui-mac-dinh-suon', name: 'Túi Mông Mặc Định', file: `tui-quan-bhld-nhin-ngan-${sideText}.png`, colorizable: true, group: 'tui' });
                list.push({ id: 'nap-tui-mac-dinh-suon', name: 'Nắp Túi Mông Mặc Định', file: `nap-tui-quan-bhld-nhin-ngan-${sideText}.png`, colorizable: true, group: 'nap-tui' });
                const defaultButtonFile = isL ? 'nut-tui-quan-bhld-nhin-ngan-trai.png' : 'nut-nap-tui-quan-bhld-nhin-ngan-phai.png';
                list.push({ id: 'nut-tui-mac-dinh-suon', name: 'Cúc Túi Mông Mặc Định', file: defaultButtonFile, colorizable: true, group: 'nut' });

                // 2. Túi Trực Quan Trên (Túi Trái Trên hoặc Túi Phải Trên)
                const showUpperPocket = isL ? state.pockets.left : state.pockets.right;
                if (showUpperPocket) {
                    list.push({ id: 'tui-tren-suon', name: 'Túi Trên Sườn', file: `tui1-quan-bhld-nhin-ngan-${sideText}.png`, colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui-tren-suon', name: 'Nắp Túi Trên Sườn', file: `nap1-tui-quan-bhld-nhin-ngan-${sideText}.png`, colorizable: true, group: 'nap-tui' });
                        const buttonFile = isL ? 'nut1-tui-quan-bhld-nhin-ngan-trai.png' : 'nut1-nap-tui-quan-bhld-nhin-ngan-phai.png';
                        list.push({ id: 'nut-tui-tren-suon', name: 'Cúc Túi Trên Sườn', file: buttonFile, colorizable: true, group: 'nut' });
                    }
                }

                // 3. Túi Trực Quan Dưới (Túi Trái Dưới hoặc Túi Phải Dưới)
                const showLowerPocket = isL ? state.pockets.sleeve : state.pockets.sleeveRight;
                if (showLowerPocket) {
                    list.push({ id: 'tui-duoi-suon', name: 'Túi Dưới Sườn', file: `tui2-quan-bhld-nhin-ngan-${sideText}.png`, colorizable: true, group: 'tui' });
                    if (state.pockets.flap) {
                        list.push({ id: 'nap-tui-duoi-suon', name: 'Nắp Túi Dưới Sườn', file: `nap2-tui-quan-bhld-nhin-ngan-${sideText}.png`, colorizable: true, group: 'nap-tui' });
                    }
                }
            }
        }

        // Apply folder prefix to each file
        return list.map(item => ({
            ...item,
            path: `${folder}/${item.file}`
        }));
    }

    // Preload required layer images
    function preloadLayers(layers, callback) {
        let loaded = 0;
        const total = layers.length;
        
        if (total === 0) {
            callback();
            return;
        }

        layers.forEach(layer => {
            const url = layer.path;
            if (imgCache[url]) {
                loaded++;
                if (loaded === total) callback();
                return;
            }

            const img = new Image();
            img.src = url;
            img.onload = () => {
                imgCache[url] = img;
                loaded++;
                if (loaded === total) callback();
            };
            img.onerror = () => {
                // If it fails, fallback gracefully by increasing count
                console.error(`Failed to load asset: ${url}`);
                loaded++;
                if (loaded === total) callback();
            };
        });
    }

    let piquePattern = null;
    function getPiquePattern(ctx) {
        if (piquePattern) return piquePattern;
        
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 4;
        patternCanvas.height = 4;
        const pCtx = patternCanvas.getContext('2d');
        
        // Neutral gray background
        pCtx.fillStyle = '#808080';
        pCtx.fillRect(0, 0, 4, 4);
        
        // Draw diagonal pattern for pique weave structure
        // Lighter gray for highlights
        pCtx.fillStyle = '#9c9c9c';
        pCtx.fillRect(0, 0, 2, 2);
        pCtx.fillRect(2, 2, 2, 2);
        
        // Darker gray for shadows
        pCtx.fillStyle = '#646464';
        pCtx.fillRect(2, 0, 2, 2);
        pCtx.fillRect(0, 2, 2, 2);
        
        piquePattern = ctx.createPattern(patternCanvas, 'repeat');
        return piquePattern;
    }

    let kakiPattern = null;
    function getKakiPattern(ctx) {
        if (kakiPattern) return kakiPattern;
        
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 6;
        patternCanvas.height = 6;
        const pCtx = patternCanvas.getContext('2d');
        
        // Neutral gray background
        pCtx.fillStyle = '#808080';
        pCtx.fillRect(0, 0, 6, 6);
        
        // Draw diagonal twill lines for kaki weave (vân vải chéo)
        pCtx.strokeStyle = '#9c9c9c'; // highlight
        pCtx.lineWidth = 1.5;
        pCtx.beginPath();
        pCtx.moveTo(0, 0);
        pCtx.lineTo(6, 6);
        pCtx.moveTo(-3, 3);
        pCtx.lineTo(3, 9);
        pCtx.moveTo(3, -3);
        pCtx.lineTo(9, 3);
        pCtx.stroke();
        
        pCtx.strokeStyle = '#646464'; // shadow
        pCtx.lineWidth = 1.5;
        pCtx.beginPath();
        pCtx.moveTo(0, 3);
        pCtx.lineTo(3, 6);
        pCtx.moveTo(3, 0);
        pCtx.lineTo(6, 3);
        pCtx.stroke();
        
        kakiPattern = ctx.createPattern(patternCanvas, 'repeat');
        return kakiPattern;
    }

    // Advanced PNG Greyscale Tinting Algorithm with LRU-bounded Multi-Tier Caching
    function getTintedLayer(img, color, textureType = false) {
        if (!color || color === 'transparent') return img;
        
        const cacheKey = img.src + '|' + color + '|' + textureType;
        if (tintCache[cacheKey]) return tintCache[cacheKey];
        
        const offscreen = document.createElement('canvas');
        offscreen.width = img.width;
        offscreen.height = img.height;
        const oCtx = offscreen.getContext('2d');
        
        // 1. Draw the greyscale texture
        oCtx.drawImage(img, 0, 0);
        
        // 2. Tint with solid color (preserves transparency via source-in)
        oCtx.globalCompositeOperation = 'source-in';
        oCtx.fillStyle = color;
        oCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        
        // 3. Apply weave texture overlay nếu có
        if (textureType === 'pique') {
            oCtx.save();
            oCtx.globalCompositeOperation = 'overlay';
            oCtx.globalAlpha = 0.22;
            oCtx.fillStyle = getPiquePattern(oCtx);
            oCtx.fillRect(0, 0, offscreen.width, offscreen.height);
            oCtx.restore();
        } else if (textureType === 'kaki') {
            oCtx.save();
            oCtx.globalCompositeOperation = 'overlay';
            oCtx.globalAlpha = 0.18;
            oCtx.fillStyle = getKakiPattern(oCtx);
            oCtx.fillRect(0, 0, offscreen.width, offscreen.height);
            oCtx.restore();
        }
        
        // 4. Multiply với greyscale gốc để có highlight/shadow thực tế
        oCtx.globalCompositeOperation = 'multiply';
        oCtx.drawImage(img, 0, 0);
        
        // 5. Clip về transparency gốc
        oCtx.globalCompositeOperation = 'destination-in';
        oCtx.drawImage(img, 0, 0);
        
        // Lưu vào LRU cache (tự giới hạn MAX_TINT_CACHE)
        setTintCache(cacheKey, offscreen);
        return offscreen;
    }

    // Draw dynamic shoulder and sleeve reflective strips
    function drawDynamicReflectiveStrips(targetCtx, scale = 1) {
        // Disabled because we are now using the premium pre-rendered PNG layers provided by the user in the folder!
        return;
    }

    // Draw the final uniform to visible Canvas
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const activeLayers = getLayersConfig();
        
        // Render layers in sequence
        activeLayers.forEach(layer => {
            const img = imgCache[layer.path];
            if (!img) return; // not preloaded yet
            
            let color = null;
            let textureType = false;
            if (layer.colorizable) {
                // Map color group keys (e.g. bo-tay-phai maps to bo-tay)
                const groupKey = layer.group || layer.id;
                color = state.colors[groupKey] || state.colors['than'];
                textureType = state.textures[groupKey] || false;
            }
            
            // Render tinted layer
            const renderedImg = getTintedLayer(img, color, textureType);
            
            // Apply overlay layer blending multiply for realistic highlights & shadows
            ctx.save();
            let dy = 0;
            if (layer.id === 'phan-quang') {
                dy = -parseInt(state.reflective.yOffset || 0);
                const tapeYCenter = 300;
                ctx.translate(0, tapeYCenter + dy);
                ctx.scale(1, parseFloat(state.reflective.width || 5) / 5);
                ctx.translate(0, -tapeYCenter);
            }
            if (layer.isOverlay) {
                ctx.globalCompositeOperation = 'multiply';
                ctx.drawImage(renderedImg, 0, 0, canvas.width, canvas.height);
            } else {
                if (layer.id === 'co-trong') {
                    ctx.globalAlpha = 0.7; // Faded by 30% compared to normal torso (100% - 30% = 70% opacity)
                }
                ctx.drawImage(renderedImg, 0, 0, canvas.width, canvas.height);
            }
            ctx.restore();

            // DYNAMIC CLIPPED PATTERN DRAW: Draw pattern on chosen layers
            const activePattern = state.patterns[state.angle];
            if (activePattern && activePattern.imgElement) {
                const cov = activePattern.coverage || { than: true, tay: false, co: false, tui: false };
                let shouldApply = false;
                let isInsideCollar = false;
                
                if (layer.id === 'co-trong' && (state.product === 'ao-polo' || state.product === 'ao-thun') && state.angle === 'front') {
                    isInsideCollar = true;
                    // Apply pattern on the inside collar of the polo/T-shirt if Torso or Collar coverage is checked
                    if (cov.than || cov.co) {
                        shouldApply = true;
                    }
                } else {
                    const isTorso = layer.id === 'than' || layer.group === 'than' || layer.id.includes('than') || layer.id.includes('nguc');
                    const isSleeve = (layer.id.includes('tay') || layer.group === 'tay') && !layer.id.includes('bo-tay') && !layer.id.includes('co-tay') && !layer.id.includes('tui');
                    const isCollar = layer.id === 'co' || layer.group === 'co' || layer.id.includes('co') || layer.id.includes('tru-co');
                    const isPocket = layer.id.includes('tui') || layer.group === 'tui' || layer.id.includes('nap-tui');
                    
                    if (isTorso && cov.than) shouldApply = true;
                    if (isSleeve && cov.tay) shouldApply = true;
                    if (isCollar && cov.co) shouldApply = true;
                    if (isPocket && cov.tui) shouldApply = true;
                }
                
                if (shouldApply) {
                    drawRealisticPattern(ctx, activePattern, img, renderedImg, isInsideCollar);
                }
            }
        });

        // Draw dynamic shoulder and sleeve reflective strips
        drawDynamicReflectiveStrips(ctx, 1);

        // Draw Pattern selection box & transform handles if selected
        if (state.activePatternSelected) {
            const activePattern = state.patterns[state.angle];
            if (activePattern && activePattern.imgElement) {
                drawPatternTransformBox(ctx, activePattern);
            }
        }

        // Draw Snapped Logo Graphic
        const anchors = LOGO_ANCHORS[state.product];
        if (anchors && anchors[state.angle] && state.logo.imgElement) {
            const anchorOptions = anchors[state.angle][state.logo.position];
            if (anchorOptions) {
                const posX = anchorOptions.x + state.logo.xOffset;
                const posY = anchorOptions.y + state.logo.yOffset;
                
                const scaleVal = (state.logo.scale / 100) * anchorOptions.scale;
                const logoW = state.logo.imgElement.width * scaleVal;
                const logoH = state.logo.imgElement.height * scaleVal;
                
                const thanLayer = activeLayers.find(l => l.id === 'than' || l.id.includes('than'));
                const bodyImg = thanLayer ? imgCache[thanLayer.path] : null;
                
                drawRealisticLogo(ctx, state.logo, posX, posY, logoW, logoH, bodyImg);
            }
        }

        // Draw Custom Draggable Logos
        state.logos.forEach(logo => {
            if (logo.view === state.angle && logo.imgElement) {
                const logoW = logo.scale;
                const logoH = logo.scale * (logo.imgElement.height / logo.imgElement.width);
                
                const thanLayer = activeLayers.find(l => l.id === 'than' || l.id.includes('than'));
                const bodyImg = thanLayer ? imgCache[thanLayer.path] : null;
                
                drawRealisticLogo(ctx, logo, logo.x, logo.y, logoW, logoH, bodyImg);
                
                // Active dragging indicator dashed border (renders clean outside shader)
                if (state.activeDragLogoId === logo.id) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(logo.x - logoW / 2 - 4, logo.y - logoH / 2 - 4, logoW + 8, logoH + 8);
                }
                
                ctx.restore();
            }
        });
        
        // Debug Active Layers
        renderDebugLayers(activeLayers);
    }

    // Refresh active layers Debug panel list
    function renderDebugLayers(layers) {
        const debugList = document.getElementById('list-active-layers');
        if (!debugList) return;
        
        debugList.innerHTML = '';
        layers.forEach(layer => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            
            const groupKey = layer.group || layer.id;
            const col = layer.colorizable ? (state.colors[groupKey] || state.colors['than']) : '#777777';
            
            item.innerHTML = `
                <span class="layer-name">${layer.id}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 9px; color: var(--text-muted);">${layer.file}</span>
                    <div class="layer-color-preview" style="background-color: ${col}"></div>
                </div>
            `;
            debugList.appendChild(item);
        });
    }

    // Rotator logic with gesture swipes
    let isDragging = false;
    let startX = 0;
    
    function initRotationGestures() {
        const getCanvasCoords = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const handleDragStart = (clientX, clientY) => {
            const coords = getCanvasCoords(clientX, clientY);

            // 1. Check Logos interaction first (logos are layered on top of pattern/body)
            let clickedLogo = null;
            
            // Filter logos for current active angle
            const currentAngleLogos = state.logos.filter(l => l.view === state.angle && l.imgElement);
            
            // Loop backwards to pick the top-most logo
            for (let i = currentAngleLogos.length - 1; i >= 0; i--) {
                const logo = currentAngleLogos[i];
                const logoW = logo.scale;
                const logoH = logo.scale * (logo.imgElement.height / logo.imgElement.width);
                
                if (coords.x >= logo.x - logoW / 2 && coords.x <= logo.x + logoW / 2 &&
                    coords.y >= logo.y - logoH / 2 && coords.y <= logo.y + logoH / 2) {
                    clickedLogo = logo;
                    break;
                }
            }
            
            if (clickedLogo) {
                state.activeDragLogoId = clickedLogo.id;
                state.dragOffsetX = clickedLogo.x - coords.x;
                state.dragOffsetY = clickedLogo.y - coords.y;
                isDragging = false; // Disable rotation drag
                
                // Deselect active pattern since we clicked on a logo
                state.activePatternSelected = false;
                state.activePatternResizeHandle = null;
                state.activePatternRotating = false;
                state.activePatternDragging = false;
                
                drawCanvas(); // Re-draw to show dashed border active
                return;
            }

            // 2. Check Pattern interaction if no logo was clicked
            const pattern = state.patterns[state.angle];
            if (pattern && pattern.imgElement) {
                const cx = canvas.width / 2 + pattern.x;
                const cy = canvas.height / 2 + pattern.y;
                const rotateHandle = getPatternRotateHandle(pattern);
                const corners = getPatternCorners(pattern);
                const clickDist = (p1, p2) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

                // A. Check Rotate Handle (dist <= 12)
                if (rotateHandle && clickDist(coords, rotateHandle) <= 12) {
                    state.activePatternRotating = true;
                    state.activePatternSelected = true;
                    isDragging = false; // Disable rotation drag
                    drawCanvas();
                    return;
                }

                // B. Check Resize Handles (dist <= 12)
                if (corners) {
                    const handleKeys = ['tl', 'tr', 'br', 'bl'];
                    for (let i = 0; i < corners.length; i++) {
                        if (clickDist(coords, corners[i]) <= 12) {
                            state.activePatternResizeHandle = handleKeys[i];
                            state.activePatternSelected = true;
                            const w100 = pattern.imgElement.width * 0.4;
                            const h100 = pattern.imgElement.height * 0.4;
                            pattern.diagonal100 = Math.sqrt((w100 / 2) ** 2 + (h100 / 2) ** 2);
                            
                            isDragging = false;
                            drawCanvas();
                            return;
                        }
                    }
                }

                // C. Check click INSIDE the pattern body
                const localCoords = getLocalClickCoords(coords.x, coords.y, pattern);
                if (localCoords) {
                    const scaleFactor = pattern.scale / 100;
                    const w = pattern.imgElement.width * scaleFactor * 0.4;
                    const h = pattern.imgElement.height * scaleFactor * 0.4;
                    
                    if (Math.abs(localCoords.x) <= w / 2 && Math.abs(localCoords.y) <= h / 2) {
                        state.activePatternDragging = true;
                        state.activePatternSelected = true;
                        state.dragOffsetX = cx - coords.x;
                        state.dragOffsetY = cy - coords.y;
                        isDragging = false;
                        drawCanvas();
                        syncPatternInputsUI(); // Update sliders immediately
                        return;
                    }
                }
            }

            // Clicked outside both pattern and logos: deselect pattern
            state.activePatternSelected = false;
            state.activePatternResizeHandle = null;
            state.activePatternRotating = false;
            state.activePatternDragging = false;
            state.activeDragLogoId = null;

            isDragging = true;
            startX = clientX;
            drawCanvas();
        };

        const handleDragMove = (clientX, clientY) => {
            const coords = getCanvasCoords(clientX, clientY);
            const pattern = state.patterns[state.angle];

            // A. Rotating Pattern
            if (state.activePatternRotating && pattern) {
                const cx = canvas.width / 2 + pattern.x;
                const cy = canvas.height / 2 + pattern.y;
                const angleRad = Math.atan2(coords.y - cy, coords.x - cx);
                let angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
                
                if (angleDeg < -180) angleDeg += 360;
                if (angleDeg > 180) angleDeg -= 360;
                
                pattern.rotate = angleDeg;
                state.isDirty = true;
                syncPatternInputsUI();
                scheduleRedraw();
                return true;
            }

            // B. Resizing Pattern
            if (state.activePatternResizeHandle && pattern) {
                const cx = canvas.width / 2 + pattern.x;
                const cy = canvas.height / 2 + pattern.y;
                const dx = coords.x - cx;
                const dy = coords.y - cy;
                const D_current = Math.sqrt(dx * dx + dy * dy);
                
                if (!pattern.diagonal100) {
                    const w100 = pattern.imgElement.width * 0.4;
                    const h100 = pattern.imgElement.height * 0.4;
                    pattern.diagonal100 = Math.sqrt((w100 / 2) ** 2 + (h100 / 2) ** 2);
                }
                
                const scaleVal = Math.round((D_current / pattern.diagonal100) * 100);
                pattern.scale = Math.max(10, Math.min(300, scaleVal));
                state.isDirty = true;
                syncPatternInputsUI();
                scheduleRedraw();
                return true;
            }

            // C. Dragging Pattern
            if (state.activePatternDragging && pattern) {
                let targetX = Math.round(coords.x - canvas.width / 2 + state.dragOffsetX);
                let targetY = Math.round(coords.y - canvas.height / 2 + state.dragOffsetY);
                
                // Centering Snap (with 12px threshold)
                if (Math.abs(targetX) < 12) targetX = 0;
                if (Math.abs(targetY) < 12) targetY = 0;
                
                // Bounds limits (cannot drag completely out of uniform area)
                pattern.x = Math.max(-300, Math.min(300, targetX));
                pattern.y = Math.max(-300, Math.min(300, targetY));
                
                state.isDirty = true;
                syncPatternInputsUI();
                scheduleRedraw();
                return true;
            }

            // D. Dragging Logo
            if (state.activeDragLogoId) {
                const logo = state.logos.find(l => l.id === state.activeDragLogoId);
                if (logo) {
                    logo.x = coords.x + state.dragOffsetX;
                    logo.y = coords.y + state.dragOffsetY;
                    logo.x = Math.max(0, Math.min(canvas.width, logo.x));
                    logo.y = Math.max(0, Math.min(canvas.height, logo.y));
                    state.isDirty = true;
                    scheduleRedraw();
                }
                return true; // Handled
            }
            return false; // Not handled, fallback to rotation
        };

        const handleDragEnd = () => {
            state.activePatternDragging = false;
            state.activePatternResizeHandle = null;
            state.activePatternRotating = false;
            if (state.activeDragLogoId) {
                state.activeDragLogoId = null;
            }
            scheduleRedraw(); // Clear dashed box
            isDragging = false;
        };

        canvasWrapper.addEventListener('mousedown', (e) => {
            handleDragStart(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            const logoHandled = handleDragMove(e.clientX, e.clientY);
            if (logoHandled) return;
            
            if (!isDragging) return;
            const diffX = e.clientX - startX;
            
            // Swipe threshold 80px to rotate
            if (Math.abs(diffX) > 80) {
                const directions = ['front', 'left', 'back', 'right'];
                let idx = directions.indexOf(state.angle);
                
                if (diffX > 0) {
                    idx = (idx - 1 + 4) % 4; // rotate left
                } else {
                    idx = (idx + 1) % 4; // rotate right
                }
                
                updateAngle(directions[idx]);
                startX = e.clientX; // reset base
            }
        });

        window.addEventListener('mouseup', () => {
            handleDragEnd();
        });

        // Touch support for Mobile swipe & drag
        canvasWrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
            }
        });

        canvasWrapper.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const logoHandled = handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
                if (logoHandled) {
                    e.preventDefault(); // Prevent scrolling while dragging logo
                    return;
                }
                
                if (!isDragging) return;
                const diffX = e.touches[0].clientX - startX;
                
                if (Math.abs(diffX) > 60) {
                    const directions = ['front', 'left', 'back', 'right'];
                    let idx = directions.indexOf(state.angle);
                    
                    if (diffX > 0) {
                        idx = (idx - 1 + 4) % 4;
                    } else {
                        idx = (idx + 1) % 4;
                    }
                    
                    updateAngle(directions[idx]);
                    startX = e.touches[0].clientX;
                }
            }
        });

        canvasWrapper.addEventListener('touchend', () => {
            handleDragEnd();
        });

        // Arrow Keys Keyboard Listeners to shift selected pattern coordinates
        window.addEventListener('keydown', (e) => {
            if (state.activePatternSelected) {
                const pattern = state.patterns[state.angle];
                if (pattern && pattern.imgElement) {
                    let moved = false;
                    const step = e.shiftKey ? 10 : 2; // move faster if shift is held
                    
                    if (e.key === 'ArrowLeft') {
                        pattern.x = Math.max(-300, pattern.x - step);
                        moved = true;
                    } else if (e.key === 'ArrowRight') {
                        pattern.x = Math.min(300, pattern.x + step);
                        moved = true;
                    } else if (e.key === 'ArrowUp') {
                        pattern.y = Math.max(-300, pattern.y - step);
                        moved = true;
                    } else if (e.key === 'ArrowDown') {
                        pattern.y = Math.min(300, pattern.y + step);
                        moved = true;
                    }
                    
                    if (moved) {
                        e.preventDefault(); // Prevent page scrolling
                        state.isDirty = true;
                        syncPatternInputsUI();
                        drawCanvas();
                    }
                }
            }
        });
    }

    // Trigger state angle updates
    function updateAngle(newAngle) {
        state.angle = newAngle;
        if (newAngle === 'back') {
            state.hasViewedBack = true;
        }
        
        // Update HUD buttons state
        document.querySelectorAll('.angle-btn').forEach(btn => {
            if (btn.getAttribute('data-angle') === newAngle) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        loadAndRender();
    }

    // Dynamic UI controls visibility management based on product type
    function syncUIControls() {
        const tabPockets = document.getElementById('tab-pockets');
        const tabReflective = document.getElementById('tab-reflective');
        const selectColorPart = document.getElementById('select-color-part');
        
        // 1. Show/hide toolbar tabs based on product type
        if (state.product === 'ao-polo' || state.product === 'ao-thun') {
            if (tabPockets) tabPockets.classList.add('hidden');
            if (tabReflective) tabReflective.classList.add('hidden');
        } else if (state.product === 'ao-bao-ho') {
            if (tabPockets) {
                tabPockets.classList.remove('hidden');
                tabPockets.querySelector('span:not(.tab-icon)').innerText = 'Túi Áo';
            }
            if (tabReflective) tabReflective.classList.remove('hidden');
        } else if (state.product === 'quan-bao-ho') {
            if (tabPockets) {
                tabPockets.classList.remove('hidden');
                tabPockets.querySelector('span:not(.tab-icon)').innerText = 'Túi Quần';
            }
            if (tabReflective) tabReflective.classList.add('hidden');
        }
        
        // If the active tab was hidden, automatically switch active tab to templates and open templates
        const activeTab = document.querySelector('.toolbar-tab.active');
        if (activeTab && activeTab.classList.contains('hidden')) {
            const templatesTab = document.getElementById('tab-templates');
            if (templatesTab) {
                templatesTab.click();
            }
        }
        
        // 2. Dynamically update select-color-part dropdown options based on product type
        if (selectColorPart) {
            const currentVal = selectColorPart.value;
            let optionsHTML = '';
            
            if (state.product === 'ao-polo') {
                optionsHTML = `
                    <option value="than">Thân Áo (Body)</option>
                    <option value="tay">Tay Áo (Sleeves)</option>
                    <option value="co">Cổ Áo (Collar)</option>
                    <option value="bo-tay">Bo Tay Áo (Cuffs)</option>
                    <option value="tru-co">Trụ Cổ (Placket)</option>
                    <option value="vien-co">Viền Cổ Áo (Collar Trim)</option>
                    <option value="nut">Khuy Nút Áo (Buttons)</option>
                `;
            } else if (state.product === 'ao-thun') {
                optionsHTML = `
                    <option value="than">Thân Áo (Body)</option>
                    <option value="tay">Tay Áo (Sleeves)</option>
                    <option value="co">Cổ Bo Áo (Neckband)</option>
                    <option value="bo-tay">Bo Tay Áo (Cuffs)</option>
                    <option value="chan-co">Chân Cổ Áo (Collar Stand)</option>
                `;
            } else if (state.product === 'ao-bao-ho') {
                optionsHTML = `
                    <option value="than">Thân Áo (Body)</option>
                    <option value="tay">Tay Áo (Sleeves)</option>
                    <option value="co">Cổ Áo (Collar)</option>
                    <option value="vien-co">Viền Cổ Áo (Collar Trim)</option>
                    <option value="tru-co">Nẹp Áo (Placket)</option>
                    <option value="bo-tay">Đai Áo (Waistband)</option>
                    <option value="tui">Túi Áo (Pockets)</option>
                    <option value="nap-tui">Nắp Túi Áo (Pocket Flaps)</option>
                    <option value="nut">Khuy Nút Áo (Buttons)</option>
                `;
            } else if (state.product === 'quan-bao-ho') {
                optionsHTML = `
                    <option value="than">Thân Quần (Trousers Body)</option>
                    <option value="tui">Túi Quần (Pockets)</option>
                    <option value="nap-tui">Nắp Túi Quần (Pocket Flaps)</option>
                    <option value="nut">Khuy Nút Quần (Buttons)</option>
                `;
            }
            
            selectColorPart.innerHTML = optionsHTML;
            
            // Try to restore previous selected value if it's still a valid option, otherwise default to "than"
            const options = Array.from(selectColorPart.options).map(opt => opt.value);
            if (options.includes(currentVal)) {
                selectColorPart.value = currentVal;
            } else {
                selectColorPart.value = 'than';
            }
        }
        
        // 3. Dynamically update pocket panel labels based on product type (Ao Bao Ho vs Quan Bao Ho)
        const pocketsPanel = document.getElementById('panel-pockets');
        if (pocketsPanel) {
            const pocketTitle = pocketsPanel.querySelector('.control-group > label.control-label');
            const chkLeftSpan = pocketsPanel.querySelector('#chk-pocket-left > span');
            const chkRightSpan = pocketsPanel.querySelector('#chk-pocket-right > span');
            const chkSleeveSpan = pocketsPanel.querySelector('#chk-pocket-sleeve > span');
            const chkSleeveCard = pocketsPanel.querySelector('#chk-pocket-sleeve');
            const chkSleeveRightSpan = pocketsPanel.querySelector('#chk-pocket-sleeve-right > span');
            const chkSleeveRightCard = pocketsPanel.querySelector('#chk-pocket-sleeve-right');
            const chkFlapSpan = pocketsPanel.querySelector('#chk-pocket-flap > span');
            
            if (state.product === 'quan-bao-ho') {
                if (pocketTitle) pocketTitle.innerText = 'Thiết lập túi quần';
                if (chkLeftSpan) chkLeftSpan.innerText = 'Túi Trái Trên';
                if (chkRightSpan) chkRightSpan.innerText = 'Túi Phải Trên';
                if (chkSleeveSpan) chkSleeveSpan.innerText = 'Túi trái dưới';
                if (chkSleeveCard) chkSleeveCard.classList.remove('hidden');
                if (chkSleeveRightSpan) chkSleeveRightSpan.innerText = 'Túi phải dưới';
                if (chkSleeveRightCard) chkSleeveRightCard.classList.remove('hidden');
                if (chkFlapSpan) chkFlapSpan.innerText = 'Nắp Che Túi Quần';
            } else {
                if (pocketTitle) pocketTitle.innerText = 'Thiết lập túi áo';
                if (chkLeftSpan) chkLeftSpan.innerText = 'Túi ngực trái';
                if (chkRightSpan) chkRightSpan.innerText = 'Túi ngực phải';
                if (chkSleeveSpan) chkSleeveSpan.innerText = 'Túi hộp tay áo';
                if (chkSleeveCard) chkSleeveCard.classList.toggle('hidden', state.product !== 'ao-bao-ho');
                if (chkSleeveRightCard) chkSleeveRightCard.classList.add('hidden');
                if (chkFlapSpan) chkFlapSpan.innerText = 'Nắp túi';
            }
        }

        // 4. Show/hide reflective height slider based on chest reflective checked state
        const groupReflectiveHeight = document.getElementById('group-reflective-height');
        const inputReflectiveHeight = document.getElementById('input-reflective-height');
        const lblReflectiveHeight = document.getElementById('lbl-reflective-height');
        if (groupReflectiveHeight && inputReflectiveHeight && lblReflectiveHeight) {
            if (state.product === 'ao-bao-ho' && state.reflective.chest) {
                groupReflectiveHeight.classList.remove('hidden');
                const val = parseInt(state.reflective.yOffset || 0);
                inputReflectiveHeight.value = val;
                lblReflectiveHeight.innerText = val === 0 ? 'Mặc định' : (val > 0 ? `+${val}px (Lên)` : `${val}px (Xuống)`);
            } else {
                groupReflectiveHeight.classList.add('hidden');
            }
        }
        
        // Dynamically update sizes tab panel
        syncSizePanel();
    }

    // Dynamic Populator for Size Charts Guide and Specs
    function syncSizePanel() {
        const selectSizeGuide = document.getElementById('select-size-guide');
        const specsContainer = document.getElementById('size-specs-table-container');
        const sizeTitle = document.getElementById('lbl-size-title');
        
        if (!specsContainer) return;
        
        const currentSizeVal = state.size || 'M';
        let optionsHTML = '';
        let tableHTML = '';
        
        const isWorkwear = (state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho');
        const isDark = (state.theme === 'dark');
        const rowBgAlt = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
        
        if (isWorkwear) {
            if (sizeTitle) sizeTitle.innerText = 'Bảng Size Bảo Hộ Lao Động';
            
            optionsHTML = `
                <option value="M">Size M (Cỡ số 5) - Cân nặng: 54-61kg / Chiều cao: 155-165cm</option>
                <option value="L">Size L (Cỡ số 6) - Cân nặng: 62-69kg / Chiều cao: 165-173cm</option>
                <option value="XL">Size XL (Cỡ số 7) - Cân nặng: 70-77kg / Chiều cao: 170-178cm</option>
                <option value="XXL">Size XXL (Cỡ số 8) - Cân nặng: 78-84kg / Chiều cao: 175-182cm</option>
            `;
            
            tableHTML = `
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px; color: var(--text-primary); border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
                    <tbody>
                        <!-- Row 1: Size -->
                        <tr style="border-bottom: 1px solid var(--border-color); background: ${rowBgAlt};">
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: bold; color: #ef4444; font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">SIZE</td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color);">
                                <div style="font-weight: bold; font-size: 14px;">M</div>
                                <div style="color: #ef4444; font-weight: bold; font-size: 13px; margin-top: 2px;">5</div>
                            </td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color);">
                                <div style="font-weight: bold; font-size: 14px;">L</div>
                                <div style="color: #ef4444; font-weight: bold; font-size: 13px; margin-top: 2px;">6</div>
                            </td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color);">
                                <div style="font-weight: bold; font-size: 14px;">XL</div>
                                <div style="color: #ef4444; font-weight: bold; font-size: 13px; margin-top: 2px;">7</div>
                            </td>
                            <td style="padding: 10px;">
                                <div style="font-weight: bold; font-size: 14px;">XXL</div>
                                <div style="color: #ef4444; font-weight: bold; font-size: 13px; margin-top: 2px;">8</div>
                            </td>
                        </tr>
                        <!-- Row 2: Cân nặng -->
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: bold; color: var(--accent-blue); font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">CÂN NẶNG (KG)</td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: 500;">54 - 61</td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: 500;">62 - 69</td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: 500;">70 - 77</td>
                            <td style="padding: 10px; font-weight: 500;">78 - 84</td>
                        </tr>
                        <!-- Row 3: Chiều cao -->
                        <tr style="background: ${rowBgAlt};">
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: bold; color: var(--accent-blue); font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">CHIỀU CAO (CM)</td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: 500;">155 - 165</td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: 500;">165 - 173</td>
                            <td style="padding: 10px; border-right: 1px solid var(--border-color); font-weight: 500;">170 - 178</td>
                            <td style="padding: 10px; font-weight: 500;">175 - 182</td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else if (state.form === 'nam') {
            if (sizeTitle) sizeTitle.innerText = 'Bảng Size Nam Chuẩn';
            
            optionsHTML = `
                <option value="S">Size S - Cân nặng: 45-54kg / Chiều cao: 150-160cm</option>
                <option value="M">Size M - Cân nặng: 55-64kg / Chiều cao: 160-170cm</option>
                <option value="L">Size L - Cân nặng: 65-69kg / Chiều cao: 170-174cm</option>
                <option value="XL">Size XL - Cân nặng: 70-75kg / Chiều cao: 175-177cm</option>
                <option value="XXL">Size XXL - Cân nặng: 75-85kg / Chiều cao: 175-180cm</option>
                <option value="3XL">Size 3XL - Cân nặng: 85-95kg / Chiều cao: 175-180cm</option>
                <option value="4XL">Size 4XL - Cân nặng: 95-110kg / Chiều cao: 175-180cm</option>
                <option value="5XL">Size 5XL - Cân nặng: 110-130kg / Chiều cao: 175-180cm</option>
            `;
            
            tableHTML = `
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px; color: var(--text-primary); border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
                    <thead>
                        <tr style="background: #d60000; color: #ffffff; font-weight: bold;">
                            <th style="padding: 10px; border: 1px solid var(--border-color); font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">SIZE</th>
                            <th style="padding: 10px; border: 1px solid var(--border-color); font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">CHIỀU CAO (CM)</th>
                            <th style="padding: 10px; border: 1px solid var(--border-color); font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">CÂN NẶNG (KG)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">S</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">150 - 160</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">45 - 54</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color); background: ${rowBgAlt};">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">M</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">160 - 170</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">55 - 64</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">L</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">170 - 174</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">65 - 69</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color); background: ${rowBgAlt};">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">XL</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">175 - 177</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">70 - 75</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">XXL</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">175 - 180</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">75 - 85</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color); background: ${rowBgAlt};">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">3XL</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">175 - 180</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">85 - 95</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">4XL</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">175 - 180</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">95 - 110</td>
                        </tr>
                        <tr style="background: ${rowBgAlt};">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">5XL</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">175 - 180</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">110 - 130</td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else {
            if (sizeTitle) sizeTitle.innerText = 'Bảng Size Nữ Chuẩn';
            
            optionsHTML = `
                <option value="S">Size S - Cân nặng: 40-44kg / Chiều cao: 145-155cm (V1 < 82cm)</option>
                <option value="M">Size M - Cân nặng: 45-48kg / Chiều cao: 150-165cm (V1 < 87cm)</option>
                <option value="L">Size L - Cân nặng: 49-55kg / Chiều cao: 166-170cm (V1 < 95cm)</option>
                <option value="XL">Size XL - Cân nặng: 56-60kg / Chiều cao: 165-174cm (V1 < 100cm)</option>
                <option value="XXL">Size XXL - Cân nặng: 61-65kg / Chiều cao: 165-174cm (V1 < 105cm)</option>
                <option value="3XL">Size 3XL - Cân nặng: 66-70kg / Chiều cao: 165-174cm (V1 < 110cm)</option>
            `;
            
            tableHTML = `
                <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px; color: var(--text-primary); border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
                    <thead>
                        <tr style="background: #d60000; color: #ffffff; font-weight: bold;">
                            <th style="padding: 10px; border: 1px solid var(--border-color); font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">SIZE</th>
                            <th style="padding: 10px; border: 1px solid var(--border-color); font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">CHIỀU CAO (CM)</th>
                            <th style="padding: 10px; border: 1px solid var(--border-color); font-family: 'Outfit', sans-serif; font-size: 12px; letter-spacing: 0.5px;">CÂN NẶNG (KG)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">S</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">145 - 155</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">40 - 44 <span style="font-size: 11px; display: block; color: var(--text-muted); font-style: italic; margin-top: 2px;">(V1 &lt;82cm)</span></td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color); background: ${rowBgAlt};">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">M</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">150 - 165</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">45 - 48 <span style="font-size: 11px; display: block; color: var(--text-muted); font-style: italic; margin-top: 2px;">(V1 &lt;87cm)</span></td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">L</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">166 - 170</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">49 - 55 <span style="font-size: 11px; display: block; color: var(--text-muted); font-style: italic; margin-top: 2px;">(V1 &lt;95cm)</span></td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color); background: ${rowBgAlt};">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">XL</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">165 - 174</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">56 - 60 <span style="font-size: 11px; display: block; color: var(--text-muted); font-style: italic; margin-top: 2px;">(V1 &lt;100cm)</span></td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">XXL</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">165 - 174</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">61 - 65 <span style="font-size: 11px; display: block; color: var(--text-muted); font-style: italic; margin-top: 2px;">(V1 &lt;105cm)</span></td>
                        </tr>
                        <tr style="background: ${rowBgAlt};">
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: bold; color: var(--accent-teal);">3XL</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">165 - 174</td>
                            <td style="padding: 10px; border: 1px solid var(--border-color); font-weight: 500;">66 - 70 <span style="font-size: 11px; display: block; color: var(--text-muted); font-style: italic; margin-top: 2px;">(V1 &lt;110cm)</span></td>
                        </tr>
                    </tbody>
                </table>
            `;
        }
        
        if (selectSizeGuide) {
            selectSizeGuide.innerHTML = optionsHTML;
        }
        if (specsContainer) {
            specsContainer.innerHTML = tableHTML;
        }
        
        if (selectSizeGuide) {
            // Restore selected size if valid, otherwise select the first option
            const options = Array.from(selectSizeGuide.options).map(opt => opt.value);
            if (options.includes(currentSizeVal)) {
                selectSizeGuide.value = currentSizeVal;
            } else {
                selectSizeGuide.value = options[0];
                state.size = options[0];
            }
        }
    }


    // Dynamic UI builder for Multi-Logos Management List
    function buildLogoListUI() {
        const listEl = document.getElementById('div-logos-list');
        if (!listEl) return;
        
        listEl.innerHTML = '';
        
        if (state.logos.length === 0) {
            listEl.innerHTML = `
                <div class="text-muted" id="lbl-no-logos" style="font-size: 11px; font-style: italic; text-align: center; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed var(--border-color);">
                    Chưa có logo nào được tải lên. Tải ảnh lên ở trên để bắt đầu!
                </div>
            `;
            return;
        }
        
        state.logos.forEach(logo => {
            const card = document.createElement('div');
            card.className = 'uploaded-logo-preview';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'stretch';
            card.style.gap = '10px';
            card.style.padding = '12px';
            card.style.background = 'rgba(19, 27, 46, 0.5)';
            card.style.border = '1px solid var(--border-color)';
            card.style.borderRadius = '8px';
            card.style.marginTop = '4px';
            
            // Header: Image thumbnail, view indicator and actions
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.justifyContent = 'space-between';
            header.style.gap = '10px';
            
            const img = document.createElement('img');
            img.src = logo.imgElement.src;
            img.style.height = '36px';
            img.style.maxWidth = '80px';
            img.style.objectFit = 'contain';
            img.style.background = 'white';
            img.style.padding = '2px';
            img.style.borderRadius = '4px';
            
            const info = document.createElement('div');
            info.style.flex = '1';
            info.style.display = 'flex';
            info.style.flexDirection = 'column';
            
            const angleNames = { 'front': 'Mặt Trước', 'back': 'Mặt Sau', 'left': 'Mặt Trái', 'right': 'Mặt Phải' };
            const viewLabel = document.createElement('span');
            viewLabel.innerText = angleNames[logo.view] || 'Không xác định';
            viewLabel.style.fontSize = '11px';
            viewLabel.style.fontWeight = '700';
            viewLabel.style.color = 'var(--accent-blue)';
            
            const dragTip = document.createElement('span');
            dragTip.innerText = '🖱 Kéo thả trên áo';
            dragTip.style.fontSize = '9px';
            dragTip.style.color = 'var(--text-muted)';
            
            info.appendChild(viewLabel);
            info.appendChild(dragTip);
            
            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '6px';
            
            const btnCenter = document.createElement('button');
            btnCenter.className = 'btn btn-secondary';
            btnCenter.style.padding = '2px 6px';
            btnCenter.style.fontSize = '9px';
            btnCenter.innerText = '🎯 Giữa';
            btnCenter.addEventListener('click', () => {
                logo.x = 400;
                logo.y = 350;
                state.isDirty = true;
                drawCanvas();
            });
            
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn btn-danger';
            btnDelete.style.padding = '2px 6px';
            btnDelete.style.fontSize = '9px';
            btnDelete.innerText = 'Xóa';
            btnDelete.addEventListener('click', () => {
                state.logos = state.logos.filter(l => l.id !== logo.id);
                state.isDirty = true;
                buildLogoListUI();
                drawCanvas();
            });
            
            actions.appendChild(btnCenter);
            actions.appendChild(btnDelete);
            
            header.appendChild(img);
            header.appendChild(info);
            header.appendChild(actions);
            
            // Control: Size Slider
            const sizeControl = document.createElement('div');
            sizeControl.className = 'control-group';
            sizeControl.style.gap = '4px';
            
            const sizeLabel = document.createElement('label');
            sizeLabel.className = 'control-label';
            sizeLabel.innerHTML = 'Kích thước: ';
            
            const sizeBadge = document.createElement('span');
            sizeBadge.className = 'value-badge';
            sizeBadge.style.padding = '2px 4px';
            sizeBadge.style.display = 'inline-flex';
            sizeBadge.style.alignItems = 'center';
            sizeBadge.style.gap = '1px';
            
            const sizeNumInput = document.createElement('input');
            sizeNumInput.type = 'number';
            sizeNumInput.min = '20';
            sizeNumInput.max = '300';
            sizeNumInput.value = logo.scale;
            
            sizeBadge.appendChild(sizeNumInput);
            sizeBadge.appendChild(document.createTextNode('px'));
            sizeLabel.appendChild(sizeBadge);
            
            const sizeSlider = document.createElement('input');
            sizeSlider.type = 'range';
            sizeSlider.className = 'custom-range';
            sizeSlider.min = '20';
            sizeSlider.max = '300';
            sizeSlider.value = logo.scale;
            
            sizeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                logo.scale = val;
                state.isDirty = true;
                sizeNumInput.value = val;
                drawCanvas();
            });
            
            sizeNumInput.addEventListener('input', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) return;
                val = Math.max(20, Math.min(300, val));
                logo.scale = val;
                state.isDirty = true;
                sizeSlider.value = val;
                drawCanvas();
            });
            sizeNumInput.addEventListener('blur', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 20) val = 20;
                if (val > 300) val = 300;
                e.target.value = val;
                logo.scale = val;
                state.isDirty = true;
                sizeSlider.value = val;
                drawCanvas();
            });
            sizeNumInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    sizeNumInput.blur();
                }
            });
            
            sizeControl.appendChild(sizeLabel);
            sizeControl.appendChild(sizeSlider);
            
            // Control: Opacity Slider
            const opacityControl = document.createElement('div');
            opacityControl.className = 'control-group';
            opacityControl.style.gap = '4px';
            
            const opacityLabel = document.createElement('label');
            opacityLabel.className = 'control-label';
            opacityLabel.innerHTML = 'Độ mờ: ';
            
            const opacityBadge = document.createElement('span');
            opacityBadge.className = 'value-badge';
            opacityBadge.style.padding = '2px 4px';
            opacityBadge.style.display = 'inline-flex';
            opacityBadge.style.alignItems = 'center';
            opacityBadge.style.gap = '1px';
            
            const opacityNumInput = document.createElement('input');
            opacityNumInput.type = 'number';
            opacityNumInput.min = '10';
            opacityNumInput.max = '100';
            opacityNumInput.value = logo.opacity;
            
            opacityBadge.appendChild(opacityNumInput);
            opacityBadge.appendChild(document.createTextNode('%'));
            opacityLabel.appendChild(opacityBadge);
            
            const opacitySlider = document.createElement('input');
            opacitySlider.type = 'range';
            opacitySlider.className = 'custom-range';
            opacitySlider.min = '10';
            opacitySlider.max = '100';
            opacitySlider.value = logo.opacity;
            
            opacitySlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                logo.opacity = val;
                state.isDirty = true;
                opacityNumInput.value = val;
                drawCanvas();
            });
            
            opacityNumInput.addEventListener('input', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) return;
                val = Math.max(10, Math.min(100, val));
                logo.opacity = val;
                state.isDirty = true;
                opacitySlider.value = val;
                drawCanvas();
            });
            opacityNumInput.addEventListener('blur', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 10) val = 10;
                if (val > 100) val = 100;
                e.target.value = val;
                logo.opacity = val;
                state.isDirty = true;
                opacitySlider.value = val;
                drawCanvas();
            });
            opacityNumInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    opacityNumInput.blur();
                }
            });
            
            opacityControl.appendChild(opacityLabel);
            opacityControl.appendChild(opacitySlider);
            
            // Control: Print Style Selector
            const styleControl = document.createElement('div');
            styleControl.className = 'control-group';
            styleControl.style.gap = '4px';
            styleControl.style.display = 'none'; // Hidden as requested by the user
            
            const styleLabel = document.createElement('label');
            styleLabel.className = 'control-label';
            styleLabel.innerText = 'Công nghệ in/thêu:';
            
            const styleSelect = document.createElement('select');
            styleSelect.className = 'input-field';
            styleSelect.style.padding = '6px 10px';
            styleSelect.style.fontSize = '12px';
            styleSelect.style.background = 'rgba(255, 255, 255, 0.05)';
            styleSelect.style.border = '1px solid var(--border-color)';
            styleSelect.style.borderRadius = '6px';
            
            styleSelect.innerHTML = `
                <option value="chuyen-nhiet" ${logo.printStyle === 'chuyen-nhiet' ? 'selected' : ''}>In Chuyển Nhiệt (Bám sớ vải)</option>
                <option value="theu" ${logo.printStyle === 'theu' ? 'selected' : ''}>Thêu Vi Tính (Nổi 3D, sợi chỉ)</option>
                <option value="cao-su" ${logo.printStyle === 'cao-su' ? 'selected' : ''}>In Cao Su Nổi (Dày, bóng nhẹ)</option>
                <option value="decal" ${logo.printStyle === 'decal' ? 'selected' : ''}>Decal Poly mờ (Mịn, sắc nét)</option>
            `;
            styleSelect.addEventListener('change', (e) => {
                logo.printStyle = e.target.value;
                state.isDirty = true;
                drawCanvas();
            });
            
            styleControl.appendChild(styleLabel);
            styleControl.appendChild(styleSelect);
            
            card.appendChild(header);
            card.appendChild(sizeControl);
            card.appendChild(opacityControl);
            card.appendChild(styleControl);
            
            listEl.appendChild(card);
        });
    }

    // Core preloading and rendering trigger
    function loadAndRender() {
        syncUIControls();
        buildLogoListUI();
        syncPatternInputsUI();
        buildColorSwatches();

        // Show subtle floating progress inside canvas
        ctx.fillStyle = 'rgba(11, 15, 25, 0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const layers = getLayersConfig();
        preloadLayers(layers, () => {
            drawCanvas();
        });
    }

    // Dynamic color picker swatches builder
    function buildColorSwatches() {
        const corpGrid = document.getElementById('grid-corporate-colors');
        const sportGrid = document.getElementById('grid-sporty-colors');
        const workGrid = document.getElementById('grid-workwear-colors');
        const texturedGrid = document.getElementById('grid-textured-colors');
        const buttonGrid = document.getElementById('grid-button-colors');
        const workwearButtonGridPlastic = document.getElementById('grid-workwear-plastic-buttons');
        const workwearButtonGridMetal = document.getElementById('grid-workwear-metal-buttons');
        
        const standardGroup = document.getElementById('group-standard-colors');
        const texturedGroup = document.getElementById('group-textured-colors');
        const workwearGroup = document.getElementById('group-workwear-colors');
        const buttonGroup = document.getElementById('group-button-colors');
        const workwearButtonGroup = document.getElementById('group-workwear-button-colors');
        
        if (!corpGrid) return;
        
        corpGrid.innerHTML = '';
        sportGrid.innerHTML = '';
        workGrid.innerHTML = '';
        if (texturedGrid) texturedGrid.innerHTML = '';
        if (buttonGrid) buttonGrid.innerHTML = '';
        if (workwearButtonGridPlastic) workwearButtonGridPlastic.innerHTML = '';
        if (workwearButtonGridMetal) workwearButtonGridMetal.innerHTML = '';
        
        const activePart = document.getElementById('select-color-part').value;
        const isPoloButtons = (state.product === 'ao-polo' && activePart === 'nut');
        const isWorkwearButtons = ((state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho') && activePart === 'nut');

        // Show/hide specific color groups based on active product type
        if (standardGroup) {
            standardGroup.style.display = (state.product === 'ao-thun') ? 'block' : 'none';
        }
        if (texturedGroup) {
            texturedGroup.style.display = (state.product === 'ao-polo' && !isPoloButtons) ? 'block' : 'none';
        }
        if (workwearGroup) {
            workwearGroup.style.display = ((state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho') && !isWorkwearButtons) ? 'block' : 'none';
        }
        if (buttonGroup) {
            buttonGroup.style.display = isPoloButtons ? 'block' : 'none';
        }
        if (workwearButtonGroup) {
            workwearButtonGroup.style.display = isWorkwearButtons ? 'block' : 'none';
        }

        const currentSelectedColor = state.colors[activePart] || state.colors['than'];

        function createSwatch(item, container) {
            const swatch = document.createElement('div');
            const isSelected = (currentSelectedColor.toLowerCase() === item.hex.toLowerCase()) && 
                               (state.textures[activePart] === (item.textureType || false));
            
            swatch.className = `color-swatch ${isSelected ? 'active' : ''}`;
            swatch.style.backgroundColor = item.hex;
            
            // Add visual pique/kaki texture indicators in picker swatches
            if (item.textureType === 'pique') {
                swatch.style.backgroundImage = 'radial-gradient(rgba(0,0,0,0.15) 20%, transparent 20%), radial-gradient(rgba(0,0,0,0.15) 20%, transparent 20%)';
                swatch.style.backgroundSize = '4px 4px';
                swatch.style.backgroundPosition = '0 0, 2px 2px';
            } else if (item.textureType === 'kaki') {
                swatch.style.backgroundImage = 'linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent)';
                swatch.style.backgroundSize = '6px 6px';
            } else if (item.isMetal) {
                if (item.metalType === 'silver') {
                    swatch.style.backgroundImage = 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)';
                } else if (item.metalType === 'nickel') {
                    swatch.style.backgroundImage = 'linear-gradient(135deg, #f1f5f9 0%, #a8a9ad 50%, #64748b 100%)';
                } else if (item.metalType === 'bronze') {
                    swatch.style.backgroundImage = 'linear-gradient(135deg, #ffe082 0%, #d4af37 50%, #855c00 100%)';
                } else if (item.metalType === 'antique') {
                    swatch.style.backgroundImage = 'linear-gradient(135deg, #a88c52 0%, #6b532a 50%, #3d2b0e 100%)';
                } else if (item.metalType === 'matte') {
                    swatch.style.backgroundImage = 'radial-gradient(circle, #333333 0%, #111111 80%)';
                }
            }
            
            swatch.title = item.name;
            swatch.addEventListener('click', () => {
                state.colors[activePart] = item.hex;
                state.textures[activePart] = item.textureType || false;
                state.isDirty = true;
                
                // Pocket color matching logic
                if (activePart === 'than') {
                    state.colors['tui'] = item.hex;
                    state.textures['tui'] = item.textureType || false;
                }
                
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                
                // Dynamic AI Suggestion triggers match suggestions
                runColorMatchingEngine(activePart, item);
                
                // Dùng debounce: tránh clearTintCache + redraw quá thường khi click nhanh
                scheduleColorRedraw();
            });
            container.appendChild(swatch);
        }

        // Render swatches only for the currently active grid
        if (state.product === 'ao-thun' && corpGrid) {
            CORPORATE_COLORS.forEach(c => createSwatch(c, corpGrid));
        }
        if (state.product === 'ao-polo' && texturedGrid && !isPoloButtons) {
            TEXTURED_COLORS.forEach(c => createSwatch(c, texturedGrid));
        }
        if (state.product === 'ao-polo' && buttonGrid && isPoloButtons) {
            POLO_BUTTON_COLORS.forEach(c => createSwatch(c, buttonGrid));
        }
        if ((state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho') && !isWorkwearButtons && workGrid) {
            WORKWEAR_COLORS.forEach(c => createSwatch(c, workGrid));
        }
        if (isWorkwearButtons) {
            if (workwearButtonGridPlastic) {
                WORKWEAR_PLASTIC_BUTTONS.forEach(c => createSwatch(c, workwearButtonGridPlastic));
            }
            if (workwearButtonGridMetal) {
                WORKWEAR_METAL_BUTTONS.forEach(c => createSwatch(c, workwearButtonGridMetal));
            }
        }

        // Build reflective colors grid swatches
        const reflGrid = document.getElementById('grid-reflective-colors');
        if (reflGrid) {
            reflGrid.innerHTML = '';
            const REFLECTIVE_COLORS = [
                { name: 'Xanh phản quang', hex: '#2dd4bf' },
                { name: 'Bạc phản quang', hex: '#e2e8f0' },
                { name: 'Vàng chanh', hex: '#bef264' },
                { name: 'Cam cảnh báo', hex: '#f97316' }
            ];
            
            const currentReflColor = state.colors['phan-quang'] || '#2dd4bf';
            
            REFLECTIVE_COLORS.forEach(item => {
                const swatch = document.createElement('div');
                swatch.className = `color-swatch ${currentReflColor.toLowerCase() === item.hex.toLowerCase() ? 'active' : ''}`;
                swatch.style.backgroundColor = item.hex;
                swatch.title = item.name;
                swatch.addEventListener('click', () => {
                    state.colors['phan-quang'] = item.hex;
                    state.isDirty = true;
                    
                    reflGrid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                    swatch.classList.add('active');
                    
                    scheduleColorRedraw();
                });
                reflGrid.appendChild(swatch);
            });
        }
    }

    // Intelligent AI color matching engine
    function runColorMatchingEngine(part, item) {
        const textEl = document.getElementById('ai-suggestion-text');
        if (!textEl) return;
        
        // Pre-defined pairings based on color theory
        let recommendation = '';
        let tags = [];
        
        if (item.name === 'Cam bảo hộ' || item.hex === '#ea580c') {
            recommendation = "Màu chủ đạo Cam bảo hộ cực kỳ nổi bật. AI đề xuất phối cùng màu Xám chì hoặc Xanh Navy ở cổ/vai để tạo điểm cân bằng thẩm mỹ, giảm bám bẩn.";
            tags = ['Xám chì', 'Navy đậm', 'Phản quang bạc'];
        } else if (item.name === 'Navy' || item.hex === '#1e3a8a') {
            recommendation = "Màu xanh Navy lịch lãm và tin cậy. AI gợi ý phối viền cổ màu Cam neon hoặc Vàng chanh để tạo nét trẻ trung, tăng năng lượng doanh nghiệp.";
            tags = ['Cam neon', 'Vàng chanh', 'Trắng tinh'];
        } else if (item.name === 'Đỏ rượu vang' || item.hex === '#7f1d1d') {
            recommendation = "Đỏ rượu vang ấm cúng và sang trọng. AI đề xuất bo tay màu Đen than và khuy nút ánh kim loại để nâng tầm đồng phục nhà hàng, cafe cao cấp.";
            tags = ['Đen than', 'Viền vàng', 'Vàng đồng'];
        } else {
            recommendation = `Đã chọn màu ${item.name} làm màu chính cho ${part === 'than' ? 'thân áo' : part}. Hệ thống AI đề xuất phối cùng tông màu tương phản nhẹ để tạo nét đột phá.`;
            tags = ['Đen tuyền', 'Xám ghi', 'Trắng sữa'];
        }

        // Apply typewriter animation
        animateAIWords(recommendation, tags);
    }

    let aiTypewriterTimer = null;

    // Typewriter rendering animation
    function animateAIWords(text, tags, keepPalette = false) {
        const el = document.getElementById('ai-suggestion-text');
        const tagsContainer = document.getElementById('ai-suggested-palettes');
        if (!el) return;

        // Clear any active typewriter timer to avoid overlapping text
        if (aiTypewriterTimer) {
            clearInterval(aiTypewriterTimer);
            aiTypewriterTimer = null;
        }

        el.innerText = '';
        el.classList.add('typing-effect');
        
        let i = 0;
        aiTypewriterTimer = setInterval(() => {
            if (i < text.length) {
                el.innerText += text.charAt(i);
                i++;
            } else {
                clearInterval(aiTypewriterTimer);
                aiTypewriterTimer = null;
                el.classList.remove('typing-effect');
                
                // Only rebuild simple tags if keepPalette=false (non-suggest flow)
                if (!keepPalette && tagsContainer) {
                    tagsContainer.innerHTML = '';
                    tagsContainer.classList.remove('hidden');
                    tags.forEach(t => {
                        const tag = document.createElement('span');
                        tag.className = 'ai-match-tag';
                        tag.innerHTML = `✨ ${t}`;
                        tagsContainer.appendChild(tag);
                    });
                }
            }
        }, 12);
    }

    // AI Industry presets logic
    function applyAIIndustryPreset(industry) {
        if (!industry) return;
        
        let descText = "";
        let presetColors = {};
        let industryTags = [];
        
        if (industry === 'co-khi') {
            descText = "Ngành Cơ khí đòi hỏi độ bền cao và chống vết bẩn cơ khí. AI đã phối màu Thân Xám kỹ sư, viền và cổ màu Cam bảo hộ thể hiện sự khỏe khoắn, năng động. Đã tích hợp túi hộp ngực đa năng tiện lợi.";
            presetColors = {
                than: '#64748b',
                tay: '#64748b',
                co: '#475569',
                'bo-tay': '#475569',
                'tru-co': '#ea580c',
                'vien-co': '#ea580c',
                tui: '#64748b',
                'nap-tui': '#475569'
            };
            state.product = 'ao-bao-ho';
            state.pockets.left = true;
            state.pockets.right = true;
            state.pockets.flap = true;
            state.pockets.sleeve = false;
            state.reflective.chest = true;
            state.reflective.shoulders = false;
            industryTags = ['Chống bẩn', 'Cam nổi bật', 'Túi đa năng'];
        } else if (industry === 'dien-luc') {
            descText = "Ngành Điện lực chú trọng an toàn phản quang. AI phối màu Thân áo Xanh công trình bích phối nẹp nắp Cam bảo hộ, trang bị đầy đủ phản quang ngực vai và bắp tay an toàn tuyệt đối.";
            presetColors = {
                than: '#2563eb',
                tay: '#2563eb',
                co: '#1e293b',
                'bo-tay': '#1e293b',
                'tru-co': '#ea580c',
                'vien-co': '#ea580c',
                tui: '#2563eb',
                'nap-tui': '#ea580c'
            };
            state.product = 'ao-bao-ho';
            state.pockets.left = true;
            state.pockets.right = true;
            state.pockets.flap = true;
            state.pockets.sleeve = true;
            state.reflective.chest = true;
            state.reflective.shoulders = true;
            state.reflective.sleeves = true;
            industryTags = ['An toàn 5cm', 'Phản quang vai', 'Túi bút tay'];
        } else if (industry === 'cong-trinh') {
            descText = "Thiết kế nổi bật tối đa ngoài đại công trường. AI sử dụng tone Cam bảo hộ chủ đạo kết hợp vai phối màu Xám chì. Đai áo thắt gọn gàng cùng logo thêu ngực trái.";
            presetColors = {
                than: '#ea580c',
                tay: '#ea580c',
                co: '#334155',
                'bo-tay': '#334155',
                'tru-co': '#334155',
                'vien-co': '#ea580c',
                tui: '#ea580c',
                'nap-tui': '#334155'
            };
            state.product = 'ao-bao-ho';
            state.pockets.left = true;
            state.pockets.right = false;
            state.pockets.flap = true;
            state.reflective.chest = true;
            industryTags = ['Bảo hộ công trình', 'Dễ nhận diện', 'Vai tối màu'];
        } else if (industry === 'nha-hang') {
            descText = "Không gian nhà hàng ẩm thực đòi hỏi tính sang trọng và ấm cúng. AI phối màu Đỏ rượu vang sâu quý phái phối đen huyền bí ở cổ, tạo cảm giác vô cùng cao cấp và lịch thiệp.";
            presetColors = {
                than: '#7f1d1d',
                tay: '#7f1d1d',
                co: '#0f172a',
                'bo-tay': '#0f172a',
                'tru-co': '#7f1d1d',
                'vien-co': '#fbbf24'
            };
            state.product = 'ao-polo';
            state.pockets.left = false;
            state.pockets.right = false;
            state.reflective.chest = false;
            industryTags = ['Đỏ quý phái', 'Lịch thiệp', 'Dễ làm sạch'];
        } else if (industry === 'the-thao') {
            descText = "Phù hợp hoạt động team-building, sự kiện sôi động. AI sử dụng phối màu Xanh mint tươi mát phối Navy đậm khỏe mạnh, mang lại cảm giác giải nhiệt và năng lượng căng tràn.";
            presetColors = {
                than: '#34d399',
                tay: '#1e3a8a',
                co: '#6d28d9',
                'bo-tay': '#6d28d9',
                'tru-co': '#1e3a8a',
                'vien-co': '#ffffff'
            };
            state.product = 'ao-polo';
            state.pockets.left = false;
            state.pockets.right = false;
            industryTags = ['Co giãn 4D', 'Mint mát lạnh', 'Đột phá'];
        }

        // Apply config states
        state.colors = { ...state.colors, ...presetColors };
        state.hasViewedBack = (state.angle === 'back');
        
        // Sync Pocket Inputs UI
        document.getElementById('input-pocket-left').checked = state.pockets.left;
        document.getElementById('input-pocket-right').checked = state.pockets.right;
        document.getElementById('input-pocket-flap').checked = state.pockets.flap;
        document.getElementById('input-pocket-sleeve').checked = state.pockets.sleeve;
        document.getElementById('input-pocket-sleeve-right').checked = state.pockets.sleeveRight;
        
        // Sync Reflective inputs UI
        document.getElementById('input-reflective-chest').checked = state.reflective.chest;
        document.getElementById('input-reflective-shoulders').checked = state.reflective.shoulders;
        document.getElementById('input-reflective-sleeves').checked = state.reflective.sleeves;
        
        // Sync selects
        const styleSel = document.getElementById('select-product-style');
        if (styleSel) {
            if (state.product === 'ao-polo') {
                styleSel.value = state.form === 'nam' ? 'polo-nam' : 'polo-nu';
            } else if (state.product === 'ao-thun') {
                styleSel.value = 'thun-tron';
            } else if (state.product === 'ao-bao-ho') {
                styleSel.value = 'bao-ho-ky-su';
            }
        }
        
        // Sync product cards active state
        document.querySelectorAll('.product-card').forEach(card => {
            if (card.getAttribute('data-product') === state.product) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Set Display labels
        document.getElementById('lbl-uniform-type').innerText = state.product === 'ao-polo' ? 'ÁO POLO ĐỒNG PHỤC' : (state.product === 'ao-thun' ? 'ÁO THUN ĐỒNG PHỤC' : 'ĐỒ BẢO HỘ LAO ĐỘNG');
        document.getElementById('lbl-product-display-name').innerText = state.product === 'ao-polo' ? 'Polo Premium Mrs Linh' : (state.product === 'ao-thun' ? 'T-Shirt Cổ Tròn Năng Động' : 'Đồng Phục Kỹ Sư Công Trình');

        // Typewriter animate description
        animateAIWords(descText, industryTags);
        
        // Re-build color picker & load resources
        buildColorSwatches();
        loadAndRender();
    }

    // ── PHONG THỦY COLOR ENGINE ───────────────────────────────────────────────
    // Tính Ngũ Hành từ năm sinh → gợi ý màu áo tương sinh, tránh màu tương khắc
    function applyFengShuiColors(birthYear, gender) {
        // Bảng Ngũ hành theo can chi (năm sinh mod 10 → thiên can)
        const thienCan = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
        const nguHanh = {
            'Giáp': 'Mộc', 'Ất': 'Mộc',
            'Bính': 'Hỏa', 'Đinh': 'Hỏa',
            'Mậu': 'Thổ', 'Kỷ': 'Thổ',
            'Canh': 'Kim', 'Tân': 'Kim',
            'Nhâm': 'Thủy', 'Quý': 'Thủy'
        };

        const canKey = thienCan[birthYear % 10];
        const hanh = nguHanh[canKey] || 'Thổ';

        // Mỗi Ngũ Hành có bảng màu chính + màu tương sinh (được dùng) + màu tương khắc (tránh)
        const fengData = {
            'Mộc': {
                desc: `Ngũ Hành Mộc (${canKey} — ${birthYear}) mang năng lượng sinh trưởng, phát triển bền bỉ. Màu sắc tốt: Xanh lá, Xanh ngọc, Đen Navy (Thủy sinh Mộc). Tránh: Trắng, Xám (Kim khắc Mộc).`,
                palettes: [
                    { name: 'Xanh lá ngọc', hex: '#166534', role: 'Màu mệnh — Đại cát', part: 'than' },
                    { name: 'Xanh bích', hex: '#0e7490', role: 'Tương sinh — Thủy→Mộc', part: 'tay' },
                    { name: 'Navy đậm', hex: '#1e3a8a', role: 'Tương sinh — Thủy→Mộc', part: 'co' },
                    { name: 'Xanh rêu', hex: '#3f6212', role: 'Hỗ trợ mệnh', part: 'bo-tay' },
                ]
            },
            'Hỏa': {
                desc: `Ngũ Hành Hỏa (${canKey} — ${birthYear}) mang nhiệt huyết, lãnh đạo, sáng tạo đột phá. Màu sắc tốt: Đỏ, Cam, Tím (Mộc sinh Hỏa). Tránh: Xanh lam đậm (Thủy khắc Hỏa).`,
                palettes: [
                    { name: 'Đỏ rực', hex: '#dc2626', role: 'Màu mệnh — Đại cát', part: 'than' },
                    { name: 'Cam bảo hộ', hex: '#ea580c', role: 'Màu mệnh — Cát', part: 'tay' },
                    { name: 'Tím hoa cà', hex: '#7c3aed', role: 'Tương sinh — Mộc→Hỏa', part: 'co' },
                    { name: 'Xanh lá đậm', hex: '#166534', role: 'Tương sinh — Mộc→Hỏa', part: 'bo-tay' },
                ]
            },
            'Thổ': {
                desc: `Ngũ Hành Thổ (${canKey} — ${birthYear}) vững chắc, uy tín, cầu toàn. Màu sắc tốt: Vàng, Nâu đất, Cam đất (Hỏa sinh Thổ). Tránh: Xanh lá (Mộc khắc Thổ).`,
                palettes: [
                    { name: 'Vàng đồng', hex: '#d97706', role: 'Màu mệnh — Đại cát', part: 'than' },
                    { name: 'Nâu đất', hex: '#92400e', role: 'Màu mệnh — Cát', part: 'tay' },
                    { name: 'Cam đất', hex: '#c2410c', role: 'Tương sinh — Hỏa→Thổ', part: 'co' },
                    { name: 'Đỏ đô', hex: '#991b1b', role: 'Tương sinh — Hỏa→Thổ', part: 'bo-tay' },
                ]
            },
            'Kim': {
                desc: `Ngũ Hành Kim (${canKey} — ${birthYear}) cứng rắn, quyết đoán, tài lộc vượng. Màu sắc tốt: Trắng, Bạc, Xám (Kim mệnh). Màu Vàng đất (Thổ sinh Kim). Tránh: Đỏ, Cam (Hỏa khắc Kim).`,
                palettes: [
                    { name: 'Trắng tinh', hex: '#f8fafc', role: 'Màu mệnh — Đại cát', part: 'than' },
                    { name: 'Xám ghi', hex: '#475569', role: 'Màu mệnh — Cát', part: 'tay' },
                    { name: 'Vàng đất', hex: '#ca8a04', role: 'Tương sinh — Thổ→Kim', part: 'co' },
                    { name: 'Kem nhạt', hex: '#fef3c7', role: 'Tương sinh — Thổ→Kim', part: 'bo-tay' },
                ]
            },
            'Thủy': {
                desc: `Ngũ Hành Thủy (${canKey} — ${birthYear}) thông minh, linh hoạt, trí tuệ. Màu sắc tốt: Đen, Xanh Navy, Xám chì (Kim sinh Thủy). Tránh: Vàng đất, Nâu (Thổ khắc Thủy).`,
                palettes: [
                    { name: 'Đen huyền', hex: '#0f172a', role: 'Màu mệnh — Đại cát', part: 'than' },
                    { name: 'Navy đậm', hex: '#1e3a8a', role: 'Màu mệnh — Cát', part: 'tay' },
                    { name: 'Xám chì', hex: '#334155', role: 'Tương sinh — Kim→Thủy', part: 'co' },
                    { name: 'Trắng bạc', hex: '#e2e8f0', role: 'Tương sinh — Kim→Thủy', part: 'bo-tay' },
                ]
            }
        };

        const data = fengData[hanh] || fengData['Thổ'];

        // Build result rows in suggestions area
        const tagsContainer = document.getElementById('ai-suggested-palettes');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            tagsContainer.classList.remove('hidden');

            // Element badge
            const badge = document.createElement('div');
            badge.style.cssText = 'font-size: 11px; font-weight: 700; color: var(--accent-blue); margin-bottom: 6px; padding: 4px 0;';
            badge.innerHTML = `⚡ Mệnh <strong>${hanh}</strong> — Năm ${birthYear} (${canKey})`;
            tagsContainer.appendChild(badge);

            data.palettes.forEach(p => {
                const row = document.createElement('div');
                row.className = 'feng-result-row';
                row.innerHTML = `
                    <div class="feng-swatch" style="background:${p.hex};"></div>
                    <div class="feng-label"><strong>${p.name}</strong>${p.role || ""}</div>
                    <button class="feng-apply-btn" title="Áp dụng màu ${p.name}">Dùng</button>
                `;
                row.querySelector('.feng-apply-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.colors[p.part] = p.hex;
                    state.colors.tui = p.part === 'than' ? p.hex : state.colors.tui;
                    state.isDirty = true;
                    scheduleColorRedraw();
                    showToast(`✅ Đã áp dụng ${p.name} (${p.role || ""}) lên ${p.part}`, 'success', 3000);
                });
                row.addEventListener('click', () => {
                    row.querySelector('.feng-apply-btn').click();
                });
                tagsContainer.appendChild(row);
            });
        }

        animateAIWords(data.desc, [hanh, canKey, String(birthYear)]);
    }

    // ── BRAND COLOR ENGINE ────────────────────────────────────────────────────
    // Phân tích màu chủ đạo thương hiệu → gợi ý bảng màu áo nhất quán
    function applyBrandColors(brandHex, mood, combined = false, birthYear = null, gender = 'nam') {
        // Parse HSL từ hex để tính toán màu bổ sung
        function hexToHSL(hex) {
            let r = parseInt(hex.slice(1, 3), 16) / 255;
            let g = parseInt(hex.slice(3, 5), 16) / 255;
            let b = parseInt(hex.slice(5, 7), 16) / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max === min) { h = s = 0; }
            else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }
            return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
        }

        function hslToHex(h, s, l) {
            h /= 360; s /= 100; l /= 100;
            let r, g, b;
            if (s === 0) { r = g = b = l; }
            else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1; if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return `#${[r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
        }

        const hsl = hexToHSL(brandHex);

        // Màu tương phản (complementary) = xoay 180°
        const compH = (hsl.h + 180) % 360;
        // Màu split-complementary = xoay ±150°
        const split1H = (hsl.h + 150) % 360;
        const split2H = (hsl.h + 210) % 360;
        // Màu tối hơn (darker) của thương hiệu
        const darkL = Math.max(10, hsl.l - 25);
        // Màu sáng hơn (lighter)
        const lightL = Math.min(90, hsl.l + 30);

        // Bảng phối theo mood
        const moodPalettes = {
            trust: {
                palettes: [
                    { name: 'Màu TH (thân)', hex: brandHex, role: 'Màu chủ — Nhận diện TH', part: 'than' },
                    { name: 'Tối hơn (tay)', hex: hslToHex(hsl.h, hsl.s, darkL), role: 'Phối tương đồng', part: 'tay' },
                    { name: 'Sáng (cổ áo)', hex: hslToHex(hsl.h, Math.max(0, hsl.s - 20), lightL), role: 'Điểm nhấn nhẹ', part: 'co' },
                    { name: 'Trắng nền', hex: '#f1f5f9', role: 'Viền sáng chuyên nghiệp', part: 'vien-co' },
                ],
                desc: `Mood Tin Cậy: Giữ màu TH ${brandHex} làm chủ đạo, phối tông sáng/tối cùng dải màu để tạo cảm giác nhất quán, chuyên nghiệp và đáng tin cậy.`
            },
            energy: {
                palettes: [
                    { name: 'Màu TH (thân)', hex: brandHex, role: 'Màu chủ năng động', part: 'than' },
                    { name: 'Bổ sung (tay)', hex: hslToHex(compH, hsl.s, hsl.l), role: 'Tương phản mạnh', part: 'tay' },
                    { name: 'Split 1 (cổ)', hex: hslToHex(split1H, hsl.s, hsl.l), role: 'Điểm nhấn sôi động', part: 'co' },
                    { name: 'Trắng nổi bật', hex: '#ffffff', role: 'Cân bằng', part: 'vien-co' },
                ],
                desc: `Mood Năng Lượng: Màu TH ${brandHex} phối với màu bổ sung ${hslToHex(compH, hsl.s, hsl.l)} tạo tương phản mạnh, bắt mắt và tràn đầy sinh lực.`
            },
            luxury: {
                palettes: [
                    { name: 'Màu TH đậm (thân)', hex: hslToHex(hsl.h, hsl.s, darkL), role: 'Tone trầm sang trọng', part: 'than' },
                    { name: 'Màu TH (tay)', hex: brandHex, role: 'Màu chủ đạo', part: 'tay' },
                    { name: 'Vàng kim (cổ)', hex: '#ca8a04', role: 'Điểm vàng cao cấp', part: 'co' },
                    { name: 'Đen huyền', hex: '#0f172a', role: 'Nền tối sang trọng', part: 'bo-tay' },
                ],
                desc: `Mood Sang Trọng: Tone trầm của màu TH ${hslToHex(hsl.h, hsl.s, darkL)} phối viền vàng kim tạo cảm giác luxury, premium cho nhà hàng / khách sạn.`
            },
            nature: {
                palettes: [
                    { name: 'Màu TH (thân)', hex: brandHex, role: 'Màu chủ tự nhiên', part: 'than' },
                    { name: 'Xanh lá rừng', hex: '#166534', role: 'Tự nhiên bền vững', part: 'tay' },
                    { name: 'Kem nhạt (cổ)', hex: '#fef9c3', role: 'Ánh đất tự nhiên', part: 'co' },
                    { name: 'Nâu đất', hex: '#78350f', role: 'Ấm áp mộc mạc', part: 'bo-tay' },
                ],
                desc: `Mood Tự Nhiên: Màu TH ${brandHex} kết hợp xanh lá rừng và nâu đất tạo bảng màu gần gũi thiên nhiên, phù hợp nông nghiệp hữu cơ, y tế, spa.`
            },
            bold: {
                palettes: [
                    { name: 'Màu TH (thân)', hex: brandHex, role: 'Màu chủ mạnh mẽ', part: 'than' },
                    { name: 'Đen công nghiệp', hex: '#1c1917', role: 'Chắc chắn, bền bỉ', part: 'tay' },
                    { name: 'Cam bảo hộ', hex: '#ea580c', role: 'Nổi bật an toàn', part: 'co' },
                    { name: 'Xám thép', hex: '#374151', role: 'Công nghiệp chính xác', part: 'bo-tay' },
                ],
                desc: `Mood Mạnh Mẽ: Màu TH ${brandHex} phối đen công nghiệp và cam bảo hộ tạo bộ đồng phục cứng rắn, nổi bật trên công trường hay xưởng cơ khí.`
            }
        };

        const moodData = moodPalettes[mood] || moodPalettes['trust'];
        let finalDesc = moodData.desc;
        let finalPalettes = moodData.palettes;

        // Kết hợp phong thủy: ưu tiên màu tương sinh với mệnh
        if (combined && birthYear) {
            const thienCan = ['Canh','Tân','Nhâm','Quý','Giáp','Ất','Bính','Đinh','Mậu','Kỷ'];
            const nguHanh = {
                'Giáp':'Mộc','Ất':'Mộc','Bính':'Hỏa','Đinh':'Hỏa',
                'Mậu':'Thổ','Kỷ':'Thổ','Canh':'Kim','Tân':'Kim','Nhâm':'Thủy','Quý':'Thủy'
            };
            const fengAccent = {
                'Mộc': { hex: '#166534', name: 'Xanh Mộc' }, 'Hỏa': { hex: '#dc2626', name: 'Đỏ Hỏa' },
                'Thổ': { hex: '#d97706', name: 'Vàng Thổ' }, 'Kim': { hex: '#94a3b8', name: 'Bạc Kim' },
                'Thủy': { hex: '#1e3a8a', name: 'Navy Thủy' }
            };
            const can = thienCan[birthYear % 10];
            const hanh = nguHanh[can] || 'Thổ';
            const accent = fengAccent[hanh];
            finalPalettes = [
                ...moodData.palettes.slice(0, 2),
                { name: `${accent.name} phong thủy (cổ)`, hex: accent.hex, role: `Mệnh ${hanh} ${birthYear}`, part: 'co' },
                { name: `Phong thủy (bo tay)`, hex: hslToHex((hsl.h + 30) % 360, hsl.s, darkL), role: 'Hài hòa PT+TH', part: 'bo-tay' },
            ];
            finalDesc = `✨ Kết hợp PT+TH: Màu TH ${brandHex} (${mood}) + Mệnh ${hanh} (${can} ${birthYear}). Cổ áo và điểm nhấn dùng màu ${accent.name} tương sinh mệnh, thân áo giữ nhận diện thương hiệu.`;
        }

        // Build result rows
        const tagsContainer = document.getElementById('ai-suggested-palettes');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            tagsContainer.classList.remove('hidden');

            finalPalettes.forEach(p => {
                const row = document.createElement('div');
                row.className = 'feng-result-row';
                row.innerHTML = `
                    <div class="feng-swatch" style="background:${p.hex};"></div>
                    <div class="feng-label"><strong>${p.name}</strong>${p.role || ""}</div>
                    <button class="feng-apply-btn">Dùng</button>
                `;
                row.querySelector('.feng-apply-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.colors[p.part] = p.hex;
                    if (p.part === 'than') state.colors.tui = p.hex;
                    state.isDirty = true;
                    scheduleColorRedraw();
                    showToast(`✅ Áp dụng ${p.name} lên ${p.part}`, 'success', 2500);
                });
                row.addEventListener('click', () => row.querySelector('.feng-apply-btn').click());
                tagsContainer.appendChild(row);
            });
        }

        animateAIWords(finalDesc, combined ? ['PT+TH', mood, String(birthYear)] : [mood, brandHex]);
    }

    // ── NATURAL LANGUAGE PARSER ───────────────────────────────────────────────
    // Phân tích chuỗi nhập tự nhiên của user → trích xuất: năm sinh, giới tính, ngành, màu
    function extractAIInfo(text) {
        const t = text.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
            .replace(/[,;.!?]/g, ' ');

        const result = {
            gender: 'nam',
            birthYear: null,
            industry: null,
            brandColors: [],
            raw: text
        };

        // Giới tính
        if (/\bnu\b|phu nu|con gai|be gai/.test(t)) result.gender = 'nu';

        // Năm sinh: 4 chữ số (1920-2010)
        const yearMatch = t.match(/\b(19[2-9]\d|200\d|2010)\b/);
        if (yearMatch) result.birthYear = parseInt(yearMatch[1]);

        // Ngành nghề (mở rộng)
        const industryMap = [
            { keys: ['xay dung','cong trinh','cong truong','kien truc','nha thau'], val: 'cong-trinh' },
            { keys: ['co khi','che tao','gia cong','han tien','may man'], val: 'co-khi' },
            { keys: ['dien luc','dien tu','ha tang','vien thong','khi gas'], val: 'dien-luc' },
            { keys: ['nha hang','am thuc','bep','cafe','quan an','dich vu an'], val: 'nha-hang' },
            { keys: ['the thao','su kien','event','giai tri','bong da','ran luyen'], val: 'the-thao' },
            { keys: ['may mac','det may','quan ao','thoi trang','theu'], val: 'may-mac' },
            { keys: ['du lich','khu du lich','travel','tour','lu hanh','khach san','resort','hotel'], val: 'du-lich' },
            { keys: ['go','noi that','do go','san go','xuong go','moc'], val: 'go' },
            { keys: ['nong san','lua gao','rau cu','trai cay','nong nghiep','hoa qua','ca phe','ca cao','tieu'], val: 'nong-san' },
            { keys: ['thuy san','hai san','nuoi tom','ca tra','ca basa','tom cua','nuoi ca'], val: 'thuy-san' },
            { keys: ['y te','benh vien','phong kham','duoc','suc khoe','spa','tham my'], val: 'y-te' },
            { keys: ['ngan hang','tai chinh','bao hiem','phap ly','luat','van phong','chung khoan'], val: 'nganh-trust' },
        ];
        for (const { keys, val } of industryMap) {
            if (keys.some(k => t.includes(k))) { result.industry = val; break; }
        }

        // Màu sắc thương hiệu — trích xuất tất cả màu được đề cập
        const colorMap = {
            'do': '#dc2626', 'hong': '#f43f5e', 'tia': '#dc2626',
            'cam': '#ea580c', 'vang': '#d97706', 'vang chanh': '#84cc16',
            'xanh la': '#166534', 'xanh re': '#166534', 'reu': '#3f6212',
            'xanh lam': '#1d4ed8', 'xanh bien': '#0e7490', 'xanh bich': '#0e7490',
            'xanh': '#1d4ed8', 'navy': '#1e3a8a', 'xanh den': '#102a43',
            'xanh ngoc': '#0d9488', 'xanh mint': '#10b981',
            'tim': '#7c3aed', 'tia': '#9333ea',
            'trang': '#f8fafc', 'kem': '#fef3c7',
            'xam': '#64748b', 'ghi': '#475569', 'bac': '#94a3b8',
            'den': '#0f172a', 'nau': '#92400e', 'be': '#d4a017',
        };
        // Priority: multi-word first
        const sortedColors = Object.keys(colorMap).sort((a, b) => b.length - a.length);
        for (const colorKey of sortedColors) {
            if (t.includes(colorKey) && !result.brandColors.includes(colorMap[colorKey])) {
                result.brandColors.push(colorMap[colorKey]);
                if (result.brandColors.length >= 3) break;
            }
        }

        return result;
    }

    // ── UNIFIED AI SUGGEST ENGINE ─────────────────────────────────────────────
    // Kết hợp phong thủy + ngành + màu thương hiệu từ thông tin user nhập
    function runAISuggest(inputText) {
        const info = extractAIInfo(inputText);
        const { gender, birthYear, industry, brandColors } = info;

        // Show result area
        const resultBody = document.getElementById('ai-result-body');
        if (resultBody) resultBody.style.display = '';

        // Determine feng shui data — dùng hệ NẠP ÂM NGŨ HÀNH (60 Hoa Giáp) — chính xác
        let fengHanh = null, fengCanChi = null, fengNapAmName = null, fengCung = null, fengPalette = [];
        if (birthYear) {
            // ─── Bảng Nạp Âm Ngũ Hành theo 30 cặp của 60 Hoa Giáp ───────────────
            // Chu kỳ bắt đầu từ Giáp Tý = 1924 (hoặc 1864, 1804...)
            // Mỗi cặp năm liên tiếp trong chu kỳ 60 năm cùng Nạp Âm
            const napAmElements = [
                'Kim','Hỏa','Mộc','Thổ','Kim','Hỏa',  // cặp 0-5:  1924-1934
                'Thủy','Thổ','Kim','Mộc','Thủy','Thổ', // cặp 6-11: 1936-1946
                'Hỏa','Mộc','Thủy','Kim','Hỏa','Mộc',  // cặp 12-17: 1948-1958
                'Thổ','Kim','Hỏa','Thủy','Thổ','Kim',  // cặp 18-23: 1960-1970
                'Mộc','Thủy','Thổ','Hỏa','Mộc','Thủy' // cặp 24-29: 1972-1982
            ];
            const napAmNames = [
                'Hải Trung Kim','Lô Trung Hỏa','Đại Lâm Mộc','Lộ Bàng Thổ','Kiếm Phong Kim','Sơn Đầu Hỏa',
                'Giản Hạ Thủy','Thành Đầu Thổ','Bạch Lạp Kim','Dương Liễu Mộc','Tuyền Trung Thủy','Ốc Thượng Thổ',
                'Tích Lịch Hỏa','Tùng Bách Mộc','Trường Lưu Thủy','Sa Trung Kim','Sơn Hạ Hỏa','Bình Địa Mộc',
                'Bích Thượng Thổ','Kim Phú Kim','Phú Đăng Hỏa','Thiên Hà Thủy','Đại Trạch Thổ','Thoa Xuyến Kim',
                'Tang Đố Mộc','Đại Khê Thủy','Sa Trung Thổ','Thiên Thượng Hỏa','Thạch Lựu Mộc','Đại Hải Thủy'
            ];
            const thienCanArr = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
            const diaChiArr  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

            const pos      = ((birthYear - 1924) % 60 + 60) % 60; // vị trí trong chu kỳ 60
            const pairIdx  = Math.floor(pos / 2);                  // chỉ số cặp (0-29)
            const stemIdx  = pos % 10;                             // Thiên Can
            const branchIdx = pos % 12;                            // Địa Chi

            fengHanh      = napAmElements[pairIdx] || 'Thổ';
            fengNapAmName = napAmNames[pairIdx] || '';
            fengCanChi    = thienCanArr[stemIdx] + ' ' + diaChiArr[branchIdx];

            // Tính Cung Mệnh (Quái số Phi Tinh)
            const yx    = birthYear % 100;
            let yySum   = yx;
            while (yySum > 9) { yySum = String(yySum).split('').reduce((a, b) => a + parseInt(b), 0); }
            const cungNam = ((11 - yySum) % 9) || 9;
            const cungNu  = ((yySum + 4) % 9)  || 9;
            fengCung = (gender === 'nu') ? cungNu : cungNam;

            // Màu sắc gợi ý theo mệnh + màu tương sinh
            const fengColors = {
                'Mộc': [
                    { hex: '#166534', part: 'co',     role: 'Mệnh Mộc — Xanh lá đại cát' },
                    { hex: '#0e7490', part: 'bo-tay', role: 'Thủy sinh Mộc — tương sinh' },
                ],
                'Hỏa': [
                    { hex: '#dc2626', part: 'co',     role: 'Mệnh Hỏa — Đỏ rực đại cát' },
                    { hex: '#166534', part: 'bo-tay', role: 'Mộc sinh Hỏa — tương sinh' },
                ],
                'Thổ': [
                    { hex: '#d97706', part: 'co',     role: 'Mệnh Thổ — Vàng đồng đại cát' },
                    { hex: '#dc2626', part: 'bo-tay', role: 'Hỏa sinh Thổ — tương sinh' },
                ],
                'Kim': [
                    { hex: '#e2e8f0', part: 'co',     role: 'Mệnh Kim — Bạc trắng đại cát' },
                    { hex: '#ca8a04', part: 'bo-tay', role: 'Thổ sinh Kim — tương sinh' },
                ],
                'Thủy': [
                    { hex: '#0f172a', part: 'co',     role: 'Mệnh Thủy — Đen huyền đại cát' },
                    { hex: '#94a3b8', part: 'bo-tay', role: 'Kim sinh Thủy — tương sinh' },
                ],
            };
            fengPalette = fengColors[fengHanh] || [];
        }

        // Determine industry mood (mở rộng ngành)
        const industryMoodMap = {
            'cong-trinh': { than: '#ea580c', tay: '#334155' },
            'co-khi':     { than: '#475569', tay: '#1c1917' },
            'dien-luc':   { than: '#1d4ed8', tay: '#ea580c' },
            'nha-hang':   { than: '#7f1d1d', tay: '#0f172a' },
            'the-thao':   { than: '#34d399', tay: '#1e3a8a' },
            'may-mac':    { than: '#ec4899', tay: '#f9a8d4' },
            'du-lich':    { than: '#0284c7', tay: '#0ea5e9' },
            'go':         { than: '#78350f', tay: '#d97706' },
            'nong-san':   { than: '#166534', tay: '#ca8a04' },
            'thuy-san':   { than: '#0c4a6e', tay: '#06b6d4' },
            'y-te':       { than: '#0f766e', tay: '#f1f5f9' },
            'nganh-trust':{ than: '#1e3a8a', tay: '#e2e8f0' },
        };
        const industryColors = industry ? (industryMoodMap[industry] || null) : null;

        // Build final palette
        const finalPalettes = [];

        // 1. Màu thân áo: ưu tiên màu thương hiệu #1 nếu có, rồi ngành, rồi navy default
        const mainColor = brandColors[0] || (industryColors ? industryColors.than : '#1e3a8a');
        finalPalettes.push({ name: 'Thân áo', hex: mainColor, role: brandColors[0] ? 'Màu thương hiệu' : (industryColors ? 'Theo ngành' : 'Mặc định'), part: 'than' });

        // 2. Màu tay áo: màu thương hiệu #2 nếu có, rồi tay từ ngành
        const sleeveColor = brandColors[1] || (industryColors ? industryColors.tay : '#334155');
        finalPalettes.push({ name: 'Tay áo', hex: sleeveColor, role: brandColors[1] ? 'Màu thương hiệu #2' : 'Theo ngành/mặc định', part: 'tay' });

        // 3. Cổ áo: phong thủy nếu có, rồi màu thương hiệu #3, rồi tối hơn
        if (fengPalette[0]) {
            finalPalettes.push({
                name: 'Cổ áo',
                hex: fengPalette[0].hex,
                part: fengPalette[0].part,
                role: fengPalette[0].role
            });
        } else if (brandColors[2]) {
            finalPalettes.push({ name: 'Cổ áo', hex: brandColors[2], role: 'Màu thương hiệu #3', part: 'co' });
        } else {
            finalPalettes.push({ name: 'Cổ áo', hex: '#0f172a', role: 'Đen tối điểm nhấn', part: 'co' });
        }

        // 4. Bo tay: phong thủy tương sinh
        if (fengPalette[1]) {
            finalPalettes.push({
                name: 'Bo tay',
                hex: fengPalette[1].hex,
                part: fengPalette[1].part,
                role: fengPalette[1].role
            });
        } else {
            finalPalettes.push({ name: 'Bo tay', hex: brandColors[1] || '#94a3b8', role: 'Tông phụ cân bằng', part: 'bo-tay' });
        }

        // Build parsed info badges
        const tagsContainer = document.getElementById('ai-suggested-palettes');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            tagsContainer.classList.remove('hidden');

            // Parsed badges row
            const badgeRow = document.createElement('div');
            badgeRow.className = 'ai-parsed-badges';
            if (gender) badgeRow.innerHTML += `<span class="ai-parsed-badge">${gender === 'nam' ? '👨 Nam' : '👩 Nữ'}</span>`;
            if (birthYear) {
                const cungLabel = fengCung ? ` • Cung ${fengCung}` : '';
                const napAmLabel = fengNapAmName ? ` (${fengNapAmName})` : '';
                badgeRow.innerHTML += `<span class="ai-parsed-badge" title="${fengCanChi}${napAmLabel}">🎂 ${birthYear} — ${fengCanChi} — Mệnh ${fengHanh}${cungLabel}</span>`;
            }
            if (industry) {
                const industryName = {
                    'cong-trinh': '🏗️ Xây dựng', 'co-khi': '⚙️ Cơ khí',
                    'dien-luc': '⚡ Điện lực', 'nha-hang': '🍽️ Nhà hàng',
                    'the-thao': '⚽ Thể thao', 'may-mac': '👗 May mặc',
                    'du-lich': '✈️ Du lịch', 'go': '🪵 Gỗ/Nội thất',
                    'nong-san': '🌾 Nông sản', 'thuy-san': '🐟 Thủy sản',
                    'y-te': '🏥 Y tế/Spa', 'nganh-trust': '🏦 Tài chính/VP'
                }[industry] || industry;
                badgeRow.innerHTML += `<span class="ai-parsed-badge">${industryName}</span>`;
            }
            brandColors.forEach((c, i) => {
                badgeRow.innerHTML += `<span class="ai-parsed-badge" style="background:${c}20; border-color:${c}60; color:${c};">Màu ${i + 1}</span>`;
            });
            tagsContainer.appendChild(badgeRow);

            // Color rows
            finalPalettes.forEach(p => {
                const row = document.createElement('div');
                row.className = 'feng-result-row';
                row.innerHTML = `
                    <div class="feng-swatch" style="background:${p.hex};"></div>
                    <div class="feng-label"><strong>${p.name}</strong>${p.role || ""}</div>
                    <button class="feng-apply-btn">Dùng</button>
                `;
                row.querySelector('.feng-apply-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.colors[p.part] = p.hex;
                    if (p.part === 'than') state.colors.tui = p.hex;
                    state.isDirty = true;
                    scheduleColorRedraw();
                    showToast(`✅ Áp dụng ${p.name} → ${p.hex}`, 'success', 2500);
                });
                row.addEventListener('click', () => row.querySelector('.feng-apply-btn').click());
                tagsContainer.appendChild(row);
            });
        }

        // Build description text
        const parts = [];
        if (birthYear) {
            const napAmDesc = fengNapAmName ? ` (${fengNapAmName})` : '';
            parts.push(`${fengCanChi} — mệnh ${fengHanh}${napAmDesc}, cung ${fengCung}`);
        }
        if (industry) {
            const nm = {
                'cong-trinh':'xây dựng','co-khi':'cơ khí','dien-luc':'điện lực',
                'nha-hang':'nhà hàng','the-thao':'thể thao','may-mac':'may mặc',
                'du-lich':'du lịch','go':'gỗ/nội thất','nong-san':'nông sản',
                'thuy-san':'thủy sản','y-te':'y tế/spa','nganh-trust':'tài chính/VP'
            };
            parts.push(`ngành ${nm[industry] || industry}`);
        }
        if (brandColors.length) parts.push(`màu chủ đạo ${brandColors.slice(0, 2).join(' + ')}`);

        const descText = `Dựa trên: ${parts.join(', ')}. Bảng màu dưới đây kết hợp Nạp Âm phong thủy + đặc trưng ngành + màu thương hiệu. Nhấn "Dùng" để áp lên từng vị trí áo.`;
        animateAIWords(descText, [], true);
    }

    // Toggle Basic vs Pro Designer modes
    function toggleDesignerMode(isPro) {

        state.isProMode = isPro;
        const descEl = document.getElementById('lbl-design-mode-desc');
        // Chỉ toggle logo-pro-control; div-pro-layers có nút toggle độc lập riêng
        const proElements = document.querySelectorAll('.logo-pro-control');
        
        if (isPro) {
            if (descEl) descEl.innerText = 'Chế độ Chuyên Nghiệp (Full Control)';
            proElements.forEach(el => el.classList.remove('hidden'));
        } else {
            if (descEl) descEl.innerText = 'Chế độ Cơ Bản cho khách đặt hàng';
            proElements.forEach(el => el.classList.add('hidden'));
        }
    }

    // Reset all adjustments of the design back to default state
    function resetDesignState() {
        state.isDirty = false;
        state.logos = [];
        state.hasViewedBack = false;
        clearTintCache();
        
        // Reset colors
        state.colors = {
            than: '#0f172a',
            tay: '#0f172a',
            co: '#1e293b',
            'bo-tay': '#1e293b',
            'tru-co': '#1e293b',
            'vien-co': '#fbbf24',
            tui: '#0f172a',
            'nap-tui': '#1e293b',
            'phan-quang': '#2dd4bf',
            nut: '#ffffff',
            'chan-co': '#1e293b'
        };
        
        // Reset textures based on product type
        const defaultTex = (state.product === 'ao-polo') ? 'pique' : 
                           ((state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho') ? 'kaki' : false);
        state.textures = {
            than: defaultTex,
            tay: defaultTex,
            co: defaultTex,
            'bo-tay': defaultTex,
            'tru-co': defaultTex,
            'vien-co': defaultTex,
            tui: defaultTex,
            'nap-tui': defaultTex,
            'phan-quang': false,
            nut: false,
            'chan-co': defaultTex
        };
        
        // Reset pockets
        state.pockets = {
            left: false,
            right: false,
            sleeve: false,
            sleeveRight: false,
            flap: false
        };
        
        // Reset reflective
        state.reflective = {
            chest: false,
            shoulders: false,
            sleeves: false,
            width: 5,
            color: '#2dd4bf',
            yOffset: 0
        };
        
        // Reset patterns
        state.patterns = {
            front: { file: null, imgElement: null, x: 0, y: 0, scale: 100, rotate: 0, opacity: 95, blendMode: 'normal', printType: 'chuyen-nhiet', realism: 85, coverage: { than: true, tay: false, co: false, tui: false } },
            back: { file: null, imgElement: null, x: 0, y: 0, scale: 100, rotate: 0, opacity: 95, blendMode: 'normal', printType: 'chuyen-nhiet', realism: 85, coverage: { than: true, tay: false, co: false, tui: false } },
            left: { file: null, imgElement: null, x: 0, y: 0, scale: 100, rotate: 0, opacity: 95, blendMode: 'normal', printType: 'chuyen-nhiet', realism: 85, coverage: { than: true, tay: false, co: false, tui: false } },
            right: { file: null, imgElement: null, x: 0, y: 0, scale: 100, rotate: 0, opacity: 95, blendMode: 'normal', printType: 'chuyen-nhiet', realism: 85, coverage: { than: true, tay: false, co: false, tui: false } }
        };
        
        // Uncheck all pocket and reflective checkboxes in DOM
        const checkIds = [
            'input-pocket-left', 'input-pocket-right', 'input-pocket-sleeve', 'input-pocket-sleeve-right', 'input-pocket-flap',
            'input-reflective-chest', 'input-reflective-shoulders', 'input-reflective-sleeves'
        ];
        checkIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });

        const inputReflectiveHeight = document.getElementById('input-reflective-height');
        if (inputReflectiveHeight) inputReflectiveHeight.value = 0;
        const lblReflectiveHeight = document.getElementById('lbl-reflective-height');
        if (lblReflectiveHeight) lblReflectiveHeight.innerText = 'Mặc định';

        // Hide any pattern previews
        const pDiv = document.getElementById('div-pattern-preview');
        if (pDiv) pDiv.classList.add('hidden');
        const pInput = document.getElementById('input-pattern-file');
        if (pInput) pInput.value = '';

        // Reset display selected color active part
        const selectPart = document.getElementById('select-color-part');
        if (selectPart) selectPart.value = 'than';

        buildColorSwatches();
    }

    function performProductSwitch(targetProduct) {
        state.product = targetProduct;
        state.hasViewedBack = (state.angle === 'back');
        clearTintCache();
        
        // Reset all texture flags based on product type
        if (state.textures) {
            const defaultTex = (targetProduct === 'ao-polo') ? 'pique' : 
                               ((targetProduct === 'ao-bao-ho' || targetProduct === 'quan-bao-ho') ? 'kaki' : false);
            for (const key in state.textures) {
                state.textures[key] = defaultTex;
            }
        }
        
        document.querySelectorAll('.product-card').forEach(c => c.classList.remove('active'));
        const activeCard = document.querySelector(`.product-card[data-product="${targetProduct}"]`);
        if (activeCard) activeCard.classList.add('active');

        // Adjust options based on product type
        const styleSel = document.getElementById('select-product-style');
        if (styleSel) styleSel.innerHTML = '';
        
        if (state.product === 'ao-polo') {
            if (styleSel) {
                styleSel.innerHTML = `
                    <option value="polo-nam">Polo Nam Cộc Tay (Vai Ngang)</option>
                    <option value="polo-nu">Polo Nữ Ôm Dáng (Eo Bó Nhẹ)</option>
                    <option value="polo-congty">Polo Công Ty Cao Cấp</option>
                    <option value="polo-thethao">Polo Thể Thao Co Giãn</option>
                `;
            }
            document.getElementById('lbl-uniform-type').innerText = 'ÁO POLO ĐỒNG PHỤC';
            document.getElementById('lbl-product-display-name').innerText = 'Polo Premium Mrs Linh';
        } else if (state.product === 'ao-thun') {
            if (styleSel) {
                styleSel.innerHTML = `
                    <option value="thun-co-tron">Áo Thun Cổ Tròn</option>
                    <option value="thun-oversize">Form Rộng Oversize</option>
                    <option value="thun-raglan">Tay Raglan Phối Màu</option>
                    <option value="thun-the-thao">Thun Thể Thao Mát Lạnh</option>
                `;
            }
            document.getElementById('lbl-uniform-type').innerText = 'ÁO THUN ĐỒNG PHỤC';
            document.getElementById('lbl-product-display-name').innerText = 'T-Shirt Cổ Tròn Năng Động';
        } else if (state.product === 'ao-bao-ho') {
            if (styleSel) {
                styleSel.innerHTML = `
                    <option value="bao-ho-ky-su">Áo Kỹ Sư Công Trình</option>
                    <option value="bao-ho-dien-luc">Đồng Phục Ngành Điện</option>
                    <option value="bao-ho-co-khi">Đồ Bảo Hộ Xưởng Cơ Khí</option>
                `;
            }
            document.getElementById('lbl-uniform-type').innerText = 'ĐỒ BẢO HỘ LAO ĐỘNG';
            document.getElementById('lbl-product-display-name').innerText = 'Áo Bảo Hộ Kỹ Sư';
        } else if (state.product === 'quan-bao-ho') {
            if (styleSel) {
                styleSel.innerHTML = `
                    <option value="quan-tui-hop">Quần Bảo Hộ Túi Hộp</option>
                    <option value="quan-tui-dui">Quần Túi Đùi Co Giãn</option>
                    <option value="quan-co-gian">Quần Công Trình Bền Bỉ</option>
                `;
            }
            document.getElementById('lbl-uniform-type').innerText = 'QUẦN BẢO HỘ LAO ĐỘNG';
            document.getElementById('lbl-product-display-name').innerText = 'Quần Bảo Hộ Túi Hộp';
        }

        loadAndRender();
    }

    // Get pattern's corner points in 800x800 coordinate space
    function getPatternCorners(pattern) {
        if (!pattern || !pattern.imgElement) return null;
        const scaleFactor = pattern.scale / 100;
        const w = pattern.imgElement.width * scaleFactor * 0.4;
        const h = pattern.imgElement.height * scaleFactor * 0.4;
        const cx = canvas.width / 2 + pattern.x;
        const cy = canvas.height / 2 + pattern.y;
        const rad = (pattern.rotate * Math.PI) / 180;

        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const localCorners = [
            { x: -w / 2, y: -h / 2 }, // Top-Left
            { x: w / 2, y: -h / 2 },  // Top-Right
            { x: w / 2, y: h / 2 },   // Bottom-Right
            { x: -w / 2, y: h / 2 }   // Bottom-Left
        ];

        return localCorners.map(pt => ({
            x: cx + pt.x * cos - pt.y * sin,
            y: cy + pt.x * sin + pt.y * cos
        }));
    }

    // Get pattern rotate handle coordinate in canvas space
    function getPatternRotateHandle(pattern) {
        if (!pattern || !pattern.imgElement) return null;
        const scaleFactor = pattern.scale / 100;
        const h = pattern.imgElement.height * scaleFactor * 0.4;
        const cx = canvas.width / 2 + pattern.x;
        const cy = canvas.height / 2 + pattern.y;
        const rad = (pattern.rotate * Math.PI) / 180;

        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const pt = { x: 0, y: -h / 2 - 25 };
        return {
            x: cx + pt.x * cos - pt.y * sin,
            y: cy + pt.x * sin + pt.y * cos
        };
    }

    // Translate canvas click coordinates to pattern local space for precision containment checks
    function getLocalClickCoords(px, py, pattern) {
        if (!pattern || !pattern.imgElement) return null;
        const cx = canvas.width / 2 + pattern.x;
        const cy = canvas.height / 2 + pattern.y;
        const rad = (-pattern.rotate * Math.PI) / 180;

        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const dx = px - cx;
        const dy = py - cy;

        return {
            x: dx * cos - dy * sin,
            y: dx * sin + dy * cos
        };
    }

    // Draw pattern dashed transform box, rotate & scale handles, snaps
    function drawPatternTransformBox(ctx, pattern) {
        if (!pattern || !pattern.imgElement) return;

        const corners = getPatternCorners(pattern);
        if (!corners) return;

        // 1. Draw dashed selection box
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        ctx.lineTo(corners[1].x, corners[1].y);
        ctx.lineTo(corners[2].x, corners[2].y);
        ctx.lineTo(corners[3].x, corners[3].y);
        ctx.closePath();
        ctx.stroke();

        // 2. Draw vertical line connecting to rotate handle
        const cx = canvas.width / 2 + pattern.x;
        const cy = canvas.height / 2 + pattern.y;
        const rad = (pattern.rotate * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const scaleFactor = pattern.scale / 100;
        const h = pattern.imgElement.height * scaleFactor * 0.4;
        
        const topCenter = {
            x: cx + (0) * cos - (-h / 2) * sin,
            y: cy + (0) * sin + (-h / 2) * cos
        };
        const rotateHandle = getPatternRotateHandle(pattern);

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(topCenter.x, topCenter.y);
        ctx.lineTo(rotateHandle.x, rotateHandle.y);
        ctx.stroke();

        // 3. Draw rotate handle circle
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rotateHandle.x, rotateHandle.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // 4. Draw 4 corner resize handles
        corners.forEach(pt => {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
            ctx.strokeRect(pt.x - 4, pt.y - 4, 8, 8);
        });

        // 5. Draw Snap guidelines if snapped to center
        if (pattern.x === 0) {
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 50);
            ctx.lineTo(canvas.width / 2, canvas.height - 50);
            ctx.stroke();
        }
        if (pattern.y === 0) {
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(50, canvas.height / 2);
            ctx.lineTo(canvas.width - 50, canvas.height / 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Sync pattern coordinate sliders UI with active pattern state values
    function syncPatternInputsUI() {
        const pattern = state.patterns[state.angle];
        const previewDiv = document.getElementById('div-pattern-preview');
        const previewImg = document.getElementById('img-pattern-preview');
        const viewLabel = document.getElementById('lbl-pattern-view-badge');

        if (!pattern || !pattern.imgElement) {
            state.activePatternSelected = false;
            if (previewDiv) previewDiv.classList.add('hidden');
            const fileInput = document.getElementById('input-pattern-file');
            if (fileInput) fileInput.value = '';
            return;
        }

        if (previewDiv) previewDiv.classList.remove('hidden');
        if (previewImg) previewImg.src = pattern.imgElement.src;
        
        const angleNames = { 'front': 'Mặt Trước', 'back': 'Mặt Sau', 'left': 'Mặt Trái', 'right': 'Mặt Phải' };
        if (viewLabel) viewLabel.innerText = angleNames[state.angle] || 'Họa Tiết';

        const scaleSlider = document.getElementById('input-pattern-scale');
        const scaleNum = document.getElementById('input-pattern-scale-num');
        if (scaleSlider) scaleSlider.value = pattern.scale;
        if (scaleNum) scaleNum.value = pattern.scale;

        const rotateSlider = document.getElementById('input-pattern-rotate');
        const rotateNum = document.getElementById('input-pattern-rotate-num');
        if (rotateSlider) rotateSlider.value = pattern.rotate;
        if (rotateNum) rotateNum.value = pattern.rotate;

        const opacitySlider = document.getElementById('input-pattern-opacity');
        const opacityLabel = document.getElementById('lbl-pattern-opacity');
        if (opacitySlider) opacitySlider.value = pattern.opacity;
        if (opacityLabel) opacityLabel.innerText = `${pattern.opacity}%`;

        const xSlider = document.getElementById('input-pattern-x');
        const xLabel = document.getElementById('lbl-pattern-x');
        if (xSlider) xSlider.value = pattern.x;
        if (xLabel) xLabel.innerText = `${pattern.x}px`;

        const ySlider = document.getElementById('input-pattern-y');
        const yLabel = document.getElementById('lbl-pattern-y');
        if (ySlider) ySlider.value = pattern.y;
        if (yLabel) yLabel.innerText = `${pattern.y}px`;

        const realismSlider = document.getElementById('input-pattern-realism');
        const realismLabel = document.getElementById('lbl-pattern-realism');
        if (realismSlider) realismSlider.value = pattern.realism;
        if (realismLabel) realismLabel.innerText = `${pattern.realism}%`;

        const blendSelect = document.getElementById('select-pattern-blend');
        if (blendSelect) blendSelect.value = pattern.blendMode;

        const printSelect = document.getElementById('select-pattern-print');
        if (printSelect) printSelect.value = pattern.printType;

        // Sync Coverage Checkboxes
        const cov = pattern.coverage || { than: true, tay: false, co: false, tui: false };
        const chkThan = document.getElementById('input-cov-than');
        const chkTay = document.getElementById('input-cov-tay');
        const chkCo = document.getElementById('input-cov-co');
        const chkTui = document.getElementById('input-cov-tui');

        if (chkThan) {
            chkThan.checked = !!cov.than;
            const parent = document.getElementById('chk-cov-than');
            if (parent) parent.classList.toggle('checked', !!cov.than);
        }
        if (chkTay) {
            chkTay.checked = !!cov.tay;
            const parent = document.getElementById('chk-cov-tay');
            if (parent) parent.classList.toggle('checked', !!cov.tay);
        }
        if (chkCo) {
            chkCo.checked = !!cov.co;
            const parent = document.getElementById('chk-cov-co');
            if (parent) parent.classList.toggle('checked', !!cov.co);
        }
        if (chkTui) {
            chkTui.checked = !!cov.tui;
            const parent = document.getElementById('chk-cov-tui');
            if (parent) parent.classList.toggle('checked', !!cov.tui);
        }
    }

    // Render hyper-realistic warped, shaded & body-clipped pattern onto target canvas context
    function drawRealisticPattern(targetCtx, pattern, rawBodyImg, tintedBodyImg, isInsideCollar = false) {
        if (!pattern.imgElement) return;

        const W = canvas.width;
        const H = canvas.height;

        if (!pattern._renderCache) {
            pattern._renderCache = {};
        }

        const cacheKey = state.angle + '|' + rawBodyImg.src + '|' + pattern.x + '|' + pattern.y + '|' + pattern.rotate + '|' + pattern.scale + '|' + pattern.printType + '|' + pattern.realism + '|' + pattern.blendMode + '|' + pattern.opacity + '|' + isInsideCollar;

        if (pattern._renderCache[rawBodyImg.src] && pattern._renderCache[rawBodyImg.src].key === cacheKey) {
            const cachedCanvas = pattern._renderCache[rawBodyImg.src].canvas;
            targetCtx.save();
            let baseAlpha = (pattern.opacity !== undefined ? pattern.opacity : 95) / 100;
            if (isInsideCollar) {
                baseAlpha *= 0.3;
            }
            targetCtx.globalAlpha = baseAlpha;
            
            const bm = pattern.blendMode || 'normal';
            if (bm !== 'normal' && bm !== 'source-in') {
                targetCtx.globalCompositeOperation = bm;
            } else {
                targetCtx.globalCompositeOperation = 'source-over';
            }
            
            targetCtx.drawImage(cachedCanvas, 0, 0);
            targetCtx.restore();
            return;
        }

        // 1. Create temporary canvas for the raw pattern drawn with transforms
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = W;
        patternCanvas.height = H;
        const patternCtx = patternCanvas.getContext('2d');

        // Apply feathering blur filter to pattern edges
        const blurRad = pattern.printType === 'theu' ? '0.6px' : (pattern.printType === 'cao-su' ? '0.15px' : '0.3px');
        patternCtx.filter = `blur(${blurRad})`;

        patternCtx.save();
        patternCtx.translate(W / 2 + pattern.x, H / 2 + pattern.y);
        patternCtx.rotate((pattern.rotate * Math.PI) / 180);

        // Apply subtle perspective/warp deformations based on active view angle
        const warpStrength = (pattern.realism !== undefined ? pattern.realism : 80) / 100;
        if (state.angle === 'left' || state.angle === 'right') {
            patternCtx.scale(1.0 - 0.22 * warpStrength, 1.0); // Side compression perspective warp
        } else if (state.angle === 'front') {
            patternCtx.scale(1.0 + 0.04 * warpStrength, 1.0 - 0.03 * warpStrength); // Subtle expansion chest curve
        } else if (state.angle === 'back') {
            patternCtx.scale(1.0 - 0.03 * warpStrength, 1.0 + 0.02 * warpStrength); // Subtle back curve
        }

        const scaleFactor = pattern.scale / 100;
        const patW = pattern.imgElement.width * scaleFactor * 0.4;
        const patH = pattern.imgElement.height * scaleFactor * 0.4;

        patternCtx.drawImage(pattern.imgElement, -patW / 2, -patH / 2, patW, patH);
        patternCtx.restore();

        // 2. Run the Hardware-Accelerated Shading Pipeline on the pattern using the raw greyscale body image
        const shadingCanvas = document.createElement('canvas');
        shadingCanvas.width = W;
        shadingCanvas.height = H;
        const shadingCtx = shadingCanvas.getContext('2d');
        shadingCtx.drawImage(rawBodyImg, 0, 0, W, H);

        const blendedCanvas = document.createElement('canvas');
        blendedCanvas.width = W;
        blendedCanvas.height = H;
        const blendedCtx = blendedCanvas.getContext('2d');

        blendedCtx.drawImage(patternCanvas, 0, 0);

        // Set realistic blend alphas
        let shadowAlpha = 0.5 * warpStrength;
        let highlightAlpha = 0.35 * warpStrength;
        let weaveAlpha = 0.15 * warpStrength;

        // Adjust shading based on print style
        const printType = pattern.printType || 'chuyen-nhiet';
        if (printType === 'theu') {
            shadowAlpha = 0.7 * warpStrength;
            highlightAlpha = 0.5 * warpStrength;
            weaveAlpha = 0.3 * warpStrength;
        } else if (printType === 'cao-su') {
            shadowAlpha = 0.25 * warpStrength;
            highlightAlpha = 0.7 * warpStrength;
            weaveAlpha = 0.03 * warpStrength;
        } else if (printType === 'decal') {
            shadowAlpha = 0.4 * warpStrength;
            highlightAlpha = 0.2 * warpStrength;
            weaveAlpha = 0.08 * warpStrength;
        }

        // Apply shadows (multiply)
        blendedCtx.save();
        blendedCtx.globalCompositeOperation = 'multiply';
        blendedCtx.globalAlpha = shadowAlpha;
        blendedCtx.drawImage(shadingCanvas, 0, 0);
        blendedCtx.restore();

        // Clip to pattern boundaries
        blendedCtx.save();
        blendedCtx.globalCompositeOperation = 'destination-in';
        blendedCtx.drawImage(patternCanvas, 0, 0);
        blendedCtx.restore();

        // Apply highlights (overlay)
        blendedCtx.save();
        blendedCtx.globalCompositeOperation = 'overlay';
        blendedCtx.globalAlpha = highlightAlpha;
        blendedCtx.drawImage(shadingCanvas, 0, 0);
        blendedCtx.restore();

        // Clip
        blendedCtx.save();
        blendedCtx.globalCompositeOperation = 'destination-in';
        blendedCtx.drawImage(patternCanvas, 0, 0);
        blendedCtx.restore();

        // Apply weave texture (soft-light)
        blendedCtx.save();
        blendedCtx.globalCompositeOperation = 'soft-light';
        blendedCtx.globalAlpha = weaveAlpha;
        blendedCtx.drawImage(shadingCanvas, 0, 0);
        blendedCtx.restore();

        // Final Clip
        blendedCtx.save();
        blendedCtx.globalCompositeOperation = 'destination-in';
        blendedCtx.drawImage(patternCanvas, 0, 0);
        blendedCtx.restore();

        // 3. Create the clipped torso mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = W;
        maskCanvas.height = H;
        const maskCtx = maskCanvas.getContext('2d');

        // Draw the blended pattern first
        maskCtx.drawImage(blendedCanvas, 0, 0);

        // Clip the pattern into the torso shape using 'destination-in'
        // This guarantees the pattern NEVER bleeds outside the shirt body torso area!
        maskCtx.save();
        maskCtx.globalCompositeOperation = 'destination-in';
        maskCtx.drawImage(tintedBodyImg, 0, 0, W, H);
        maskCtx.restore();

        // Save into cache
        pattern._renderCache[rawBodyImg.src] = {
            key: cacheKey,
            canvas: maskCanvas
        };

        // 4. Draw the final clipped pattern back onto the main target context
        targetCtx.save();
        let baseAlpha = (pattern.opacity !== undefined ? pattern.opacity : 95) / 100;
        if (isInsideCollar) {
            baseAlpha *= 0.3; // Faded to only 30% to simulate inside view
        }
        targetCtx.globalAlpha = baseAlpha;
        
        const bm = pattern.blendMode || 'normal';
        if (bm !== 'normal' && bm !== 'source-in') {
            targetCtx.globalCompositeOperation = bm;
        } else {
            targetCtx.globalCompositeOperation = 'source-over'; // Normal print mode for crisp clear transfer look
        }
        
        targetCtx.drawImage(maskCanvas, 0, 0);
        targetCtx.restore();
    }

    // Render hyper-realistic warped, shaded & textured logo onto the target canvas context
    function drawRealisticLogo(targetCtx, logo, posX, posY, logoW, logoH, bodyImg) {
        if (!logo.imgElement) return;

        // Ensure logo dimensions are valid integers
        const W = Math.max(10, Math.round(logoW));
        const H = Math.max(10, Math.round(logoH));

        // Default physical simulation factors
        let shadowAlpha = 0.5;      // opacity for 'multiply' shadow creases
        let highlightAlpha = 0.35;  // opacity for 'overlay' highlights
        let weaveAlpha = 0.15;      // opacity for 'soft-light' fabric weave bleed
        let blurRadius = '0.3px';   // edge feathering blur filter

        // Custom simulation parameters based on selected logo print technology style
        const printStyle = logo.printStyle || 'chuyen-nhiet';
        if (printStyle === 'theu') {
            shadowAlpha = 0.65;     // deeper crevice shadows for 3D embroidery threads
            highlightAlpha = 0.45;  // bright sheen reflection on embroidery threads
            weaveAlpha = 0.25;      // thick fabric weave/thread bleed through
            blurRadius = '0.5px';   // soft feathered thread edges
        } else if (printStyle === 'cao-su') {
            shadowAlpha = 0.3;      // stiff rubber ignores fine crease shadows
            highlightAlpha = 0.65;  // glossy high highlight reflections
            weaveAlpha = 0.04;      // opaque silicone blocks fabric texture
            blurRadius = '0.15px';  // sharp crisp clean-cut rubber edges
        } else if (printStyle === 'decal') {
            shadowAlpha = 0.45;
            highlightAlpha = 0.25;
            weaveAlpha = 0.08;
            blurRadius = '0.25px';
        }

        // Double-Layer Cache - Layer 2: Shaded Composite Cache check
        const shadeCacheKey = state.angle + '|' + W + '|' + H + '|' + Math.round(posX) + '|' + Math.round(posY) + '|' + printStyle + '|' + (bodyImg ? bodyImg.src : '') + '|' + state.colors.than;
        if (logo._shadeCache && logo._shadeCacheKey === shadeCacheKey) {
            targetCtx.save();
            targetCtx.globalAlpha = logo.opacity / 100;
            targetCtx.drawImage(logo._shadeCache, posX - W / 2, posY - H / 2, W, H);
            targetCtx.restore();
            return;
        }

        // Double-Layer Cache - Layer 1: Blurred Logo Cache
        if (!logo._blurCache || logo._blurWidth !== W || logo._blurHeight !== H || logo._blurRadius !== blurRadius) {
            const logoCanvas = document.createElement('canvas');
            logoCanvas.width = W;
            logoCanvas.height = H;
            const logoCtx = logoCanvas.getContext('2d');
            
            logoCtx.filter = `blur(${blurRadius})`;
            logoCtx.drawImage(logo.imgElement, 0, 0, W, H);
            
            logo._blurCache = logoCanvas;
            logo._blurWidth = W;
            logo._blurHeight = H;
            logo._blurRadius = blurRadius;
        }
        const logoCanvas = logo._blurCache;

        // 2. Extract corresponding portion of fabric texture as shading map
        const shadingCanvas = document.createElement('canvas');
        shadingCanvas.width = W;
        shadingCanvas.height = H;
        const shadingCtx = shadingCanvas.getContext('2d');
        
        if (bodyImg) {
            // CRITICAL FIX: Calculate scale factor to match actual high-res raw image size to 800x800 canvas coordinates
            const scaleX = bodyImg.naturalWidth / 800;
            const scaleY = bodyImg.naturalHeight / 800;
            
            // Map logo's bounding box coordinates onto the exact raw shirt texture space
            shadingCtx.drawImage(
                bodyImg,
                Math.round((posX - W / 2) * scaleX),
                Math.round((posY - H / 2) * scaleY),
                Math.round(W * scaleX),
                Math.round(H * scaleY),
                0,
                0,
                W,
                H
            );
        } else {
            // Fallback: fill shading map with neutral gray if no shirt texture is loaded yet
            shadingCtx.fillStyle = '#808080';
            shadingCtx.fillRect(0, 0, W, H);
        }

        // 3. Create the final blended output canvas using native hardware-accelerated blend modes
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = W;
        outputCanvas.height = H;
        const outputCtx = outputCanvas.getContext('2d');

        // Step A: Draw the base feathered logo
        outputCtx.drawImage(logoCanvas, 0, 0);

        // Step B: Apply 'multiply' for soft crevice shadows of fabric creases
        outputCtx.save();
        outputCtx.globalCompositeOperation = 'multiply';
        outputCtx.globalAlpha = shadowAlpha;
        outputCtx.drawImage(shadingCanvas, 0, 0);
        outputCtx.restore();

        // Step C: Clip to logo boundaries to keep shading within the logo
        outputCtx.save();
        outputCtx.globalCompositeOperation = 'destination-in';
        outputCtx.drawImage(logoCanvas, 0, 0);
        outputCtx.restore();

        // Step D: Apply 'overlay' for highlights & texture folds
        outputCtx.save();
        outputCtx.globalCompositeOperation = 'overlay';
        outputCtx.globalAlpha = highlightAlpha;
        outputCtx.drawImage(shadingCanvas, 0, 0);
        outputCtx.restore();

        // Step E: Clip again to maintain transparent boundaries
        outputCtx.save();
        outputCtx.globalCompositeOperation = 'destination-in';
        outputCtx.drawImage(logoCanvas, 0, 0);
        outputCtx.restore();

        // Step F: Apply 'soft-light' for fabric weave texture bleed
        outputCtx.save();
        outputCtx.globalCompositeOperation = 'soft-light';
        outputCtx.globalAlpha = weaveAlpha;
        outputCtx.drawImage(shadingCanvas, 0, 0);
        outputCtx.restore();

        // Final Edge Clip
        outputCtx.save();
        outputCtx.globalCompositeOperation = 'destination-in';
        outputCtx.drawImage(logoCanvas, 0, 0);
        outputCtx.restore();

        // Save cache for stationary draws
        logo._shadeCache = outputCanvas;
        logo._shadeCacheKey = shadeCacheKey;

        // 4. Render output canvas onto target context with opacity
        targetCtx.save();
        targetCtx.globalAlpha = logo.opacity / 100;
        targetCtx.drawImage(
            outputCanvas,
            posX - W / 2,
            posY - H / 2,
            W,
            H
        );
        targetCtx.restore();
    }

    // ── Toast Notification ───────────────────────────────────────────────
    // Thay thế alert() để không block main thread và đẹp hơn
    function showToast(message, type = 'info', duration = 4000) {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        const icons = { success: '✅', error: '⚠️', info: 'ℹ️', warning: '🔔' };
        toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${message}</span>`;
        
        toastContainer.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('show'));
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, duration);
    }

    // Interactive event listeners registrations
    function initEvents() {
        
        // Tab switching slide panels control
        document.querySelectorAll('.toolbar-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanelId = tab.getAttribute('data-panel');
                const panel = document.getElementById('main-tool-panel');
                
                if (tab.classList.contains('active') && !panel.classList.contains('collapsed')) {
                    // Toggle collapse if clicking the active one
                    panel.classList.add('collapsed');
                    tab.classList.remove('active');
                    return;
                }
                
                document.querySelectorAll('.toolbar-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                panel.classList.remove('collapsed');
                
                // Show correct child content inside panel
                document.querySelectorAll('.panel-content').forEach(content => {
                    content.classList.add('hidden');
                });
                
                const activeContent = document.getElementById(targetPanelId);
                if (activeContent) activeContent.classList.remove('hidden');
                
                if (targetPanelId === 'panel-colors') {
                    buildColorSwatches();
                }
                
                // Title
                const panelTitles = {
                    'panel-templates': 'Mẫu Đồng Phục',
                    'panel-colors': 'Phối Màu Sắc',
                    'panel-pockets': 'Thiết Kế Túi Áo',
                    'panel-reflective': 'Dải Phản Quang',
                    'panel-logo': 'Thương Hiệu Logo',
                    'panel-patterns': 'Họa Tiết In Lớn',
                    'panel-sizes': 'Bảng thông số Size cơ bản',
                    'panel-export': 'Tải File Thiết Kế'
                };
                document.getElementById('panel-title').innerText = panelTitles[targetPanelId] || 'Thiết Kế';
            });
        });

        // Close panel trigger
        document.getElementById('btn-panel-close').addEventListener('click', () => {
            document.getElementById('main-tool-panel').classList.add('collapsed');
            document.querySelectorAll('.toolbar-tab').forEach(t => t.classList.remove('active'));
        });

        // Angle Buttons Click triggers
        document.querySelectorAll('.angle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                updateAngle(btn.getAttribute('data-angle'));
            });
        });

        // Product Cards Category changes
        let pendingProduct = null;
        const switchModal = document.getElementById('modal-switch-confirm');
        
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const targetProduct = card.getAttribute('data-product');
                if (state.product === targetProduct) return; // Ignore click on already active product
                
                if (state.isDirty) {
                    pendingProduct = targetProduct;
                    if (switchModal) switchModal.classList.add('active');
                } else {
                    performProductSwitch(targetProduct);
                }
            });
        });

        // Switch Confirmation Modal Event Listeners
        if (switchModal) {
            const btnClose = document.getElementById('btn-close-switch-modal');
            const btnContinue = document.getElementById('btn-switch-continue');
            const btnNew = document.getElementById('btn-switch-new');
            
            const closeModal = () => switchModal.classList.remove('active');
            
            if (btnClose) btnClose.addEventListener('click', closeModal);
            if (btnContinue) btnContinue.addEventListener('click', closeModal);
            
            if (btnNew) {
                btnNew.addEventListener('click', () => {
                    closeModal();
                    if (pendingProduct) {
                        resetDesignState();
                        performProductSwitch(pendingProduct);
                        pendingProduct = null;
                    }
                });
            }
        }

        // Form gender segment selectors
        document.getElementById('form-nam').addEventListener('click', () => {
            state.form = 'nam';
            state.hasViewedBack = (state.angle === 'back');
            document.getElementById('form-nam').classList.add('active');
            document.getElementById('form-nu').classList.remove('active');
            loadAndRender();
        });
        document.getElementById('form-nu').addEventListener('click', () => {
            state.form = 'nu';
            state.hasViewedBack = (state.angle === 'back');
            document.getElementById('form-nu').classList.add('active');
            document.getElementById('form-nam').classList.remove('active');
            loadAndRender();
        });

        // Color Picker Part selector changes
        document.getElementById('select-color-part').addEventListener('change', () => {
            buildColorSwatches();
        });

        // Size Guide Selector Listener
        const selectSizeGuide = document.getElementById('select-size-guide');
        if (selectSizeGuide) {
            selectSizeGuide.addEventListener('change', (e) => {
                state.size = e.target.value;
                state.isDirty = true;
            });
        }

        // Mode switch checkbox toggle
        document.getElementById('input-mode-toggle').addEventListener('change', (e) => {
            toggleDesignerMode(e.target.checked);
        });

        // Pockets controls toggles
        document.getElementById('input-pocket-left').addEventListener('change', (e) => {
            state.pockets.left = e.target.checked;
            state.isDirty = true;
            loadAndRender();
        });
        document.getElementById('input-pocket-right').addEventListener('change', (e) => {
            state.pockets.right = e.target.checked;
            state.isDirty = true;
            loadAndRender();
        });
        document.getElementById('input-pocket-sleeve').addEventListener('change', (e) => {
            state.pockets.sleeve = e.target.checked;
            state.isDirty = true;
            loadAndRender();
        });
        document.getElementById('input-pocket-sleeve-right').addEventListener('change', (e) => {
            state.pockets.sleeveRight = e.target.checked;
            state.isDirty = true;
            loadAndRender();
        });
        document.getElementById('input-pocket-flap').addEventListener('change', (e) => {
            state.pockets.flap = e.target.checked;
            state.isDirty = true;
            loadAndRender();
        });

        // Reflective tape checkbox changes
        document.getElementById('input-reflective-chest').addEventListener('change', (e) => {
            state.reflective.chest = e.target.checked;
            state.isDirty = true;
            loadAndRender();
        });
        document.getElementById('input-reflective-shoulders').addEventListener('change', (e) => {
            state.reflective.shoulders = e.target.checked;
            state.isDirty = true;
            loadAndRender();
        });
        document.getElementById('input-reflective-sleeves').addEventListener('change', (e) => {
            state.reflective.sleeves = e.target.checked;
            state.isDirty = true;
            loadAndRender();
        });


        // Reflective height range slider for chest tape
        const inputReflectiveHeight = document.getElementById('input-reflective-height');
        if (inputReflectiveHeight) {
            inputReflectiveHeight.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                state.reflective.yOffset = val;
                state.isDirty = true;
                const lblReflectiveHeight = document.getElementById('lbl-reflective-height');
                if (lblReflectiveHeight) {
                    lblReflectiveHeight.innerText = val === 0 ? 'Mặc định' : (val > 0 ? `+${val}px (Lên)` : `${val}px (Xuống)`);
                }
                drawCanvas(); // Phải dùng drawCanvas() trực tiếp ở đây để smooth khi kéo
                // scheduleRedraw() cũng ổn, nhưng drawCanvas() cho phép smooth hơn với slider
            });
        }

        // Logo Upload triggers
        const uploadZone = document.getElementById('logo-upload-zone');
        const fileInput = document.getElementById('input-logo-file');
        
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const logo = {
                        id: 'logo_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                        imgElement: img,
                        file: file,
                        view: state.angle,
                        x: 400,
                        y: 350,
                        scale: 120, // default width in pixels
                        opacity: 100,
                        printStyle: 'chuyen-nhiet'
                    };
                    state.logos.push(logo);
                    state.isDirty = true;
                    loadAndRender();
                    fileInput.value = ''; // clear input
                };
            };
            reader.readAsDataURL(file);
        });


        // Patterns uploads
        const patternZone = document.getElementById('pattern-upload-zone');
        const patternInput = document.getElementById('input-pattern-file');
        
        patternZone.addEventListener('click', () => {
            patternInput.click();
        });

        patternInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    state.patterns[state.angle].file = file;
                    state.patterns[state.angle].imgElement = img;
                    state.isDirty = true;
                    state.activePatternSelected = true; // Select pattern immediately
                    
                    syncPatternInputsUI();
                    scheduleRedraw();
                };
            };
            reader.readAsDataURL(file);
        });

        // Remove Pattern
        document.getElementById('btn-remove-pattern').addEventListener('click', () => {
            state.patterns[state.angle].file = null;
            state.patterns[state.angle].imgElement = null;
            state.activePatternSelected = false;
            state.isDirty = true;
            document.getElementById('div-pattern-preview').classList.add('hidden');
            document.getElementById('input-pattern-file').value = '';
            scheduleRedraw();
        });

        // Reset Pattern
        document.getElementById('btn-reset-pattern').addEventListener('click', () => {
            const pattern = state.patterns[state.angle];
            if (pattern) {
                pattern.x = 0;
                pattern.y = 0;
                pattern.scale = 100;
                pattern.rotate = 0;
                pattern.opacity = 90;
                pattern.realism = 80;
                pattern.blendMode = 'multiply';
                pattern.printType = 'chuyen-nhiet';
                state.isDirty = true;
                syncPatternInputsUI();
                scheduleRedraw();
            }
        });

        // Sliders Listeners
        document.getElementById('input-pattern-scale').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.patterns[state.angle].scale = val;
            state.isDirty = true;
            const numEl = document.getElementById('input-pattern-scale-num');
            if (numEl) numEl.value = val;
            scheduleRedraw();
        });
        document.getElementById('input-pattern-rotate').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.patterns[state.angle].rotate = val;
            state.isDirty = true;
            const numEl = document.getElementById('input-pattern-rotate-num');
            if (numEl) numEl.value = val;
            scheduleRedraw();
        });

        // Numeric Keypad/Keyboard Inputs Listeners
        const scaleNumInput = document.getElementById('input-pattern-scale-num');
        if (scaleNumInput) {
            scaleNumInput.addEventListener('input', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) return;
                val = Math.max(10, Math.min(300, val));
                state.patterns[state.angle].scale = val;
                state.isDirty = true;
                const slider = document.getElementById('input-pattern-scale');
                if (slider) slider.value = val;
                scheduleRedraw();
            });
            scaleNumInput.addEventListener('blur', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 10) val = 10;
                if (val > 300) val = 300;
                e.target.value = val;
                state.patterns[state.angle].scale = val;
                state.isDirty = true;
                const slider = document.getElementById('input-pattern-scale');
                if (slider) slider.value = val;
                scheduleRedraw();
            });
            scaleNumInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    scaleNumInput.blur();
                }
            });
        }

        const rotateNumInput = document.getElementById('input-pattern-rotate-num');
        if (rotateNumInput) {
            rotateNumInput.addEventListener('input', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) return;
                val = Math.max(-180, Math.min(180, val));
                state.patterns[state.angle].rotate = val;
                state.isDirty = true;
                const slider = document.getElementById('input-pattern-rotate');
                if (slider) slider.value = val;
                scheduleRedraw();
            });
            rotateNumInput.addEventListener('blur', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) val = 0;
                if (val < -180) val = -180;
                if (val > 180) val = 180;
                e.target.value = val;
                state.patterns[state.angle].rotate = val;
                state.isDirty = true;
                const slider = document.getElementById('input-pattern-rotate');
                if (slider) slider.value = val;
                scheduleRedraw();
            });
            rotateNumInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    rotateNumInput.blur();
                }
            });
        }

        document.getElementById('input-pattern-opacity').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.patterns[state.angle].opacity = val;
            state.isDirty = true;
            document.getElementById('lbl-pattern-opacity').innerText = `${val}%`;
            scheduleRedraw();
        });
        document.getElementById('input-pattern-x').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.patterns[state.angle].x = val;
            state.isDirty = true;
            document.getElementById('lbl-pattern-x').innerText = `${val}px`;
            scheduleRedraw();
        });
        document.getElementById('input-pattern-y').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.patterns[state.angle].y = val;
            state.isDirty = true;
            document.getElementById('lbl-pattern-y').innerText = `${val}px`;
            scheduleRedraw();
        });
        document.getElementById('input-pattern-realism').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.patterns[state.angle].realism = val;
            state.isDirty = true;
            document.getElementById('lbl-pattern-realism').innerText = `${val}%`;
            scheduleRedraw();
        });

        // Dropdowns Listeners
        document.getElementById('select-pattern-blend').addEventListener('change', (e) => {
            state.patterns[state.angle].blendMode = e.target.value;
            state.isDirty = true;
            scheduleRedraw();
        });
        document.getElementById('select-pattern-print').addEventListener('change', (e) => {
            state.patterns[state.angle].printType = e.target.value;
            state.isDirty = true;
            scheduleRedraw();
        });

        // Coverage Checkboxes Listeners
        const setupCoverageListener = (chkId, cardId, key) => {
            const chk = document.getElementById(chkId);
            if (chk) {
                chk.addEventListener('change', (e) => {
                    const pattern = state.patterns[state.angle];
                    if (!pattern.coverage) {
                        pattern.coverage = { than: true, tay: false, co: false, tui: false };
                    }
                    pattern.coverage[key] = e.target.checked;
                    state.isDirty = true;
                    
                    const card = document.getElementById(cardId);
                    if (card) {
                        card.classList.toggle('checked', e.target.checked);
                    }
                    
                    scheduleRedraw();
                });
            }
        };

        setupCoverageListener('input-cov-than', 'chk-cov-than', 'than');
        setupCoverageListener('input-cov-tay', 'chk-cov-tay', 'tay');
        setupCoverageListener('input-cov-co', 'chk-cov-co', 'co');
        setupCoverageListener('input-cov-tui', 'chk-cov-tui', 'tui');

        // ── Natural Language AI Suggest Button ───────────────────────────────
        // Hint chips: bấm để điền sẵn vào textarea
        document.querySelectorAll('.ai-hint-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const ta = document.getElementById('ai-input-text');
                if (ta) {
                    ta.value = chip.getAttribute('data-text');
                    ta.focus();
                }
            });
        });

        // Main suggest button
        const btnAISuggest = document.getElementById('btn-ai-suggest');
        if (btnAISuggest) {
            btnAISuggest.addEventListener('click', () => {
                const input = (document.getElementById('ai-input-text').value || '').trim();
                if (!input) {
                    showToast('Vui lòng nhập thông tin trước khi gợi ý!', 'warning');
                    return;
                }
                btnAISuggest.classList.add('loading');
                // Slight delay for UX feel
                setTimeout(() => {
                    runAISuggest(input);
                    btnAISuggest.classList.remove('loading');
                }, 600);
            });
            // Also support Enter key (Ctrl+Enter)
            document.getElementById('ai-input-text').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    btnAISuggest.click();
                }
            });
        }

        // ── Debug Layers Toggle ───────────────────────────────────────────────
        const debugBtn = document.getElementById('btn-toggle-debug-layers');
        const debugPanel = document.getElementById('div-pro-layers');
        const debugLbl = document.getElementById('lbl-debug-toggle');
        if (debugBtn && debugPanel) {
            debugBtn.addEventListener('click', () => {
                const isHidden = debugPanel.classList.toggle('hidden');
                debugLbl.textContent = isHidden ? 'Hiện ▼' : 'Ẩn ▲';
                debugBtn.style.opacity = isHidden ? '0.6' : '1';
            });
        }

        // Lead quote modal forms toggles
        const modal = document.getElementById('modal-lead-form');
        
        function openLeadForm() {
            // Dynamic labels based on product type
            const labelQty = document.getElementById('lbl-lead-quantity') || document.querySelector('#modal-lead-form label[for="form-quantity"]') || document.querySelectorAll('#modal-lead-form label.control-label')[2];
            if (labelQty) {
                if (state.product === 'quan-bao-ho') {
                    labelQty.innerHTML = 'Số lượng quần dự kiến <span style="color: var(--accent-rose);">*</span>';
                } else if (state.product === 'ao-bao-ho') {
                    labelQty.innerHTML = 'Số lượng áo dự kiến <span style="color: var(--accent-rose);">*</span>';
                } else {
                    labelQty.innerHTML = 'Số lượng áo dự kiến <span style="color: var(--accent-rose);">*</span>';
                }
            }
            
            // Also update lead capture description dynamically
            const leadDesc = document.querySelector('#modal-lead-form .modal-body p');
            if (leadDesc) {
                const productNamesDesc = {
                    'ao-polo': 'bản thiết kế áo thun Polo',
                    'ao-thun': 'bản thiết kế áo thun cổ tròn',
                    'ao-bao-ho': 'bản thiết kế áo Bảo Hộ Lao Động',
                    'quan-bao-ho': 'bản thiết kế quần Bảo Hộ Lao Động'
                };
                const pName = productNamesDesc[state.product] || 'bản thiết kế';
                leadDesc.innerHTML = `Vui lòng điền thông tin của bạn. Xưởng may Mrs Linh Quy Nhơn sẽ nhận được toàn bộ ${pName} (phối màu, logo, túi) của bạn và liên hệ báo giá gốc tận xưởng trong vòng 10 phút.`;
            }
            
            modal.classList.add('active');
        }

        // Nút "Gửi Báo Giá" header → cùng chức năng với nút "Gửi mẫu thiết kế qua Zalo"
        document.getElementById('btn-open-quote')?.addEventListener('click', () => {
            document.getElementById('btn-zalo-share')?.click();
        });
        // btn-quick-order is now an <a> link → no JS listener needed

        document.getElementById('btn-close-lead-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        document.getElementById('btn-cancel-lead').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // Submit form quote lead capture
        document.getElementById('btn-submit-lead').addEventListener('click', () => {
            const name = document.getElementById('form-fullname').value;
            const phone = document.getElementById('form-phone').value;
            const qty = document.getElementById('form-quantity').value;
            const notes = document.getElementById('form-notes').value;

            if (!name || !phone) {
                showToast('Vui lòng điền họ tên và số điện thoại/Zalo để Mrs Linh liên hệ báo giá!', 'warning');
                return;
            }

            // High end quote calculation feedback dynamically mapped to product
            const productLabels = {
                'ao-polo': 'áo thun Polo Premium',
                'ao-thun': 'áo thun cổ tròn',
                'ao-bao-ho': 'áo Bảo Hộ Lao Động',
                'quan-bao-ho': 'quần Bảo Hộ Lao Động'
            };
            const productTxt = productLabels[state.product] || 'đồng phục';

            showToast(`👍 Cảm ơn anh/chị ${name}! Mrs Linh Quy Nhơn sẽ liên hệ báo giá qua ${phone} trong giây lát!`, 'success', 6000);
            modal.classList.remove('active');
        });

        // Export PNG downloads
        document.getElementById('btn-download-png').addEventListener('click', () => {
            downloadDesignPNG();
        });
        document.getElementById('btn-export-png-panel').addEventListener('click', () => {
            downloadDesignPNG();
        });
        


        // Zalo Share Modal and PDF trigger
        const zaloModal = document.getElementById('modal-zalo-share');
        
        document.getElementById('btn-zalo-share').addEventListener('click', () => {
            // Guard size logic: if workwear and current state.size is not M, L, XL, XXL, normalize it to 'M'
            const isWorkwear = (state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho');
            if (isWorkwear) {
                const validSizes = ['M', 'L', 'XL', 'XXL'];
                if (!validSizes.includes(state.size)) {
                    state.size = 'M'; // Safe fallback
                }
            }
            
            // Dynamic text update for Zalo share modal based on product
            const zaloDesc = document.querySelector('#modal-zalo-share .modal-body p');
            if (zaloDesc) {
                if (state.product === 'quan-bao-ho') {
                    zaloDesc.innerHTML = 'Vui lòng cung cấp thông tin liên hệ và số lượng chi tiết cho từng size quần. Hệ thống sẽ tự động tổng hợp, xuất file PDF Catalog 3D chuyên nghiệp và kết nối tới Zalo của Mrs Linh.';
                } else {
                    zaloDesc.innerHTML = 'Vui lòng cung cấp thông tin liên hệ và số lượng chi tiết cho từng size áo. Hệ thống sẽ tự động tổng hợp, xuất file PDF Catalog 3D chuyên nghiệp và kết nối tới Zalo của Mrs Linh.';
                }
            }
            
            zaloModal.classList.add('active');
            populateZaloSizeInputs();
        });
        
        document.getElementById('btn-close-zalo-modal').addEventListener('click', () => {
            zaloModal.classList.remove('active');
        });
        
        document.getElementById('btn-cancel-zalo').addEventListener('click', () => {
            zaloModal.classList.remove('active');
        });

        document.getElementById('btn-submit-zalo').addEventListener('click', () => {
            generateDesignPDF();
        });

        // Save Draft local storage
        document.getElementById('btn-save-draft').addEventListener('click', () => {
            localStorage.setItem('mrs_linh_design_draft', JSON.stringify({
                product: state.product,
                form: state.form,
                colors: state.colors,
                pockets: state.pockets,
                reflective: state.reflective,
                size: state.size
            }));
            showToast('💾 Đã lưu bản phác thảo thiết kế thành công!', 'success');
        });

        // Accordions
        const trigger = document.querySelector('.accordion-trigger');
        if (trigger) {
            trigger.addEventListener('click', () => {
                const acc = document.querySelector('.accordion');
                if (acc) acc.classList.toggle('expanded');
            });
        }

        // Theme Switch Sáng / Tối
        document.getElementById('btn-theme-toggle').addEventListener('click', () => {
            const body = document.body;
            if (body.getAttribute('data-theme') === 'light') {
                body.removeAttribute('data-theme');
                state.theme = 'dark';
            } else {
                body.setAttribute('data-theme', 'light');
                state.theme = 'light';
            }
            loadAndRender();
        });
    }

    // Generate transparent canvas of only the designed shirt (Dynamic angle)
    function getTransparentShirtCanvas(angle = 'front') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 800;
        tempCanvas.height = 800;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Force angle for drawing layers
        const originalAngle = state.angle;
        state.angle = angle;
        
        const activeLayers = getLayersConfig();
        
        // Render layers in sequence
        activeLayers.forEach(layer => {
            const img = imgCache[layer.path];
            if (!img) return; // not preloaded yet
            
            let color = null;
            let textureType = false;
            if (layer.colorizable) {
                const groupKey = layer.group || layer.id;
                color = state.colors[groupKey] || state.colors['than'];
                textureType = state.textures[groupKey] || false;
            }
            
            // Render tinted layer
            const renderedImg = getTintedLayer(img, color, textureType);
            
            tempCtx.save();
            let dy = 0;
            if (layer.id === 'phan-quang') {
                dy = -parseInt(state.reflective.yOffset || 0);
                const tapeYCenter = 300;
                tempCtx.translate(0, tapeYCenter + dy);
                tempCtx.scale(1, parseFloat(state.reflective.width || 5) / 5);
                tempCtx.translate(0, -tapeYCenter);
            }
            if (layer.isOverlay) {
                tempCtx.globalCompositeOperation = 'multiply';
                tempCtx.drawImage(renderedImg, 0, 0, tempCanvas.width, tempCanvas.height);
            } else {
                if (layer.id === 'co-trong') {
                    tempCtx.globalAlpha = 0.7;
                }
                tempCtx.drawImage(renderedImg, 0, 0, tempCanvas.width, tempCanvas.height);
            }
            tempCtx.restore();

            // Apply patterns
            const activePattern = state.patterns[angle];
            if (activePattern && activePattern.imgElement) {
                const cov = activePattern.coverage || { than: true, tay: false, co: false, tui: false };
                let shouldApply = false;
                let isInsideCollar = false;
                
                if (layer.id === 'co-trong' && (state.product === 'ao-polo' || state.product === 'ao-thun')) {
                    isInsideCollar = true;
                    if (cov.than || cov.co) shouldApply = true;
                } else {
                    const isTorso = layer.id === 'than' || layer.group === 'than' || layer.id.includes('than') || layer.id.includes('nguc');
                    const isSleeve = (layer.id.includes('tay') || layer.group === 'tay') && !layer.id.includes('bo-tay') && !layer.id.includes('co-tay') && !layer.id.includes('tui');
                    const isCollar = layer.id === 'co' || layer.group === 'co' || layer.id.includes('co') || layer.id.includes('tru-co');
                    const isPocket = layer.id.includes('tui') || layer.group === 'tui' || layer.id.includes('nap-tui');
                    
                    if (isTorso && cov.than) shouldApply = true;
                    if (isSleeve && cov.tay) shouldApply = true;
                    if (isCollar && cov.co) shouldApply = true;
                    if (isPocket && cov.tui) shouldApply = true;
                }
                
                if (shouldApply) {
                    drawRealisticPattern(tempCtx, activePattern, img, renderedImg, isInsideCollar);
                }
            }
        });

        // Draw custom draggable logos
        state.logos.forEach(logo => {
            if (logo.view === angle && logo.imgElement) {
                const logoW = logo.scale;
                const logoH = logo.scale * (logo.imgElement.height / logo.imgElement.width);
                const thanLayer = activeLayers.find(l => l.id === 'than' || l.id.includes('than'));
                const bodyImg = thanLayer ? imgCache[thanLayer.path] : null;
                
                drawRealisticLogo(tempCtx, logo, logo.x, logo.y, logoW, logoH, bodyImg);
            }
        });
        
        state.angle = originalAngle; // restore
        return tempCanvas;
    }

    function populateZaloSizeInputs() {
        const container = document.getElementById('zalo-size-inputs-container');
        if (!container) return;
        
        const currentProductKey = `${state.product}_${state.form}`;
        if (container.dataset.lastProduct === currentProductKey && container.children.length > 0) {
            return; // Preserve existing user-entered size inputs and values
        }
        container.dataset.lastProduct = currentProductKey;
        
        container.innerHTML = '';
        
        const isWorkwear = (state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho');
        
        if (isWorkwear) {
            // Create Section Title
            const sectionTitle = document.createElement('div');
            sectionTitle.className = 'zalo-section-title';
            sectionTitle.style.cssText = 'font-size: 13px; font-weight: 700; color: var(--accent-blue); margin-top: 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;';
            sectionTitle.innerHTML = '🛡️ Size Unisex Bảo Hộ';
            container.appendChild(sectionTitle);

            const grid = document.createElement('div');
            grid.className = 'zalo-size-grid';
            
            const sizes = [
                { name: 'M', spec: '54-61kg', display: 'M (Cỡ 5)' },
                { name: 'L', spec: '62-69kg', display: 'L (Cỡ 6)' },
                { name: 'XL', spec: '70-77kg', display: 'XL (Cỡ 7)' },
                { name: 'XXL', spec: '78-84kg', display: 'XXL (Cỡ 8)' }
            ];
            
            sizes.forEach(size => {
                const item = document.createElement('div');
                item.className = 'zalo-size-item';
                
                const label = document.createElement('span');
                label.className = 'zalo-size-label';
                label.innerText = size.display;
                
                const specSpan = document.createElement('span');
                specSpan.className = 'zalo-size-spec';
                specSpan.style.cssText = 'font-size: 9px; color: var(--text-muted); margin-bottom: 2px;';
                specSpan.innerText = size.spec;
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'zalo-size-input';
                input.id = `input-zalo-qty-unisex-${size.name}`;
                input.min = '0';
                input.value = (size.name === state.size) ? '20' : '0'; // default selected to 20
                
                item.appendChild(label);
                item.appendChild(specSpan);
                item.appendChild(input);
                grid.appendChild(item);
            });
            container.appendChild(grid);
        } else {
            // For Polo/T-Shirt, render BOTH Men and Women size inputs concurrently!
            
            // --- Men's sizes section ---
            const menTitle = document.createElement('div');
            menTitle.className = 'zalo-section-title';
            menTitle.style.cssText = 'font-size: 13px; font-weight: 700; color: var(--accent-blue); margin-top: 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;';
            menTitle.innerHTML = '🙋‍♂️ Form Nam Chuẩn (S - 5XL)';
            container.appendChild(menTitle);
            
            const menGrid = document.createElement('div');
            menGrid.className = 'zalo-size-grid';
            
            const menSizes = [
                { name: 'S', spec: '45-54kg' },
                { name: 'M', spec: '55-64kg' },
                { name: 'L', spec: '65-69kg' },
                { name: 'XL', spec: '70-75kg' },
                { name: 'XXL', spec: '75-85kg' },
                { name: '3XL', spec: '85-95kg' },
                { name: '4XL', spec: '95-110kg' },
                { name: '5XL', spec: '110-130kg' }
            ];
            
            menSizes.forEach(size => {
                const item = document.createElement('div');
                item.className = 'zalo-size-item';
                
                const label = document.createElement('span');
                label.className = 'zalo-size-label';
                label.innerText = size.name;
                
                const specSpan = document.createElement('span');
                specSpan.className = 'zalo-size-spec';
                specSpan.style.cssText = 'font-size: 9px; color: var(--text-muted); margin-bottom: 2px;';
                specSpan.innerText = size.spec;
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'zalo-size-input';
                input.id = `input-zalo-qty-nam-${size.name}`;
                input.min = '0';
                
                // Auto-populate 20 if state.form is 'nam' and size name matches state.size
                input.value = (state.form === 'nam' && size.name === state.size) ? '20' : '0';
                
                item.appendChild(label);
                item.appendChild(specSpan);
                item.appendChild(input);
                menGrid.appendChild(item);
            });
            container.appendChild(menGrid);
            
            // --- Women's sizes section ---
            const womenTitle = document.createElement('div');
            womenTitle.className = 'zalo-section-title';
            womenTitle.style.cssText = 'font-size: 13px; font-weight: 700; color: var(--accent-teal); margin-top: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;';
            womenTitle.innerHTML = '🙋‍♀️ Form Nữ Chuẩn (S - 3XL)';
            container.appendChild(womenTitle);
            
            const womenGrid = document.createElement('div');
            womenGrid.className = 'zalo-size-grid';
            
            const womenSizes = [
                { name: 'S', spec: '40-44kg' },
                { name: 'M', spec: '45-48kg' },
                { name: 'L', spec: '49-55kg' },
                { name: 'XL', spec: '56-60kg' },
                { name: 'XXL', spec: '61-65kg' },
                { name: '3XL', spec: '66-70kg' }
            ];
            
            womenSizes.forEach(size => {
                const item = document.createElement('div');
                item.className = 'zalo-size-item';
                
                const label = document.createElement('span');
                label.className = 'zalo-size-label';
                label.innerText = size.name;
                
                const specSpan = document.createElement('span');
                specSpan.className = 'zalo-size-spec';
                specSpan.style.cssText = 'font-size: 9px; color: var(--text-muted); margin-bottom: 2px;';
                specSpan.innerText = size.spec;
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'zalo-size-input';
                input.id = `input-zalo-qty-nu-${size.name}`;
                input.min = '0';
                
                // Auto-populate 20 if state.form is 'nu' and size name matches state.size
                input.value = (state.form === 'nu' && size.name === state.size) ? '20' : '0';
                
                item.appendChild(label);
                item.appendChild(specSpan);
                item.appendChild(input);
                womenGrid.appendChild(item);
            });
            container.appendChild(womenGrid);
        }
    }

    function generateDesignPDF() {
        const fullname = document.getElementById('zalo-fullname').value.trim();
        const phone = document.getElementById('zalo-phone').value.trim();
        const notes = document.getElementById('zalo-notes') ? document.getElementById('zalo-notes').value.trim() : '';
        
        if (!fullname || !phone) {
            showToast('Vui lòng nhập đầy đủ Họ tên và Số điện thoại/Zalo để tạo catalog PDF!', 'warning');
            return;
        }

        // Check if back side layers are cached to prevent blank images in PDF
        if (!state.hasViewedBack) {
            showToast('⚠️ Bạn chưa xem thiết kế MẶT SAU. Hệ thống sẽ tự chuyển sang xem mặt sau. Đợi load xong rồi bấm lại nút PDF nhé!', 'warning', 5000);
            
            // Automatically close the Zalo modal
            const modal = document.getElementById('modal-zalo-share');
            if (modal) {
                modal.classList.remove('active');
            }
            
            const backBtn = document.querySelector('[data-angle="back"]');
            if (backBtn) {
                backBtn.click();
            }
            return;
        }
        
        // 1. Gather size breakdown and compute total quantity
        const isWorkwear = (state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho');
        const sizeGuides = {
            unisex: {
                'M': { range: '54-61kg / 155-165cm', display: 'M (Cỡ 5)' },
                'L': { range: '62-69kg / 165-173cm', display: 'L (Cỡ 6)' },
                'XL': { range: '70-77kg / 170-178cm', display: 'XL (Cỡ 7)' },
                'XXL': { range: '78-84kg / 175-182cm', display: 'XXL (Cỡ 8)' }
            },
            nam: {
                'S': { range: '45-54kg / 150-160cm', display: 'S' },
                'M': { range: '55-64kg / 160-170cm', display: 'M' },
                'L': { range: '65-69kg / 170-174cm', display: 'L' },
                'XL': { range: '70-75kg / 175-177cm', display: 'XL' },
                'XXL': { range: '75-85kg / 175-180cm', display: 'XXL' },
                '3XL': { range: '85-95kg / 175-180cm', display: '3XL' },
                '4XL': { range: '95-110kg / 175-180cm', display: '4XL' },
                '5XL': { range: '110-130kg / 175-180cm', display: '5XL' }
            },
            nu: {
                'S': { range: '40-44kg / 145-155cm (V1 < 82cm)', display: 'S' },
                'M': { range: '45-48kg / 150-165cm (V1 < 87cm)', display: 'M' },
                'L': { range: '49-55kg / 166-170cm (V1 < 95cm)', display: 'L' },
                'XL': { range: '56-60kg / 165-174cm (V1 < 100cm)', display: 'XL' },
                'XXL': { range: '61-65kg / 165-174cm (V1 < 105cm)', display: 'XXL' },
                '3XL': { range: '66-70kg / 165-174cm (V1 < 110cm)', display: '3XL' }
            }
        };

        let sizeTableRows = '';
        let totalQty = 0;
        let sizeRowsCount = 0;
        
        if (isWorkwear) {
            const formLabel = state.product === 'ao-bao-ho' ? 'Áo BHLĐ' : (state.product === 'quan-bao-ho' ? 'Quần BHLĐ' : 'Unisex Bảo Hộ');
            const sizesList = ['M', 'L', 'XL', 'XXL'];
            sizesList.forEach(sz => {
                const input = document.getElementById(`input-zalo-qty-unisex-${sz}`);
                const qty = input ? parseInt(input.value) || 0 : 0;
                if (qty > 0) {
                    totalQty += qty;
                    sizeRowsCount++;
                    const guide = sizeGuides.unisex[sz];
                    sizeTableRows += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 4px 6px; text-align: left; color: #475569; font-weight: 500;">${formLabel}</td>
                            <td style="padding: 4px 6px; font-weight: bold; text-align: center; color: #1e293b;">${guide.display}</td>
                            <td style="padding: 4px 6px; text-align: left; color: #64748b; font-size: 10px;">${guide.range}</td>
                            <td style="padding: 4px 6px; text-align: center; color: #0284c7; font-weight: bold;">${qty} chiếc</td>
                        </tr>
                    `;
                }
            });
        } else {
            // Process Men's sizes (Form Nam)
            const maleFormLabel = state.product === 'ao-polo' ? 'Áo Polo Nam' : (state.product === 'ao-thun' ? 'Áo Thun Nam' : 'Form Nam');
            const menSizesList = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
            menSizesList.forEach(sz => {
                const input = document.getElementById(`input-zalo-qty-nam-${sz}`);
                const qty = input ? parseInt(input.value) || 0 : 0;
                if (qty > 0) {
                    totalQty += qty;
                    sizeRowsCount++;
                    const guide = sizeGuides.nam[sz];
                    sizeTableRows += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 4px 6px; text-align: left; color: #0284c7; font-weight: bold;">🙋‍♂️ ${maleFormLabel}</td>
                            <td style="padding: 4px 6px; font-weight: bold; text-align: center; color: #1e293b;">Size ${sz}</td>
                            <td style="padding: 4px 6px; text-align: left; color: #64748b; font-size: 10px;">${guide.range}</td>
                            <td style="padding: 4px 6px; text-align: center; color: #0284c7; font-weight: bold;">${qty} chiếc</td>
                        </tr>
                    `;
                }
            });
            
            // Process Women's sizes (Form Nữ)
            const femaleFormLabel = state.product === 'ao-polo' ? 'Áo Polo Nữ' : (state.product === 'ao-thun' ? 'Áo Thun Nữ' : 'Form Nữ');
            const womenSizesList = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
            womenSizesList.forEach(sz => {
                const input = document.getElementById(`input-zalo-qty-nu-${sz}`);
                const qty = input ? parseInt(input.value) || 0 : 0;
                if (qty > 0) {
                    totalQty += qty;
                    sizeRowsCount++;
                    const guide = sizeGuides.nu[sz];
                    sizeTableRows += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 4px 6px; text-align: left; color: #ec4899; font-weight: bold;">🙋‍♀️ ${femaleFormLabel}</td>
                            <td style="padding: 4px 6px; font-weight: bold; text-align: center; color: #1e293b;">Size ${sz}</td>
                            <td style="padding: 4px 6px; text-align: left; color: #64748b; font-size: 10px;">${guide.range}</td>
                            <td style="padding: 4px 6px; text-align: center; color: #0284c7; font-weight: bold;">${qty} chiếc</td>
                        </tr>
                    `;
                }
            });
        }
        
        if (totalQty === 0) {
            showToast('Vui lòng nhập số lượng đặt hàng (> 0) cho ít nhất 1 size!', 'warning');
            return;
        }
        
        // 2. Fetch high-res base64 images for all 4 angles from offscreen canvas
        const imgFront = getTransparentShirtCanvas('front').toDataURL('image/png');
        const imgBack = getTransparentShirtCanvas('back').toDataURL('image/png');
        const imgLeft = getTransparentShirtCanvas('left').toDataURL('image/png');
        const imgRight = getTransparentShirtCanvas('right').toDataURL('image/png');
        
        // 3. Format product color details into clean labels
        const productNames = {
            'ao-polo': 'Áo Thun Polo Premium (Form Nam & Nữ Chuẩn)',
            'ao-thun': 'Áo Thun Cổ Tròn Năng Động (Form Nam & Nữ Chuẩn)',
            'ao-bao-ho': 'Áo Bảo Hộ Lao Động Kỹ Sư Công Trình',
            'quan-bao-ho': 'Quần Bảo Hộ Lao Động Kỹ Sư Công Trình'
        };
        const productName = productNames[state.product] || 'Đồng Phục Cao Cấp Mrs Linh';
        
        const getColorName = (hex, partKey) => {
            const hasTex = partKey ? !!state.textures[partKey] : false;
            const allColors = [...CORPORATE_COLORS, ...SPORTY_COLORS, ...WORKWEAR_COLORS, ...TEXTURED_COLORS, ...POLO_BUTTON_COLORS, ...WORKWEAR_PLASTIC_BUTTONS, ...WORKWEAR_METAL_BUTTONS];
            const found = allColors.find(c => c.hex.toLowerCase() === hex.toLowerCase() && (!!c.hasTexture === hasTex));
            return found ? found.name : hex;
        };

        // Render colors spec list dynamically based on product type
        let colorSpecsHTML = '';
        if (state.product === 'ao-polo' || state.product === 'ao-thun') {
            colorSpecsHTML += `
                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #475569; font-family: 'Inter', sans-serif;">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors.than}; border: 1px solid #cbd5e1;"></span>
                            <strong>Thân áo (Body):</strong>
                        </span>
                        <span>${getColorName(state.colors.than, 'than')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors.tay}; border: 1px solid #cbd5e1;"></span>
                            <strong>Tay áo (Sleeves):</strong>
                        </span>
                        <span>${getColorName(state.colors.tay, 'tay')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors.co}; border: 1px solid #cbd5e1;"></span>
                            <strong>Cổ áo (Collar):</strong>
                        </span>
                        <span>${getColorName(state.colors.co, 'co')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors['bo-tay']}; border: 1px solid #cbd5e1;"></span>
                            <strong>Bo tay (Cuffs):</strong>
                        </span>
                        <span>${getColorName(state.colors['bo-tay'], 'bo-tay')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors['tru-co']}; border: 1px solid #cbd5e1;"></span>
                            <strong>Trụ cổ (Placket):</strong>
                        </span>
                        <span>${getColorName(state.colors['tru-co'], 'tru-co')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors['vien-co']}; border: 1px solid #cbd5e1;"></span>
                            <strong>Viền cổ (Trim):</strong>
                        </span>
                        <span>${getColorName(state.colors['vien-co'], 'vien-co')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors['chan-co'] || state.colors.co}; border: 1px solid #cbd5e1;"></span>
                            <strong>Chân cổ trong:</strong>
                        </span>
                        <span>${getColorName(state.colors['chan-co'] || state.colors.co, 'chan-co')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors.nut || '#ffffff'}; border: 1px solid #cbd5e1;"></span>
                            <strong>Màu khuy nút:</strong>
                        </span>
                        <span>${getColorName(state.colors.nut || '#ffffff', 'nut')}</span>
                    </div>
                </div>
            `;
        } else {
            colorSpecsHTML += `
                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #475569; font-family: 'Inter', sans-serif;">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors.than}; border: 1px solid #cbd5e1;"></span>
                            <strong>Vải chính (Main):</strong>
                        </span>
                        <span>${getColorName(state.colors.than, 'than')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors.co || state.colors.than}; border: 1px solid #cbd5e1;"></span>
                            <strong>Chi tiết phối (Accents):</strong>
                        </span>
                        <span>${getColorName(state.colors.co || state.colors.than, 'co')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors.tui || state.colors.than}; border: 1px solid #cbd5e1;"></span>
                            <strong>Thân túi bảo hộ:</strong>
                        </span>
                        <span>${getColorName(state.colors.tui || state.colors.than, 'tui')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors['nap-tui'] || state.colors.than}; border: 1px solid #cbd5e1;"></span>
                            <strong>Nắp đậy túi:</strong>
                        </span>
                        <span>${getColorName(state.colors['nap-tui'] || state.colors.than, 'nap-tui')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors['phan-quang'] || '#2dd4bf'}; border: 1px solid #cbd5e1;"></span>
                            <strong>Phản quang:</strong>
                        </span>
                        <span>${getColorName(state.colors['phan-quang'] || '#2dd4bf', 'phan-quang')}</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 3px;">
                        <span style="display: inline-flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background-color: ${state.colors.nut || '#ffffff'}; border: 1px solid #cbd5e1;"></span>
                            <strong>Khuy nút (Buttons):</strong>
                        </span>
                        <span>${getColorName(state.colors.nut || '#ffffff', 'nut')}</span>
                    </div>
                </div>
            `;
        }

        // Pocket Specs HTML
        let pocketSpecsHTML = '';
        if (state.product === 'ao-bao-ho') {
            const activePockets = [];
            if (state.pockets.left) activePockets.push('Túi ngực trái');
            if (state.pockets.right) activePockets.push('Túi ngực phải');
            if (state.pockets.sleeve) activePockets.push('Túi hộp tay áo');
            if (state.pockets.flap) activePockets.push('Nắp túi');
            
            if (activePockets.length > 0) {
                pocketSpecsHTML = `<div style="font-size: 10px; color: #475569; font-family: 'Inter', sans-serif;">📂 <strong>Cấu hình túi:</strong> ${activePockets.join(', ')}</div>`;
            } else {
                pocketSpecsHTML = `<div style="font-size: 10px; color: #64748b; font-style: italic; font-family: 'Inter', sans-serif;">📂 Không cấu hình túi áo</div>`;
            }
        } else if (state.product === 'quan-bao-ho') {
            const activePockets = [];
            if (state.pockets.left) activePockets.push('Túi Trái Trên');
            if (state.pockets.right) activePockets.push('Túi Phải Trên');
            if (state.pockets.sleeve) activePockets.push('Túi trái dưới');
            if (state.pockets.sleeveRight) activePockets.push('Túi phải dưới');
            if (state.pockets.flap) activePockets.push('Nắp che túi quần');
            
            if (activePockets.length > 0) {
                pocketSpecsHTML = `<div style="font-size: 10px; color: #475569; font-family: 'Inter', sans-serif;">📂 <strong>Cấu hình túi:</strong> ${activePockets.join(', ')}</div>`;
            } else {
                pocketSpecsHTML = `<div style="font-size: 10px; color: #64748b; font-style: italic; font-family: 'Inter', sans-serif;">📂 Không cấu hình túi quần</div>`;
            }
        }

        // Reflective Specs HTML
        let reflectiveSpecsHTML = '';
        if (state.product === 'ao-bao-ho' || state.product === 'quan-bao-ho') {
            const activeRefs = [];
            if (state.reflective.chest) activeRefs.push('Phản quang ngực');
            if (state.reflective.shoulders) activeRefs.push('Phản quang vai');
            if (state.reflective.sleeves) activeRefs.push('Phản quang bắp tay/ống quần');
            if (activeRefs.length > 0) {
                reflectiveSpecsHTML = `
                    <div style="font-size: 10px; color: #475569; font-family: 'Inter', sans-serif; margin-top: 2px;">
                        ⚡ <strong>Vạch phản quang:</strong> ${activeRefs.join(', ')} (Chiều cao lệch: ${state.reflective.yOffset || 0}px)
                    </div>
                `;
            } else {
                reflectiveSpecsHTML = `<div style="font-size: 10px; color: #64748b; font-style: italic; font-family: 'Inter', sans-serif; margin-top: 2px;">⚡ Không đính phản quang</div>`;
            }
        }

        // Technical Specs Left Column Data array
        const specs = [
            { label: 'Tên dòng áo/quần', value: productName },
            { label: 'Phân loại Form', value: state.product === 'ao-polo' ? (state.form === 'nam' ? 'Áo Polo Nam' : 'Áo Polo Nữ') : (state.product === 'ao-thun' ? (state.form === 'nam' ? 'Áo Thun Nam' : 'Áo Thun Nữ') : (state.product === 'ao-bao-ho' ? 'Áo BHLĐ' : 'Quần BHLĐ')) },
            { label: 'Chất liệu vải đề xuất', value: isWorkwear ? 'Kaki liên doanh dày dặn, bền màu' : 'Vải thun cá sấu 100% co giãn 4 chiều' },
            { label: 'Kiểu cổ áo', value: state.product === 'ao-polo' ? 'Cổ bẻ Polo dệt bo cao cấp' : (state.product === 'ao-thun' ? 'Cổ tròn bo thun dệt kim' : 'Cổ bẻ jacket khóa kéo bảo hộ') },
            { label: 'Kiểu tay áo', value: isWorkwear ? 'Tay dài đai cài nút cổ tay' : 'Tay ngắn bo thun' },
            { label: 'Công nghệ logo', value: state.logos.length > 0 ? (state.logos[0].printStyle === 'theu' ? 'Thêu vi tính satin 3D' : 'In PET kỹ thuật số sắc nét') : 'In chuyển nhiệt bám sớ vải' }
        ];

        let specsRowsHTML = specs.map(s => `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 4px 0; font-size: 10px;">
                <span style="color: #64748b; font-weight: 500;">${s.label}:</span>
                <span style="color: #0f172a; font-weight: 700; text-align: right;">${s.value}</span>
            </div>
        `).join('');

        // Draggable logos description and Zoom cards
        const hasSnappedLogo = !!(state.logo && state.logo.imgElement);
        const hasDraggableLogos = state.logos && state.logos.length > 0;
        const hasPatterns = state.patterns && Object.values(state.patterns).some(p => p && p.imgElement);

        let logoSpecsBlockHTML = '';
        if (!hasSnappedLogo && !hasDraggableLogos && !hasPatterns) {
            logoSpecsBlockHTML = `
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
                    <h3 style="margin: 0 0 4px 0; font-size: 10.5px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; font-weight: 800;">ĐẶC TÍNH LOGO / HỌA TIẾT</h3>
                    <div style="font-size: 9.5px; color: #64748b; font-style: italic; font-family: 'Inter', sans-serif; margin-top: 6px;">
                        Đặc tính logo / họa tiết: chưa gắn vào thiết kế
                    </div>
                </div>
            `;
        } else {
            let logoZoomCardsHTML = '';
            if (hasSnappedLogo) {
                const posLabels = {
                    'nguc-trai': 'Ngực Trái (Left Chest)',
                    'nguc-phai': 'Ngực Phải (Right Chest)',
                    'sau-lung': 'Sau Lưng (Back Side)',
                    'tay-trai': 'Tay Trái (Left Sleeve)',
                    'tay-phai': 'Tay Phải (Right Sleeve)'
                };
                const pos = posLabels[state.logo.position] || state.logo.position;
                logoZoomCardsHTML += `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 12px; box-sizing: border-box; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.01);">
                        <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; padding: 2px;">
                            <img src="${state.logo.imgElement.src}" style="max-width: 100%; max-height: 100%; object-fit: contain;"/>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 11px; font-weight: 800; color: #0f172a;">Logo Cố Định: ${pos}</div>
                            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Tỉ lệ scale: <strong>${state.logo.scale}%</strong> | Công nghệ: <strong>${state.logo.printStyle === 'theu' ? 'Thêu vi tính satin' : 'In chuyển nhiệt'}</strong></div>
                        </div>
                    </div>
                `;
            }
            if (hasDraggableLogos) {
                state.logos.forEach((l, idx) => {
                    const posLabels = {
                        'nguc-trai': 'Ngực Trái (Left Chest)',
                        'nguc-phai': 'Ngực Phải (Right Chest)',
                        'sau-lung': 'Sau Lưng (Back Side)',
                        'tay-trai': 'Tay Trái (Left Sleeve)',
                        'tay-phai': 'Tay Phải (Right Sleeve)'
                    };
                    const pos = posLabels[l.position] || l.position;
                    logoZoomCardsHTML += `
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 12px; box-sizing: border-box; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.01);">
                            <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; padding: 2px;">
                                <img src="${l.imgElement ? l.imgElement.src : ''}" style="max-width: 100%; max-height: 100%; object-fit: contain;"/>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 11px; font-weight: 800; color: #0f172a;">Cận Cảnh Logo Tự Do #${idx + 1}: ${pos}</div>
                                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Kích thước hiển thị: <strong>${l.scale}px</strong> | Công nghệ: <strong>${l.printStyle === 'theu' ? 'Thêu vi tính satin' : 'In PET sắc nét'}</strong></div>
                            </div>
                        </div>
                    `;
                });
            }
            if (hasPatterns) {
                const angleNames = {
                    'front': 'Mặt Trước (Front)',
                    'back': 'Mặt Sau (Back)',
                    'left': 'Mặt Trái (Left)',
                    'right': 'Mặt Phải (Right)'
                };
                Object.entries(state.patterns).forEach(([angle, p]) => {
                    if (p && p.imgElement) {
                        logoZoomCardsHTML += `
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; gap: 12px; box-sizing: border-box; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.01);">
                                <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; padding: 2px;">
                                    <img src="${p.imgElement.src}" style="max-width: 100%; max-height: 100%; object-fit: contain;"/>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 11px; font-weight: 800; color: #0f172a;">Họa Tiết Toàn Thân: ${angleNames[angle] || angle}</div>
                                    <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Tỉ lệ scale: <strong>${p.scale}%</strong> | Độ mờ: <strong>${p.opacity}%</strong> | Kiểu in: <strong>${p.printType === 'chuyen-nhiet' ? 'In chuyển nhiệt toàn phần' : 'In kỹ thuật số'}</strong></div>
                                </div>
                            </div>
                        `;
                    }
                });
            }
            logoSpecsBlockHTML = `
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
                    <h3 style="margin: 0 0 4px 0; font-size: 10.5px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; font-weight: 800;">ĐẶC TÍNH LOGO / HỌA TIẾT</h3>
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                        ${logoZoomCardsHTML}
                    </div>
                </div>
            `;
        }

        // Define HTML string blocks for the layout packing solver
        const clientInfoHTML = `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px; font-family: 'Inter', sans-serif; box-sizing: border-box; margin-bottom: 3.5mm;">
                <div>
                    <h3 style="margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #d60000; font-weight: bold;">THÔNG TIN KHÁCH HÀNG</h3>
                    <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 1px;">${fullname}</div>
                    <div style="font-size: 9.5px; color: #475569;">Số điện thoại / Zalo: <strong>${phone}</strong></div>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0 0 2px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: bold;">THỜI GIAN KHỞI TẠO</h3>
                    <div style="font-size: 9.5px; color: #475569; font-weight: 500;">${new Date().toLocaleDateString('vi-VN')}</div>
                    <div style="font-size: 9px; color: #0284c7; font-weight: 600; margin-top: 2px;">Trạng thái: Đã duyệt phác thảo 3D</div>
                </div>
            </div>
        `;

        const sizingTableHTML = `
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; box-sizing: border-box;">
                <h3 style="margin: 0 0 5px 0; font-size: 10.5px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; font-weight: 800;">SỐ LƯỢNG ĐẶT HÀNG</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 9px; font-family: 'Inter', sans-serif;">
                    <thead>
                        <tr style="background-color: #0f172a; color: #ffffff; text-align: left;">
                            <th style="padding: 4px; text-align: left; width: 32%;">Form</th>
                            <th style="padding: 4px; text-align: center; width: 18%;">Size</th>
                            <th style="padding: 4px; text-align: left; width: 32%;">Thông Số Chuẩn</th>
                            <th style="padding: 4px; text-align: center; width: 18%;">Số Lượng</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sizeTableRows}
                        <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 1px solid #94a3b8;">
                            <td colspan="3" style="padding: 5px 4px; text-align: left; color: #0f172a; font-size: 9.5px; text-transform: uppercase;">TỔNG CỘNG SỐ LƯỢNG MẪU</td>
                            <td style="padding: 5px 4px; text-align: center; color: #d60000; font-size: 10px;">${totalQty} chiếc</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        const colorSpecsBlockHTML = `
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; box-sizing: border-box; display: flex; flex-direction: column; gap: 4px;">
                <h3 style="margin: 0 0 2px 0; font-size: 10.5px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; font-weight: 800;">ĐẶC TẢ PHỐI MÀU & CHI TIẾT</h3>
                <div style="font-size: 9.5px; font-weight: bold; color: #0284c7; margin-bottom: 2px;">Mẫu sản phẩm: ${productName}</div>
                ${colorSpecsHTML}
                ${pocketSpecsHTML}
                ${reflectiveSpecsHTML}
            </div>
        `;

        const specsBlockHTML = `
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; box-sizing: border-box; display: flex; flex-direction: column; gap: 4px;">
                <h3 style="margin: 0 0 2px 0; font-size: 10.5px; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; font-weight: 800;">THÔNG SỐ ĐẶT HÀNG</h3>
                ${specsRowsHTML}
            </div>
        `;

        const warningBlockHTML = `
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 8px 10px; font-size: 9px; line-height: 1.4; color: #b45309; font-family: 'Inter', sans-serif; box-sizing: border-box;">
                <strong>⚠️ Lưu ý từ xưởng may ĐỒNG PHỤC MRS LINH:</strong> Bản đặc tả kỹ thuật này sẽ được đối chiếu trực tiếp với mẫu vải và chỉ thêu thực tế tại xưởng. Mrs Linh bảo hành hình in thêu lên đến 12 tháng, hỗ trợ may mẫu thử trước khi sản xuất hàng loạt.
            </div>
        `;

        const notesBlockHTML = `
            <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-radius: 8px; padding: 10px 12px; box-sizing: border-box;">
                <h3 style="margin: 0 0 4px 0; font-size: 10.5px; text-transform: uppercase; color: #d60000; border-bottom: 2px solid #cbd5e1; padding-bottom: 3px; font-weight: 800;">GHI CHÚ ĐẶC BIỆT TỪ KHÁCH HÀNG</h3>
                <div style="font-size: 9.5px; color: #334155; line-height: 1.6; white-space: pre-wrap; font-style: italic; margin-top: 3px;">
                    ${notes}
                </div>
            </div>
        `;

        const signaturesBlockHTML = `
            <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px; box-sizing: border-box; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-family: 'Inter', sans-serif; margin-top: 10px; margin-bottom: 0;">
                <div style="text-align: center;">
                    <div style="font-size: 9.5px; font-weight: bold; color: #0f172a; text-transform: uppercase;">ĐẠI DIỆN KHÁCH HÀNG</div>
                    <div style="font-size: 8px; color: #64748b; margin-top: 2px;">(Ký, ghi rõ họ tên & đóng dấu)</div>
                    <div style="margin-top: 25px; border-top: 1px dashed #cbd5e1; width: 100px; margin-left: auto; margin-right: auto;"></div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 9.5px; font-weight: bold; color: #0284c7; text-transform: uppercase;">ĐỒNG PHỤC MRS LINH</div>
                    <div style="font-size: 8px; color: #64748b; margin-top: 2px;">(Hệ thống duyệt tự động qua Zalo)</div>
                    <div style="margin-top: 25px; font-size: 9px; font-weight: bold; color: #0284c7;">ĐÃ XÁC NHẬN THIẾT KẾ 3D</div>
                </div>
            </div>
        `;

        // 3. EXPLICIT 1-PAGE LAYOUT DEFINITION (TO RESOLVE DYNAMIC OVERFLOW BUGS)
        // Page 1 blocks (combined all specs, warnings, notes, and signatures):
        const page1LeftBlocks = [
            sizingTableHTML,
            colorSpecsBlockHTML
        ];
        if (notes && notes.length > 0) {
            page1LeftBlocks.push(notesBlockHTML);
        }
        page1LeftBlocks.push(signaturesBlockHTML);
        
        const page1RightImages = [
            { label: 'MẶT TRƯỚC (FRONT VIEW)', src: imgFront },
            { label: 'MẶT SAU (BACK VIEW)', src: imgBack }
        ];

        // 4. GENERATE FINAL HTML STAGE FOR HTML2PDF
        const getHeaderHTML = (pageNum) => {
            const recordCode = '810834'; // Or use dynamic code: Date.now().toString().slice(-6)
            return `
                <!-- Top Header Banner (Max height 80px / 20mm) -->
                <div style="height: 20mm; border-bottom: 3.5px solid #0284c7; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4mm; box-sizing: border-box; font-family: 'Inter', sans-serif; margin-top: -2mm;">
                    <!-- Brand & Info Group (Left) -->
                    <div style="display: flex; align-items: center;">
                        <!-- Brand Logo -->
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; font-family: 'Outfit', sans-serif; min-width: 45mm;">
                            <span style="font-size: 24px; font-weight: 900; color: #0284c7; line-height: 0.95; letter-spacing: 0.5px;">MRS LINH</span>
                            <span style="font-size: 10px; font-weight: 800; color: #0f172a; line-height: 0.95; letter-spacing: 3.5px; margin-top: 4px;">UNIFORM</span>
                            <span style="font-size: 6.5px; font-weight: 700; color: #64748b; line-height: 0.95; letter-spacing: 0.2px; margin-top: 4px; text-transform: uppercase;">ĐỒNG PHỤC CHUYÊN NGHIỆP</span>
                        </div>
                        
                        <!-- Vertical Divider -->
                        <div style="width: 1px; height: 12mm; background-color: #cbd5e1; margin: 0 15px;"></div>
                        
                        <!-- Brand Details -->
                        <div style="display: flex; flex-direction: column; justify-content: center; font-family: 'Inter', sans-serif; gap: 2px;">
                            <span style="font-size: 9px; font-weight: 800; color: #0f172a; line-height: 1.3;">CÔNG TY TNHH DV TM ĐT ĐỒNG PHỤC MRS<br>LINH</span>
                            <span style="font-size: 7.5px; color: #475569; display: flex; align-items: center; gap: 4px; line-height: 1.2;">
                                <span style="color: #ef4444; font-size: 8px;">📍</span> <strong>Địa chỉ:</strong> 16/6 Lưu Trọng Lư, Quy Nhơn, Gia Lai
                            </span>
                            <span style="font-size: 7.5px; color: #475569; display: flex; align-items: center; gap: 4px; line-height: 1.2;">
                                <span style="color: #ef4444; font-size: 8px;">📞</span> <strong>SĐT/Zalo:</strong> 0934.975.913
                            </span>
                            <span style="font-size: 7.5px; color: #0284c7; display: flex; align-items: center; gap: 4px; line-height: 1.2; font-weight: 600; text-decoration: none;">
                                <span style="color: #64748b; font-size: 8px;">✉️</span> mrslinh@inaodongphucmrslinh.com
                            </span>
                        </div>
                    </div>
                    
                    <!-- Document Title (Right) -->
                    <div style="text-align: right; display: flex; flex-direction: column; justify-content: center; font-family: 'Inter', sans-serif; gap: 2px;">
                        <span style="font-size: 20px; font-weight: 800; color: #0284c7; font-family: 'Inter', sans-serif; letter-spacing: -0.3px; line-height: 1.1;">BẢNG MÔ TẢ SẢN PHẨM</span>
                        <span style="font-size: 8px; color: #475569; line-height: 1.2;">Mã hồ sơ: ML-${recordCode} | <strong style="color: #0284c7; font-weight: 800;">TRANG 1/1</strong></span>
                        <span style="font-size: 8px; color: #94a3b8; font-weight: 500; line-height: 1.2;">Hệ thống 3D Mrs Linh</span>
                    </div>
                </div>
            `;
        };

        const getFooterHTML = (pageNum) => `
            <!-- Footer -->
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 2.5mm; text-align: center; font-size: 8.5px; color: #64748b; font-family: 'Inter', sans-serif; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; margin-top: auto;">
                <span>Thiết kế & Sản xuất bởi <strong>Mrs Linh Uniform</strong> | Hotline: <strong>0934 975 913</strong></span>
                <span>www.inaodongphucmrslinh.com</span>
                <span style="font-weight: bold; color: #0284c7; background: #e0f2fe; padding: 0.5mm 3mm; border-radius: 9999px;">Trang 1 / 1</span>
            </div>
        `;

        const renderImageCardsHTML = (images) => {
            return images.map(img => `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 84mm; height: 68mm; box-sizing: border-box; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="width: 78mm; height: 55mm; display: flex; align-items: center; justify-content: center;">
                        <img src="${img.src}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;"/>
                    </div>
                    <span style="font-size: 8.5px; font-weight: 800; color: #0284c7; text-transform: uppercase; background-color: #e0f2fe; padding: 0.5mm 3mm; border-radius: 4px; margin-top: 1mm; font-family: 'Inter', sans-serif;">${img.label}</span>
                </div>
            `).join('');
        };

        const page1BodyHTML = `
            <div style="display: flex; gap: 8mm; flex: 1; align-items: stretch; margin-bottom: 4mm; box-sizing: border-box;">
                <!-- Left Column: Page 1 Specs Blocks -->
                <div style="flex: 1.1; display: flex; flex-direction: column; gap: 3.5mm; box-sizing: border-box;">
                    ${page1LeftBlocks.join('')}
                </div>
                <!-- Right Column: Page 1 Mockup Cards -->
                <div style="flex: 0.9; display: flex; flex-direction: column; gap: 3.5mm; box-sizing: border-box; justify-content: flex-start; align-items: center;">
                    ${renderImageCardsHTML(page1RightImages)}
                    <div style="width: 84mm; box-sizing: border-box;">
                        ${logoSpecsBlockHTML}
                    </div>
                </div>
            </div>
        `;
        
        const page1HTML = `
            <div class="pdf-page" style="position: relative;">
                <!-- Watermark Logo Overlay -->
                <div style="position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%); width: 140mm; height: 140mm; opacity: 0.06; pointer-events: none; z-index: 99; display: flex; align-items: center; justify-content: center;">
                    <img src="public/logo.png" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                </div>

                <!-- Top Header Banner -->
                ${getHeaderHTML(1)}
                
                <!-- Client Info (Page 1 only) -->
                ${clientInfoHTML}
                
                <!-- Page Body Content -->
                ${page1BodyHTML}
                
                <!-- Footer -->
                ${getFooterHTML(1)}
            </div>
        `;

        const pagesHTML = page1HTML;

        const googleFontsLink = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;700;900&display=swap');
                * {
                    box-sizing: border-box;
                }
            </style>
        `;
        
        // Create an invisible parent container in the DOM flow to resolve html2canvas offscreen rendering blank bugs
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '0';
        container.style.top = '0';
        container.style.width = '0';
        container.style.height = '0';
        container.style.overflow = 'hidden';
        document.body.appendChild(container);
        
        const element = document.createElement('div');
        element.style.width = '210mm';
        element.style.background = '#ffffff';
        container.appendChild(element);
        
        element.innerHTML = googleFontsLink + pagesHTML;
        
        // 4. Run html2pdf to build and download the catalog
        const opt = {
            margin:       0,
            filename:     `MRS_LINH_DESIGN_${state.product.toUpperCase()}_${phone}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Display subtle loading state in the button
        const btn = document.getElementById('btn-submit-zalo');
        const originalText = btn.innerText;
        btn.innerText = 'Đang lập file PDF...';
        btn.disabled = true;
        
        html2pdf().set(opt).from(element).save().then(() => {
            // Clean up temporary DOM container
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            
            // Restore button
            btn.innerText = originalText;
            btn.disabled = false;
            
            // Close modal
            document.getElementById('modal-zalo-share').classList.remove('active');
            
            showToast('🎉 Tải file PDF catalog thiết kế thành công! Đang kết nối Zalo Mrs Linh...', 'success', 5000);
            
            // Open Zalo chat
            window.open('https://zalo.me/0934975913', '_blank');
        }).catch(err => {
            console.error('PDF generation failed:', err);
            
            // Clean up temporary DOM container on error
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            
            btn.innerText = originalText;
            btn.disabled = false;
        });
    }


    // Direct Canvas Export PNG with supersampling x2
    function downloadDesignPNG() {
        // Create an offscreen canvas with 2x resolution for high-quality supersampled output
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width * 2;
        tempCanvas.height = canvas.height * 2;
        const tempCtx = tempCanvas.getContext('2d');

        // Scale by 2x immediately to automatically double resolution for all subsequent drawing operations
        tempCtx.save();
        tempCtx.scale(2, 2);

        const activeLayers = getLayersConfig();
        
        // Render exactly like the main canvas, but strictly on transparent background
        activeLayers.forEach(layer => {
            const img = imgCache[layer.path];
            if (!img) return;
            
            let color = null;
            let textureType = false;
            if (layer.colorizable) {
                const groupKey = layer.group || layer.id;
                color = state.colors[groupKey] || state.colors['than'];
                textureType = state.textures[groupKey] || false;
            }
            
            const renderedImg = getTintedLayer(img, color, textureType);
            
            tempCtx.save();
            let dy = 0;
            if (layer.id === 'phan-quang') {
                dy = -parseInt(state.reflective.yOffset || 0);
                const tapeYCenter = 300;
                tempCtx.translate(0, tapeYCenter + dy);
                tempCtx.scale(1, parseFloat(state.reflective.width || 5) / 5);
                tempCtx.translate(0, -tapeYCenter);
            }
            if (layer.isOverlay) {
                tempCtx.globalCompositeOperation = 'multiply';
                tempCtx.drawImage(renderedImg, 0, 0, canvas.width, canvas.height);
            } else {
                if (layer.id === 'co-trong') {
                    tempCtx.globalAlpha = 0.7; // Faded by 30% compared to normal torso (100% - 30% = 70% opacity)
                }
                tempCtx.drawImage(renderedImg, 0, 0, canvas.width, canvas.height);
            }
            tempCtx.restore();

            // DYNAMIC CLIPPED PATTERN DRAW FOR EXPORT
            const activePattern = state.patterns[state.angle];
            if (activePattern && activePattern.imgElement) {
                const cov = activePattern.coverage || { than: true, tay: false, co: false, tui: false };
                let shouldApply = false;
                let isInsideCollar = false;
                
                if (layer.id === 'co-trong' && (state.product === 'ao-polo' || state.product === 'ao-thun') && state.angle === 'front') {
                    isInsideCollar = true;
                    // Apply pattern on the inside collar of the polo/T-shirt if Torso or Collar coverage is checked
                    if (cov.than || cov.co) {
                        shouldApply = true;
                    }
                } else {
                    const isTorso = layer.id === 'than' || layer.group === 'than' || layer.id.includes('than') || layer.id.includes('nguc');
                    const isSleeve = (layer.id.includes('tay') || layer.group === 'tay') && !layer.id.includes('bo-tay') && !layer.id.includes('co-tay') && !layer.id.includes('tui');
                    const isCollar = layer.id === 'co' || layer.group === 'co' || layer.id.includes('co') || layer.id.includes('tru-co');
                    const isPocket = layer.id.includes('tui') || layer.group === 'tui' || layer.id.includes('nap-tui');
                    
                    if (isTorso && cov.than) shouldApply = true;
                    if (isSleeve && cov.tay) shouldApply = true;
                    if (isCollar && cov.co) shouldApply = true;
                    if (isPocket && cov.tui) shouldApply = true;
                }
                
                if (shouldApply) {
                    drawRealisticPattern(tempCtx, activePattern, img, renderedImg, isInsideCollar);
                }
            }
        });

        // Draw dynamic shoulder and sleeve reflective strips on export
        drawDynamicReflectiveStrips(tempCtx, 1);

        // Draw Custom Draggable Logos on export
        state.logos.forEach(logo => {
            if (logo.view === state.angle && logo.imgElement) {
                const logoW = logo.scale;
                const logoH = logo.scale * (logo.imgElement.height / logo.imgElement.width);
                
                const thanLayer = activeLayers.find(l => l.id === 'than' || l.id.includes('than'));
                const bodyImg = thanLayer ? imgCache[thanLayer.path] : null;
                
                drawRealisticLogo(tempCtx, logo, logo.x, logo.y, logoW, logoH, bodyImg);
            }
        });

        tempCtx.restore(); // restore scaling

        // Trigger browser download
        const link = document.createElement('a');
        link.download = `mrs-linh-thietke-${state.product}-${state.angle}.png`;
        link.href = tempCanvas.toDataURL();
        link.click();
    }

    // Core Initialization
    function init() {
        // Setup initial angle and load layers (this also calls buildColorSwatches inside loadAndRender)
        updateAngle('front');
        
        // Gestures drag 360 rotating setup
        initRotationGestures();
        
        // Event triggers setup
        initEvents();
        
        // LocalStorage loading of drafts if exists
        const draft = localStorage.getItem('mrs_linh_design_draft');
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                state.product = parsed.product || state.product;
                state.form = parsed.form || state.form;
                state.colors = { ...state.colors, ...parsed.colors };
                state.pockets = { ...state.pockets, ...parsed.pockets };
                state.reflective = { ...state.reflective, ...parsed.reflective };
                state.size = parsed.size || state.size;
                
                // Sync form gender buttons UI to match restored state
                if (state.form === 'nu') {
                    document.getElementById('form-nu').classList.add('active');
                    document.getElementById('form-nam').classList.remove('active');
                } else {
                    document.getElementById('form-nam').classList.add('active');
                    document.getElementById('form-nu').classList.remove('active');
                }
                
                // Sync product card active UI
                document.querySelectorAll('.product-card').forEach(card => {
                    card.classList.toggle('active', card.getAttribute('data-product') === state.product);
                });
                
            } catch (e) {
                console.error('Draft parsing failed.', e);
            }
        }
        
        // Single unified loadAndRender — calls buildColorSwatches internally
        loadAndRender();
    }

    // Execute on load
    window.addEventListener('DOMContentLoaded', init);

})();
