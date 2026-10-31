// src/scenes/PhoneScreenTexture.ts
import * as THREE from 'three';
import { W } from '../scroll/progress';

export class PhoneScreenTexture {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  private lastRenderKey: string = '';
  private baseCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;
  private baseRendered: boolean = false;

  // Ultra-crisp high-DPI Galaxy Z Fold 5 canvas resolution (2048 x 2480)
  constructor(width = 2048, height = 2480) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Failed to get 2D canvas context for phone screen');
    }
    this.ctx = context;

    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = width;
    this.baseCanvas.height = height;
    const bCtx = this.baseCanvas.getContext('2d', { alpha: false });
    if (!bCtx) {
      throw new Error('Failed to get offscreen 2D canvas context');
    }
    this.baseCtx = bCtx;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.anisotropy = 16;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.renderBaseLayer();
    this.draw(0, true);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(x, y, w, h, r);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Pre-render static background, status bar, and structural UI elements.
   * Galaxy Z Fold 5 dual-pane tablet layout with crisp typography.
   */
  private renderBaseLayer(): void {
    const ctx = this.baseCtx;
    const w = this.baseCanvas.width;
    const h = this.baseCanvas.height;

    // 1. Crisp Pure White Clinical Surface
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // 2. High-Contrast Status Bar (Time: 9:41, 5G, Wi-Fi, 100% Battery)
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('9:41', 80, 85);

    // Right-aligned status icons (5G, Wi-Fi, Battery)
    const iconBaseX = w - 240;
    // 5G Signal bars
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(iconBaseX, 64, 7, 24);
    ctx.fillRect(iconBaseX + 14, 56, 7, 32);
    ctx.fillRect(iconBaseX + 28, 48, 7, 40);
    ctx.fillRect(iconBaseX + 42, 40, 7, 48);

    // Battery pill
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    this.roundRect(ctx, iconBaseX + 85, 46, 68, 36, 10);
    ctx.stroke();
    ctx.fillStyle = '#0B7F63';
    this.roundRect(ctx, iconBaseX + 90, 51, 50, 26, 6);
    ctx.fill();

    // Battery tip
    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, iconBaseX + 155, 58, 6, 12, 3);
    ctx.fill();

    // 3. Navigation Header Bar (Brand & Verified Address)
    const headerY = 135;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, headerY, w, 160);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, headerY + 160);
    ctx.lineTo(w, headerY + 160);
    ctx.stroke();

    // Brand icon pill
    ctx.fillStyle = '#0B7F63';
    this.roundRect(ctx, 80, headerY + 30, 96, 96, 26);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 56px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('P', 110, headerY + 98);

    // Delivery location text (high-contrast dark ink)
    ctx.fillStyle = '#0B7F63';
    ctx.font = '800 26px -apple-system, sans-serif';
    ctx.fillText('⚡ DELIVERING IN 15 MIN', 205, headerY + 62);
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 36px -apple-system, sans-serif';
    ctx.fillText('742 Indiranagar 100ft Rd, Bengaluru ▾', 205, headerY + 108);

    // 4. Search Bar Background Box (spans across both panes)
    const searchY = 325;
    ctx.fillStyle = '#F1F5F9';
    this.roundRect(ctx, 80, searchY, w - 160, 105, 30);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 5. Category Chips across top
    const categories = ['All Prescriptions', 'Daily Care', 'Ayurveda', 'Baby & Mom'];
    const chipY = 460;
    const chipW = (w - 160 - 3 * 30) / 4;
    categories.forEach((cat, idx) => {
      const chipX = 80 + idx * (chipW + 30);
      ctx.fillStyle = idx === 0 ? '#0B7F63' : '#F1F5F9';
      this.roundRect(ctx, chipX, chipY, chipW, 70, 22);
      ctx.fill();
      if (idx !== 0) {
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#0F172A';
      ctx.font = '800 28px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cat, chipX + chipW / 2, chipY + 45);
    });
    ctx.textAlign = 'left';

    // Central subtle tablet vertical crease guideline (indicates fold spine at center)
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, 555);
    ctx.lineTo(w / 2, h - 180);
    ctx.stroke();

    // 6. Bottom Navigation Dock
    const dockY = h - 170;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, dockY, w, 170);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, dockY);
    ctx.lineTo(w, dockY);
    ctx.stroke();

    const navTabs = [
      { name: 'Pharmacy', active: true },
      { name: 'My Orders', active: false },
      { name: 'Rx Upload', active: false },
      { name: 'Profile', active: false }
    ];
    const tabW = w / navTabs.length;
    navTabs.forEach((tab, i) => {
      const tx = i * tabW + tabW / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = tab.active ? '#0B7F63' : '#64748B';
      ctx.font = '800 32px -apple-system, sans-serif';
      ctx.fillText(tab.name, tx, dockY + 85);
      if (tab.active) {
        ctx.fillStyle = '#0B7F63';
        this.roundRect(ctx, tx - 28, dockY + 110, 56, 8, 4);
        ctx.fill();
      }
    });
    ctx.textAlign = 'left';

    this.baseRendered = true;
  }

  private getVisualKey(p: number): string {
    if (p <= W.phoneRotates.end) return 'splash';
    if (p < W.appOpens.end) return 'open';
    if (p < W.searchMedicine.end) {
      const sp = (p - W.searchMedicine.start) / (W.searchMedicine.end - W.searchMedicine.start);
      return `search-${Math.floor(sp * 64)}`;
    }
    if (p < W.placeOrder.end) {
      const op = (p - W.placeOrder.start) / (W.placeOrder.end - W.placeOrder.start);
      return `order-${Math.floor(op * 64)}`;
    }
    return 'departed';
  }

  public draw(p: number, force = false): void {
    if (!this.baseRendered) this.renderBaseLayer();

    const key = this.getVisualKey(p);
    if (!force && key === this.lastRenderKey) return;
    this.lastRenderKey = key;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fast copy pre-rendered base layout
    ctx.drawImage(this.baseCanvas, 0, 0);

    // --- SCENE 1: Splash Transition ---
    if (p <= W.phoneRotates.end) {
      const splashProgress = Math.min(1, Math.max(0, (p - W.phoneRotates.start) / (W.phoneRotates.end - W.phoneRotates.start)));
      const splashOpacity = Math.max(0, 1 - splashProgress * 1.5);
      if (splashOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = splashOpacity;
        ctx.fillStyle = '#0B7F63';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#FFFFFF';
        this.roundRect(ctx, w / 4 - 140, h / 2 - 240, 280, 280, 64);
        ctx.fill();
        ctx.fillStyle = '#0B7F63';
        ctx.font = '900 160px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('P', w / 4 - 55, h / 2 - 40);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 90px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Pharmafly', w / 4, h / 2 + 130);
        ctx.font = '700 42px -apple-system, sans-serif';
        ctx.fillText('Pharmacy. Delivered in 15 Minutes.', w / 4, h / 2 + 210);
        ctx.restore();
        this.texture.needsUpdate = true;
        return;
      }
    }

    // --- SEARCH QUERY BAR ---
    const fullSearchQuery = 'Amoxicillin 500mg (20 Caps)';
    let isFiltered = false;

    if (p < W.appOpens.end) {
      ctx.fillStyle = '#64748B';
      ctx.font = '700 36px -apple-system, sans-serif';
      ctx.fillText('🔍 Search medicines, prescriptions...', 120, 390);
    } else if (p >= W.searchMedicine.start && p < W.searchMedicine.end) {
      const searchProgress = (p - W.searchMedicine.start) / (W.searchMedicine.end - W.searchMedicine.start);
      const charCount = Math.floor(searchProgress * fullSearchQuery.length);
      const typedText = fullSearchQuery.slice(0, charCount);

      // Active highlighted search border
      ctx.strokeStyle = '#0B7F63';
      ctx.lineWidth = 4;
      this.roundRect(ctx, 80, 325, w - 160, 105, 30);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '800 38px -apple-system, sans-serif';
      ctx.fillText(`🔍 ${typedText}`, 120, 390);
      isFiltered = searchProgress > 0.35;
    } else {
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 38px -apple-system, sans-serif';
      ctx.fillText(`🔍 ${fullSearchQuery}`, 120, 390);
      isFiltered = true;
    }

    // =========================================================================
    // DUAL PANE TABLET LAYOUT (Galaxy Z Fold 5 wide screen)
    // Left Pane (X: 80 to 980)  |  Right Pane (X: 1060 to 1968)
    // =========================================================================
    const leftPaneW = w / 2 - 120; // 904px
    const rightPaneX = w / 2 + 40; // 1064px
    const rightPaneW = w / 2 - 120; // 904px

    // --- LEFT PANE PRODUCT CARDS ---

    // 1. Amoxicillin 500mg Card
    const card1Y = 565;
    ctx.fillStyle = isFiltered ? '#F0FDF4' : '#FFFFFF';
    this.roundRect(ctx, 80, card1Y, leftPaneW, 310, 32);
    ctx.fill();
    ctx.strokeStyle = isFiltered ? '#0B7F63' : '#E2E8F0';
    ctx.lineWidth = isFiltered ? 4.5 : 2;
    ctx.stroke();

    // Rx Badge
    ctx.fillStyle = '#0B7F63';
    this.roundRect(ctx, 110, card1Y + 40, 110, 110, 24);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 48px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Rx', 165, card1Y + 112);
    ctx.textAlign = 'left';

    // Title & subtitle
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Amoxicillin 500mg', 245, card1Y + 80);
    ctx.fillStyle = '#475569';
    ctx.font = '700 28px -apple-system, sans-serif';
    ctx.fillText('15 Capsules · Antibiotic Strip', 245, card1Y + 125);

    // Verified badge
    ctx.fillStyle = '#0B7F63';
    this.roundRect(ctx, 245, card1Y + 155, 270, 44, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px -apple-system, sans-serif';
    ctx.fillText('✓ Rx Verified Match', 265, card1Y + 185);

    // Price
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 48px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('₹249', 80 + leftPaneW - 35, card1Y + 95);
    ctx.fillStyle = '#0B7F63';
    ctx.font = '800 24px -apple-system, sans-serif';
    ctx.fillText('● IN STOCK', 80 + leftPaneW - 35, card1Y + 140);
    ctx.textAlign = 'left';

    // 2. Paracetamol 650mg Card
    const card2Y = 905;
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, 80, card2Y, leftPaneW, 290, 32);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    this.roundRect(ctx, 110, card2Y + 40, 110, 110, 24);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 40px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tab', 165, card2Y + 110);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Paracetamol 650mg', 245, card2Y + 80);
    ctx.fillStyle = '#475569';
    ctx.font = '700 28px -apple-system, sans-serif';
    ctx.fillText('15 Fast Action Tablets · Fever', 245, card2Y + 125);

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 46px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('₹45', 80 + leftPaneW - 35, card2Y + 95);
    ctx.textAlign = 'left';

    // 3. Vitamin C 500mg Card
    const card3Y = 1225;
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, 80, card3Y, leftPaneW, 290, 32);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFF7ED';
    this.roundRect(ctx, 110, card3Y + 40, 110, 110, 24);
    ctx.fill();
    ctx.fillStyle = '#EA580C';
    ctx.font = '800 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Vit', 165, card3Y + 110);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Vitamin C 500mg Chewable', 245, card3Y + 80);
    ctx.fillStyle = '#475569';
    ctx.font = '700 28px -apple-system, sans-serif';
    ctx.fillText('30 Orange Lozenges · Immunity', 245, card3Y + 125);

    ctx.fillStyle = '#0F172A';
    ctx.font = '900 46px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('₹180', 80 + leftPaneW - 35, card3Y + 95);
    ctx.textAlign = 'left';

    // 4. Prescription Upload Card
    const card4Y = 1545;
    ctx.fillStyle = '#ECFDF5';
    this.roundRect(ctx, 80, card4Y, leftPaneW, 220, 30);
    ctx.fill();
    ctx.strokeStyle = '#A7F3D0';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#065F46';
    ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Have a Paper Prescription?', 115, card4Y + 65);
    ctx.fillStyle = '#047857';
    ctx.font = '700 26px -apple-system, sans-serif';
    ctx.fillText('Upload photo · Verified in 3 mins', 115, card4Y + 110);

    ctx.fillStyle = '#0B7F63';
    this.roundRect(ctx, 115, card4Y + 135, 290, 56, 16);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 24px -apple-system, sans-serif';
    ctx.fillText('📷 Upload Script', 155, card4Y + 172);

    // --- RIGHT PANE: REAL-TIME ORDER SUMMARY / CHECKOUT PANEL ---
    const checkoutY = 565;
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, rightPaneX, checkoutY, rightPaneW, 1200, 36);
    ctx.fill();
    ctx.strokeStyle = isFiltered ? '#0B7F63' : '#E2E8F0';
    ctx.lineWidth = isFiltered ? 3.5 : 2;
    ctx.stroke();

    // Right Pane Header
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Order Summary', rightPaneX + 45, checkoutY + 75);

    // Live Dispatch Badge
    ctx.fillStyle = '#DCFCE7';
    this.roundRect(ctx, rightPaneX + 45, checkoutY + 105, 340, 48, 14);
    ctx.fill();
    ctx.fillStyle = '#15803D';
    ctx.font = '800 24px -apple-system, sans-serif';
    ctx.fillText('⚡ 15-Minute Guaranteed', rightPaneX + 65, checkoutY + 138);

    // Line items
    const rows = [
      { label: 'Amoxicillin 500mg (20 Caps)', val: '₹249' },
      { label: 'Express Cold-Chain Delivery', val: 'FREE' },
      { label: 'Pharmacist Verification Fee', val: '₹0' },
      { label: 'Tamper-Evident Security Seal', val: 'FREE' },
      { label: 'Real-time GPS Scooter Tracking', val: 'INCLUDED' }
    ];

    let ry = checkoutY + 210;
    rows.forEach((r) => {
      ctx.fillStyle = '#475569';
      ctx.font = '700 28px -apple-system, sans-serif';
      ctx.fillText(r.label, rightPaneX + 45, ry);
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(r.val, rightPaneX + rightPaneW - 45, ry);
      ctx.textAlign = 'left';
      ry += 70;
    });

    // Divider line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(rightPaneX + 45, ry);
    ctx.lineTo(rightPaneX + rightPaneW - 45, ry);
    ctx.stroke();

    // Total Amount
    ry += 65;
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 40px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Total Payable', rightPaneX + 45, ry);
    ctx.fillStyle = '#0B7F63';
    ctx.font = '900 56px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('₹249', rightPaneX + rightPaneW - 45, ry);
    ctx.textAlign = 'left';

    // Delivery address card in right pane
    ry += 40;
    const isOrderConfirmed = p >= W.placeOrder.start && ((p - W.placeOrder.start) / (W.placeOrder.end - W.placeOrder.start)) >= 0.65;
    ctx.fillStyle = isOrderConfirmed ? '#F0FDF4' : '#F8FAFC';
    this.roundRect(ctx, rightPaneX + 45, ry, rightPaneW - 90, 140, 20);
    ctx.fill();
    ctx.strokeStyle = isOrderConfirmed ? '#059669' : '#E2E8F0';
    ctx.lineWidth = isOrderConfirmed ? 3 : 2;
    ctx.stroke();

    if (isOrderConfirmed) {
      ctx.fillStyle = '#059669';
      ctx.font = '900 24px -apple-system, sans-serif';
      ctx.fillText('✓ RX APPROVED · ASSIGNED TO CLOUD DISPATCH', rightPaneX + 70, ry + 42);
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 28px -apple-system, sans-serif';
      ctx.fillText('Apt 4B, Indiranagar Heights, 100ft Rd', rightPaneX + 70, ry + 82);
      ctx.fillStyle = '#059669';
      ctx.font = '700 24px -apple-system, sans-serif';
      ctx.fillText('Direct rider dispatching from Indiranagar hub', rightPaneX + 70, ry + 118);
    } else {
      ctx.fillStyle = '#64748B';
      ctx.font = '800 22px -apple-system, sans-serif';
      ctx.fillText('DELIVER TO DOORSTEP', rightPaneX + 70, ry + 42);
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 28px -apple-system, sans-serif';
      ctx.fillText('Apt 4B, Indiranagar Heights, 100ft Rd', rightPaneX + 70, ry + 82);
      ctx.fillStyle = '#0B7F63';
      ctx.font = '700 24px -apple-system, sans-serif';
      ctx.fillText('Direct rider handover with digital OTP', rightPaneX + 70, ry + 118);
    }

    // Dynamic Place Order Button
    const btnY = checkoutY + 1040;
    let btnText = 'Place Order · 15 Min Delivery ➔';
    let btnColor = '#0B7F63';

    if (p >= W.placeOrder.start) {
      const orderProgress = (p - W.placeOrder.start) / (W.placeOrder.end - W.placeOrder.start);
      if (orderProgress >= 0.65) {
        btnText = '✓ ORDER PLACED · DISPATCHING ⚡';
        btnColor = '#059669';
      } else if (orderProgress >= 0.35) {
        btnText = '⚡ Verifying Prescription...';
        btnColor = '#047857';
      }
    }

    ctx.fillStyle = btnColor;
    this.roundRect(ctx, rightPaneX + 45, btnY, rightPaneW - 90, 110, 30);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(btnText, rightPaneX + rightPaneW / 2, btnY + 70);
    ctx.textAlign = 'left';

    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.texture.dispose();
  }
}

/**
 * CoverScreenTexture:
 * High-DPI Smartphone Cover Display (1024 x 2048) on the outer face of Galaxy Z Fold 5.
 * Features the flagship emerald green Pharmafly splash screen with prominent white "P" logo,
 * "15-MIN MEDICINE DELIVERY" badge, status bar, and network active status.
 */
export class CoverScreenTexture {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;

  constructor(width = 1024, height = 2048) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Failed to get 2D context for cover screen');
    this.ctx = context;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.anisotropy = 16;
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.draw();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(x, y, w, h, r);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Lush Emerald Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#064E3B');
    grad.addColorStop(0.5, '#0B7F63');
    grad.addColorStop(1, '#022C22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle background glowing circles
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.40, 420, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-Contrast Status Bar (White on emerald)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('9:41', 80, 85);

    // Right-aligned status icons (5G, Wi-Fi, Battery)
    const iconBaseX = w - 240;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(iconBaseX, 64, 7, 24);
    ctx.fillRect(iconBaseX + 14, 56, 7, 32);
    ctx.fillRect(iconBaseX + 28, 48, 7, 40);
    ctx.fillRect(iconBaseX + 42, 40, 7, 48);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    this.roundRect(ctx, iconBaseX + 85, 46, 68, 36, 10);
    ctx.stroke();
    ctx.fillStyle = '#10B981';
    this.roundRect(ctx, iconBaseX + 90, 51, 50, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, iconBaseX + 155, 58, 6, 12, 3);
    ctx.fill();

    // 3. Center Brand Showcase
    const centerY = h * 0.38;

    // White rounded brand icon tile with soft glow
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, w / 2 - 130, centerY - 130, 260, 260, 60);
    ctx.fill();

    // Emerald "P" logo
    ctx.fillStyle = '#0B7F63';
    ctx.font = '900 170px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('P', w / 2, centerY + 58);

    // Pharmafly Brand Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 88px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Pharmafly', w / 2, centerY + 240);

    // Pill badge: 15-MIN MEDICINE DELIVERY
    const badgeW = 600;
    const badgeH = 72;
    const badgeY = centerY + 300;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.roundRect(ctx, w / 2 - badgeW / 2, badgeY, badgeW, badgeH, 36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#A7F3D0';
    ctx.font = '800 28px -apple-system, sans-serif';
    ctx.fillText('⚡ 15-MIN MEDICINE DELIVERY', w / 2, badgeY + 47);

    // Subtitle tagline
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '600 32px -apple-system, sans-serif';
    ctx.fillText('Healthcare essentials at your doorstep', w / 2, centerY + 430);

    // Live network status indicator
    ctx.fillStyle = '#34D399';
    ctx.beginPath();
    ctx.arc(w / 2 - 160, centerY + 490, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D1FAE5';
    ctx.font = '700 26px -apple-system, sans-serif';
    ctx.fillText('Bengaluru Live Network Active', w / 2 + 10, centerY + 498);

    // Bottom prompt to explore
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '600 26px -apple-system, sans-serif';
    ctx.fillText('Scroll to open prescription store ▾', w / 2, h - 180);

    // Bottom home indicator bar
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, w / 2 - 120, h - 60, 240, 10, 5);
    ctx.fill();

    ctx.textAlign = 'left';
    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.texture.dispose();
  }
}
