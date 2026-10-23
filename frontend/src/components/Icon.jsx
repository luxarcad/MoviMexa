export default function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: "M5 12h14m-6-6 6 6-6 6",
    chevron: "m9 5 7 7-7 7",
    search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    route: "M5 6h11a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h11M5 3v6m-3-3h6",
    compass: "m16 8-3 5-5 3 3-5 5-3M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    heart:
      "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
    clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    bus: "M5 17h14V6a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v11Zm0-7h14M8 14h.01M16 14h.01M7 17v3m10-3v3M9 6h6",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    help: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    user: "M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    swap: "m7 3-4 4h14M3 7l4 4m10 10 4-4H7m14 0-4-4",
    check: "m5 12 4 4L19 6",
    close: "m6 6 12 12M6 18 18 6",
    play: "m8 4 12 8-12 8V4Z",
    pause: "M8 5v14M16 5v14",
    alert: "m12 3 10 18H2L12 3Zm0 6v5m0 3h.01",
    logout: "M9 21H5V3h4m6 5 4 4-4 4m-6-4h12",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    target:
      "M12 2v3m0 14v3M2 12h3m14 0h3M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    shield: "m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Zm-4 10 3 3 5-6",
    leaf: "M20 3C7 1 2 8 5 15s15 4 15-12ZM4 21 15 10",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.route} />
    </svg>
  );
}
