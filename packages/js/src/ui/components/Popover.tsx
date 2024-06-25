import { Portal } from 'solid-js/web';

export function Popover() {
  return (
    <Portal>
      <div class="popup">
        <h1>Popup</h1>
        <p>Some text you might need for something or other.</p>
      </div>
    </Portal>
  );
}
