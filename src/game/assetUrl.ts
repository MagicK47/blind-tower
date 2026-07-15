const cleanPath = (path: string) => path.replace(/^\/+/, "");

export function assetUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}${cleanPath(path)}`, document.baseURI).href;
}

export const tileUrl = (frame: number) => assetUrl(`assets/tiles/tile_${String(frame).padStart(4, "0")}.png`);

export function installAssetCssVariables(): void {
  const root = document.documentElement;
  const uiAssets = {
    "--ui-panel-brown": "panel_brown.png",
    "--ui-square-brown": "buttonSquare_brown.png",
    "--ui-square-brown-pressed": "buttonSquare_brown_pressed.png",
    "--ui-inset-brown": "panelInset_brown.png",
    "--ui-long-brown": "buttonLong_brown.png",
    "--ui-long-brown-pressed": "buttonLong_brown_pressed.png",
    "--ui-long-beige": "buttonLong_beige.png",
  } as const;

  Object.entries(uiAssets).forEach(([property, file]) => {
    root.style.setProperty(property, `url("${assetUrl(`assets/ui/${file}`)}")`);
  });
}
