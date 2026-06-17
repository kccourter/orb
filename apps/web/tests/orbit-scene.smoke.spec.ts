import { expect, type Page, test } from "@playwright/test";

test("renders the orbit scene to a nonblank canvas", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("#scene");
  await expect(canvas).toBeVisible();

  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);
});

test("recomputes the orbit from sampling controls", async ({ page }) => {
  await page.goto("/");

  const epochInput = page.getByTestId("epoch-input");
  const durationInput = page.getByTestId("duration-input");
  const stepInput = page.getByTestId("step-input");
  const resetButton = page.getByTestId("reset-settings");

  await expect(epochInput).toHaveValue("2024-06-21T13:31:24Z");
  await expect(durationInput).toHaveValue("92.5");
  await expect(stepInput).toHaveValue("30");

  await durationInput.fill("120");
  await durationInput.blur();
  await expect(durationInput).toHaveValue("120");
  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);

  await resetButton.click();
  await expect(durationInput).toHaveValue("92.5");
  await expect(stepInput).toHaveValue("30");
  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);
});

async function countNonBlankCanvasPixels(page: Page): Promise<number> {
  const nonBlankPixels = await page.waitForFunction(() => {
    const scene = document.querySelector<HTMLCanvasElement>("#scene");
    const context = scene?.getContext("webgl2") ?? scene?.getContext("webgl");

    if (!scene || !context || scene.width === 0 || scene.height === 0) {
      return 0;
    }

    context.finish();

    const sampleWidth = Math.min(scene.width, 64);
    const sampleHeight = Math.min(scene.height, 64);
    const pixels = new Uint8Array(sampleWidth * sampleHeight * 4);
    context.readPixels(
      Math.floor((scene.width - sampleWidth) / 2),
      Math.floor((scene.height - sampleHeight) / 2),
      sampleWidth,
      sampleHeight,
      context.RGBA,
      context.UNSIGNED_BYTE,
      pixels,
    );

    let nonBackgroundPixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];

      if (alpha > 0 && (red !== 7 || green !== 16 || blue !== 20)) {
        nonBackgroundPixels += 1;
      }
    }

    return nonBackgroundPixels;
  });

  return nonBlankPixels.jsonValue();
}
