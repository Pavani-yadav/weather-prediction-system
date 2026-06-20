/* public/js/charts.js — Vanilla JS Canvas charts (no Recharts, no libraries).
 * Implements: LineChart, AreaChart, BarChart for the Forecast Analytics view.
 */
'use strict';

const Charts = {
  /**
   * Draw an area chart on a canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {Array<{label:string, value:number}>} data
   * @param {Object} opts {color, fill, height, showDots, valueSuffix}
   */
  area(canvas, data, opts = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = opts.height || 200;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (!data || data.length === 0) return;

    const padL = 36, padR = 12, padT = 16, padB = 28;
    const cw = w - padL - padR;
    const ch = h - padT - padB;
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);
    const color = opts.color || '#22d3ee';
    const fillColor = opts.fill || color;

    // Y axis grid + labels
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '10px Inter, sans-serif';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      const val = max - (range / 4) * i;
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(0) + (opts.valueSuffix || ''), padL - 6, y + 3);
    }

    // X axis labels — show every 2nd hour, rotated for readability
    const step = 2;
    ctx.textAlign = 'center';
    ctx.font = '9px Inter, sans-serif';
    data.forEach((d, i) => {
      if (i % step !== 0 && i !== data.length - 1) return;
      const x = padL + (cw / (data.length - 1 || 1)) * i;
      ctx.save();
      ctx.translate(x, h - 6);
      ctx.rotate(-Math.PI / 5);
      ctx.fillText(d.label, 0, 0);
      ctx.restore();
    });

    // Area fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
    grad.addColorStop(0, fillColor + '99');
    grad.addColorStop(1, fillColor + '11');
    ctx.fillStyle = grad;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padL + (cw / (data.length - 1 || 1)) * i;
      const y = padT + ch - ((d.value - min) / range) * ch;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + cw, padT + ch);
    ctx.lineTo(padL, padT + ch);
    ctx.closePath();
    ctx.fill();

    // Line stroke
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padL + (cw / (data.length - 1 || 1)) * i;
      const y = padT + ch - ((d.value - min) / range) * ch;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    if (opts.showDots) {
      ctx.fillStyle = color;
      data.forEach((d, i) => {
        const x = padL + (cw / (data.length - 1 || 1)) * i;
        const y = padT + ch - ((d.value - min) / range) * ch;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      });
    }
  },

  /**
   * Draw a bar chart.
   */
  bars(canvas, data, opts = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = opts.height || 200;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (!data || data.length === 0) return;

    const padL = 36, padR = 12, padT = 16, padB = 28;
    const cw = w - padL - padR;
    const ch = h - padT - padB;
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);
    const color = opts.color || '#34d399';
    const barW = (cw / data.length) * 0.7;
    const gap = (cw / data.length) * 0.3;

    // Y grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '10px Inter, sans-serif';
    for (let i = 0; i <= 4; i++) {
      const y = padT + (ch / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      const val = max - (max / 4) * i;
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(0) + (opts.valueSuffix || ''), padL - 6, y + 3);
    }

    // Bars
    const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '66');
    ctx.fillStyle = grad;
    data.forEach((d, i) => {
      const x = padL + (cw / data.length) * i + gap / 2;
      const barH = (d.value / max) * ch;
      const y = padT + ch - barH;
      ctx.beginPath();
      const r = Math.min(barW / 2, 6);
      ctx.moveTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.lineTo(x + barW - r, y);
      ctx.arcTo(x + barW, y, x + barW, y + r, r);
      ctx.lineTo(x + barW, padT + ch);
      ctx.lineTo(x, padT + ch);
      ctx.closePath();
      ctx.fill();
      // X label — rotated for readability, show every 2nd hour
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.textAlign = 'center';
      ctx.font = '9px Inter, sans-serif';
      if (i % 2 === 0 || i === data.length - 1) {
        ctx.save();
        ctx.translate(x + barW / 2, h - 6);
        ctx.rotate(-Math.PI / 5);
        ctx.fillText(d.label, 0, 0);
        ctx.restore();
      }
      ctx.fillStyle = grad;
    });
  },
};
