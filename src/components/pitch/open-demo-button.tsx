"use client";

// One click, two tabs: instructor and student, each already signed in.
// window.open() calls must happen synchronously inside the click handler
// or browsers block the second one as an unrequested popup — this fires
// both immediately, no await in between.
export function OpenDemoButton() {
  function openDemo() {
    window.open("/demo/instructor", "_blank");
    window.open("/demo/student", "_blank");
  }

  return (
    <button
      onClick={openDemo}
      className="rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary"
    >
      Open demo →
    </button>
  );
}
