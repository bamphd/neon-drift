// Keyboard + mouse state, polled once per fixed step. Edge-triggered presses
// (justPressed / justClicked) are consumed by the game each step and cleared
// at the end of it, so a key press never fires twice.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.justClicked = false;
    this.clickX = 0;
    this.clickY = 0;
    this.canvas = canvas;
    this.attach();
  }

  attach() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.justPressed.add(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    });
    this.canvas.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      this.mouseDown = true;
      this.justClicked = true;
      const rect = this.canvas.getBoundingClientRect();
      this.clickX = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
      this.clickY = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  down(code) {
    return this.keys.has(code);
  }

  pressed(code) {
    return this.justPressed.has(code);
  }

  pressedAny(codes) {
    return codes.some((code) => this.justPressed.has(code));
  }

  // Normalised movement axis from WASD / arrows, -1..1 on each axis.
  axis() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  dashPressed() {
    return this.pressed('Space') || this.pressed('ShiftLeft') || this.pressed('ShiftRight');
  }

  endStep() {
    this.justPressed.clear();
    this.justClicked = false;
  }
}
