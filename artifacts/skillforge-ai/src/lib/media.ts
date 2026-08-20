export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url;
}

export function downloadMedia(url: string, fallbackName?: string) {
  const target = resolveMediaUrl(url);
  const urlName = typeof target === "string" ? target.split("/").pop() : "";
  let name = fallbackName?.trim() || urlName || "download";
  const urlExt = (urlName || "").includes(".")
    ? (urlName || "").split(".").pop()
    : "";
  if (urlExt && !name.toLowerCase().endsWith(`.${urlExt.toLowerCase()}`)) {
    name = `${name}.${urlExt}`;
  }

  fetch(target, { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      return res.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    })
    .catch((err) => {
      console.error("Failed to download file:", err);
      window.open(target, "_blank", "noopener,noreferrer");
    });
}