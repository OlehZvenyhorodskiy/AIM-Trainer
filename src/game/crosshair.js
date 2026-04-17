export function createCrosshairMarkup() {
  return `
    <div class="crosshair__dot"></div>
    <div class="crosshair__ring"></div>
    <div class="crosshair__arm crosshair__arm--top"></div>
    <div class="crosshair__arm crosshair__arm--right"></div>
    <div class="crosshair__arm crosshair__arm--bottom"></div>
    <div class="crosshair__arm crosshair__arm--left"></div>
  `;
}

export function applyCrosshairStyles(element, settings, dynamicSpread = 0) {
  if (!element) return;
  const style = settings.crosshair;
  const gap = Number(style.gap) + dynamicSpread;
  const size = Number(style.size);
  const thickness = Number(style.thickness);

  element.dataset.style = style.style;
  element.style.setProperty('--crosshair-color', style.color);
  element.style.setProperty('--crosshair-outline-color', style.outlineColor);
  element.style.setProperty('--crosshair-opacity', `${Number(style.opacity) / 100}`);
  element.style.setProperty('--crosshair-gap', `${gap}px`);
  element.style.setProperty('--crosshair-size', `${size}px`);
  element.style.setProperty('--crosshair-thickness', `${thickness}px`);
  element.style.setProperty('--crosshair-outline-width', style.outline ? '1px' : '0px');
}
